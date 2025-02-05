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
  // Format revenue values to billions
  const formattedData = data.map(item => ({
    ...item,
    revenue: item.revenue ? Number((item.revenue / 1000000000).toFixed(2)) : null,
    reportType: `Q${item.quarter} ${item.fiscal_year}`
  }));

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <XAxis 
            dataKey={item => item.announcement_date || item.date}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.toLocaleDateString('en-US', { 
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}`;
            }}
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
            labelFormatter={(value) => {
              const date = new Date(value);
              return `Report Date: ${date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}`;
            }}
            formatter={(value: number, name: string, props: any) => {
              const item = props.payload;
              return [
                `$${value.toFixed(2)}B`, 
                `Revenue (${item.reportType})`
              ];
            }}
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