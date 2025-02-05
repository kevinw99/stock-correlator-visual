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
}

export const BarChart = ({ 
  data, 
  title, 
  dataKey, 
  height = 300, 
  color = "#2563eb",
  dateRange 
}: BarChartProps) => {
  console.log('BarChart received data:', data);
  
  // Determine the appropriate unit based on the maximum revenue
  const maxRevenue = Math.max(...data.map(item => Number(item.revenue) || 0));
  const useMillions = maxRevenue < 1000000000; // Use millions if max revenue is less than 1B
  const divisor = useMillions ? 1000000 : 1000000000;
  const unitLabel = useMillions ? 'M' : 'B';
  
  // Format revenue values to billions or millions
  const formattedData = data.map(item => {
    const formatted = {
      ...item,
      revenue: Number(item.revenue) ? Number((Number(item.revenue) / divisor).toFixed(2)) : null,
      date: new Date(item.date),
      announcement_date: item.announcement_date ? new Date(item.announcement_date) : null
    };
    console.log('Formatted chart item:', formatted);
    return formatted;
  });

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
            domain={dateRange ? [dateRange.start.getTime(), dateRange.end.getTime()] : ['auto', 'auto']}
            type="number"
            scale="time"
            tickFormatter={(value) => format(new Date(value), 'yyyy-MM-dd')}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tickFormatter={(value) => `${value.toFixed(1)}${unitLabel}`}
          />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{ 
              background: 'white', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px',
              padding: '8px'
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}${unitLabel}`, 'Revenue']}
            labelFormatter={(label) => {
              const item = formattedData.find(d => d.date.getTime() === new Date(label).getTime());
              return item ? `Date: ${format(new Date(label), 'yyyy-MM-dd')}\nAnnouncement: ${format(item.announcement_date, 'yyyy-MM-dd')}` : '';
            }}
          />
          <Bar
            dataKey={dataKey}
            fill={color}
            radius={[4, 4, 0, 0]}
            barSize={10} // Make bars narrower
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </Card>
  );
};