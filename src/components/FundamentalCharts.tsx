import { BarChart } from './BarChart';

interface FundamentalChartsProps {
  data: any[];
  symbol: string;
}

export const FundamentalCharts = ({ data, symbol }: FundamentalChartsProps) => {
  // Filter out entries without revenue data and sort by announcement date
  const dataWithRevenue = data
    .filter(item => 
      item.revenue != null && 
      item.quarter != null && 
      item.quarter > 0 && 
      item.quarter <= 4
    )
    .sort((a, b) => new Date(a.announcement_date || a.date).getTime() - new Date(b.announcement_date || b.date).getTime());

  console.log('Data received in FundamentalCharts:', data);
  console.log('Filtered quarterly data with revenue:', dataWithRevenue);

  return (
    <div className="space-y-6">
      <BarChart
        data={dataWithRevenue}
        title="Quarterly Revenue (Billions USD)"
        dataKey="revenue"
        height={400}
        color="#0891b2"
      />
    </div>
  );
};