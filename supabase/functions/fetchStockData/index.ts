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

    const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
    if (!FMP_API_KEY) {
      throw new Error('FMP_API_KEY not configured');
    }

    // Fetch historical price data
    const priceUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${FMP_API_KEY}`;
    const priceResponse = await fetch(priceUrl);
    const priceData = await priceResponse.json();

    // Fetch income statements for revenue and margin data
    const incomeUrl = `https://financialmodelingprep.com/api/v3/income-statement/${symbol}?limit=4&apikey=${FMP_API_KEY}`;
    const incomeResponse = await fetch(incomeUrl);
    const incomeData = await incomeResponse.json();

    if (!priceData.historical || !incomeData.length) {
      throw new Error('No data available for this symbol');
    }

    // Process and combine the data
    const processedData = priceData.historical
      .slice(0, 30) // Last 30 days of price data
      .map((price: any) => {
        const date = new Date(price.date).getTime();
        return {
          date,
          price: price.close,
          // Find matching quarterly data if available
          revenue: null,
          margin: null
        };
      })
      .reverse();

    // Store data in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert data into the database
    for (const data of processedData) {
      const { error } = await supabase
        .from('stock_data')
        .upsert({
          symbol,
          date: new Date(data.date).toISOString(),
          price: data.price,
          revenue: data.revenue,
          margin: data.margin
        }, {
          onConflict: 'symbol,date'
        });
      
      if (error) {
        console.error('Error inserting data:', error);
      }
    }

    return new Response(JSON.stringify(processedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});