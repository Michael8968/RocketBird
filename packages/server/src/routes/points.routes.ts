import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { authMiddleware } from '../middlewares/auth.middleware';
import { success, error, paginated } from '../utils/response';
import { User } from '../models/user.model';
import { PointsRecord, PointsProduct, ExchangeOrder, IExchangeOrder } from '../models/points.model';
import { ApiCode } from '@rocketbird/shared';

const router = Router();

// GET /api/points/balance - 获取积分余额
router.get('/balance', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findByUserId(req.user!.userId);
    if (!user) {
      return error(res, ApiCode.NotFound, '用户不存在', 404);
    }

    success(res, {
      totalPoints: user.totalPoints,
      availablePoints: user.availablePoints,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/points/records - 获取积分明细
router.get('/records', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, type } = req.query;

    const query: Record<string, unknown> = { userId: req.user!.userId };
    if (type) {
      query.type = type;
    }

    const result = await PointsRecord.findPaginated(
      query,
      { page: Number(page), pageSize: Number(pageSize) },
      { field: 'createdAt', direction: 'desc' }
    );

    paginated(res, result.list, result.total, result.page, result.pageSize);
  } catch (err) {
    next(err);
  }
});

// GET /api/points/mall/products - 获取积分商城商品列表
router.get('/mall/products', authMiddleware, async (req, res, next) => {
  try {
    const { category } = req.query;

    const products = await PointsProduct.findActiveProducts(category as string | undefined);

    success(res, products);
  } catch (err) {
    next(err);
  }
});

// GET /api/points/mall/products/:productId - 获取商品详情
router.get('/mall/products/:productId', authMiddleware, async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await PointsProduct.findByProductId(productId);
    if (!product) {
      return error(res, ApiCode.NotFound, '商品不存在', 404);
    }

    if (product.status !== 1) {
      return error(res, ApiCode.BadRequest, '商品已下架');
    }

    success(res, product);
  } catch (err) {
    next(err);
  }
});

