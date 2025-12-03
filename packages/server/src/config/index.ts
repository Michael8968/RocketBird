/**
 * 服务端配置
 * 使用 getter 确保在 dotenv 加载后才读取环境变量
 */

export const config = {
  // 环境
  get env() {
    return process.env.NODE_ENV || 'development';
  },
  get port() {
    return parseInt(process.env.PORT || '3000', 10);
  },

  // JWT
  jwt: {
    get secret() {
      return process.env.JWT_SECRET || 'rocketbird-secret-key';
    },
    get adminSecret() {
      return process.env.JWT_ADMIN_SECRET || 'rocketbird-admin-secret-key';
    },
    accessTokenExpire: '7d',
    refreshTokenExpire: '30d',
  },

  // TCB 云开发
  tcb: {
    get envId() {
      return process.env.TCB_ENV_ID || '';
    },
    get secretId() {
      return process.env.TCB_SECRET_ID || '';
    },
    get secretKey() {
      return process.env.TCB_SECRET_KEY || '';
    },
  },

  // 微信
  wechat: {
    get appId() {
      return process.env.WECHAT_APP_ID || '';
    },
    get appSecret() {
      return process.env.WECHAT_APP_SECRET || '';
    },
  },

  // 短信
  sms: {
    get signName() {
      return process.env.SMS_SIGN_NAME || '';
    },
    get templateId() {
      return process.env.SMS_TEMPLATE_ID || '';
    },
  },
};

export default config;
