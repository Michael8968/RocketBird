import { Router } from 'express';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import memberRoutes from './member.routes';
import levelRoutes from './level.routes';
import pointsRoutes from './points.routes';
import checkinRoutes from './checkin.routes';
import benefitsRoutes from './benefits.routes';
import mealsRoutes from './meals.routes';
import referralRoutes from './referral.routes';
import feedbackRoutes from './feedback.routes';
import brandRoutes from './brand.routes';
import accountRoutes from './account.routes';
import roleRoutes from './role.routes';
import logRoutes from './log.routes';

const router = Router();

// 管理后台路由
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/members', memberRoutes);
router.use('/levels', levelRoutes);
router.use('/points', pointsRoutes);
router.use('/checkin', checkinRoutes);
router.use('/benefits', benefitsRoutes);
router.use('/meals', mealsRoutes);
router.use('/referral', referralRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/brand', brandRoutes);
router.use('/accounts', accountRoutes);
router.use('/roles', roleRoutes);
router.use('/logs', logRoutes);

export default router;