// POST /api/points/mall/exchange - 积分兑换
router.post('/mall/exchange', authMiddleware, async (req, res, next) => {
  try {
    const { productId, quantity = 1, deliveryInfo } = req.body;

    if (!productId) {
      return error(res, ApiCode.BadRequest, '请选择商品');
    }

    const product = await PointsProduct.findByProductId(productId);
    if (!product) {
      return error(res, ApiCode.NotFound, '商品不存在', 404);
    }

    if (product.status !== 1) {
      return error(res, ApiCode.BadRequest, '商品已下架');
    }

    if (product.stock < quantity) {
      return error(res, ApiCode.BadRequest, '库存不足');
    }

    const user = await User.findByUserId(req.user!.userId);
    if (!user) {
      return error(res, ApiCode.NotFound, '用户不存在', 404);
    }

    const totalPoints = product.pointsCost * quantity;
    if (user.availablePoints < totalPoints) {
      return error(res, ApiCode.BadRequest, '积分不足');
    }

    // 检查限购
    if (product.limitPerUser > 0) {
      const existingOrders = await ExchangeOrder.findByUserId(user.userId);
      const productOrders = existingOrders.filter(o => o.productId === productId && (o.status === 0 || o.status === 1));
      const totalQuantity = productOrders.reduce((sum, o) => sum + o.quantity, 0);
      if (totalQuantity + quantity > product.limitPerUser) {
        return error(res, ApiCode.BadRequest, `该商品每人限兑 ${product.limitPerUser} 份`);
      }
    }

    // 实物商品需要收货地址
    if (product.productType === 'physical' && !deliveryInfo) {
      return error(res, ApiCode.BadRequest, '请填写收货地址');
    }

    // 扣减积分
    await User.updatePoints(user.userId, -totalPoints);

    // 扣减库存
    await PointsProduct.decreaseStock(productId, quantity);

    // 生成兑换码
    const couponCode = product.productType === 'coupon'
      ? `CP${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      : undefined;

    // 计算过期时间
    const expireAt = product.validDays
      ? new Date(Date.now() + product.validDays * 24 * 60 * 60 * 1000)
      : undefined;

    // 创建订单
    const order = await ExchangeOrder.create({
      orderId: uuid(),
      userId: user.userId,
      userPhone: user.phone,
      productId,
      productName: product.name,
      productType: product.productType,
      coverImage: product.coverImage,
      pointsCost: product.pointsCost,
      quantity,
      totalPoints,
      status: 0,
      couponCode,
      expireAt,
      deliveryInfo,
    });

    // 记录积分消费
    await PointsRecord.create({
      recordId: uuid(),
      userId: user.userId,
      type: 'consume',
      points: -totalPoints,
      balance: user.availablePoints - totalPoints,
      source: 'exchange',
      sourceId: order.orderId,
      description: `兑换商品: ${product.name} x${quantity}`,
    });

    success(res, {
      orderId: order.orderId,
      couponCode,
      message: '兑换成功',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/points/mall/orders - 获取兑换订单列表
router.get('/mall/orders', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, status } = req.query;

    const query: Record<string, unknown> = { userId: req.user!.userId };
    if (status !== undefined && status !== '') {
      query.status = Number(status);
    }

    const result = await ExchangeOrder.findPaginated(
      query,
      { page: Number(page), pageSize: Number(pageSize) },
      { field: 'createdAt', direction: 'desc' }
    );

    paginated(res, result.list, result.total, result.page, result.pageSize);
  } catch (err) {
    next(err);
  }
});

// GET /api/points/mall/orders/:orderId - 获取订单详情
router.get('/mall/orders/:orderId', authMiddleware, async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await ExchangeOrder.findByOrderId(orderId);
    if (!order) {
      return error(res, ApiCode.NotFound, '订单不存在', 404);
    }

    if (order.userId !== req.user!.userId) {
      return error(res, ApiCode.Forbidden, '无权查看此订单', 403);
    }

    // 获取商品详情
    const product = await PointsProduct.findByProductId(order.productId);

    success(res, {
      ...order,
      useRules: product?.useRules,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/points/mall/orders/:orderId/use - 核销订单（自助核销）
router.post('/mall/orders/:orderId/use', authMiddleware, async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await ExchangeOrder.findByOrderId(orderId);
    if (!order) {
      return error(res, ApiCode.NotFound, '订单不存在', 404);
    }

    if (order.userId !== req.user!.userId) {
      return error(res, ApiCode.Forbidden, '无权操作此订单', 403);
    }

    if (order.status !== 0) {
      const statusText: Record<number, string> = {
        1: '已使用',
        2: '已过期',
        3: '已取消',
      };
      return error(res, ApiCode.BadRequest, `订单${statusText[order.status] || '状态异常'}，无法核销`);
    }

    // 检查是否过期
    if (order.expireAt && new Date() > new Date(order.expireAt)) {
      await ExchangeOrder.updateStatus(orderId, 2);
      return error(res, ApiCode.BadRequest, '订单已过期');
    }

    // 更新订单状态
    if (order._id) {
      await ExchangeOrder.updateById(order._id, {
        status: 1,
        usedAt: new Date(),
      } as Partial<IExchangeOrder>);
    }

    success(res, { message: '核销成功' });
  } catch (err) {
    next(err);
  }
});

// POST /api/points/mall/orders/:orderId/cancel - 取消订单
router.post('/mall/orders/:orderId/cancel', authMiddleware, async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await ExchangeOrder.findByOrderId(orderId);
    if (!order) {
      return error(res, ApiCode.NotFound, '订单不存在', 404);
    }

    if (order.userId !== req.user!.userId) {
      return error(res, ApiCode.Forbidden, '无权操作此订单', 403);
    }

    if (order.status !== 0) {
      return error(res, ApiCode.BadRequest, '只能取消待使用的订单');
    }

    // 退还积分
    const user = await User.findByUserId(req.user!.userId);
    if (user) {
      await User.updatePoints(user.userId, order.totalPoints);

      // 记录积分退还
      await PointsRecord.create({
        recordId: uuid(),
        userId: user.userId,
        type: 'earn',
        points: order.totalPoints,
        balance: user.availablePoints + order.totalPoints,
        source: 'refund',
        sourceId: orderId,
        description: `取消订单退还积分: ${order.productName}`,
      });
    }

    // 恢复库存
    const product = await PointsProduct.findByProductId(order.productId);
    if (product && product._id) {
      await PointsProduct.updateById(product._id, {
        stock: product.stock + order.quantity,
      });
    }

    // 更新订单状态
    await ExchangeOrder.updateStatus(orderId, 3);

    success(res, { message: '订单已取消' });
  } catch (err) {
    next(err);
  }
});

export default router;
