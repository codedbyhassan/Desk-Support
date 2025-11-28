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
  } catch (err) {
    console.error('Failed to get user media:', err)
    throw err
  }
}

export function stopMedia(stream?: MediaStream | null) {
  if (!stream) return
  stream.getTracks().forEach(t => t.stop())
}
