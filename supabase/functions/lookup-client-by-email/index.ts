// Supabase Edge Function: lookup-client-by-email
// Purpose: Zapier POSTs a HoneyBook client email, receives matching Supabase client
// Does NOT expose service role key to caller

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for preflight and response
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    console.log('[lookup-client-by-email] Rejected method:', req.method)
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Parse request body
    const body = await req.json()
    const rawEmail = body?.email

    if (!rawEmail || typeof rawEmail !== 'string') {
      console.log('[lookup-client-by-email] Missing or invalid email in request')
      return new Response(
        JSON.stringify({ error: 'Missing required field: email' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Normalize email: trim whitespace and lowercase
    const normalizedEmail = rawEmail.trim().toLowerCase()
    console.log('[lookup-client-by-email] Looking up email:', normalizedEmail)

    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[lookup-client-by-email] Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Query clients table - case-insensitive email match
    // Using ilike for case-insensitive comparison
    const { data: clients, error } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        display_name,
        email,
        status,
        meals_per_week,
        portions,
        delivery_dates,
        confirmed_dates
      `)
      .ilike('email', normalizedEmail)
      .limit(1)

    if (error) {
      console.error('[lookup-client-by-email] Database error:', error.message)
      return new Response(
        JSON.stringify({ error: 'Database query failed', details: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if client found
    if (!clients || clients.length === 0) {
      console.log('[lookup-client-by-email] No client found for email:', normalizedEmail)
      return new Response(
        JSON.stringify({
          client_found: false,
          message: 'No client found with this email',
          searched_email: normalizedEmail
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Client found - return data
    const client = clients[0]
    console.log('[lookup-client-by-email] Found client:', client.name, '(id:', client.id, ')')

    return new Response(
      JSON.stringify({
        client_found: true,
        client_id: client.id,
        client_name: client.name,
        display_name: client.display_name,
        email: client.email,
        status: client.status,
        meals_per_week: client.meals_per_week,
        portions: client.portions,
        delivery_dates: client.delivery_dates || [],
        confirmed_dates: client.confirmed_dates || []
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (err) {
    console.error('[lookup-client-by-email] Unexpected error:', err.message)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
