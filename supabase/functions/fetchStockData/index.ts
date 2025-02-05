import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FMP_API_KEY = Deno.env.get('FMP_API_KEY')

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

    if (!FMP_API_KEY) {
      console.error('FMP_API_KEY is not set')
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Fetching fundamental data for symbol: ${symbol}`)
    
    const fundamentalUrl = `https://financialmodelingprep.com/api/v3/income-statement/${symbol}?period=quarter&limit=20&apikey=${FMP_API_KEY}`
    
    const response = await fetch(fundamentalUrl)
    
    if (!response.ok) {
      console.error(`FMP API error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`Error details: ${errorText}`)
      throw new Error(`Failed to fetch fundamental data: ${response.statusText}`)
    }

    const fundamentalData = await response.json()
    console.log(`Received ${fundamentalData.length} quarters of fundamental data`)

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