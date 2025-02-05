import { useState, useEffect } from "react";
import { StockChart } from "@/components/StockChart";
import { StockSearch } from "@/components/StockSearch";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { FundamentalCharts } from "@/components/FundamentalCharts";
import { useSearchParams } from "react-router-dom";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTimestamp, setSearchTimestamp] = useState<number>(Date.now());
  const currentSymbol = searchParams.get('symbol');

  const { data: fundamentalCheck } = useQuery({
    queryKey: ['fundamentalCheck'],
    queryFn: async () => {
      const { data: fundamentalData, error: fundamentalError } = await supabase
        .from('fundamental_data')
        .select('symbol, revenue, gross_margin')
        .not('revenue', 'is', null)
        .limit(5);

      if (fundamentalError) throw fundamentalError;
      console.log('Sample of fundamental data:', fundamentalData);
      return fundamentalData;
    }
  });

  const { data: stockData, isLoading, error } = useQuery({
    queryKey: ['stockData', currentSymbol, searchTimestamp],
    queryFn: async () => {
      if (!currentSymbol) return null;
      console.log('Fetching data for symbol:', currentSymbol, 'at timestamp:', searchTimestamp);

      // Get ALL price data without any limit
      const { data: priceData, error: priceError } = await supabase
        .from('stock_data')
        .select('*')
        .eq('symbol', currentSymbol)
        .order('date', { ascending: true });

      if (priceError) throw priceError;
      
      // Log the date range of the price data
      if (priceData && priceData.length > 0) {
        console.log('Price data range:', {
          first: priceData[0].date,
          last: priceData[priceData.length - 1].date,
          total: priceData.length
        });
      }

      // Fetch fundamental data
      const response = await supabase.functions.invoke('fetchStockData', {
        body: { symbol: currentSymbol }
      });

      if (response.error) throw new Error(response.error.message);
      
      const combinedData = {
        fundamentalData: response.data.fundamentalData || [],
        priceData: priceData || []
      };
      
      console.log('Combined data:', {
        fundamentalDataCount: combinedData.fundamentalData.length,
        priceDataCount: combinedData.priceData.length,
        priceDataRange: priceData && priceData.length > 0 ? {
          first: priceData[0].date,
          last: priceData[priceData.length - 1].date
        } : null
      });

      return combinedData;
    },
    enabled: !!currentSymbol
  });

  const handleSearch = (symbol: string) => {
    console.log("Searching for symbol:", symbol);
    setSearchParams({ symbol: symbol });
    setSearchTimestamp(Date.now());
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Stock Analysis Dashboard</h1>
          <StockSearch onSearch={handleSearch} initialSymbol={currentSymbol || ''} />
        </div>

        {fundamentalCheck && fundamentalCheck.length > 0 && (
          <Alert>
            <AlertDescription>
              Found {fundamentalCheck.length} stocks with fundamental data. 
              Sample: {fundamentalCheck.map(d => d.symbol).join(', ')}
            </AlertDescription>
          </Alert>
        )}

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
              <FundamentalCharts data={stockData} symbol={currentSymbol} />
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