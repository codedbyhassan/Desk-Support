// supabase/functions/create-daily-room/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const { teamId, teamName, maxParticipants = 50 } = await req.json()

    if (!teamId || !teamName) {
      throw new Error('Missing required fields: teamId, teamName')
    }

    // Get user's company_id
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData) {
      throw new Error('Failed to get user data')
    }

    // Create Daily.co room
    const dailyApiKey = Deno.env.get('DAILY_API_KEY')
    if (!dailyApiKey) {
      throw new Error('DAILY_API_KEY not configured')
    }

    const roomName = `team-${teamId}-${Date.now()}`
    
    const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dailyApiKey}`,
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          max_participants: maxParticipants,
          enable_chat: true,
          enable_screenshare: true,
          enable_recording: false,
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // Expires in 24 hours
        },
      }),
    })

    if (!dailyResponse.ok) {
      const errorText = await dailyResponse.text()
      console.error('Daily API error:', errorText)
      throw new Error(`Failed to create Daily room: ${dailyResponse.status}`)
    }

    const dailyRoom = await dailyResponse.json()

    // Insert call record into database
    const { data: call, error: callError } = await supabaseClient
      .from('active_calls')
      .insert({
        team_id: teamId,
        company_id: userData.company_id,
        room_name: dailyRoom.name,
        room_url: dailyRoom.url,
        started_by: user.id,
        status: 'active',
        max_participants: maxParticipants,
      })
      .select()
      .single()

    if (callError) {
      console.error('Database error:', callError)
      throw new Error('Failed to create call record')
    }

    // Add the starter as a participant
    await supabaseClient
      .from('call_participants')
      .insert({
        call_id: call.id,
        user_id: user.id,
      })

    return new Response(
      JSON.stringify({
        success: true,
        call,
        roomUrl: dailyRoom.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in create-daily-room:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // CRITICAL: Always return CORS headers, even on error
    // Return 200 with success: false instead of 400 to avoid CORS issues
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Changed from 400 to 200 to avoid CORS preflight issues
      }
    )
  }
})