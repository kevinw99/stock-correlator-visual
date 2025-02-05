import { BarChart } from './BarChart';

interface FundamentalChartsProps {
  data: {
    fundamentalData?: any[];
    priceData?: any[];
  };
  symbol: string;
}

export const FundamentalCharts = ({ data, symbol }: FundamentalChartsProps) => {
  console.log('Raw data received in FundamentalCharts:', data);

  // Check if fundamentalData exists and is an array
  if (!data.fundamentalData || !Array.isArray(data.fundamentalData)) {
    console.log('No fundamental data available or invalid format');
    return null;
  }

  // Filter and sort data
  const quarterlyData = data.fundamentalData
    .filter(item => {
      console.log('Processing item:', item);
      const hasRevenue = item.revenue != null;
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
    label: `Q${item.quarter} ${item.fiscal_year}`,
    revenue: Number(item.revenue) // Ensure revenue is a number
  }));

  console.log('Final formatted data:', formattedData);

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