/**
 * 初始化管理员数据
 * 运行: yarn workspace @rocketbird/server seed:admin
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { config } from '../config';
import { AdminUser, AdminRole } from '../models/admin.model';

async function seedAdmin() {
  try {
    // 连接数据库
    await mongoose.connect(config.database.uri, config.database.options);
    console.log('数据库连接成功');

    // 检查是否已存在超级管理员角色
    let superAdminRole = await AdminRole.findOne({ code: 'super_admin' });

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
    const existingAdmin = await AdminUser.findOne({ username: 'admin' });

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

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seedAdmin();
