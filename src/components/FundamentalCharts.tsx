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

  // Get the full date range for price data
  const priceDataRange = data.priceData && data.priceData.length > 0 ? {
    start: new Date(Math.min(...data.priceData.map(d => new Date(d.date).getTime()))),
    end: new Date(Math.max(...data.priceData.map(d => new Date(d.date).getTime())))
  } : null;

  console.log('Price data range:', priceDataRange);

  // Format quarterly data and get its date range
  const formattedQuarterlyData = data.fundamentalData
    .filter(item => {
      const hasRevenue = item.revenue != null;
      const hasQuarter = item.quarter != null;
      const hasYear = item.fiscal_year != null;
      const hasDate = item.date != null;
      return hasRevenue && hasQuarter && hasYear && hasDate;
    })
    .map(item => ({
      ...item,
      revenue: Number(item.revenue),
      date: new Date(item.announcement_date || item.date)
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  console.log('Formatted quarterly data:', formattedQuarterlyData);

  const quarterlyDataRange = formattedQuarterlyData.length > 0 ? {
    start: new Date(Math.min(...formattedQuarterlyData.map(d => d.date.getTime()))),
    end: new Date(Math.max(...formattedQuarterlyData.map(d => d.date.getTime())))
  } : null;

  console.log('Quarterly data range:', quarterlyDataRange);

  // Get the global date range that covers both datasets
  const globalDateRange = {
    start: new Date(Math.min(
      priceDataRange?.start?.getTime() || Infinity,
      quarterlyDataRange?.start?.getTime() || Infinity
    )),
    end: new Date(Math.max(
      priceDataRange?.end?.getTime() || -Infinity,
      quarterlyDataRange?.end?.getTime() || -Infinity
    ))
  };

  console.log('Global date range for alignment:', globalDateRange);

  return (
    <div className="space-y-6">
      {data.priceData && data.priceData.length > 0 && priceDataRange && (
        <StockChart
          data={data.priceData}
          title={`Stock Price History for ${symbol}`}
          dataKey="price"
          height={400}
          color="#0891b2"
          announcementDates={formattedQuarterlyData.map(d => d.date.toISOString())}
          dateRange={priceDataRange}
          globalDateRange={globalDateRange}
        />
      )}
      <BarChart
        data={formattedQuarterlyData}
        title={`Quarterly Revenue for ${symbol}`}
        dataKey="revenue"
        height={400}
        color="#0891b2"
        dateRange={quarterlyDataRange}
        globalDateRange={globalDateRange}
      />
    </div>
  );
};