import { useCallback, useEffect, useRef, useState } from 'react'
import { createSignalingClient, SignalMessage } from '@/services/video/signaling'
import { createPeerConnection, getLocalMedia, stopMedia } from '@/services/video/webrtc'

/**
 * Simple hook for 1:1 or small-group WebRTC via a WebSocket signaling server.
 * This is a scaffold — for production with >3 participants use an SFU (LiveKit, mediasoup, Janus).
 */
export function useVideoCall(roomId: string | null) {
  const signalingRef = useRef<any>(null)
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({})
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})

  useEffect(() => {
    return () => {
      // cleanup
      Object.values(pcsRef.current).forEach(pc => pc.close())
      pcsRef.current = {}
      stopMedia(localStream)
    }
  }, [])

  const startLocal = useCallback(async () => {
    const stream = await getLocalMedia({ audio: true, video: true })
    setLocalStream(stream)
    return stream
  }, [])

  const callPeer = useCallback(async (peerId: string) => {
    // create pc, add tracks, create offer, send via signaling
    const pc = createPeerConnection(peerId, (stream) => {
      setRemoteStreams(prev => ({ ...prev, [peerId]: stream }))
    }, (candidate) => {
      signalingRef.current.send({ type: 'ice-candidate', payload: { to: peerId, candidate } })
    })

    pcsRef.current[peerId] = pc
    if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream))
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    signalingRef.current.send({ type: 'offer', payload: { to: peerId, sdp: pc.localDescription } })
  }, [localStream])

  const joinRoom = useCallback(async (room: string, publish: boolean = true) => {
    if (!room) return
    if (!signalingRef.current) signalingRef.current = createSignalingClient()
    try {
      await signalingRef.current.connect()
    } catch (err) {
      console.error('[useVideoCall] signaling connect failed', err)
      return
    }

    signalingRef.current.send({ type: 'join', payload: { room } })

    // ensure we only register one message handler per signaling client
    if (!signalingRef.current._messageHandlerRegistered) {
      signalingRef.current.onMessage(async (msg: SignalMessage) => {
        const { type, payload } = msg

        if (type === 'peer-joined') {
          const peerId = payload?.id
          // if we have a local stream (we publish), initiate a call to the new peer
          if (peerId && localStream) {
            try {
              await callPeer(peerId)
            } catch (err) {
              console.error('[useVideoCall] callPeer error', err)
            }
          }
          return
        }

        if (type === 'peer-left') {
          const peerId = payload?.id
          if (peerId) {
            // cleanup
            const pc = pcsRef.current[peerId]
            if (pc) {
              pc.close()
              delete pcsRef.current[peerId]
            }
            setRemoteStreams(prev => {
              const next = { ...prev }
              delete next[peerId]
              return next
            })
          }
          return
        }

        if (type === 'offer') {
          const { from, sdp } = payload
          const pc = createPeerConnection(from, (stream) => {
            setRemoteStreams(prev => ({ ...prev, [from]: stream }))
          }, (candidate) => {
            signalingRef.current.send({ type: 'ice-candidate', payload: { to: from, candidate } })
          })

          pcsRef.current[from] = pc

          // add local tracks if we are publishing
          if (localStream && publish) localStream.getTracks().forEach(t => pc.addTrack(t, localStream))

          await pc.setRemoteDescription(new RTCSessionDescription(sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          signalingRef.current.send({ type: 'answer', payload: { to: from, sdp: pc.localDescription } })
        }

        if (type === 'answer') {
          const { from, sdp } = payload
          const pc = pcsRef.current[from]
          if (pc) pc.setRemoteDescription(new RTCSessionDescription(sdp))
        }

        if (type === 'ice-candidate') {
          const { from, candidate } = payload
          const pc = pcsRef.current[from]
          if (pc && candidate) pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error)
        }
      })
      signalingRef.current._messageHandlerRegistered = true
    }
  }, [localStream, callPeer])

  const leave = useCallback(() => {
    signalingRef.current?.send({ type: 'leave', payload: {} })
    signalingRef.current?.close()
    Object.values(pcsRef.current).forEach(pc => pc.close())
    pcsRef.current = {}
    stopMedia(localStream)
    setLocalStream(null)
    setRemoteStreams({})
  }, [localStream])

  return {
    startLocal,
    joinRoom,
    callPeer,
    leave,
    localStream,
    remoteStreams,
  }
}
