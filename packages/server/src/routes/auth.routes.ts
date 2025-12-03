import { Router } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { authMiddleware } from '../middlewares/auth.middleware';
import { success, error } from '../utils/response';
import { User, IUser } from '../models/user.model';
import { LevelRule } from '../models/level.model';
import { InviteRecord } from '../models/referral.model';
import { PointsRecord } from '../models/points.model';
import { config } from '../config';
import { ApiCode } from '@rocketbird/shared';

const router = Router();

// 验证码缓存 (生产环境应使用 Redis)
const smsCodeCache = new Map<string, { code: string; expireAt: number }>();

// 生成邀请码
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 生成 JWT Token
function generateToken(user: IUser): string {
  const signOptions: SignOptions = {
    expiresIn: config.jwt.accessTokenExpire as SignOptions['expiresIn'],
  };
  return jwt.sign(
    { userId: user.userId, phone: user.phone || '' },
    config.jwt.secret,
    signOptions
  );
}

// POST /api/auth/wechat-login - 微信登录
router.post('/wechat-login', async (req, res, next) => {
  try {
    const { code, userInfo, inviteCode } = req.body;

    if (!code) {
      return error(res, ApiCode.BadRequest, '缺少微信授权码');
    }

    // 调用微信 API 获取 openId (生产环境需要实现)
    // const wxResult = await getWechatOpenId(code);
    // 这里模拟获取 openId
    const openId = `wx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 查找用户
    let user = await User.findByOpenId(openId);

    if (!user) {
      // 新用户注册
      const defaultLevel = await LevelRule.findByGrowthValue(0);

      user = await User.create({
        userId: uuid(),
        openId,
        nickname: userInfo?.nickName || '微信用户',
        avatar: userInfo?.avatarUrl || '',
        gender: userInfo?.gender || 0,
        levelId: defaultLevel?.levelId || '',
        levelName: defaultLevel?.name || '普通会员',
        growthValue: 0,
        totalPoints: 0,
        availablePoints: 0,
        inviteCode: generateInviteCode(),
        invitedBy: inviteCode || undefined,
        registerSource: 'wechat',
        status: 1,
        lastLoginAt: new Date(),
      });

      // 处理邀请奖励
      if (inviteCode) {
        const inviter = await User.findByInviteCode(inviteCode);
        if (inviter) {
          // 记录邀请关系
          await InviteRecord.create({
            recordId: uuid(),
            inviterId: inviter.userId,
            inviterNickname: inviter.nickname,
            inviteeId: user.userId,
            inviteeNickname: user.nickname,
            inviteCode,
            rewardPoints: 100,
            status: 1,
          });

          // 给邀请人增加积分
          await User.updatePoints(inviter.userId, 100);
          await PointsRecord.create({
            recordId: uuid(),
            userId: inviter.userId,
            type: 'earn',
            points: 100,
            balance: inviter.availablePoints + 100,
            source: 'referral',
            sourceId: user.userId,
            description: `邀请新用户 ${user.nickname} 注册`,
          });
        }
      }
    } else {
      // 更新登录时间
      await User.updateLastLogin(user.userId);
    }

    const token = generateToken(user);

    success(res, {
      token,
      userInfo: {
        userId: user.userId,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
        levelId: user.levelId,
        levelName: user.levelName,
        growthValue: user.growthValue,
        availablePoints: user.availablePoints,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/send-sms - 发送短信验证码
router.post('/send-sms', async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return error(res, ApiCode.BadRequest, '请输入正确的手机号');
    }

    // 检查发送频率限制
    const cached = smsCodeCache.get(phone);
    if (cached && Date.now() - (cached.expireAt - 5 * 60 * 1000) < 60 * 1000) {
      return error(res, ApiCode.BadRequest, '请求过于频繁，请稍后再试');
    }

    // 生成验证码
    const code = config.env === 'development' ? '123456' : String(Math.floor(100000 + Math.random() * 900000));

    // 存储验证码 (5分钟有效)
    smsCodeCache.set(phone, {
      code,
      expireAt: Date.now() + 5 * 60 * 1000,
    });

    // 生产环境发送短信 (需要实现短信服务)
    // if (config.env === 'production') {
    //   await sendSms(phone, code);
    // }

    success(res, { message: '验证码已发送' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/sms-login - 短信登录
router.post('/sms-login', async (req, res, next) => {
  try {
    const { phone, code, inviteCode } = req.body;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return error(res, ApiCode.BadRequest, '请输入正确的手机号');
    }

    if (!code) {
      return error(res, ApiCode.BadRequest, '请输入验证码');
    }

    // 验证验证码
    const cached = smsCodeCache.get(phone);
    if (!cached || cached.code !== code || Date.now() > cached.expireAt) {
      return error(res, ApiCode.BadRequest, '验证码错误或已过期');
    }

    // 清除已使用的验证码
    smsCodeCache.delete(phone);

    // 查找用户
    let user = await User.findByPhone(phone);
    let isNewUser = false;

    if (!user) {
      // 新用户注册
      isNewUser = true;
      const defaultLevel = await LevelRule.findByGrowthValue(0);

      user = await User.create({
        userId: uuid(),
        openId: `phone_${phone}`,
        phone,
        nickname: `用户${phone.slice(-4)}`,
        avatar: '',
        gender: 0,
        levelId: defaultLevel?.levelId || '',
        levelName: defaultLevel?.name || '普通会员',
        growthValue: 0,
        totalPoints: 0,
        availablePoints: 0,
        inviteCode: generateInviteCode(),
        invitedBy: inviteCode || undefined,
        registerSource: 'sms',
        status: 1,
        lastLoginAt: new Date(),
      });

      // 处理邀请奖励
      if (inviteCode) {
        const inviter = await User.findByInviteCode(inviteCode);
        if (inviter) {
          await InviteRecord.create({
            recordId: uuid(),
            inviterId: inviter.userId,
            inviterNickname: inviter.nickname,
            inviteeId: user.userId,
            inviteeNickname: user.nickname,
            inviteePhone: phone,
            inviteCode,
            rewardPoints: 100,
            status: 1,
          });

          await User.updatePoints(inviter.userId, 100);
          await PointsRecord.create({
            recordId: uuid(),
            userId: inviter.userId,
            type: 'earn',
            points: 100,
            balance: inviter.availablePoints + 100,
            source: 'referral',
            sourceId: user.userId,
            description: `邀请新用户 ${user.nickname} 注册`,
          });
        }
      }
    } else {
      // 检查账号状态
      if (user.status !== 1) {
        return error(res, ApiCode.Forbidden, '账号已被禁用', 403);
      }
      await User.updateLastLogin(user.userId);
    }

    const token = generateToken(user);

    success(res, {
      token,
      isNewUser,
      userInfo: {
        userId: user.userId,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
        levelId: user.levelId,
        levelName: user.levelName,
        growthValue: user.growthValue,
        availablePoints: user.availablePoints,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/profile - 获取用户信息
router.get('/profile', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findByUserId(req.user!.userId);
    if (!user) {
      return error(res, ApiCode.NotFound, '用户不存在', 404);
    }

    success(res, {
      userId: user.userId,
      nickname: user.nickname,
      avatar: user.avatar,
      phone: user.phone,
      gender: user.gender,
      birthday: user.birthday,
      province: user.province,
      city: user.city,
      levelId: user.levelId,
      levelName: user.levelName,
      growthValue: user.growthValue,
      totalPoints: user.totalPoints,
      availablePoints: user.availablePoints,
      inviteCode: user.inviteCode,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/profile - 更新用户信息
router.put('/profile', authMiddleware, async (req, res, next) => {
  try {
    const { nickname, avatar, gender, birthday, province, city } = req.body;

    const user = await User.findByUserId(req.user!.userId);
    if (!user) {
      return error(res, ApiCode.NotFound, '用户不存在', 404);
    }

    const updateData: Partial<IUser> = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (gender !== undefined) updateData.gender = gender;
    if (birthday !== undefined) updateData.birthday = new Date(birthday);
    if (province !== undefined) updateData.province = province;
    if (city !== undefined) updateData.city = city;

    await User.updateById(user._id!, updateData);

    success(res, { message: '更新成功' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/bindPhone - 绑定手机号
router.put('/bindPhone', authMiddleware, async (req, res, next) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return error(res, ApiCode.BadRequest, '请输入正确的手机号');
    }

    // 验证验证码
    const cached = smsCodeCache.get(phone);
    if (!cached || cached.code !== code || Date.now() > cached.expireAt) {
      return error(res, ApiCode.BadRequest, '验证码错误或已过期');
    }

    // 检查手机号是否已被使用
    const existingUser = await User.findByPhone(phone);
    if (existingUser && existingUser.userId !== req.user!.userId) {
      return error(res, ApiCode.BadRequest, '该手机号已被其他账号绑定');
    }

    const user = await User.findByUserId(req.user!.userId);
    if (!user) {
      return error(res, ApiCode.NotFound, '用户不存在', 404);
    }

    await User.updateById(user._id!, { phone });
    smsCodeCache.delete(phone);

    success(res, { message: '绑定成功' });
  } catch (err) {
    next(err);
  }
});

export default router;
