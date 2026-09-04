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
  private isConnecting: boolean = false
  private messageQueue: SignalMessage[] = []
  private _maxQueueTime: number = 5000 // max time to queue messages (5 seconds)
  private _queueStartTime: number = 0
  // marker for whether we've already registered a single message handler
  public _messageHandlerRegistered: boolean = false

  constructor(url: string) {
    this.url = url
  }

  connect(): Promise<void> {
    // Prevent multiple simultaneous connection attempts
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.debug('[Signaling] already connected')
      return Promise.resolve()
    }

    if (this.isConnecting) {
      console.debug('[Signaling] connection already in progress')
      return Promise.resolve()
    }

    this.isConnecting = true
    this._queueStartTime = Date.now()

    return new Promise((resolve, reject) => {
      console.debug('[Signaling] connecting to', this.url)
      
      try {
        this.ws = new WebSocket(this.url)

        // open
        this.ws.onopen = () => {
          console.info('[Signaling] connected')
          this.isConnecting = false
          // Flush queued messages
          this.flushQueue()
          resolve()
        }

        // error
        this.ws.onerror = (e) => {
          console.error('[Signaling] socket error', e)
          this.isConnecting = false
          reject(e)
        }

        // close
        this.ws.onclose = (ev) => {
          console.warn('[Signaling] socket closed', ev.code, ev.reason)
          this.isConnecting = false
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
      } catch (err) {
        this.isConnecting = false
        reject(err)
      }
    })
  }

  private flushQueue() {
    if (this.ws?.readyState === WebSocket.OPEN && this.messageQueue.length > 0) {
      console.debug(`[Signaling] flushing ${this.messageQueue.length} queued messages`)
      const queue = [...this.messageQueue]
      this.messageQueue = []
      queue.forEach(msg => {
        try {
          this.ws!.send(JSON.stringify(msg))
        } catch (err) {
          console.error('[Signaling] error sending queued message', err)
        }
      })
    }
  }

  send(message: SignalMessage) {
    if (!this.ws) {
      console.warn('[Signaling] send failed: socket not created')
      return
    }

    if (this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message))
        return
      } catch (err) {
        console.error('[Signaling] send error', err)
        return
      }
    }

    // Socket not ready - queue the message
    console.warn('[Signaling] socket not open (readyState=', this.ws.readyState, '), queuing message')
    this.messageQueue.push(message)

    // Wait for connection with timeout
    const startTime = Date.now()
    const maxWait = 5000 // 5 second timeout
    const checkInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        clearInterval(checkInterval)
        this.flushQueue()
        return
      }

      // Check timeout
      if (Date.now() - startTime > maxWait) {
        clearInterval(checkInterval)
        console.error('[Signaling] timeout waiting for connection, dropped', this.messageQueue.length, 'queued messages')
        this.messageQueue = []
        return
      }
    }, 100)
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
    this.isConnecting = false
    this._messageHandlerRegistered = false
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Helper to create a signaling client from env variable
export function createSignalingClient() {
  let url = import.meta.env.VITE_SIGNALING_URL as string
  
  if (!url) {
    // Determine protocol based on current page protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const hostname = window.location.hostname
    
    // For GitHub Codespaces
    if (hostname.includes('github.dev')) {
      // Replace the port in the hostname with 4000 (your WebSocket server port)
      const baseUrl = hostname.replace(/-\d+\.app\.github\.dev$/, '-4000.app.github.dev')
      url = `${protocol}//${baseUrl}/ws`
    } else {
      // Local development - connect to WebSocket server on port 4000
      url = `${protocol}//localhost:4000/ws`
    }
  }
  
  console.log('[Signaling] Using WebSocket URL:', url)
  return new SignalingClient(url)
}