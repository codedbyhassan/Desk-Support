// src/lib/daily.ts
import { supabase } from './supabase'

export interface DailyCall {
  id: string
  team_id: string
  company_id: string
  room_name: string
  room_url: string
  started_by: string
  started_at: string
  ended_at?: string
  status: 'active' | 'ended'
  max_participants: number
}

export interface CallParticipant {
  id: string
  call_id: string
  user_id: string
  joined_at: string
  left_at?: string
  user?: {
    full_name: string
    avatar_url?: string
  }
}

export class DailyClient {
  private static apiKey: string = import.meta.env.VITE_DAILY_API_KEY || ''
  private static baseUrl: string = 'https://api.daily.co/v1'

  /**
   * Get active call for a team
   */
  static async getActiveCall(teamId: string): Promise<DailyCall | null> {
    try {
      const { data, error } = await supabase
        .from('active_calls')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .maybeSingle()

      if (error) {
        console.error('Error fetching active call:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in getActiveCall:', error)
      return null
    }
  }

  /**
   * Get active participants in a call
   */
  static async getActiveParticipants(callId: string): Promise<CallParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('call_participants')
        .select(`
          *,
          user:users(full_name, avatar_url)
        `)
        .eq('call_id', callId)
        .is('left_at', null)
        .order('joined_at', { ascending: true })

      if (error) {
        console.error('Error fetching participants:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getActiveParticipants:', error)
      return []
    }
  }

  /**
   * Create a new Daily.co room via Supabase Edge Function
   */
  static async createRoom(teamId: string, teamName: string, maxParticipants = 50): Promise<DailyCall> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/create-daily-room`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': supabase.supabaseKey,
          },
          body: JSON.stringify({
            teamId,
            teamName,
            maxParticipants,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        // Show the actual error from the edge function
        const errorMsg = result.error || `HTTP ${response.status}: ${response.statusText}`
        console.error('Edge function error:', errorMsg)
        throw new Error(errorMsg)
      }

      return result.call
    } catch (error) {
      console.error('Error creating Daily room:', error)
      throw error
    }
  }

  /**
   * End a Daily.co room via Supabase Edge Function
   */
  static async endRoom(callId: string): Promise<{ duration: string; participants: number }> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/end-daily-room`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': supabase.supabaseKey,
          },
          body: JSON.stringify({ callId }),
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMsg = result.error || `HTTP ${response.status}: ${response.statusText}`
        console.error('Edge function error:', errorMsg)
        throw new Error(errorMsg)
      }

      return {
        duration: result.duration,
        participants: result.participants,
      }
    } catch (error) {
      console.error('Error ending Daily room:', error)
      throw error
    }
  }

  /**
   * Join a call
   */
  static async joinCall(callId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('call_participants')
        .insert({
          call_id: callId,
          user_id: userId,
        })

      if (error) throw error
    } catch (error) {
      console.error('Error joining call:', error)
      throw error
    }
  }

  /**
   * Leave a call
   */
  static async leaveCall(callId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('call_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('call_id', callId)
        .eq('user_id', userId)
        .is('left_at', null)

      if (error) throw error
    } catch (error) {
      console.error('Error leaving call:', error)
      throw error
    }
  }

  /**
   * Subscribe to call changes
   */
  static subscribeToCallChanges(
    teamId: string,
    callback: (call: DailyCall | null) => void
  ): () => void {
    const channel = supabase
      .channel(`team-call-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_calls',
          filter: `team_id=eq.${teamId}`,
        },
        async (payload) => {
          if (payload.eventType === 'DELETE' || 
              (payload.new as any)?.status === 'ended') {
            callback(null)
          } else {
            callback(payload.new as DailyCall)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  /**
   * Subscribe to participant changes
   */
  static subscribeToParticipantChanges(
    callId: string,
    callback: (participants: CallParticipant[]) => void
  ): () => void {
    const fetchParticipants = async () => {
      const participants = await this.getActiveParticipants(callId)
      callback(participants)
    }

    const channel = supabase
      .channel(`call-participants-${callId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_participants',
          filter: `call_id=eq.${callId}`,
        },
        fetchParticipants
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
}

export const dailyClient = new DailyClient()