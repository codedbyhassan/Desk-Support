// Simple WebSocket-based signaling client (browser)
// Replace or extend with your preferred signaling server (Supabase Realtime, WebSocket on server, or hosted service).

export type SignalMessage = {
  type: string
  payload?: any
}

export class SignalingClient {
  private url: string
  private ws: WebSocket | null = null
  private handlers: ((msg: SignalMessage) => void)[] = []
  // marker for whether we've already registered a single message handler
  public _messageHandlerRegistered: boolean = false

  constructor(url: string) {
    this.url = url
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.debug('[Signaling] connecting to', this.url)
      this.ws = new WebSocket(this.url)

      // open
      this.ws.onopen = () => {
        console.info('[Signaling] connected')
        resolve()
      }

      // error
      this.ws.onerror = (e) => {
        console.error('[Signaling] socket error', e)
        reject(e)
      }

      // close
      this.ws.onclose = (ev) => {
        console.warn('[Signaling] socket closed', ev.code, ev.reason)
      }

      // messages
      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as SignalMessage
          this.handlers.forEach(h => h(msg))
        } catch (err) {
          console.error('[Signaling] invalid signal message', err)
        }
      }
    })
  }

  send(message: SignalMessage) {
    if (!this.ws) {
      console.warn('[Signaling] send failed: socket not created')
      return
    }
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[Signaling] send failed: socket not open, readyState=', this.ws.readyState)
      return
    }
    try {
      this.ws.send(JSON.stringify(message))
    } catch (err) {
      console.error('[Signaling] send error', err)
    }
  }

  onMessage(fn: (msg: SignalMessage) => void) {
    this.handlers.push(fn)
    return () => {
      this.handlers = this.handlers.filter(h => h !== fn)
    }
  }

  close() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.handlers = []
  }
}

// Helper to create a signaling client from env variable
export function createSignalingClient() {
  const url = (import.meta.env.VITE_SIGNALING_URL as string) || `ws://${window.location.host}/ws`
  return new SignalingClient(url)
}
