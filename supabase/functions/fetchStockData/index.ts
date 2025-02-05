import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
    if (!FMP_API_KEY) {
      console.error('FMP_API_KEY not found in environment variables');
      throw new Error('API key configuration error');
    }

    const { symbol } = await req.json();
    if (!symbol) {
      console.error('No symbol provided in request');
      throw new Error('Symbol is required');
    }

    console.log(`Processing request for symbol: ${symbol}`);

    // Fetch 5 years of historical price data
    const priceUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?from=${getDateYearsAgo(5)}&apikey=${FMP_API_KEY}`;
    console.log(`Fetching price data for ${symbol}...`);
    const priceResponse = await fetch(priceUrl);
    
    if (!priceResponse.ok) {
      console.error(`Price API error for ${symbol}:`, priceResponse.status, await priceResponse.text());
      throw new Error(`Failed to fetch price data: ${priceResponse.status}`);
    }
    
    const priceData = await priceResponse.json();
    console.log(`Price data for ${symbol}:`, {
      received: !!priceData,
      hasHistorical: !!priceData.historical,
      dataPoints: priceData.historical?.length || 0
    });

    if (!priceData.historical || priceData.historical.length === 0) {
      console.error(`No historical price data found for ${symbol}`);
      throw new Error(`No price data available for ${symbol}`);
    }

    // Fetch quarterly income statements for revenue data
    const incomeUrl = `https://financialmodelingprep.com/api/v3/income-statement/${symbol}?period=quarter&limit=20&apikey=${FMP_API_KEY}`;
    console.log(`Fetching income data for ${symbol}...`);
    const incomeResponse = await fetch(incomeUrl);
    
    if (!incomeResponse.ok) {
      console.error(`Income API error for ${symbol}:`, incomeResponse.status, await incomeResponse.text());
      throw new Error(`Failed to fetch income data: ${incomeResponse.status}`);
    }
    
    const incomeData = await incomeResponse.json();
    console.log(`Income data for ${symbol}:`, {
      received: !!incomeData,
      isArray: Array.isArray(incomeData),
      records: Array.isArray(incomeData) ? incomeData.length : 0
    });

    if (!Array.isArray(incomeData) || incomeData.length === 0) {
      console.error(`No income statement data found for ${symbol}`);
      throw new Error(`No financial data available for ${symbol}`);
    }

    // Process and combine the data
    const combinedData = priceData.historical.map((pricePoint: any) => {
      const date = pricePoint.date;
      const matchingIncome = incomeData.find((income: any) => {
        const incomeDate = income.date.split(' ')[0];
        return incomeDate === date;
      });

      return {
        date: date,
        price: pricePoint.close,
        revenue: matchingIncome?.revenue || null,
        margin: matchingIncome ? (matchingIncome.grossProfit / matchingIncome.revenue) * 100 : null
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