import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { authMiddleware } from '../middlewares/auth.middleware';
import { success, error, paginated } from '../utils/response';
import { User } from '../models/user.model';
import { BenefitRule, BenefitRecord, IBenefitRecord } from '../models/benefits.model';
import { PointsRecord } from '../models/points.model';
import { ApiCode } from '@rocketbird/shared';

const router = Router();

// GET /api/benefits/available - 获取可用福利列表
router.get('/available', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findByUserId(req.user!.userId);
    if (!user) {
      return error(res, ApiCode.NotFound, '用户不存在', 404);
    }

    const rules = await BenefitRule.findActiveRules();

    // 过滤出用户可领取的福利
    const availableBenefits = rules.filter(rule => {
      // 检查等级限制
      if (rule.conditions.levelIds && rule.conditions.levelIds.length > 0) {
        if (!rule.conditions.levelIds.includes(user.levelId)) {
          return false;
        }
      }

      // 检查成长值限制
      if (rule.conditions.minGrowth && user.growthValue < rule.conditions.minGrowth) {
        return false;
      }

      return true;
    });

    success(res, availableBenefits);
  } catch (err) {
    next(err);
  }
});

// GET /api/benefits/my - 获取我的福利
router.get('/my', authMiddleware, async (req, res, next) => {
  try {
    const { status } = req.query;

    const records = await BenefitRecord.findByUserId(req.user!.userId);

    // 过滤状态
    let filteredRecords = records;
    if (status !== undefined && status !== '') {
      filteredRecords = records.filter(r => r.status === Number(status));
    }

    // 检查并更新过期状态
    const now = new Date();
    for (const record of filteredRecords) {
      if (record.status === 0 && new Date(record.expireAt) < now) {
        if (record._id) {
          await BenefitRecord.updateById(record._id, { status: 3 } as Partial<IBenefitRecord>);
          record.status = 3;
        }
      }
    }

    success(res, filteredRecords);
  } catch (err) {
    next(err);
  }
});

