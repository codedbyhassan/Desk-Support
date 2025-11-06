// supabase/functions/end-daily-room/index.ts
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
    const { callId } = await req.json()

    if (!callId) {
      throw new Error('Missing required field: callId')
    }

    // Get call details
    const { data: call, error: callError } = await supabaseClient
      .from('active_calls')
      .select('*')
      .eq('id', callId)
      .single()

    if (callError || !call) {
      throw new Error('Call not found')
    }

    // Delete Daily.co room
    const dailyApiKey = Deno.env.get('DAILY_API_KEY')
    if (!dailyApiKey) {
      throw new Error('DAILY_API_KEY not configured')
    }

    const dailyResponse = await fetch(`https://api.daily.co/v1/rooms/${call.room_name}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
      },
    })

    if (!dailyResponse.ok && dailyResponse.status !== 404) {
      console.error('Failed to delete Daily room:', dailyResponse.status)
      // Continue anyway to update database
    }

    // Update all participants who haven't left
    await supabaseClient
      .from('call_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('call_id', callId)
      .is('left_at', null)

    // Get participant count
    const { data: participants, error: participantsError } = await supabaseClient
      .from('call_participants')
      .select('id')
      .eq('call_id', callId)

    const participantCount = participants?.length || 0

    // Update call status
    const endedAt = new Date().toISOString()
    await supabaseClient
      .from('active_calls')
      .update({
        status: 'ended',
        ended_at: endedAt,
      })
      .eq('id', callId)

    // Calculate duration
    const startTime = new Date(call.started_at).getTime()
    const endTime = new Date(endedAt).getTime()
    const durationMs = endTime - startTime
    const durationMinutes = Math.floor(durationMs / 60000)
    const durationSeconds = Math.floor((durationMs % 60000) / 1000)
    const duration = `${durationMinutes}m ${durationSeconds}s`

    return new Response(
      JSON.stringify({
        success: true,
        duration,
        participants: participantCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})