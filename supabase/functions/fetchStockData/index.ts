import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getDateYearsAgo(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().split('T')[0];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TIINGO_API_KEY = Deno.env.get('TIINGO_API_KEY');
    if (!TIINGO_API_KEY) {
      console.error('TIINGO_API_KEY not found in environment variables');
      throw new Error('API key configuration error');
    }

    const { symbol } = await req.json();
    if (!symbol) {
      console.error('No symbol provided in request');
      throw new Error('Symbol is required');
    }

    console.log(`Processing request for symbol: ${symbol}`);

    // Fetch daily price data from Tiingo
    const startDate = getDateYearsAgo(5);
    const priceUrl = `https://api.tiingo.com/tiingo/daily/${symbol}/prices?startDate=${startDate}&token=${TIINGO_API_KEY}`;
    console.log(`Fetching price data for ${symbol}...`);
    const priceResponse = await fetch(priceUrl);
    
    if (!priceResponse.ok) {
      console.error(`Price API error for ${symbol}:`, priceResponse.status, await priceResponse.text());
      throw new Error(`Failed to fetch price data: ${priceResponse.status}`);
    }
    
    const priceData = await priceResponse.json();
    console.log(`Price data received for ${symbol}:`, {
      dataPoints: priceData?.length || 0
    });

    if (!Array.isArray(priceData) || priceData.length === 0) {
      console.error(`No price data found for ${symbol}`);
      throw new Error(`No price data available for ${symbol}`);
    }

    // Fetch fundamentals data from Tiingo
    const fundamentalsUrl = `https://api.tiingo.com/tiingo/fundamentals/${symbol}/statements?token=${TIINGO_API_KEY}`;
    console.log(`Fetching fundamentals data for ${symbol}...`);
    const fundamentalsResponse = await fetch(fundamentalsUrl);
    
    if (!fundamentalsResponse.ok) {
      console.error(`Fundamentals API error for ${symbol}:`, fundamentalsResponse.status, await fundamentalsResponse.text());
      throw new Error(`Failed to fetch fundamentals data: ${fundamentalsResponse.status}`);
    }
    
    const fundamentalsData = await fundamentalsResponse.json();
    console.log(`Fundamentals data received for ${symbol}:`, {
      quarters: fundamentalsData?.length || 0
    });

    // Process and combine the data
    const combinedData = priceData.map((pricePoint: any) => {
      const date = pricePoint.date.split('T')[0];
      const matchingFundamentals = fundamentalsData?.find((f: any) => 
        f.date.split('T')[0] === date
      );

      return {
        date: date,
        price: pricePoint.adjClose || pricePoint.close,
        revenue: matchingFundamentals?.quarterlyRevenue || null,
        margin: matchingFundamentals?.grossMargin ? 
          parseFloat(matchingFundamentals.grossMargin) * 100 : null
      };
    });

    // Sort data by date in ascending order
    const sortedData = combinedData.sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    console.log(`Successfully processed data for ${symbol}. Total records: ${sortedData.length}`);

    // Store the data in Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { db: { schema: 'public' } }
    );

    // Insert the data into the stock_data table
    const { error: insertError } = await supabaseClient
      .from('stock_data')
      .upsert(
        sortedData.map(record => ({
          symbol: symbol,
          ...record
        }))
      );

    if (insertError) {
      console.error('Error inserting data into Supabase:', insertError);
      throw new Error('Failed to store data');
    }

    return new Response(JSON.stringify(sortedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing request:', error.message);
    return new Response(JSON.stringify({
        error: error.message,
        details: 'Please ensure the stock symbol is valid and try again.'
      }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})