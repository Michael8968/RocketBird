import { Pie } from '@ant-design/charts';

export interface LevelDistributionData {
  levelId: string;
  levelName: string;
  count: number;
  percentage: number;
}

interface LevelDistributionChartProps {
  data: LevelDistributionData[];
  loading?: boolean;
}

const LevelDistributionChart: React.FC<LevelDistributionChartProps> = ({ data, loading }) => {
  const config = {
    data,
    angleField: 'count',
    colorField: 'levelName',
    loading,
    height: 280,
    innerRadius: 0.5,
    radius: 0.9,
    label: {
      text: 'levelName',
      position: 'outside',
      style: {
        fontSize: 12,
      },
    },
    legend: {
      color: {
        position: 'bottom' as const,
        layout: {
          justifyContent: 'center',
        },
      },
    },
    tooltip: {
      title: (d: LevelDistributionData) => d.levelName,
      items: [
        {
          field: 'count',
          name: '人数',
          valueFormatter: (val: number) => `${val} 人`,
        },
      ],
    },
    interaction: {
      elementHighlight: true,
    },
    annotations: [
      {
        type: 'text',
        style: {
          text: '等级分布',
          x: '50%',
          y: '50%',
          textAlign: 'center',
          fontSize: 14,
          fill: '#666',
        },
      },
    ],
  };

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: 280,
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

  return <Pie {...config} />;
};

export default LevelDistributionChart;
