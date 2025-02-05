import { StockChart } from './StockChart';

interface FundamentalChartsProps {
  data: any[];
  symbol: string;
}

export const FundamentalCharts = ({ data, symbol }: FundamentalChartsProps) => {
  // Filter out entries without revenue data and sort by date
  const dataWithRevenue = data
    .filter(item => item.revenue != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  console.log('Data received in FundamentalCharts:', data);
  console.log('Filtered data with revenue:', dataWithRevenue);

  return (
    <div className="space-y-6">
      <StockChart
        data={dataWithRevenue}
        title="Quarterly Revenue (Millions USD)"
        dataKey="revenue"
        height={400}
        color="#0891b2"
      />
    </div>
  );
};