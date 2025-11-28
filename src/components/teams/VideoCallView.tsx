import React, { useEffect, useRef, useState } from 'react'
import { useVideoCall } from '@/hooks/useVideoCall'
import { AlertCircle } from 'lucide-react'

interface VideoCallViewProps {
  roomId: string
  mode?: 'lecture' | 'video'
  initiator?: boolean
  onLeave?: () => void
}

export default function VideoCallView({ roomId, mode = 'video', initiator = false, onLeave }: VideoCallViewProps) {
  const { startLocal, joinRoom, leave, localStream, remoteStreams } = useVideoCall(roomId)
  const localRef = useRef<HTMLVideoElement | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    if (!roomId) return

    async function setup() {
      try {
        setConnectionError(null)
        if (initiator) {
          // initiator publishes in both modes
          await startLocal()
          await joinRoom(roomId, true)
        } else {
          if (mode === 'video') {
            // participants publish in video chat
            await startLocal()
            await joinRoom(roomId, true)
          } else {
            // lecture mode: participants join as listeners (no publish)
            await joinRoom(roomId, false)
          }
        }
      } catch (err: any) {
        console.error('[VideoCallView] setup error', err)
        setConnectionError(err?.message || 'Failed to connect to call')
      }
    }

    setup()

    return () => {
      // cleanup handled by hook
    }
  }, [roomId, mode, initiator, startLocal, joinRoom])

  useEffect(() => {
    if (localRef.current && localStream) {
      localRef.current.srcObject = localStream
    }
  }, [localStream])

  const remoteEntries = Object.entries(remoteStreams)

  return (
    <div className="w-full h-full flex flex-col gap-3 p-3">
      {mode === 'lecture' ? (
        <div className="flex-1 bg-card rounded-lg p-4 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            {initiator ? (
              <video ref={localRef} autoPlay muted playsInline className="rounded-md bg-black w-full h-[60vh] object-cover" />
            ) : (
              remoteEntries.length > 0 ? (
                <video
                  autoPlay
                  playsInline
                  ref={(el) => { if (el) el.srcObject = remoteEntries[0][1] }}
                  className="rounded-md bg-black w-full h-[60vh] object-cover"
                />
              ) : (
                <div className="text-center text-muted-foreground">Waiting for speaker...</div>
              )
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">Mode: Lecture</div>
              <div className="text-xs text-muted-foreground">{initiator ? 'You are the speaker' : 'You are a listener'}</div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => { leave(); onLeave?.() }} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors">Leave</button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {remoteEntries.map(([id, stream]) => (
              <div key={id} className="p-2 bg-muted rounded-md text-xs text-center">Participant {id}</div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-card rounded-lg p-4 flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="col-span-1">
              <div className="text-sm font-semibold mb-2">You</div>
              <video ref={localRef} autoPlay muted playsInline className="rounded-md bg-black w-full h-48 object-cover" />
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-2">
              {remoteEntries.length > 0 ? (
                remoteEntries.map(([id, stream]) => (
                  <video
                    key={id}
                    autoPlay
                    playsInline
                    ref={(el) => { if (el) el.srcObject = stream }}
                    className="rounded-md bg-black w-full h-48 object-cover"
                  />
                ))
              ) : (
                <div className="text-muted-foreground">No participants yet</div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button onClick={() => { leave(); onLeave?.() }} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors">Leave</button>
          </div>
        </div>
      )}

      {connectionError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-semibold">Connection Error</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{connectionError}</p>
            <button
              onClick={() => {
                setConnectionError(null)
                onLeave?.()
              }}
              className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
