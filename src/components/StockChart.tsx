import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { Card } from './ui/card';
import { format } from 'date-fns';

interface StockChartProps {
  data: any[];
  title: string;
  dataKey: string;
  height?: number;
  color?: string;
  announcementDates?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  globalDateRange?: {
    start: Date;
    end: Date;
  };
}

export const StockChart = ({ 
  data, 
  title, 
  dataKey, 
  height = 300, 
  color = "#2563eb",
  announcementDates = [],
  dateRange,
  globalDateRange
}: StockChartProps) => {
  console.log('StockChart date range:', dateRange);
  console.log('StockChart global date range:', globalDateRange);

  const formattedData = data.map(item => ({
    ...item,
    date: new Date(item.date)
  }));

  // Use the global date range for the domain if provided, otherwise use the local date range
  const domain = globalDateRange ? 
    [globalDateRange.start.getTime(), globalDateRange.end.getTime()] : 
    dateRange ? 
      [dateRange.start.getTime(), dateRange.end.getTime()] :
      ['auto', 'auto'];

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.1}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date"
            domain={domain}
            type="number"
            scale="time"
            tickFormatter={(value) => format(new Date(value), 'yyyy-MM-dd')}
            minTickGap={50}
          />
          <YAxis />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            labelFormatter={(value) => format(new Date(value), 'yyyy-MM-dd')}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fillOpacity={1}
            fill={`url(#gradient-${dataKey})`}
          />
          {announcementDates.map((date, index) => (
            <ReferenceLine
              key={index}
              x={new Date(date).getTime()}
              stroke="#ff6b6b"
              strokeDasharray="3 3"
              label={{ value: 'ER', position: 'insideTop' }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
};