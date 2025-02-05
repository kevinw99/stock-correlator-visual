import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol } = await req.json();
    console.log('Fetching data for symbol:', symbol);

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
    if (!FMP_API_KEY) {
      throw new Error('FMP_API_KEY not configured');
    }

    // Fetch 5 years of historical price data
    const priceUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?from=${getDateYearsAgo(5)}&apikey=${FMP_API_KEY}`;
    console.log('Fetching price data from:', priceUrl);
    const priceResponse = await fetch(priceUrl);
    const priceData = await priceResponse.json();

    // Check if price data is valid
    if (!priceData.historical || priceData.historical.length === 0) {
      console.error('No price data found for symbol:', symbol);
      throw new Error(`No price data available for symbol: ${symbol}`);
    }

    // Fetch quarterly income statements for revenue data
    const incomeUrl = `https://financialmodelingprep.com/api/v3/income-statement/${symbol}?period=quarter&limit=20&apikey=${FMP_API_KEY}`;
    console.log('Fetching income data from:', incomeUrl);
    const incomeResponse = await fetch(incomeUrl);
    const incomeData = await incomeResponse.json();

    // Check if income data is valid
    if (!Array.isArray(incomeData) || incomeData.length === 0) {
      console.error('No income data found for symbol:', symbol);
      throw new Error(`No income data available for symbol: ${symbol}`);
    }

    // Process and combine the data
    const processedData = priceData.historical
      .map((price: any) => {
        const date = new Date(price.date).getTime();
        // Find matching quarterly data
        const quarterData = incomeData.find((q: any) => {
          const qDate = new Date(q.date).getTime();
          return Math.abs(date - qDate) < 24 * 60 * 60 * 1000; // Within 1 day
        });

        return {
          date,
          price: price.close,
          revenue: quarterData?.revenue || null,
        };
      })
      .reverse(); // Reverse to get chronological order

    // Store data in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Storing data for symbol:', symbol);

    // Insert data into the database
    for (const data of processedData) {
      const { error } = await supabase
        .from('stock_data')
        .upsert({
          symbol,
          date: new Date(data.date).toISOString(),
          price: data.price,
          revenue: data.revenue,
        }, {
          onConflict: 'symbol,date'
        });
      
      if (error) {
        console.error('Error inserting data:', error);
      }
    }

    console.log('Successfully processed and stored data for:', symbol);
    return new Response(JSON.stringify(processedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetchStockData:', error.message);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Please ensure the stock symbol is valid and try again.'
      }), {
      status: 400, // Changed from 500 to 400 for invalid input
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to get date from X years ago
function getDateYearsAgo(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().split('T')[0];
}