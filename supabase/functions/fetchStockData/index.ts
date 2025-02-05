import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TIINGO_API_KEY = Deno.env.get('TIINGO_API_KEY')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { symbol } = await req.json()
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!TIINGO_API_KEY) {
      console.error('TIINGO_API_KEY is not set')
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Fetching fundamental data for symbol: ${symbol}`)
    
    // Fetch quarterly statements from Tiingo
    const fundamentalUrl = `https://api.tiingo.com/tiingo/fundamentals/${symbol}/statements?token=${TIINGO_API_KEY}`
    
    const response = await fetch(fundamentalUrl)
    
    if (!response.ok) {
      console.error(`Tiingo API error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`Error details: ${errorText}`)
      throw new Error(`Failed to fetch fundamental data: ${response.statusText}`)
    }

    const rawData = await response.json()
    
    // Transform Tiingo data format to match our existing structure
    const fundamentalData = rawData
      .filter((statement: any) => statement.totalRevenue != null)
      .map((statement: any) => ({
        symbol: symbol,
        date: statement.date,
        announcement_date: statement.date, // Tiingo doesn't provide announcement date
        revenue: parseFloat(statement.totalRevenue),
        gross_profit: statement.grossProfit ? parseFloat(statement.grossProfit) : null,
        gross_margin: statement.grossProfit && statement.totalRevenue ? 
          (parseFloat(statement.grossProfit) / parseFloat(statement.totalRevenue)) * 100 : null,
        quarter: Math.floor(new Date(statement.date).getMonth() / 3) + 1,
        fiscal_year: new Date(statement.date).getFullYear()
      }))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`Processed ${fundamentalData.length} quarters of fundamental data:`, fundamentalData[0]);

    return new Response(
      JSON.stringify({ fundamentalData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in fetchStockData function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})