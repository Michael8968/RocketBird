import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.middleware';
import { success, error, paginated } from '../utils/response';
import { MealCategory, FitnessMeal, MealFavorite } from '../models/meals.model';
import { ApiCode } from '@rocketbird/shared';

const router = Router();

// GET /api/meals/categories - 获取分类列表
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await MealCategory.findActiveCategories();
    success(res, categories);
  } catch (err) {
    next(err);
  }
});

// GET /api/meals/recommended - 获取推荐健身餐 (放在 /:mealId 之前)
router.get('/recommended', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const meals = await FitnessMeal.findRecommended();
    success(res, meals.slice(0, Number(limit)));
  } catch (err) {
    next(err);
  }
});

// GET /api/meals/user/favorites - 获取我的收藏 (放在 /:mealId 之前)
router.get('/user/favorites', authMiddleware, async (req, res, next) => {
  try {
    const favorites = await MealFavorite.findByUserId(req.user!.userId);

    // 获取收藏的健身餐详情
    const meals = await Promise.all(
      favorites.map(async (fav) => {
        const meal = await FitnessMeal.findByMealId(fav.mealId);
        return meal ? { ...meal, favoriteId: fav.favoriteId, favoritedAt: fav.createdAt } : null;
      })
    );

    success(res, meals.filter(Boolean));
  } catch (err) {
    next(err);
  }
});

// GET /api/meals/list - 获取健身餐列表
router.get('/list', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, categoryId, keyword, difficulty, tag } = req.query;

    const query: Record<string, unknown> = { status: 1 };

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (difficulty) {
      query.difficulty = Number(difficulty);
    }

    if (tag) {
      query.tags = tag;
    }

    // 关键字搜索需要在应用层处理
    let result = await FitnessMeal.findPaginated(
      query,
      { page: Number(page), pageSize: Number(pageSize) },
      { field: 'sortOrder', direction: 'asc' }
    );

    // 如果有关键字，在应用层过滤
    if (keyword) {
      const kw = (keyword as string).toLowerCase();
      result.list = result.list.filter(
        meal => meal.name.toLowerCase().includes(kw) || meal.description.toLowerCase().includes(kw)
      );
      result.total = result.list.length;
    }

    // 如果用户已登录，标记收藏状态
    if (req.user) {
      const favorites = await MealFavorite.findByUserId(req.user.userId);
      const favoriteMealIds = new Set(favorites.map(f => f.mealId));
      result.list = result.list.map(meal => ({
        ...meal,
        isFavorited: favoriteMealIds.has(meal.mealId),
      }));
    }

    paginated(res, result.list, result.total, result.page, result.pageSize);
  } catch (err) {
    next(err);
  }
});

// GET /api/meals/:mealId - 获取健身餐详情
router.get('/:mealId', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const { mealId } = req.params;

    const meal = await FitnessMeal.findByMealId(mealId);
    if (!meal) {
      return error(res, ApiCode.NotFound, '健身餐不存在', 404);
    }

    if (meal.status !== 1) {
      return error(res, ApiCode.NotFound, '健身餐已下架', 404);
    }

    // 增加浏览量
    await FitnessMeal.incrementViewCount(mealId);

    // 获取分类信息
    const category = await MealCategory.findByCategoryId(meal.categoryId);

    // 检查是否已收藏
    let isFavorited = false;
    if (req.user) {
      const favorite = await MealFavorite.findByUserAndMeal(req.user.userId, mealId);
      isFavorited = !!favorite;
    }

    success(res, {
      ...meal,
      viewCount: (meal.viewCount || 0) + 1,
      categoryInfo: category,
      isFavorited,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/meals/:mealId/favorite - 收藏健身餐
router.post('/:mealId/favorite', authMiddleware, async (req, res, next) => {
  try {
    const { mealId } = req.params;

    const meal = await FitnessMeal.findByMealId(mealId);
    if (!meal) {
      return error(res, ApiCode.NotFound, '健身餐不存在', 404);
    }

    // 检查是否已收藏
    const existing = await MealFavorite.findByUserAndMeal(req.user!.userId, mealId);
    if (existing) {
      return error(res, ApiCode.BadRequest, '已收藏过该健身餐');
    }

    // 创建收藏记录
    await MealFavorite.create({
      favoriteId: uuid(),
      userId: req.user!.userId,
      mealId,
    });

    // 更新收藏数
    await FitnessMeal.updateFavoriteCount(mealId, 1);

    success(res, { message: '收藏成功' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/meals/:mealId/favorite - 取消收藏
router.delete('/:mealId/favorite', authMiddleware, async (req, res, next) => {
  try {
    const { mealId } = req.params;

    const removed = await MealFavorite.removeByUserAndMeal(req.user!.userId, mealId);
    if (!removed) {
      return error(res, ApiCode.NotFound, '未收藏该健身餐', 404);
    }

    // 更新收藏数
    await FitnessMeal.updateFavoriteCount(mealId, -1);

    success(res, { message: '取消收藏成功' });
  } catch (err) {
    next(err);
  }
});

export default router;
