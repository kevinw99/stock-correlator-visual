import { useState } from "react";
import { StockChart } from "@/components/StockChart";
import { StockSearch } from "@/components/StockSearch";

// Mock data - in a real app this would come from an API
const mockData = [
  { date: "2024-01-01", price: 240, revenue: 25.17, margin: 18.2 },
  { date: "2024-01-02", price: 245, revenue: 25.87, margin: 18.5 },
  { date: "2024-01-03", price: 238, revenue: 26.12, margin: 18.1 },
  { date: "2024-01-04", price: 242, revenue: 26.45, margin: 18.7 },
  { date: "2024-01-05", price: 250, revenue: 26.89, margin: 19.2 },
].map(d => ({ ...d, date: new Date(d.date).getTime() }));

const Index = () => {
  const [currentSymbol, setCurrentSymbol] = useState<string | null>(null);

  const handleSearch = (symbol: string) => {
    console.log("Searching for symbol:", symbol);
    setCurrentSymbol(symbol);
    // In a real app, this would fetch data from an API
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Stock Analysis Dashboard</h1>
          <StockSearch onSearch={handleSearch} />
        </div>

        {currentSymbol && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">{currentSymbol} Analysis</h2>
            <div className="space-y-6">
              <StockChart
                data={mockData}
                title="Stock Price"
                dataKey="price"
                height={400}
              />
              <div className="grid md:grid-cols-2 gap-6">
                <StockChart
                  data={mockData}
                  title="Quarterly Revenue"
                  dataKey="revenue"
                  color="#0891b2"
                />
                <StockChart
                  data={mockData}
                  title="Profit Margin"
                  dataKey="margin"
                  color="#059669"
                />
              </div>
            </div>
          </div>
        )}

        {!currentSymbol && (
          <div className="text-center py-12">
            <h2 className="text-xl text-gray-600">
              Enter a stock symbol above to view analysis
            </h2>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;