import { BarChart } from './BarChart';

interface FundamentalChartsProps {
  data: any[];
  symbol: string;
}

export const FundamentalCharts = ({ data, symbol }: FundamentalChartsProps) => {
  console.log('Raw data received in FundamentalCharts:', data);
  console.log('Symbol:', symbol);

  // Helper function to determine quarter from date
  const getQuarterFromDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth();
    // Convert month (0-11) to quarter (1-4)
    return Math.floor(month / 3) + 1;
  };

  // Helper function to get fiscal year from date
  const getFiscalYearFromDate = (dateString: string) => {
    return new Date(dateString).getFullYear();
  };

  // Filter and sort data
  const dataWithQuarters = data
    .filter(item => {
      console.log('Processing item:', item);
      const hasRevenue = item.revenue != null && item.revenue !== 0;
      const hasDate = item.date != null;
      
      // Skip annual reports (typically much larger revenue numbers)
      const isQuarterlyReport = item.revenue < 200000000000; // Threshold for quarterly vs annual

      console.log('Item validation:', {
        hasRevenue,
        hasDate,
        isQuarterlyReport,
        revenue: item.revenue,
        date: item.date
      });

      return hasRevenue && hasDate && isQuarterlyReport;
    })
    .map(item => ({
      ...item,
      quarter: getQuarterFromDate(item.date),
      fiscal_year: getFiscalYearFromDate(item.date),
      // Convert revenue to billions for display
      revenue: Number((item.revenue / 1000000000).toFixed(2))
    }))
    .sort((a, b) => {
      // Sort by date
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  console.log('Processed quarterly data:', dataWithQuarters);
  console.log('Number of valid quarterly data points:', dataWithQuarters.length);

  // Format data for display
  const formattedData = dataWithQuarters.map(item => ({
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