import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Fetch fundamentals data with 10-year history
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 10);
    const fundamentalsUrl = `https://api.tiingo.com/tiingo/fundamentals/${formattedSymbol}/statements?startDate=${startDate.toISOString().split('T')[0]}&token=${TIINGO_API_KEY}`;
    console.log(`Fetching fundamentals data from URL: ${fundamentalsUrl.replace(TIINGO_API_KEY, 'HIDDEN')}`);
    
    const fundamentalsResponse = await fetch(fundamentalsUrl);
    if (!fundamentalsResponse.ok) {
      console.error(`Error fetching fundamental data: ${fundamentalsResponse.status}`);
      throw new Error('Failed to fetch fundamental data');
    }
    
    const fundamentalsData = await fundamentalsResponse.json();
    console.log(`Received fundamentals data for ${formattedSymbol}:`, JSON.stringify(fundamentalsData).slice(0, 200) + '...');

    // Process and store fundamental data
    if (Array.isArray(fundamentalsData) && fundamentalsData.length > 0) {
      console.log(`Processing ${fundamentalsData.length} fundamental data records for ${formattedSymbol}`);
      
      // First, fetch price data for 10 years
      const priceStartDate = new Date();
      priceStartDate.setFullYear(priceStartDate.getFullYear() - 10);
      const priceUrl = `https://api.tiingo.com/tiingo/daily/${formattedSymbol}/prices?startDate=${priceStartDate.toISOString().split('T')[0]}&token=${TIINGO_API_KEY}`;
      console.log(`Fetching price data from URL: ${priceUrl.replace(TIINGO_API_KEY, 'HIDDEN')}`);
      
      const priceResponse = await fetch(priceUrl);
      if (!priceResponse.ok) {
        console.error(`Error fetching price data: ${priceResponse.status}`);
        throw new Error('Failed to fetch price data');
      }
      
      const priceData = await priceResponse.json();
      console.log(`Received price data for ${formattedSymbol}:`, JSON.stringify(priceData.slice(0, 2)) + '...');

      // Store price data
      if (Array.isArray(priceData) && priceData.length > 0) {
        for (const item of priceData) {
          try {
            const { error: priceError } = await supabaseClient
              .from('stock_data')
              .upsert({
                symbol: formattedSymbol,
                date: item.date,
                price: item.adjClose || item.close,
              }, {
                onConflict: 'symbol,date'
              });

            if (priceError) {
              console.error(`Error storing price data for ${formattedSymbol}:`, priceError);
              continue;
            }
          } catch (error) {
            console.error(`Unexpected error storing price data for ${formattedSymbol}:`, error);
            continue;
          }
        }
      }

      // Process and store fundamental data
      for (const item of fundamentalsData) {
        const quarter = item.quarter;
        const year = item.year;

        console.log('Processing statement data:', {
          date: item.date,
          quarter: quarter,
          year: year
        });

        if (!quarter || !year) {
          console.log(`Skipping record with missing quarter/year data: quarter=${quarter}, year=${year}`);
          continue;
        }

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

        console.log(`Processing fundamental data for ${formattedSymbol}:`, {
          date: item.date,
          quarter: quarter,
          year: year,
          revenue,
          grossProfit,
          grossMargin
        });

        try {
          const { error: fundamentalError } = await supabaseClient
            .from('fundamental_data')
            .upsert({
              symbol: formattedSymbol,
              date: item.date,
              revenue,
              gross_profit: grossProfit,
              gross_margin: grossMargin,
              quarter: quarter,
              fiscal_year: year,
              announcement_date: item.date
            }, {
              onConflict: 'symbol,date'
            });

          if (fundamentalError) {
            console.error(`Error storing fundamental data for ${formattedSymbol}:`, fundamentalError);
            continue;
          }

          console.log(`Successfully stored fundamental data for ${formattedSymbol} on ${item.date}`);
        } catch (error) {
          console.error(`Unexpected error storing fundamental data for ${formattedSymbol}:`, error);
          continue;
        }
      }
    }

    // Fetch the stored data from database
    const { data: fundamentalData, error: fetchError } = await supabaseClient
      .from('fundamental_data')
      .select('*')
      .eq('symbol', formattedSymbol)
      .order('date', { ascending: true });

    if (fetchError) {
      console.error('Error fetching stored data:', fetchError);
      throw new Error('Failed to fetch stored data');
    }

    // Return the database data
    return new Response(JSON.stringify({
      fundamentalData,
      message: 'Data processed and retrieved successfully'
    }), {
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
});