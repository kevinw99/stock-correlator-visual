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

    const formattedSymbol = symbol.trim().toUpperCase();
    console.log(`Processing request for symbol: ${formattedSymbol}`);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { db: { schema: 'public' } }
    );

    // Fetch price data
    const startDate = getDateYearsAgo(10);
    const priceUrl = `https://api.tiingo.com/tiingo/daily/${formattedSymbol}/prices?startDate=${startDate}&token=${TIINGO_API_KEY}`;
    console.log(`Fetching price data from URL: ${priceUrl.replace(TIINGO_API_KEY, 'HIDDEN')}`);
    
    const priceResponse = await fetch(priceUrl);
    if (!priceResponse.ok) {
      throw new Error(`Invalid stock symbol or API error: ${formattedSymbol}`);
    }
    
    const priceData = await priceResponse.json();

    // Fetch fundamentals data
    const fundamentalsUrl = `https://api.tiingo.com/tiingo/fundamentals/${formattedSymbol}/statements?token=${TIINGO_API_KEY}`;
    console.log(`Fetching fundamentals data from URL: ${fundamentalsUrl.replace(TIINGO_API_KEY, 'HIDDEN')}`);
    
    const fundamentalsResponse = await fetch(fundamentalsUrl);
    const fundamentalsData = await fundamentalsResponse.json();
    
    console.log('Fundamentals data received:', fundamentalsData);

    // Store price data
    const priceDataToStore = priceData.map((price: any) => ({
      symbol: formattedSymbol,
      date: price.date,
      price: price.adjClose || price.close
    }));

    const { error: priceError } = await supabaseClient
      .from('stock_data')
      .upsert(priceDataToStore, {
        onConflict: 'symbol,date'
      });

    if (priceError) {
      console.error('Error storing price data:', priceError);
      throw new Error('Failed to store price data');
    }

    // Store fundamental data
    if (Array.isArray(fundamentalsData) && fundamentalsData.length > 0) {
      const fundamentalsToStore = fundamentalsData.map((item: any) => {
        const incomeStatement = item.statementData?.incomeStatement || [];
        const overview = item.statementData?.overview || [];

        const revenueItem = incomeStatement.find((entry: any) => entry.dataCode === 'revenue');
        const grossProfitItem = incomeStatement.find((entry: any) => entry.dataCode === 'grossProfit');
        const grossMarginItem = overview.find((entry: any) => entry.dataCode === 'grossMargin');

        const revenue = revenueItem?.value || null;
        const grossProfit = grossProfitItem?.value || null;
        const grossMargin = grossMarginItem?.value 
          ? grossMarginItem.value * 100
          : (revenue && grossProfit ? (grossProfit / revenue) * 100 : null);

        console.log('Processing fundamental data:', {
          date: item.date,
          revenue,
          grossProfit,
          grossMargin
        });

        return {
          symbol: formattedSymbol,
          date: item.date,
          revenue,
          gross_profit: grossProfit,
          gross_margin: grossMargin
        };
      });

      console.log('Storing fundamental data:', fundamentalsToStore);

      const { error: fundamentalsError } = await supabaseClient
        .from('fundamental_data')
        .upsert(fundamentalsToStore, {
          onConflict: 'symbol,date'
        });

      if (fundamentalsError) {
        console.error('Error storing fundamentals data:', fundamentalsError);
        throw new Error('Failed to store fundamentals data');
      }
    }

    // Fetch combined data for response
    const { data: stockData, error: fetchError } = await supabaseClient
      .from('stock_data')
      .select('*')
      .eq('symbol', formattedSymbol)
      .order('date', { ascending: true });

    const { data: fundamentalData, error: fetchFundamentalsError } = await supabaseClient
      .from('fundamental_data')
      .select('*')
      .eq('symbol', formattedSymbol)
      .order('date', { ascending: true });

    if (fetchError || fetchFundamentalsError) {
      console.error('Error fetching stored data:', fetchError || fetchFundamentalsError);
      throw new Error('Failed to fetch stored data');
    }

    // Combine the data
    const combinedData = stockData.map((price: any) => {
      const fundamental = fundamentalData?.find(
        (f: any) => f.date.split('T')[0] === price.date.split('T')[0]
      );
      return {
        ...price,
        revenue: fundamental?.revenue || null,
        margin: fundamental?.gross_margin || null
      };
    });

    return new Response(JSON.stringify(combinedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({
      error: error.message,
      details: 'Please ensure the stock symbol is valid and try again.'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})