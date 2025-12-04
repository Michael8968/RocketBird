import { Column } from '@ant-design/charts';

export interface MemberGrowthData {
  date: string;
  count: number;
}

interface MemberGrowthChartProps {
  data: MemberGrowthData[];
  loading?: boolean;
}

const MemberGrowthChart: React.FC<MemberGrowthChartProps> = ({ data, loading }) => {
  const config = {
    data,
    xField: 'date',
    yField: 'count',
    loading,
    height: 240,
    colorField: 'date',
    style: {
      radiusTopLeft: 4,
      radiusTopRight: 4,
      fill: 'linear-gradient(180deg, #1890ff 0%, #69c0ff 100%)',
    },
    axis: {
      x: {
        labelFormatter: (val: string) => val.slice(5),
        labelAutoRotate: false,
      },
      y: {
        title: '新增人数',
        labelFormatter: (val: number) => `${val}`,
      },
    },
    tooltip: {
      title: (d: MemberGrowthData) => d.date,
      items: [{ channel: 'y', name: '新增会员' }],
    },
    interaction: {
      tooltip: {
        render: (_: unknown, { title, items }: { title: string; items: Array<{ name: string; value: number }> }) => {
          return `<div style="padding: 8px">
            <div style="margin-bottom: 4px; color: #666">${title}</div>
            <div style="font-weight: bold">${items[0]?.name}: ${items[0]?.value} 人</div>
          </div>`;
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

export default MemberGrowthChart;
