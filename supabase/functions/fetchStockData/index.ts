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

    // Fetch price data
    const startDate = getDateYearsAgo(10);
    const priceUrl = `https://api.tiingo.com/tiingo/daily/${formattedSymbol}/prices?startDate=${startDate}&token=${TIINGO_API_KEY}`;
    console.log(`Fetching price data from URL: ${priceUrl.replace(TIINGO_API_KEY, 'HIDDEN')}`);
    
    const priceResponse = await fetch(priceUrl);
    console.log('Price API response status:', priceResponse.status);
    
    if (!priceResponse.ok) {
      const errorText = await priceResponse.text();
      console.error(`Price API error for ${formattedSymbol}:`, priceResponse.status, errorText);
      throw new Error(`Invalid stock symbol or API error: ${formattedSymbol}`);
    }
    
    const priceData = await priceResponse.json();
    if (!Array.isArray(priceData) || priceData.length === 0) {
      console.error(`No price data found for ${formattedSymbol}`);
      throw new Error(`No price data available for ${formattedSymbol}`);
    }

    // Fetch fundamentals data
    const fundamentalsUrl = `https://api.tiingo.com/tiingo/fundamentals/${formattedSymbol}/statements?startDate=${startDate}&token=${TIINGO_API_KEY}`;
    console.log(`Fetching fundamentals data from URL: ${fundamentalsUrl.replace(TIINGO_API_KEY, 'HIDDEN')}`);
    
    const fundamentalsResponse = await fetch(fundamentalsUrl);
    console.log('Fundamentals API response status:', fundamentalsResponse.status);
    
    let fundamentalsData = [];
    
    if (fundamentalsResponse.ok) {
      const rawFundamentals = await fundamentalsResponse.json();
      console.log('Raw fundamentals summary:', {
        totalRecords: rawFundamentals.length,
        dateRange: rawFundamentals.length > 0 ? {
          start: rawFundamentals[0]?.date,
          end: rawFundamentals[rawFundamentals.length - 1]?.date
        } : null
      });
      
      // Process fundamentals data
      fundamentalsData = rawFundamentals.map(item => {
        const incomeStatement = item.statementData?.incomeStatement || [];
        const overview = item.statementData?.overview || [];

        const revenueItem = incomeStatement.find(entry => entry.dataCode === 'revenue');
        const grossProfitItem = incomeStatement.find(entry => entry.dataCode === 'grossProfit');
        const grossMarginItem = overview.find(entry => entry.dataCode === 'grossMargin');
        
        const revenue = revenueItem?.value || null;
        const grossProfit = grossProfitItem?.value || null;
        const grossMargin = grossMarginItem?.value 
          ? grossMarginItem.value * 100  // Convert from decimal to percentage
          : (revenue && grossProfit ? (grossProfit / revenue) * 100 : null);

        console.log('Processing statement:', {
          date: item.date,
          revenue,
          grossProfit,
          grossMargin
        });
        
        return {
          date: item.date,
          revenue,
          gross_profit: grossProfit,
          gross_margin: grossMargin
        };
      });
    } else {
      const errorText = await fundamentalsResponse.text();
      console.warn(`No fundamentals data available for ${formattedSymbol}:`, 
        fundamentalsResponse.status, errorText);
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { db: { schema: 'public' } }
    );

    // Store price data
    const priceDataToStore = priceData.map(price => ({
      symbol: formattedSymbol,
      date: price.date,
      price: price.adjClose || price.close
    }));

    const { error: priceError } = await supabaseClient
      .from('stock_data')
      .upsert(priceDataToStore, {
        onConflict: 'symbol,date',
        ignoreDuplicates: false
      });

    if (priceError) {
      console.error('Error storing price data:', priceError);
      throw new Error('Failed to store price data');
    }

    // Store fundamental data
    if (fundamentalsData.length > 0) {
      const fundamentalsToStore = fundamentalsData.map(fundamental => ({
        symbol: formattedSymbol,
        date: fundamental.date,
        revenue: fundamental.revenue,
        gross_profit: fundamental.gross_profit,
        gross_margin: fundamental.gross_margin
      }));

      const { error: fundamentalsError } = await supabaseClient
        .from('fundamental_data')
        .upsert(fundamentalsToStore, {
          onConflict: 'symbol,date',
          ignoreDuplicates: false
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
    const combinedData = stockData.map(price => {
      const fundamental = fundamentalData.find(f => f.date.split('T')[0] === price.date.split('T')[0]);
      return {
        ...price,
        revenue: fundamental?.revenue || null,
        margin: fundamental?.gross_margin || null
      };
    });

    console.log(`Final data summary for ${formattedSymbol}:`, {
      totalRecords: combinedData.length,
      recordsWithRevenue: combinedData.filter(d => d.revenue !== null).length,
      recordsWithMargin: combinedData.filter(d => d.margin !== null).length,
      dateRange: {
        start: combinedData[0]?.date,
        end: combinedData[combinedData.length - 1]?.date
      }
    });

    return new Response(JSON.stringify(combinedData), {
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