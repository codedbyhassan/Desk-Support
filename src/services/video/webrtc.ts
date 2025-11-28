// Lightweight WebRTC helpers: creating peer connections, getUserMedia, TURN config

export type RTCMap = { [peerId: string]: RTCPeerConnection }

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
]

export function getTurnServersFromEnv(): RTCIceServer[] {
  const url = import.meta.env.VITE_TURN_URL as string | undefined
  const user = import.meta.env.VITE_TURN_USER as string | undefined
  const pass = import.meta.env.VITE_TURN_PASS as string | undefined

  if (url && user && pass) {
    return [{ urls: url, username: user, credential: pass }]
  }

  return []
}

export function createPeerConnection(peerId: string, onTrack: (stream: MediaStream, id: string) => void, onIceCandidate?: (candidate: RTCIceCandidate, id: string) => void) {
  const pc = new RTCPeerConnection({ iceServers: [...DEFAULT_ICE_SERVERS, ...getTurnServersFromEnv()] })

  pc.onicecandidate = (ev) => {
    if (ev.candidate && onIceCandidate) onIceCandidate(ev.candidate, peerId)
  }

  pc.ontrack = (ev) => {
    onTrack(ev.streams[0], peerId)
  }

  return pc
}

export async function getLocalMedia(constraints: MediaStreamConstraints = { audio: true, video: true }) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    return stream
  } catch (err: any) {
    let message = 'Failed to access media devices'
    
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      message = 'Camera/microphone access was denied. Please check your browser permissions.'
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      message = 'No camera or microphone found. Please connect a device and try again.'
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      message = 'Camera or microphone is being used by another application. Please close other apps and try again.'
    } else if (err.name === 'OverconstrainedError') {
      message = 'Your device does not support the required video/audio settings.'
    } else if (err.name === 'TypeError') {
      message = 'Invalid media constraints specified.'
    }
    
    console.error('Failed to get user media:', err)
    throw new Error(message)
  }
}

export function stopMedia(stream?: MediaStream | null) {
  if (!stream) return
  stream.getTracks().forEach(t => t.stop())
}
