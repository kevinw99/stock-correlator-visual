import { BarChart } from './BarChart';

interface FundamentalChartsProps {
  data: any[];
  symbol: string;
}

export const FundamentalCharts = ({ data, symbol }: FundamentalChartsProps) => {
  console.log('Raw data received in FundamentalCharts:', data);
  console.log('Symbol:', symbol);

  // Filter and sort data
  const quarterlyData = data
    .filter(item => {
      console.log('Processing item:', item);
      const hasRevenue = item.revenue != null && item.revenue !== 0;
      const hasQuarter = item.quarter != null;
      const hasYear = item.fiscal_year != null;
      
      console.log('Item validation:', {
        hasRevenue,
        hasQuarter,
        hasYear,
        revenue: item.revenue,
        quarter: item.quarter,
        fiscal_year: item.fiscal_year
      });

      return hasRevenue && hasQuarter && hasYear;
    })
    .map(item => ({
      ...item,
      // Convert revenue to billions for display
      revenue: Number((item.revenue / 1000000000).toFixed(2))
    }))
    .sort((a, b) => {
      // Sort by fiscal year and quarter
      if (a.fiscal_year !== b.fiscal_year) {
        return a.fiscal_year - b.fiscal_year;
      }
      return a.quarter - b.quarter;
    });

  console.log('Processed quarterly data:', quarterlyData);
  console.log('Number of valid quarterly data points:', quarterlyData.length);

  // Format data for display
  const formattedData = quarterlyData.map(item => ({
    ...item,
    label: `Q${item.quarter} ${item.fiscal_year}`
  }));

  return (
    <div className="space-y-6">
      <BarChart
        data={formattedData}
        title={`Quarterly Revenue for ${symbol} (Billions USD)`}
        dataKey="revenue"
        height={400}
        color="#0891b2"
      />
    </div>
  );
};