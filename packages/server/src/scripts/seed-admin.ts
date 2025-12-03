/**
 * 初始化管理员数据
 * 运行: yarn workspace @rocketbird/server seed:admin
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 必须在其他模块导入前加载环境变量
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

async function seedAdmin() {
  // 使用动态导入，确保环境变量已加载
  const bcryptModule = await import('bcryptjs');
  const bcrypt = bcryptModule.default;
  const { v4: uuid } = await import('uuid');
  const { connectDatabase } = await import('../config/database');
  const { AdminUser, AdminRole } = await import('../models/admin.model');

  try {
    // 初始化 TCB
    await connectDatabase();
    console.log('TCB 数据库连接成功');

    // 确保集合存在
    await AdminRole.ensureCollection();
    await AdminUser.ensureCollection();

    // 检查是否已存在超级管理员角色
    let superAdminRole = await AdminRole.findByCode('super_admin');

    if (!superAdminRole) {
      superAdminRole = await AdminRole.create({
        roleId: uuid(),
        name: '超级管理员',
        code: 'super_admin',
        description: '拥有系统所有权限',
        permissions: ['*'], // * 表示所有权限
        isSystem: true,
        status: 1,
      });
      console.log('✅ 超级管理员角色创建成功');
    } else {
      console.log('⏭️  超级管理员角色已存在，跳过');
    }

    // 检查是否已存在 admin 用户
    const existingAdmin = await AdminUser.findByUsername('admin');

    if (!existingAdmin) {
      // 加密密码
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await AdminUser.create({
        adminId: uuid(),
        username: 'admin',
        password: hashedPassword,
        realName: '系统管理员',
        roleId: superAdminRole.roleId,
        roleName: superAdminRole.name,
        status: 1,
      });
      console.log('✅ 默认管理员账号创建成功');
      console.log('');
      console.log('========================================');
      console.log('  默认管理员账号信息:');
      console.log('  用户名: admin');
      console.log('  密码: admin123');
      console.log('========================================');
      console.log('');
      console.log('⚠️  请登录后立即修改密码！');
    } else {
      console.log('⏭️  admin 用户已存在，跳过');
    }

    console.log('');
    console.log('✅ 初始化完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
}

seedAdmin();
