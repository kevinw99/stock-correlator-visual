import { Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from './ui/card';

interface BarChartProps {
  data: any[];
  title: string;
  dataKey: string;
  height?: number;
  color?: string;
}

export const BarChart = ({ data, title, dataKey, height = 300, color = "#2563eb" }: BarChartProps) => {
  console.log('BarChart received data:', data);
  
  // Format revenue values to billions
  const formattedData = data.map(item => {
    const formatted = {
      ...item,
      revenue: item.revenue ? Number((item.revenue / 1000000000).toFixed(2)) : null,
      label: `Q${item.quarter} ${item.fiscal_year}`
    };
    console.log('Formatted item:', formatted);
    return formatted;
  });

  console.log('Final formatted data for chart:', formattedData);

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <XAxis 
            dataKey="label"
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tickFormatter={(value) => `${value.toFixed(1)}B`}
          />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{ 
              background: 'white', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px',
              padding: '8px'
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}B`, 'Revenue']}
          />
          <Bar
            dataKey={dataKey}
            fill={color}
            radius={[4, 4, 0, 0]}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </Card>
  );
};