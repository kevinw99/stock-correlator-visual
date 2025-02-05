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

  // Log the price data to see what we're working with
  console.log('Price data before processing:', data.priceData?.map(d => ({
    date: new Date(d.date),
    timestamp: new Date(d.date).getTime()
  })));

  // Get the full date range from price data, making sure to sort it first
  const dateRange = data.priceData ? {
    start: new Date(Math.min(...data.priceData.map(d => new Date(d.date).getTime()))),
    end: new Date(Math.max(...data.priceData.map(d => new Date(d.date).getTime())))
  } : null;

  console.log('Calculated date range:', dateRange);

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