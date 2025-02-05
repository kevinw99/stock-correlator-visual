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

  if (!data.fundamentalData || !Array.isArray(data.fundamentalData)) {
    console.log('No fundamental data available or invalid format');
    return null;
  }

  const quarterlyData = data.fundamentalData
    .filter(item => {
      const hasRevenue = item.revenue != null;
      const hasQuarter = item.quarter != null;
      const hasYear = item.fiscal_year != null;
      const hasDate = item.date != null;
      return hasRevenue && hasQuarter && hasYear && hasDate;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Get the full date range from price data
  const dateRange = data.priceData ? {
    start: new Date(data.priceData[0].date),
    end: new Date(data.priceData[data.priceData.length - 1].date)
  } : null;

  const formattedData = quarterlyData.map(item => ({
    ...item,
    revenue: Number(item.revenue)
  }));

  return (
    <div className="space-y-6">
      {data.priceData && data.priceData.length > 0 && dateRange && (
        <StockChart
          data={data.priceData}
          title={`Stock Price History for ${symbol}`}
          dataKey="price"
          height={400}
          color="#0891b2"
          announcementDates={formattedData.map(d => d.announcement_date)}
          dateRange={dateRange}
        />
      )}
      <BarChart
        data={formattedData}
        title={`Quarterly Revenue for ${symbol}`}
        dataKey="revenue"
        height={400}
        color="#0891b2"
        dateRange={dateRange}
      />
    </div>
  );
};