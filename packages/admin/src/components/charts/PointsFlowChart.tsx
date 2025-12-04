import { Column } from '@ant-design/charts';

export interface PointsFlowData {
  date: string;
  earned: number;
  consumed: number;
}

interface PointsFlowChartProps {
  data: PointsFlowData[];
  loading?: boolean;
}

const PointsFlowChart: React.FC<PointsFlowChartProps> = ({ data, loading }) => {
  // 转换数据为分组柱状图格式
  const chartData = data.flatMap((item) => [
    { date: item.date, type: '发放', value: item.earned },
    { date: item.date, type: '消耗', value: item.consumed },
  ]);

  const config = {
    data: chartData,
    xField: 'date',
    yField: 'value',
    colorField: 'type',
    group: true,
    loading,
    height: 240,
    style: {
      radiusTopLeft: 4,
      radiusTopRight: 4,
    },
    scale: {
      color: {
        range: ['#52c41a', '#ff6b35'],
      },
    },
    axis: {
      x: {
        labelFormatter: (val: string) => val.slice(5),
        labelAutoRotate: false,
      },
      y: {
        title: '积分数',
        labelFormatter: (val: number) => `${val}`,
      },
    },
    tooltip: {
      title: (d: { date: string }) => d.date,
      items: [{ channel: 'y', name: (d: { type: string }) => d.type }],
    },
    legend: {
      color: {
        position: 'bottom',
        layout: {
          justifyContent: 'center',
        },
      },
    },
  };

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: 240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
        }}
      >
        暂无数据
      </div>
    );
  }

  return <Column {...config} />;
};

export default PointsFlowChart;
