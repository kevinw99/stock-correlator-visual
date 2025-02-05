import { BarChart } from './BarChart';

interface FundamentalChartsProps {
  data: any[];
  symbol: string;
}

export const FundamentalCharts = ({ data, symbol }: FundamentalChartsProps) => {
  console.log('Raw data before filtering:', data);
  console.log('Sample data item:', data[0]);

  // Filter out entries without revenue data and sort by announcement date
  const dataWithRevenue = data
    .filter(item => {
      console.log('Checking item:', item);
      console.log('Quarter value:', item.quarter);
      console.log('Revenue value:', item.revenue);
      
      return item.revenue != null && 
             item.quarter != null && 
             item.quarter > 0 && 
             item.quarter <= 4;
    })
    .sort((a, b) => new Date(a.announcement_date || a.date).getTime() - new Date(b.announcement_date || b.date).getTime());

  console.log('Data received in FundamentalCharts:', data);
  console.log('Filtered quarterly data with revenue:', dataWithRevenue);
  console.log('Number of items after filtering:', dataWithRevenue.length);

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