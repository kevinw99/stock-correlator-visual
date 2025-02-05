import { BarChart } from './BarChart';

interface FundamentalChartsProps {
  data: any[];
  symbol: string;
}

export const FundamentalCharts = ({ data, symbol }: FundamentalChartsProps) => {
  console.log('Raw data received in FundamentalCharts:', data);
  console.log('Symbol:', symbol);

  // Filter out entries without revenue data and sort by announcement date
  const dataWithRevenue = data
    .filter(item => {
      console.log('Checking item for revenue data:', item);
      const hasRevenue = item.revenue != null;
      const hasQuarter = item.quarter != null && item.quarter > 0 && item.quarter <= 4;
      const hasFiscalYear = item.fiscal_year != null;
      
      console.log('Item validation:', {
        hasRevenue,
        hasQuarter,
        hasFiscalYear,
        revenue: item.revenue,
        quarter: item.quarter,
        fiscalYear: item.fiscal_year
      });

      return hasRevenue && hasQuarter && hasFiscalYear;
    })
    .sort((a, b) => {
      // Sort by fiscal year and quarter
      if (a.fiscal_year !== b.fiscal_year) {
        return a.fiscal_year - b.fiscal_year;
      }
      return a.quarter - b.quarter;
    });

  console.log('Filtered and sorted quarterly data:', dataWithRevenue);
  console.log('Number of valid quarterly data points:', dataWithRevenue.length);

  return (
    <div className="space-y-6">
      <BarChart
        data={dataWithRevenue}
        title={`Quarterly Revenue for ${symbol} (Billions USD)`}
        dataKey="revenue"
        height={400}
        color="#0891b2"
      />
    </div>
  );
};