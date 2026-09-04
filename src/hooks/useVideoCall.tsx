import { useCallback, useEffect, useRef, useState } from 'react'
import { createSupabaseSignalingClient, SupabaseSignalingClient, SignalMessage } from '@/services/video/supabase-signaling'
import { createPeerConnection, getLocalMedia, stopMedia } from '@/services/video/webrtc'
import { supabase } from '@/lib/supabase'

/**
 * Hook for WebRTC video calls using Supabase Realtime signaling
 * No separate server needed - uses Supabase Realtime for peer discovery and signaling
 */
export function useVideoCall(_roomId: string | null) {
  const signalingRef = useRef<SupabaseSignalingClient | null>(null)
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({})
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttemptsRef = useRef(5)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [callId, setCallId] = useState<string | null>(null)
  const [currentAudioInput, setCurrentAudioInput] = useState<string | null>(null)
  const [currentVideoInput, setCurrentVideoInput] = useState<string | null>(null)
  const [currentAudioOutput, setCurrentAudioOutput] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [screenSharePeerId, setScreenSharePeerId] = useState<string | null>(null)

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

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
    
    // Store device IDs
    const audioTrack = stream.getAudioTracks()[0]
    const videoTrack = stream.getVideoTracks()[0]
    if (audioTrack?.getSettings) {
      setCurrentAudioInput(audioTrack.getSettings().deviceId || null)
    }
    if (videoTrack?.getSettings) {
      setCurrentVideoInput(videoTrack.getSettings().deviceId || null)
    }
    
    return stream
  }, [])

  const deviceConstraint = (deviceId: string | null | undefined): MediaTrackConstraints | boolean =>
    deviceId ? { deviceId: { exact: deviceId } } : true

  const callPeer = useCallback(
    async (peerId: string) => {
      if (!signalingRef.current || !signalingRef.current.isConnected()) {
        console.error('[useVideoCall] signaling not connected')
        return
      }

      console.debug('[useVideoCall] calling peer:', peerId)

      const pc = createPeerConnection(
        peerId,
        (stream) => {
          setRemoteStreams(prev => ({ ...prev, [peerId]: stream }))
        },
        (candidate) => {
          signalingRef.current?.send({
            type: 'ice-candidate',
            payload: { to_user_id: peerId, candidate },
          } as any)
        }
      )

      pcsRef.current[peerId] = pc
      if (localStream) {
        localStream.getTracks().forEach(t => pc.addTrack(t, localStream))
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      await signalingRef.current.send({
        type: 'offer',
        payload: { to_user_id: peerId, sdp: pc.localDescription },
      } as any)
    },
    [localStream]
  )

  const joinRoom = useCallback(
    async (room: string, publish: boolean = true) => {
      if (!room || !userId) return

      console.debug('[useVideoCall] joining room:', room)

      // Use room name as call ID (simpler, avoids RLS issues on initial join)
      const actualCallId = room
      setCallId(actualCallId)

      // Create signaling client
      try {
        signalingRef.current = await createSupabaseSignalingClient(actualCallId, userId)
        console.debug('[useVideoCall] signaling connected')
      } catch (err) {
        console.error('[useVideoCall] failed to initialize signaling:', err)
        return
      }

      // Register message handler once
      if (!signalingRef.current._messageHandlerRegistered) {
        signalingRef.current.onMessage(async (msg: SignalMessage) => {
          const { type, payload } = msg
          console.debug('[useVideoCall] received message:', type)

          if (type === 'offer') {
            const { from_user_id: fromUserId, payload: { sdp } } = msg
            const peerId = fromUserId
            if (!peerId) return

            const pc = createPeerConnection(
              peerId,
              (stream) => {
                setRemoteStreams(prev => ({ ...prev, [peerId]: stream }))
              },
              (candidate) => {
                signalingRef.current?.send({
                  type: 'ice-candidate',
                  payload: { to_user_id: fromUserId, candidate },
                } as any)
              }
            )

            pcsRef.current[peerId] = pc

            if (localStream && publish) {
              localStream.getTracks().forEach(t => pc.addTrack(t, localStream))
            }

            await pc.setRemoteDescription(new RTCSessionDescription(sdp))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            await signalingRef.current?.send({
              type: 'answer',
              payload: { to_user_id: fromUserId, sdp: pc.localDescription },
            } as any)
          }

          if (type === 'answer') {
            const { from_user_id: fromUserId, payload: { sdp } } = msg
            if (!fromUserId) return
            const pc = pcsRef.current[fromUserId]
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(sdp))
            }
          }

          if (type === 'ice-candidate') {
            const { from_user_id: fromUserId, payload: { candidate } } = msg
            if (!fromUserId) return
            const pc = pcsRef.current[fromUserId]
            if (pc && candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error)
            }
          }

          if (type === 'screen-share-start') {
            const { from_user_id: fromUserId } = msg
            if (!fromUserId) return
            setScreenSharePeerId(fromUserId)
            console.debug('[useVideoCall] screen share started by:', fromUserId)
          }

          if (type === 'screen-share-stop') {
            const { from_user_id: fromUserId } = msg
            setScreenSharePeerId(prev => prev === fromUserId ? null : prev)
            console.debug('[useVideoCall] screen share stopped by:', fromUserId)
          }
        })
        signalingRef.current._messageHandlerRegistered = true
      }
    },
    [userId, localStream]
  )

  const leave = useCallback(() => {
    console.debug('[useVideoCall] leaving call')
    
    // Close all peer connections
    Object.values(pcsRef.current).forEach(pc => pc.close())
    pcsRef.current = {}

    // Stop local media
    stopMedia(localStream)
    setLocalStream(null)
    setRemoteStreams({})

    // Close signaling
    signalingRef.current?.close()
    signalingRef.current = null
  }, [localStream])

  const toggleAudio = useCallback((enabled: boolean) => {
    if (!localStream) return false
    
    localStream.getAudioTracks().forEach(track => {
      track.enabled = enabled
    })
    
    console.debug('[useVideoCall] audio toggled:', enabled)
    return true
  }, [localStream])

  const toggleVideo = useCallback((enabled: boolean) => {
    if (!localStream) return false
    
    localStream.getVideoTracks().forEach(track => {
      track.enabled = enabled
    })
    
    console.debug('[useVideoCall] video toggled:', enabled)
    return true
  }, [localStream])

  const switchAudioInput = useCallback(async (deviceId: string) => {
    try {
      // Stop current audio tracks
      if (localStream) {
        localStream.getAudioTracks().forEach(t => t.stop())
      }

      // Get new audio stream with specified device
      const newStream = await getLocalMedia({
        audio: deviceConstraint(deviceId),
        video: deviceConstraint(currentVideoInput),
      })

      // Replace audio tracks in all peer connections
      const audioTrack = newStream.getAudioTracks()[0]
      if (audioTrack) {
        for (const pc of Object.values(pcsRef.current)) {
          const sender = pc.getSenders().find(s => s.track?.kind === 'audio')
          if (sender) {
            await sender.replaceTrack(audioTrack)
          }
        }
      }

      // Update local stream
      if (localStream) {
        localStream.addTrack(audioTrack)
      } else {
        setLocalStream(newStream)
      }

      setCurrentAudioInput(deviceId)
      console.debug('[useVideoCall] audio input switched to:', deviceId)
    } catch (err) {
      console.error('[useVideoCall] failed to switch audio input:', err)
    }
  }, [localStream, currentVideoInput])

  const switchVideoInput = useCallback(async (deviceId: string) => {
    try {
      // Stop current video tracks
      if (localStream) {
        localStream.getVideoTracks().forEach(t => t.stop())
      }

      // Get new video stream with specified device
      const newStream = await getLocalMedia({
        audio: deviceConstraint(currentAudioInput),
        video: deviceConstraint(deviceId),
      })

      // Replace video tracks in all peer connections
      const videoTrack = newStream.getVideoTracks()[0]
      if (videoTrack) {
        for (const pc of Object.values(pcsRef.current)) {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          if (sender) {
            await sender.replaceTrack(videoTrack)
          }
        }
      }

      // Update local stream
      if (localStream) {
        localStream.addTrack(videoTrack)
      } else {
        setLocalStream(newStream)
      }

      setCurrentVideoInput(deviceId)
      console.debug('[useVideoCall] video input switched to:', deviceId)
    } catch (err) {
      console.error('[useVideoCall] failed to switch video input:', err)
    }
  }, [localStream, currentAudioInput])

  const switchAudioOutput = useCallback((deviceId: string) => {
    // Audio output can only be set on audio elements, not on MediaStream
    // This would need to be handled in the component by setting the sinkId
    setCurrentAudioOutput(deviceId)
    console.debug('[useVideoCall] audio output switched to:', deviceId)
  }, [])

  const reconnect = useCallback(async (room: string, publish: boolean = true) => {
    if (reconnectAttemptsRef.current >= maxReconnectAttemptsRef.current) {
      console.error('[useVideoCall] Max reconnection attempts reached')
      setReconnecting(false)
      return
    }

    reconnectAttemptsRef.current += 1
    setReconnecting(true)

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.pow(2, reconnectAttemptsRef.current - 1) * 1000

    reconnectTimeoutRef.current = setTimeout(async () => {
      console.debug('[useVideoCall] Attempting to reconnect...', reconnectAttemptsRef.current)
      try {
        await joinRoom(room, publish)
        reconnectAttemptsRef.current = 0
        setReconnecting(false)
      } catch (err) {
        console.error('[useVideoCall] Reconnection attempt failed:', err)
        // Will retry again with exponential backoff
      }
    }, delay)
  }, [joinRoom])

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
        audio: false,
      })

      // Replace video tracks with screen share
      const videoTrack = screenStream.getVideoTracks()[0]
      if (videoTrack) {
        for (const pc of Object.values(pcsRef.current)) {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          if (sender) {
            await sender.replaceTrack(videoTrack)
          }
        }

        // Broadcast screen share start event
        signalingRef.current?.send({
          type: 'screen-share-start',
          payload: {},
        } as any)

        // Handle stop sharing
        videoTrack.onended = async () => {
          console.debug('[useVideoCall] Screen share stopped')
          
          // Broadcast screen share stop event
          signalingRef.current?.send({
            type: 'screen-share-stop',
            payload: {},
          } as any)

          if (localStream) {
            const cameraTrack = localStream.getVideoTracks()[0]
            if (cameraTrack) {
              for (const pc of Object.values(pcsRef.current)) {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video')
                if (sender) {
                  await sender.replaceTrack(cameraTrack)
                }
              }
            }
          }
        }
      }

      console.debug('[useVideoCall] Screen share started')
      return screenStream
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        console.debug('[useVideoCall] User cancelled screen share')
      } else {
        console.error('[useVideoCall] Failed to start screen share:', err)
      }
      throw err
    }
  }, [localStream])

  const stopScreenShare = useCallback(async () => {
    try {
      if (localStream) {
        const cameraTrack = localStream.getVideoTracks()[0]
        if (cameraTrack) {
          for (const pc of Object.values(pcsRef.current)) {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video')
            if (sender) {
              await sender.replaceTrack(cameraTrack)
            }
          }
        }
      }

      // Broadcast screen share stop event
      signalingRef.current?.send({
        type: 'screen-share-stop',
        payload: {},
      } as any)

      console.debug('[useVideoCall] Screen share stopped')
    } catch (err) {
      console.error('[useVideoCall] Failed to stop screen share:', err)
      throw err
    }
  }, [localStream])

  return {
    startLocal,
    joinRoom,
    callPeer,
    leave,
    localStream,
    remoteStreams,
    toggleAudio,
    toggleVideo,
    switchAudioInput,
    switchVideoInput,
    switchAudioOutput,
    reconnect,
    reconnecting,
    reconnectAttempts: reconnectAttemptsRef.current,
    startScreenShare,
    stopScreenShare,
    screenSharePeerId,
    currentAudioInput,
    currentVideoInput,
    currentAudioOutput,
    signalingClient: signalingRef.current,
    userId,
  }
}
