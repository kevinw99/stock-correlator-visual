import { StockChart } from './StockChart';
import { Card } from './ui/card';

interface FundamentalChartsProps {
  data: any[];
  symbol: string;
}

export const FundamentalCharts = ({ data, symbol }: FundamentalChartsProps) => {
  // Calculate TTM Revenue
  const calculateTTM = (data: any[]) => {
    return data.map((item, index, arr) => {
      if (index < 3) return { ...item, ttmRevenue: null };
      const ttmRevenue = arr
        .slice(index - 3, index + 1)
        .reduce((sum, curr) => sum + (curr.revenue || 0), 0);
      return { ...item, ttmRevenue };
    });
  };

  // Calculate YoY Growth
  const calculateYoYGrowth = (data: any[]) => {
    return data.map((item, index, arr) => {
      if (index < 4) return { ...item, yoyGrowth: null };
      const previousYearRevenue = arr[index - 4]?.revenue;
      if (!previousYearRevenue || !item.revenue) return { ...item, yoyGrowth: null };
      const yoyGrowth = ((item.revenue - previousYearRevenue) / previousYearRevenue) * 100;
      return { ...item, yoyGrowth };
    });
  };

  const dataWithCalculations = calculateYoYGrowth(calculateTTM(data));

  return (
    <div className="space-y-6">
      <StockChart
        data={dataWithCalculations}
        title="Trailing 12 Months Revenue"
        dataKey="ttmRevenue"
        height={400}
        color="#2563eb"
      />
      <div className="grid md:grid-cols-2 gap-6">
        <StockChart
          data={dataWithCalculations}
          title="Quarterly Revenue"
          dataKey="revenue"
          color="#0891b2"
        />
        <StockChart
          data={dataWithCalculations}
          title="Year-over-Year Growth (%)"
          dataKey="yoyGrowth"
          color="#059669"
        />
      </div>
    </div>
  );
};