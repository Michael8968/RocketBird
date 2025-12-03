import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { success, error, paginated } from '../utils/response';
import { User } from '../models/user.model';
import { InviteRecord, InviteRule } from '../models/referral.model';
import { ApiCode } from '@rocketbird/shared';

const router = Router();

// GET /api/referral/my-code - 获取我的邀请码
router.get('/my-code', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findByUserId(req.user!.userId);
    if (!user) {
      return error(res, ApiCode.NotFound, '用户不存在', 404);
    }

    // 获取当前邀请规则
    const rule = await InviteRule.findActiveRule();

    // 生成邀请链接
    const inviteUrl = `${process.env.H5_BASE_URL || 'https://example.com'}/pages/login/index?inviteCode=${user.inviteCode}`;

    success(res, {
      inviteCode: user.inviteCode,
      inviteUrl,
      inviterReward: rule?.inviterReward || 0,
      inviteeReward: rule?.inviteeReward || 0,
      rewardCondition: rule?.rewardCondition || 'register',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/referral/generate-poster - 生成邀请海报
router.post('/generate-poster', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findByUserId(req.user!.userId);
    if (!user) {
      return error(res, ApiCode.NotFound, '用户不存在', 404);
    }

    // 在实际生产环境中，这里应该调用图片生成服务生成海报
    // 目前返回一个模拟的海报URL
    const posterData = {
      inviteCode: user.inviteCode,
      nickname: user.nickname,
      avatar: user.avatar,
      // 海报URL (实际应用中应该是动态生成的)
      posterUrl: `${process.env.CDN_BASE_URL || ''}/posters/invite_${user.inviteCode}.png`,
      qrcodeUrl: `${process.env.H5_BASE_URL || 'https://example.com'}/pages/login/index?inviteCode=${user.inviteCode}`,
    };

    success(res, posterData);
  } catch (err) {
    next(err);
  }
});

// GET /api/referral/records - 获取邀请记录
router.get('/records', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, status } = req.query;

    const query: Record<string, unknown> = { inviterId: req.user!.userId };
    if (status !== undefined && status !== '') {
      query.status = Number(status);
    }

    const result = await InviteRecord.findPaginated(
      query,
      { page: Number(page), pageSize: Number(pageSize) },
      { field: 'createdAt', direction: 'desc' }
    );

    paginated(res, result.list, result.total, result.page, result.pageSize);
  } catch (err) {
    next(err);
  }
});

// GET /api/referral/stats - 获取邀请统计
router.get('/stats', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    // 获取总邀请数
    const totalInvites = await InviteRecord.countByInviterId(userId);

    // 获取今日邀请数
    const todayInvites = await InviteRecord.countTodayByInviterId(userId);

    // 获取所有邀请记录计算奖励
    const records = await InviteRecord.findByInviterId(userId);

    // 计算已获得奖励积分
    const earnedPoints = records
      .filter(r => r.status === 1)
      .reduce((sum, r) => sum + r.rewardPoints, 0);

    // 计算待发放奖励
    const pendingPoints = records
      .filter(r => r.status === 0)
      .reduce((sum, r) => sum + r.rewardPoints, 0);

    // 获取用户邀请码
    const user = await User.findByUserId(userId);

    success(res, {
      inviteCode: user?.inviteCode,
      totalInvites,
      todayInvites,
      earnedPoints,
      pendingPoints,
      // 邀请排名（可以后续实现）
      ranking: null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/referral/validate-code - 验证邀请码
router.post('/validate-code', async (req, res, next) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return error(res, ApiCode.BadRequest, '请输入邀请码');
    }

    const inviter = await User.findByInviteCode(inviteCode);
    if (!inviter) {
      return error(res, ApiCode.NotFound, '邀请码不存在', 404);
    }

    // 获取邀请规则
    const rule = await InviteRule.findActiveRule();

    success(res, {
      valid: true,
      inviterNickname: inviter.nickname,
      inviterAvatar: inviter.avatar,
      inviteeReward: rule?.inviteeReward || 0,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/referral/rules - 获取邀请规则
router.get('/rules', async (req, res, next) => {
  try {
    const rule = await InviteRule.findActiveRule();

    if (!rule) {
      return success(res, {
        enabled: false,
        message: '邀请活动暂未开放',
      });
    }

    success(res, {
      enabled: true,
      inviterReward: rule.inviterReward,
      inviteeReward: rule.inviteeReward,
      rewardCondition: rule.rewardCondition,
      maxInvitesPerDay: rule.maxInvitesPerDay,
      maxInvitesTotal: rule.maxInvitesTotal,
      description: rule.description,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
