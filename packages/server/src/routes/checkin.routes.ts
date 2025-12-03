import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { authMiddleware } from '../middlewares/auth.middleware';
import { success, error, paginated } from '../utils/response';
import { User } from '../models/user.model';
import { CheckinTheme, CheckinRecord } from '../models/checkin.model';
import { PointsRecord } from '../models/points.model';
import { ApiCode } from '@rocketbird/shared';

const router = Router();

// GET /api/checkin/themes - 获取打卡主题列表
router.get('/themes', authMiddleware, async (req, res, next) => {
  try {
    const themes = await CheckinTheme.findActiveThemes();

    // 获取用户今日在各主题的打卡次数
    const userId = req.user!.userId;
    const themesWithStatus = await Promise.all(
      themes.map(async (theme) => {
        const todayCount = await CheckinRecord.getUserTodayCheckinCount(userId, theme.themeId);
        return {
          ...theme,
          todayCheckinCount: todayCount,
          canCheckin: todayCount < theme.maxDailyCheckin,
        };
      })
    );

    success(res, themesWithStatus);
  } catch (err) {
    next(err);
  }
});

// GET /api/checkin/themes/:themeId - 获取主题详情
router.get('/themes/:themeId', authMiddleware, async (req, res, next) => {
  try {
    const { themeId } = req.params;

    const theme = await CheckinTheme.findByThemeId(themeId);
    if (!theme) {
      return error(res, ApiCode.NotFound, '主题不存在', 404);
    }

    if (theme.status !== 1) {
      return error(res, ApiCode.NotFound, '主题已下架', 404);
    }

    // 获取用户今日打卡次数
    const todayCount = await CheckinRecord.getUserTodayCheckinCount(req.user!.userId, themeId);

    // 获取该主题最近的打卡记录
    const recentRecords = await CheckinRecord.findByThemeId(themeId, 10);

    success(res, {
      ...theme,
      todayCheckinCount: todayCount,
      canCheckin: todayCount < theme.maxDailyCheckin,
      recentRecords,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/checkin/create - 创建打卡记录
router.post('/create', authMiddleware, async (req, res, next) => {
  try {
    const { themeId, content, images = [], location } = req.body;

    if (!themeId) {
      return error(res, ApiCode.BadRequest, '请选择打卡主题');
    }

    const theme = await CheckinTheme.findByThemeId(themeId);
    if (!theme) {
      return error(res, ApiCode.NotFound, '主题不存在', 404);
    }

    if (theme.status !== 1) {
      return error(res, ApiCode.BadRequest, '该主题已下架');
    }

    // 检查今日打卡次数
    const todayCount = await CheckinRecord.getUserTodayCheckinCount(req.user!.userId, themeId);
    if (todayCount >= theme.maxDailyCheckin) {
      return error(res, ApiCode.BadRequest, `该主题每日最多打卡 ${theme.maxDailyCheckin} 次`);
    }

    const user = await User.findByUserId(req.user!.userId);
    if (!user) {
      return error(res, ApiCode.NotFound, '用户不存在', 404);
    }

    // 创建打卡记录
    const record = await CheckinRecord.create({
      recordId: uuid(),
      userId: user.userId,
      userNickname: user.nickname,
      userAvatar: user.avatar,
      themeId,
      themeName: theme.name,
      content,
      images,
      location,
      rewardPoints: theme.rewardPoints,
      shareRewardPoints: theme.shareRewardPoints,
      isShared: false,
      shareCount: 0,
      reviewStatus: 1, // 默认通过（可以改为0需要审核）
    });

    // 发放打卡积分
    if (theme.rewardPoints > 0) {
      await User.updatePoints(user.userId, theme.rewardPoints);

      await PointsRecord.create({
        recordId: uuid(),
        userId: user.userId,
        type: 'earn',
        points: theme.rewardPoints,
        balance: user.availablePoints + theme.rewardPoints,
        source: 'checkin',
        sourceId: record.recordId,
        description: `${theme.name}打卡奖励`,
      });
    }

    // 增加成长值
    await User.updateGrowthValue(user.userId, 10);

    success(res, {
      recordId: record.recordId,
      rewardPoints: theme.rewardPoints,
      message: '打卡成功',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/checkin/my-records - 获取我的打卡记录
router.get('/my-records', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, themeId } = req.query;

    const query: Record<string, unknown> = { userId: req.user!.userId };
    if (themeId) {
      query.themeId = themeId;
    }

    const result = await CheckinRecord.findPaginated(
      query,
      { page: Number(page), pageSize: Number(pageSize) },
      { field: 'createdAt', direction: 'desc' }
    );

    paginated(res, result.list, result.total, result.page, result.pageSize);
  } catch (err) {
    next(err);
  }
});

// GET /api/checkin/records/:recordId - 获取打卡详情
router.get('/records/:recordId', authMiddleware, async (req, res, next) => {
  try {
    const { recordId } = req.params;

    const record = await CheckinRecord.findByRecordId(recordId);
    if (!record) {
      return error(res, ApiCode.NotFound, '打卡记录不存在', 404);
    }

    // 获取主题详情
    const theme = await CheckinTheme.findByThemeId(record.themeId);

    success(res, {
      ...record,
      theme,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/checkin/records/:recordId/share - 生成分享海报
router.post('/records/:recordId/share', authMiddleware, async (req, res, next) => {
  try {
    const { recordId } = req.params;

    const record = await CheckinRecord.findByRecordId(recordId);
    if (!record) {
      return error(res, ApiCode.NotFound, '打卡记录不存在', 404);
    }

    if (record.userId !== req.user!.userId) {
      return error(res, ApiCode.Forbidden, '无权操作此记录', 403);
    }

    // 获取主题详情
    const theme = await CheckinTheme.findByThemeId(record.themeId);

    // 生成海报（实际应用中应该调用图片生成服务）
    const posterData = {
      recordId: record.recordId,
      themeName: record.themeName,
      content: record.content,
      images: record.images,
      createdAt: record.createdAt,
      userNickname: record.userNickname,
      userAvatar: record.userAvatar,
      templateImages: theme?.templateImages || [],
      // 模拟的海报URL
      posterUrl: record.posterUrl || `${process.env.CDN_BASE_URL || ''}/posters/checkin_${recordId}.png`,
    };

    success(res, posterData);
  } catch (err) {
    next(err);
  }
});

// POST /api/checkin/records/:recordId/share-callback - 分享回调
router.post('/records/:recordId/share-callback', authMiddleware, async (req, res, next) => {
  try {
    const { recordId } = req.params;

    const record = await CheckinRecord.findByRecordId(recordId);
    if (!record) {
      return error(res, ApiCode.NotFound, '打卡记录不存在', 404);
    }

    if (record.userId !== req.user!.userId) {
      return error(res, ApiCode.Forbidden, '无权操作此记录', 403);
    }

    // 检查是否已经获得过分享奖励
    if (record.isShared) {
      return success(res, {
        message: '分享成功',
        alreadyRewarded: true,
        rewardPoints: 0,
      });
    }

    // 标记为已分享
    await CheckinRecord.markAsShared(recordId);

    // 发放分享奖励
    let rewardPoints = 0;
    if (record.shareRewardPoints > 0) {
      rewardPoints = record.shareRewardPoints;
      const user = await User.findByUserId(req.user!.userId);
      if (user) {
        await User.updatePoints(user.userId, rewardPoints);

        await PointsRecord.create({
          recordId: uuid(),
          userId: user.userId,
          type: 'earn',
          points: rewardPoints,
          balance: user.availablePoints + rewardPoints,
          source: 'share',
          sourceId: recordId,
          description: '分享打卡记录奖励',
        });
      }
    }

    success(res, {
      message: '分享成功',
      rewardPoints,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/checkin/stats - 获取打卡统计
router.get('/stats', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    // 获取用户所有打卡记录
    const records = await CheckinRecord.findByUserId(userId, 1000);

    // 计算总打卡次数
    const totalCheckins = records.length;

    // 计算连续打卡天数
    let consecutiveDays = 0;
    if (records.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 按日期分组
      const dateSet = new Set<string>();
      records.forEach(r => {
        const date = new Date(r.createdAt!);
        dateSet.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
      });

      // 计算连续天数
      const checkDate = new Date(today);
      while (true) {
        const dateStr = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
        if (dateSet.has(dateStr)) {
          consecutiveDays++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // 计算本月打卡天数
    const thisMonth = new Date();
    const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
    const monthRecords = records.filter(r => new Date(r.createdAt!) >= monthStart);
    const monthDateSet = new Set<string>();
    monthRecords.forEach(r => {
      const date = new Date(r.createdAt!);
      monthDateSet.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
    });
    const monthCheckinDays = monthDateSet.size;

    // 计算获得的总积分
    const totalPoints = records.reduce((sum, r) => sum + r.rewardPoints + (r.isShared ? r.shareRewardPoints : 0), 0);

    success(res, {
      totalCheckins,
      consecutiveDays,
      monthCheckinDays,
      totalPoints,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/checkin/calendar - 获取打卡日历
router.get('/calendar', authMiddleware, async (req, res, next) => {
  try {
    const { year, month } = req.query;

    const targetYear = year ? Number(year) : new Date().getFullYear();
    const targetMonth = month ? Number(month) - 1 : new Date().getMonth();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    // 获取指定月份的打卡记录
    const allRecords = await CheckinRecord.findByUserId(req.user!.userId, 1000);
    const monthRecords = allRecords.filter(r => {
      const recordDate = new Date(r.createdAt!);
      return recordDate >= startDate && recordDate <= endDate;
    });

    // 按日期分组
    const calendarData: Record<number, { count: number; points: number; records: typeof monthRecords }> = {};

    for (let day = 1; day <= endDate.getDate(); day++) {
      calendarData[day] = { count: 0, points: 0, records: [] };
    }

    monthRecords.forEach(record => {
      const day = new Date(record.createdAt!).getDate();
      if (calendarData[day]) {
        calendarData[day].count++;
        calendarData[day].points += record.rewardPoints;
        calendarData[day].records.push(record);
      }
    });

    success(res, {
      year: targetYear,
      month: targetMonth + 1,
      calendar: calendarData,
      totalDays: Object.values(calendarData).filter(d => d.count > 0).length,
      totalCheckins: monthRecords.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
