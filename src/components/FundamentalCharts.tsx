import { BarChart } from './BarChart';
import { StockChart } from './StockChart';

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
      const hasDate = item.date != null;
      
      console.log('Item validation:', {
        hasRevenue,
        hasQuarter,
        hasYear,
        hasDate,
        revenue: item.revenue,
        quarter: item.quarter,
        fiscal_year: item.fiscal_year,
        date: item.date
      });

      return hasRevenue && hasQuarter && hasYear && hasDate;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  console.log('Processed quarterly data:', quarterlyData);
  console.log('Number of valid quarterly data points:', quarterlyData.length);

  // Format data for display
  const formattedData = quarterlyData.map(item => ({
    ...item,
    revenue: Number(item.revenue)
  }));

  console.log('Final formatted data:', formattedData);

  return (
    <div className="space-y-6">
      {data.priceData && data.priceData.length > 0 && (
        <StockChart
          data={data.priceData}
          title={`Stock Price History for ${symbol}`}
          dataKey="price"
          height={400}
          color="#0891b2"
        />
      )}
      <BarChart
        data={formattedData}
        title={`Quarterly Revenue for ${symbol}`}
        dataKey="revenue"
        height={400}
        color="#0891b2"
      />
    </div>
  );
};