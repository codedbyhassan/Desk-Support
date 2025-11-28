/**
 * Supabase Realtime-based signaling client
 * Replaces WebSocket signaling with Supabase Realtime subscriptions
 * 
 * Benefits:
 * - No separate server needed
 * - Automatic authentication via Supabase Auth
 * - Row-level security policies enforce permissions
 * - Realtime subscriptions for offers, answers, ICE candidates
 */

import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export type SignalMessage = {
  type: 'offer' | 'answer' | 'ice-candidate' | 'mute' | 'unmute' | 'screen-share' | 'join' | 'leave'
  payload?: any
}

export class SupabaseSignalingClient {
  private callId: string
  private userId: string
  private channel: RealtimeChannel | null = null
  private handlers: ((msg: SignalMessage) => void)[] = []
  private isSubscribed: boolean = false
  private pollingInterval: NodeJS.Timeout | null = null
  public _messageHandlerRegistered: boolean = false

  constructor(callId: string, userId: string) {
    this.callId = callId
    this.userId = userId
    console.debug('[SupabaseSignaling] initialized for call:', callId, 'user:', userId)
  }

  /**
   * Subscribe to signaling messages for this call
   */
  async subscribe(): Promise<void> {
    if (this.isSubscribed) {
      console.debug('[SupabaseSignaling] already subscribed')
      return
    }

    if (!this.callId || !this.userId) {
      throw new Error('[SupabaseSignaling] missing callId or userId')
    }

    console.debug('[SupabaseSignaling] subscribing to channel:', this.callId)

    try {
      // Create channel for this call
      // Channel naming: call:{callId}
      this.channel = supabase.channel(`call:${this.callId}`, {
        config: {
          broadcast: { self: true },
        },
      })

      // Listen for signaling messages
      this.channel.on('broadcast', { event: 'signaling' }, (payload: any) => {
        const message = payload.payload as SignalMessage
        console.debug('[SupabaseSignaling] received:', message.type, payload)
        this.handlers.forEach(h => h(message))
      })

      // Subscribe to channel
      this.channel.subscribe((status) => {
        console.debug('[SupabaseSignaling] channel status:', status)
        if (status === 'SUBSCRIBED') {
          this.isSubscribed = true
          console.info('[SupabaseSignaling] ✅ subscribed to call channel')
          // Start polling for database messages as fallback
          this.startPolling()
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[SupabaseSignaling] ❌ channel error - trying polling fallback')
          this.isSubscribed = false
          this.startPolling()
        } else if (status === 'CLOSED') {
          console.warn('[SupabaseSignaling] channel closed')
          this.isSubscribed = false
        }
      })
    } catch (err) {
      console.error('[SupabaseSignaling] subscription error:', err)
      this.startPolling()
    }
  }

  /**
   * Fallback: Poll database for signaling messages
   */
  private startPolling() {
    if (this.pollingInterval) return

    console.debug('[SupabaseSignaling] 📡 Starting polling fallback for messages')
    this.pollingInterval = setInterval(async () => {
      try {
        const { data: messages, error } = await supabase
          .from('signaling_messages')
          .select('*')
          .eq('call_id', this.callId)
          .eq('to_user_id', this.userId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          console.error('[SupabaseSignaling] polling error:', error)
          return
        }

        if (messages && messages.length > 0) {
          messages.reverse().forEach((msg: any) => {
            const signalMsg: SignalMessage = {
              type: msg.message_type,
              payload: msg.payload,
            }
            this.handlers.forEach(h => h(signalMsg))
          })
        }
      } catch (err) {
        console.error('[SupabaseSignaling] polling exception:', err)
      }
    }, 2000) // Poll every 2 seconds
  }

  /**
   * Stop polling
   */
  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }

  /**
   * Send signaling message to peers
   */
  async send(message: SignalMessage & { payload: { to_user_id: string; [key: string]: any } }): Promise<void> {
    if (!this.userId) {
      console.warn('[SupabaseSignaling] userId not set')
      return
    }

    try {
      // Save to database first (guaranteed delivery)
      await this.saveToDB(message as any)

      // Try to broadcast via realtime (if connected)
      if (this.channel && this.isSubscribed) {
        try {
          await this.channel.send({
            type: 'broadcast',
            event: 'signaling',
            payload: message,
          })
          console.debug('[SupabaseSignaling] 📤 sent via realtime:', message.type)
        } catch (err) {
          console.warn('[SupabaseSignaling] realtime send failed, using database only:', err)
        }
      }
    } catch (err) {
      console.error('[SupabaseSignaling] send error:', err)
      throw err
    }
  }

  /**
   * Save signaling message to database for persistence/recovery
   */
  async saveToDB(
    message: SignalMessage & { payload: { to_user_id: string; [key: string]: any } }
  ): Promise<void> {
    try {
      const { error } = await supabase.from('signaling_messages').insert({
        call_id: this.callId,
        from_user_id: this.userId,
        to_user_id: message.payload.to_user_id,
        message_type: message.type,
        payload: message.payload,
      })

      if (error) {
        console.error('[SupabaseSignaling] DB save failed:', error)
      } else {
        console.debug('[SupabaseSignaling] 💾 message saved to DB:', message.type)
      }
    } catch (err) {
      console.error('[SupabaseSignaling] DB save error:', err)
    }
  }

  /**
   * Register message handler
   */
  onMessage(fn: (msg: SignalMessage) => void): () => void {
    this.handlers.push(fn)
    return () => {
      this.handlers = this.handlers.filter(h => h !== fn)
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    // Consider connected if either realtime OR polling is active
    return (this.isSubscribed && this.channel?.state === 'SUBSCRIBED') || !!this.pollingInterval
  }

  /**
   * Unsubscribe and cleanup
   */
  async close(): Promise<void> {
    console.debug('[SupabaseSignaling] closing...')
    this.stopPolling()

    if (this.channel) {
      await this.channel.unsubscribe()
      this.channel = null
    }

    this.handlers = []
    this.isSubscribed = false
    this._messageHandlerRegistered = false
  }
}

/**
 * Create a Supabase signaling client
 */
export async function createSupabaseSignalingClient(
  callId: string,
  userId: string
): Promise<SupabaseSignalingClient> {
  const client = new SupabaseSignalingClient(callId, userId)
  await client.subscribe()
  return client
}
