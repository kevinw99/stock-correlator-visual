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

    // Format symbol for Tiingo (uppercase and trim)
    const formattedSymbol = symbol.trim().toUpperCase();
    console.log(`Processing request for symbol: ${formattedSymbol}`);

    // Fetch daily price data from Tiingo
    const startDate = getDateYearsAgo(5);
    const priceUrl = `https://api.tiingo.com/tiingo/daily/${formattedSymbol}/prices?startDate=${startDate}&token=${TIINGO_API_KEY}`;
    console.log(`Fetching price data for ${formattedSymbol}...`);
    
    const priceResponse = await fetch(priceUrl);
    if (!priceResponse.ok) {
      console.error(`Price API error for ${formattedSymbol}:`, priceResponse.status, await priceResponse.text());
      throw new Error(`Invalid stock symbol or API error: ${formattedSymbol}`);
    }
    
    const priceData = await priceResponse.json();
    if (!Array.isArray(priceData) || priceData.length === 0) {
      console.error(`No price data found for ${formattedSymbol}`);
      throw new Error(`No price data available for ${formattedSymbol}`);
    }

    console.log(`Successfully fetched price data for ${formattedSymbol}:`, {
      dataPoints: priceData.length
    });

    // Process the price data first
    const combinedData = priceData.map((pricePoint: any) => ({
      date: pricePoint.date.split('T')[0],
      price: pricePoint.adjClose || pricePoint.close,
      revenue: null,
      margin: null
    }));

    try {
      // Attempt to fetch fundamentals data, but don't fail if unavailable
      const fundamentalsUrl = `https://api.tiingo.com/tiingo/fundamentals/${formattedSymbol}/statements?token=${TIINGO_API_KEY}`;
      console.log(`Attempting to fetch fundamentals data for ${formattedSymbol}...`);
      
      const fundamentalsResponse = await fetch(fundamentalsUrl);
      if (fundamentalsResponse.ok) {
        const fundamentalsData = await fundamentalsResponse.json();
        console.log(`Successfully fetched fundamentals data for ${formattedSymbol}:`, {
          quarters: fundamentalsData?.length || 0
        });

        // Merge fundamentals data if available
        if (Array.isArray(fundamentalsData) && fundamentalsData.length > 0) {
          combinedData.forEach((dataPoint, index) => {
            const matchingFundamentals = fundamentalsData.find(
              (f: any) => f.date.split('T')[0] === dataPoint.date
            );
            if (matchingFundamentals) {
              combinedData[index].revenue = matchingFundamentals.quarterlyRevenue || null;
              combinedData[index].margin = matchingFundamentals.grossMargin ? 
                parseFloat(matchingFundamentals.grossMargin) * 100 : null;
            }
          });
        }
      } else {
        console.log(`Fundamentals data not available for ${formattedSymbol} (status: ${fundamentalsResponse.status})`);
      }
    } catch (fundamentalsError) {
      console.error(`Error fetching fundamentals for ${formattedSymbol}:`, fundamentalsError);
      // Continue without fundamentals data
    }

    // Sort data by date in ascending order
    const sortedData = combinedData.sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Store the data in Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { db: { schema: 'public' } }
    );

    const { error: insertError } = await supabaseClient
      .from('stock_data')
      .upsert(
        sortedData.map(record => ({
          symbol: formattedSymbol,
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