// POST /api/benefits/:ruleId/claim - 领取福利
router.post('/:ruleId/claim', authMiddleware, async (req, res, next) => {
  try {
    const { ruleId } = req.params;

    const rule = await BenefitRule.findByRuleId(ruleId);
    if (!rule) {
      return error(res, ApiCode.NotFound, '福利不存在', 404);
    }

    if (rule.status !== 1) {
      return error(res, ApiCode.BadRequest, '该福利已下架');
    }

    const user = await User.findByUserId(req.user!.userId);
    if (!user) {
      return error(res, ApiCode.NotFound, '用户不存在', 404);
    }

    // 检查等级限制
    if (rule.conditions.levelIds && rule.conditions.levelIds.length > 0) {
      if (!rule.conditions.levelIds.includes(user.levelId)) {
        return error(res, ApiCode.Forbidden, '您的等级不满足领取条件', 403);
      }
    }

    // 检查成长值限制
    if (rule.conditions.minGrowth && user.growthValue < rule.conditions.minGrowth) {
      return error(res, ApiCode.Forbidden, '您的成长值不满足领取条件', 403);
    }

    // 检查是否已领取过（根据福利类型判断是否可重复领取）
    const existingRecords = await BenefitRecord.find({
      userId: user.userId,
      ruleId,
    });

    // 生日福利每年可领一次
    if (rule.type === 'birthday') {
      const thisYear = new Date().getFullYear();
      const thisYearRecords = existingRecords.filter(r => {
        const recordYear = new Date(r.createdAt!).getFullYear();
        return recordYear === thisYear;
      });
      if (thisYearRecords.length > 0) {
        return error(res, ApiCode.BadRequest, '今年已领取过生日福利');
      }
    } else if (rule.type === 'new_member' || rule.type === 'level_upgrade') {
      // 新会员福利和升级福利只能领一次
      if (existingRecords.length > 0) {
        return error(res, ApiCode.BadRequest, '您已领取过该福利');
      }
    }

    // 计算过期时间
    const expireAt = new Date(Date.now() + rule.validDays * 24 * 60 * 60 * 1000);

    // 创建福利记录
    const record = await BenefitRecord.create({
      recordId: uuid(),
      userId: user.userId,
      userNickname: user.nickname,
      ruleId,
      ruleName: rule.name,
      type: rule.type,
      rewardType: rule.rewardType,
      rewardValue: rule.rewardValue,
      rewardUnit: rule.rewardUnit,
      status: 0, // 待领取 -> 实际创建时就是已领取状态
      claimedAt: new Date(),
      expireAt,
    });

    // 如果是积分奖励，直接发放
    if (rule.rewardType === 'points') {
      await User.updatePoints(user.userId, rule.rewardValue);

      // 记录积分流水
      await PointsRecord.create({
        recordId: uuid(),
        userId: user.userId,
        type: 'earn',
        points: rule.rewardValue,
        balance: user.availablePoints + rule.rewardValue,
        source: 'benefit',
        sourceId: record.recordId,
        description: `领取福利: ${rule.name}`,
      });

      // 更新福利记录为已使用
      if (record._id) {
        await BenefitRecord.updateById(record._id, {
          status: 2,
          usedAt: new Date(),
        } as Partial<IBenefitRecord>);
      }
    } else {
      // 其他类型福利更新为已领取
      if (record._id) {
        await BenefitRecord.updateById(record._id, { status: 1 } as Partial<IBenefitRecord>);
      }
    }

    success(res, {
      recordId: record.recordId,
      message: '领取成功',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/benefits/:recordId/use - 使用福利
router.post('/:recordId/use', authMiddleware, async (req, res, next) => {
  try {
    const { recordId } = req.params;

    const record = await BenefitRecord.findByRecordId(recordId);
    if (!record) {
      return error(res, ApiCode.NotFound, '福利记录不存在', 404);
    }

    if (record.userId !== req.user!.userId) {
      return error(res, ApiCode.Forbidden, '无权操作此福利', 403);
    }

    if (record.status !== 1) {
      const statusText: Record<number, string> = {
        0: '待领取',
        2: '已使用',
        3: '已过期',
      };
      return error(res, ApiCode.BadRequest, `福利${statusText[record.status] || '状态异常'}，无法使用`);
    }

    // 检查是否过期
    if (new Date() > new Date(record.expireAt)) {
      if (record._id) {
        await BenefitRecord.updateById(record._id, { status: 3 } as Partial<IBenefitRecord>);
      }
      return error(res, ApiCode.BadRequest, '福利已过期');
    }

    // 更新状态为已使用
    if (record._id) {
      await BenefitRecord.updateById(record._id, {
        status: 2,
        usedAt: new Date(),
      } as Partial<IBenefitRecord>);
    }

    success(res, { message: '使用成功' });
  } catch (err) {
    next(err);
  }
});

// GET /api/benefits/birthday - 获取生日福利
router.get('/birthday', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findByUserId(req.user!.userId);
    if (!user) {
      return error(res, ApiCode.NotFound, '用户不存在', 404);
    }

    // 获取生日福利规则
    const birthdayRules = await BenefitRule.findByType('birthday');

    if (birthdayRules.length === 0) {
      return success(res, {
        available: false,
        message: '暂无生日福利',
      });
    }

    // 检查用户是否设置了生日
    if (!user.birthday) {
      return success(res, {
        available: false,
        needSetBirthday: true,
        message: '请先设置生日',
      });
    }

    // 检查是否是生日月
    const today = new Date();
    const birthday = new Date(user.birthday);
    const isBirthdayMonth = today.getMonth() === birthday.getMonth();

    // 检查今年是否已领取
    const thisYear = today.getFullYear();
    const existingRecords = await BenefitRecord.find({
      userId: user.userId,
      type: 'birthday',
    });
    const thisYearRecord = existingRecords.find(r => {
      return new Date(r.createdAt!).getFullYear() === thisYear;
    });

    // 过滤出用户等级可领取的福利
    const availableRules = birthdayRules.filter(rule => {
      if (rule.conditions.levelIds && rule.conditions.levelIds.length > 0) {
        return rule.conditions.levelIds.includes(user.levelId);
      }
      return true;
    });

    success(res, {
      available: isBirthdayMonth && !thisYearRecord && availableRules.length > 0,
      isBirthdayMonth,
      alreadyClaimed: !!thisYearRecord,
      benefits: availableRules,
      claimedRecord: thisYearRecord,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/benefits/growth - 获取成长福利
router.get('/growth', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findByUserId(req.user!.userId);
    if (!user) {
      return error(res, ApiCode.NotFound, '用户不存在', 404);
    }

    // 获取成长福利规则
    const growthRules = await BenefitRule.findByType('growth');

    // 获取用户已领取的成长福利
    const claimedRecords = await BenefitRecord.find({
      userId: user.userId,
      type: 'growth',
    });
    const claimedRuleIds = claimedRecords.map(r => r.ruleId);

    // 返回所有成长福利及领取状态
    const benefits = growthRules.map(rule => ({
      ...rule,
      claimed: claimedRuleIds.includes(rule.ruleId),
      canClaim: user.growthValue >= (rule.conditions.minGrowth || 0) && !claimedRuleIds.includes(rule.ruleId),
    }));

    success(res, {
      currentGrowth: user.growthValue,
      benefits,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/benefits/records - 获取福利记录
router.get('/records', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, type, status } = req.query;

    const query: Record<string, unknown> = { userId: req.user!.userId };
    if (type) {
      query.type = type;
    }
    if (status !== undefined && status !== '') {
      query.status = Number(status);
    }

    const result = await BenefitRecord.findPaginated(
      query,
      { page: Number(page), pageSize: Number(pageSize) },
      { field: 'createdAt', direction: 'desc' }
    );

    paginated(res, result.list, result.total, result.page, result.pageSize);
  } catch (err) {
    next(err);
  }
});

export default router;
