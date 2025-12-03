import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { success, error, paginated } from '../utils/response';
import { User } from '../models/user.model';
import { LevelRule, LevelChangeLog } from '../models/level.model';
import { ApiCode } from '@rocketbird/shared';

const router = Router();

// GET /api/level/current - 获取当前等级信息
router.get('/current', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findByUserId(req.user!.userId);
    if (!user) {
      return error(res, ApiCode.NotFound, '用户不存在', 404);
    }

    // 获取当前等级规则
    const currentLevel = await LevelRule.findByGrowthValue(user.growthValue);

    // 获取下一等级
    const allRules = await LevelRule.findActiveRules();
    const currentIndex = allRules.findIndex(r => r.levelId === currentLevel?.levelId);
    const nextLevel = currentIndex >= 0 && currentIndex < allRules.length - 1
      ? allRules[currentIndex + 1]
      : null;

    success(res, {
      levelId: currentLevel?.levelId || user.levelId,
      levelName: currentLevel?.name || user.levelName,
      levelCode: currentLevel?.code,
      icon: currentLevel?.icon,
      color: currentLevel?.color,
      benefits: currentLevel?.benefits || [],
      growthValue: user.growthValue,
      minGrowth: currentLevel?.minGrowth || 0,
      maxGrowth: currentLevel?.maxGrowth || 0,
      nextLevel: nextLevel ? {
        levelId: nextLevel.levelId,
        levelName: nextLevel.name,
        minGrowth: nextLevel.minGrowth,
        needGrowth: nextLevel.minGrowth - user.growthValue,
      } : null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/level/rules - 获取等级规则
router.get('/rules', async (req, res, next) => {
  try {
    const rules = await LevelRule.findActiveRules();

    const formattedRules = rules.map(rule => ({
      levelId: rule.levelId,
      name: rule.name,
      code: rule.code,
      minGrowth: rule.minGrowth,
      maxGrowth: rule.maxGrowth,
      icon: rule.icon,
      color: rule.color,
      benefits: rule.benefits,
    }));

    success(res, formattedRules);
  } catch (err) {
    next(err);
  }
});

// GET /api/level/progress - 获取升级进度
router.get('/progress', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findByUserId(req.user!.userId);
    if (!user) {
      return error(res, ApiCode.NotFound, '用户不存在', 404);
    }

    const allRules = await LevelRule.findActiveRules();
    const currentLevel = await LevelRule.findByGrowthValue(user.growthValue);

    if (!currentLevel || allRules.length === 0) {
      return success(res, {
        currentGrowth: user.growthValue,
        currentLevel: null,
        nextLevel: null,
        progress: 0,
        isMaxLevel: true,
      });
    }

    const currentIndex = allRules.findIndex(r => r.levelId === currentLevel.levelId);
    const nextLevel = currentIndex < allRules.length - 1 ? allRules[currentIndex + 1] : null;

    // 计算进度百分比
    let progress = 100;
    if (nextLevel) {
      const levelRange = currentLevel.maxGrowth - currentLevel.minGrowth;
      const userProgress = user.growthValue - currentLevel.minGrowth;
      progress = levelRange > 0 ? Math.min(100, Math.floor((userProgress / levelRange) * 100)) : 0;
    }

    success(res, {
      currentGrowth: user.growthValue,
      currentLevel: {
        levelId: currentLevel.levelId,
        name: currentLevel.name,
        icon: currentLevel.icon,
        color: currentLevel.color,
        minGrowth: currentLevel.minGrowth,
        maxGrowth: currentLevel.maxGrowth,
      },
      nextLevel: nextLevel ? {
        levelId: nextLevel.levelId,
        name: nextLevel.name,
        icon: nextLevel.icon,
        color: nextLevel.color,
        minGrowth: nextLevel.minGrowth,
        needGrowth: nextLevel.minGrowth - user.growthValue,
      } : null,
      progress,
      isMaxLevel: !nextLevel,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/level/history - 获取等级变动历史
router.get('/history', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;

    const logs = await LevelChangeLog.findByUserId(req.user!.userId);

    // 手动分页
    const total = logs.length;
    const start = (Number(page) - 1) * Number(pageSize);
    const end = start + Number(pageSize);
    const paginatedLogs = logs.slice(start, end);

    const formattedLogs = paginatedLogs.map(log => ({
      logId: log.logId,
      beforeLevel: {
        levelId: log.beforeLevelId,
        name: log.beforeLevelName,
      },
      afterLevel: {
        levelId: log.afterLevelId,
        name: log.afterLevelName,
      },
      changeType: log.changeType,
      reason: log.reason,
      createdAt: log.createdAt,
    }));

    paginated(res, formattedLogs, total, Number(page), Number(pageSize));
  } catch (err) {
    next(err);
  }
});

export default router;
