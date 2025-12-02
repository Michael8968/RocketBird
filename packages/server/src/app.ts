import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { errorMiddleware } from './middlewares/error.middleware';
import { loggerMiddleware } from './middlewares/logger.middleware';
import routes from './routes';
import { connectDatabase } from './config/database';

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(loggerMiddleware);

// 路由
app.use('/api', routes);

// 错误处理
app.use(errorMiddleware);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务
const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    // 连接数据库
    await connectDatabase();
    console.log('Database connected');

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

export default app;
