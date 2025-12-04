import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Avatar, Space, Spin } from 'antd';
import {
  UserOutlined,
  GiftOutlined,
  CheckSquareOutlined,
  RiseOutlined,
  ShoppingOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getDashboardStats,
  getMemberGrowthTrend,
  getLevelDistribution,
  getCheckinRanking,
  getPointsFlow,
  DashboardStats,
  MemberGrowthData,
  LevelDistribution,
  CheckinRanking,
} from '@/services/dashboard';
import {
  MemberGrowthChart,
  PointsFlowChart,
  LevelDistributionChart,
} from '@/components/charts';

// 颜色常量
const COLORS = {
  PRIMARY: '#1890ff',
  SUCCESS: '#52c41a',
  WARNING: '#faad14',
  DANGER: '#ff4d4f',
  ORANGE: '#ff6b35',
  PURPLE: '#722ed1',
  PINK: '#eb2f96',
  CYAN: '#13c2c2',
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [memberGrowth, setMemberGrowth] = useState<MemberGrowthData[]>([]);
  const [levelDistribution, setLevelDistribution] = useState<LevelDistribution[]>([]);
  const [checkinRanking, setCheckinRanking] = useState<CheckinRanking[]>([]);
  const [pointsFlow, setPointsFlow] = useState<Array<{ date: string; earned: number; consumed: number }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, growthData, levelData, rankingData, flowData] = await Promise.all([
          getDashboardStats(),
          getMemberGrowthTrend({ days: 7 }),
          getLevelDistribution(),
          getCheckinRanking({ limit: 10 }),
          getPointsFlow({ days: 7 }),
        ]);
        setStats(statsData);
        setMemberGrowth(growthData);
        setLevelDistribution(levelData);
        setCheckinRanking(rankingData);
        setPointsFlow(flowData);
      } catch (err) {
        console.error('获取仪表盘数据失败', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const rankingColumns: ColumnsType<CheckinRanking> = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_, __, index) => (
        <span
          style={{
            color: index < 3 ? COLORS.ORANGE : undefined,
            fontWeight: index < 3 ? 'bold' : undefined,
          }}
        >
          {index + 1}
        </span>
      ),
    },
    {
      title: '用户',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar src={record.avatar} size="small" icon={<UserOutlined />} />
          <span>{record.nickname}</span>
        </Space>
      ),
    },
    {
      title: '累计打卡',
      dataIndex: 'totalCheckins',
      key: 'totalCheckins',
      render: (val) => `${val} 次`,
    },
    {
      title: '连续打卡',
      dataIndex: 'consecutiveCheckins',
      key: 'consecutiveCheckins',
      render: (val) => `${val} 天`,
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>数据概览</h2>

      {/* 统计卡片 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总会员数"
              value={stats?.members.total || 0}
              prefix={<UserOutlined style={{ color: COLORS.PRIMARY }} />}
              suffix="人"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日新增"
              value={stats?.members.todayNew || 0}
              prefix={<RiseOutlined style={{ color: COLORS.SUCCESS }} />}
              suffix="人"
              valueStyle={{ color: COLORS.SUCCESS }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日打卡"
              value={stats?.checkin.today || 0}
              prefix={<CheckSquareOutlined style={{ color: COLORS.ORANGE }} />}
              suffix="次"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日积分消耗"
              value={stats?.points.todayConsumed || 0}
              prefix={<GiftOutlined style={{ color: COLORS.WARNING }} />}
              suffix="分"
            />
          </Card>
        </Col>
      </Row>

      {/* 额外统计 */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃会员"
              value={stats?.members.active || 0}
              prefix={<UserOutlined style={{ color: COLORS.PURPLE }} />}
              suffix="人"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待审核打卡"
              value={stats?.checkin.pending || 0}
              prefix={<ClockCircleOutlined style={{ color: COLORS.WARNING }} />}
              suffix="条"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待核销订单"
              value={stats?.orders.pending || 0}
              prefix={<ShoppingOutlined style={{ color: COLORS.PINK }} />}
              suffix="单"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="累计积分发放"
              value={stats?.points.totalEarned || 0}
              prefix={<GiftOutlined style={{ color: COLORS.CYAN }} />}
              suffix="分"
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="会员增长趋势 (近7天)">
            <MemberGrowthChart data={memberGrowth} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="积分流动分析 (近7天)">
            <PointsFlowChart data={pointsFlow} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="等级分布">
            <LevelDistributionChart data={levelDistribution} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="打卡排行榜 TOP 10">
            <Table
              columns={rankingColumns}
              dataSource={checkinRanking}
              rowKey="userId"
              pagination={false}
              size="small"
              locale={{ emptyText: '暂无数据' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
