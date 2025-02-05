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
    const startDate = getDateYearsAgo(5);
    const priceUrl = `https://api.tiingo.com/tiingo/daily/${formattedSymbol}/prices?startDate=${startDate}&token=${TIINGO_API_KEY}`;
    console.log(`Fetching price data...`);
    
    const priceResponse = await fetch(priceUrl);
    if (!priceResponse.ok) {
      console.error(`Price API error for ${formattedSymbol}:`, priceResponse.status);
      throw new Error(`Invalid stock symbol or API error: ${formattedSymbol}`);
    }
    
    const priceData = await priceResponse.json();
    if (!Array.isArray(priceData) || priceData.length === 0) {
      console.error(`No price data found for ${formattedSymbol}`);
      throw new Error(`No price data available for ${formattedSymbol}`);
    }

    // Fetch fundamentals data using the correct endpoint
    const fundamentalsUrl = `https://api.tiingo.com/tiingo/fundamentals/${formattedSymbol}/statements?token=${TIINGO_API_KEY}`;
    console.log(`Fetching fundamentals data...`);
    
    const fundamentalsResponse = await fetch(fundamentalsUrl);
    let fundamentalsData = [];
    
    if (fundamentalsResponse.ok) {
      const rawFundamentals = await fundamentalsResponse.json();
      console.log('Fundamentals data received:', {
        status: fundamentalsResponse.status,
        dataLength: rawFundamentals.length
      });
      
      // Process fundamentals data
      fundamentalsData = rawFundamentals.map(item => ({
        date: item.date,
        revenue: item.totalRevenue || null,
        margin: item.grossMargin || null
      }));
      
      console.log('Processed fundamentals data:', {
        totalRecords: fundamentalsData.length,
        sample: fundamentalsData[0]
      });
    } else {
      console.warn(`No fundamentals data available for ${formattedSymbol}:`, 
        await fundamentalsResponse.text());
    }

    // Create a map of fundamentals data by date for easier lookup
    const fundamentalsMap = new Map(
      fundamentalsData.map(f => [f.date.split('T')[0], f])
    );

    // Merge data
    const combinedData = priceData.map(pricePoint => {
      const priceDate = pricePoint.date.split('T')[0];
      const fundamentals = fundamentalsMap.get(priceDate);
      
      return {
        date: priceDate,
        price: pricePoint.adjClose || pricePoint.close,
        revenue: fundamentals?.revenue || null,
        margin: fundamentals?.margin || null,
        symbol: formattedSymbol
      };
    });

    // Sort by date
    const sortedData = combinedData.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Store in Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { db: { schema: 'public' } }
    );

    const { error: insertError } = await supabaseClient
      .from('stock_data')
      .upsert(sortedData, {
        onConflict: 'symbol,date',
        ignoreDuplicates: false
      });

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