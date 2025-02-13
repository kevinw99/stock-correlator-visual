import { Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from './ui/card';
import { format } from 'date-fns';

interface BarChartProps {
  data: any[];
  title: string;
  dataKey: string;
  height?: number;
  color?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  globalDateRange?: {
    start: Date;
    end: Date;
  };
}

export const BarChart = ({ 
  data, 
  title, 
  dataKey, 
  height = 300, 
  color = "#2563eb",
  dateRange,
  globalDateRange
}: BarChartProps) => {
  console.log('BarChart received data:', data);
  console.log('Date range:', dateRange);
  console.log('Global date range:', globalDateRange);
  
  // Format revenue values to billions or millions
  const formattedData = data.map(item => {
    const revenue = Number(item[dataKey]);
    
    // Use billions if revenue is over 1B, otherwise use millions
    const divisor = revenue >= 1000000000 ? 1000000000 : 1000000;
    const unitLabel = revenue >= 1000000000 ? 'B' : 'M';
    
    return {
      ...item,
      [dataKey]: revenue ? Number((revenue / divisor).toFixed(2)) : null,
      date: new Date(item.date)
    };
  });

  // Use the global date range for the domain if provided, otherwise use the local date range
  const domain = globalDateRange ? 
    [globalDateRange.start.getTime(), globalDateRange.end.getTime()] : 
    dateRange ? 
      [dateRange.start.getTime(), dateRange.end.getTime()] :
      [
        Math.min(...formattedData.map(d => d.date.getTime())),
        Math.max(...formattedData.map(d => d.date.getTime()))
      ];
  
  console.log('Calculated X-axis domain:', domain);

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart 
          data={formattedData} 
          margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
        >
          <XAxis 
            dataKey="date"
            domain={domain}
            type="number"
            scale="time"
            tickFormatter={(value) => format(new Date(value), 'yyyy-MM-dd')}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tickFormatter={(value) => `$${value}${value >= 1 ? 'B' : 'M'}`}
          />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{ 
              background: 'white', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px',
              padding: '8px'
            }}
            formatter={(value: number) => [`$${value}${value >= 1 ? 'B' : 'M'}`, 'Revenue']}
            labelFormatter={(label) => format(new Date(label), 'yyyy-MM-dd')}
          />
          <Bar
            dataKey={dataKey}
            fill={color}
            radius={[4, 4, 0, 0]}
            barSize={10}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </Card>
  );
};