import { useState } from "react";
import { StockChart } from "@/components/StockChart";
import { StockSearch } from "@/components/StockSearch";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [currentSymbol, setCurrentSymbol] = useState<string | null>(null);

  const { data: stockData, isLoading, error } = useQuery({
    queryKey: ['stockData', currentSymbol],
    queryFn: async () => {
      if (!currentSymbol) return null;

      // First, try to fetch from Supabase
      const { data: existingData, error: dbError } = await supabase
        .from('stock_data')
        .select('*')
        .eq('symbol', currentSymbol)
        .order('date', { ascending: true });

      if (dbError) throw dbError;

      // If we have recent data (less than a day old), use it
      if (existingData && existingData.length > 0) {
        const latestDate = new Date(existingData[existingData.length - 1].date);
        const isRecent = (Date.now() - latestDate.getTime()) < 24 * 60 * 60 * 1000;
        
        if (isRecent) {
          console.log('Using cached data from Supabase');
          return existingData;
        }
      }

      // If no recent data, fetch from API
      console.log('Fetching fresh data from API');
      const response = await supabase.functions.invoke('fetchStockData', {
        body: { symbol: currentSymbol }
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    enabled: !!currentSymbol
  });

  const handleSearch = (symbol: string) => {
    console.log("Searching for symbol:", symbol);
    setCurrentSymbol(symbol);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Stock Analysis Dashboard</h1>
          <StockSearch onSearch={handleSearch} />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : 'An error occurred while fetching data'}
            </AlertDescription>
          </Alert>
        )}

        {currentSymbol && stockData && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">{currentSymbol} Analysis</h2>
            <div className="space-y-6">
              <StockChart
                data={stockData}
                title="Stock Price"
                dataKey="price"
                height={400}
              />
              <div className="grid md:grid-cols-2 gap-6">
                <StockChart
                  data={stockData}
                  title="Quarterly Revenue"
                  dataKey="revenue"
                  color="#0891b2"
                />
                <StockChart
                  data={stockData}
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