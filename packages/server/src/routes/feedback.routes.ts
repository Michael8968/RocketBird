import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { authMiddleware } from '../middlewares/auth.middleware';
import { success, error, paginated } from '../utils/response';
import { User } from '../models/user.model';
import { Feedback } from '../models/feedback.model';
import { ApiCode } from '@rocketbird/shared';

const router = Router();

// 反馈类型配置
const FEEDBACK_TYPES = [
  { value: 'suggestion', label: '功能建议', description: '对产品功能的改进建议' },
  { value: 'bug', label: '问题反馈', description: '使用过程中遇到的问题' },
  { value: 'complaint', label: '投诉', description: '对服务的投诉' },
  { value: 'other', label: '其他', description: '其他类型的反馈' },
];

// GET /api/feedback/types - 获取反馈类型列表 (放在 /:feedbackId 之前)
router.get('/types', async (req, res, next) => {
  try {
    success(res, FEEDBACK_TYPES);
  } catch (err) {
    next(err);
  }
});

// GET /api/feedback/my - 获取我的反馈列表 (放在 /:feedbackId 之前)
router.get('/my', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, status } = req.query;

    const query: Record<string, unknown> = { userId: req.user!.userId };
    if (status !== undefined && status !== '') {
      query.status = Number(status);
    }

    const result = await Feedback.findPaginated(
      query,
      { page: Number(page), pageSize: Number(pageSize) },
      { field: 'createdAt', direction: 'desc' }
    );

    // 添加类型标签
    const listWithLabels = result.list.map(item => ({
      ...item,
      typeLabel: FEEDBACK_TYPES.find(t => t.value === item.type)?.label || item.type,
    }));

    paginated(res, listWithLabels, result.total, result.page, result.pageSize);
  } catch (err) {
    next(err);
  }
});

// POST /api/feedback/submit - 提交意见反馈
router.post('/submit', authMiddleware, async (req, res, next) => {
  try {
    const { type, content, images = [], contact } = req.body;

    if (!type) {
      return error(res, ApiCode.BadRequest, '请选择反馈类型');
    }

    if (!FEEDBACK_TYPES.find(t => t.value === type)) {
      return error(res, ApiCode.BadRequest, '无效的反馈类型');
    }

    if (!content || content.trim().length === 0) {
      return error(res, ApiCode.BadRequest, '请输入反馈内容');
    }

    if (content.length > 1000) {
      return error(res, ApiCode.BadRequest, '反馈内容不能超过1000字');
    }

    if (images.length > 9) {
      return error(res, ApiCode.BadRequest, '最多上传9张图片');
    }

    const user = await User.findByUserId(req.user!.userId);
    if (!user) {
      return error(res, ApiCode.NotFound, '用户不存在', 404);
    }

    const feedback = await Feedback.create({
      feedbackId: uuid(),
      userId: user.userId,
      userNickname: user.nickname,
      userPhone: user.phone,
      type,
      content: content.trim(),
      images,
      contact,
      status: 0, // 待处理
    });

    success(res, {
      feedbackId: feedback.feedbackId,
      message: '提交成功，我们会尽快处理',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/feedback/:feedbackId - 获取反馈详情
router.get('/:feedbackId', authMiddleware, async (req, res, next) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await Feedback.findByFeedbackId(feedbackId);
    if (!feedback) {
      return error(res, ApiCode.NotFound, '反馈不存在', 404);
    }

    if (feedback.userId !== req.user!.userId) {
      return error(res, ApiCode.Forbidden, '无权查看此反馈', 403);
    }

    success(res, {
      ...feedback,
      typeLabel: FEEDBACK_TYPES.find(t => t.value === feedback.type)?.label || feedback.type,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
