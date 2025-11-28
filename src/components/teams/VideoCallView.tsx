import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useVideoCall } from '@/hooks/useVideoCall'
import { useTheme } from '@/context/ThemeContext'
import { useAudioLevel } from '@/hooks/useAudioLevel'
import { useVideoChat } from '@/hooks/useVideoChat'
import { AlertCircle, Mic, MicOff, Video, VideoOff, PhoneOff, Settings, Maximize2, Minimize2, Monitor, MessageSquare, Users } from 'lucide-react'
import VideoCallSettings from './VideoCallSettings'
import ScreenShareDisplay from './ScreenShareDisplay'
import ChatPanel from '../calls/ChatPanel'
import ParticipantsList from './ParticipantsList'

interface VideoCallViewProps {
  roomId: string
  mode?: 'lecture' | 'video'
  initiator?: boolean
  onLeave?: () => void
  participantNames?: Record<string, string>
}

// Separate component to prevent re-renders
function LocalVideoElement({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!ref.current) return

    if (stream) {
      ref.current.srcObject = stream
      console.debug('[VideoCallView] setting local stream')
    }

    return () => {
      // Cleanup: clear srcObject on unmount
      if (ref.current && ref.current.srcObject === stream) {
        ref.current.srcObject = null
      }
    }
  }, [stream])

  return (
    <video ref={ref} autoPlay muted playsInline className="w-full h-full object-cover rounded-2xl" />
  )
}

// Separate component for each remote video
function RemoteVideoElement({ stream, peerId }: { stream: MediaStream; peerId: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!ref.current) return

    if (stream) {
      ref.current.srcObject = stream
      console.debug('[VideoCallView] setting remote stream for peer:', peerId)
    }

    return () => {
      // Cleanup: clear srcObject on unmount
      if (ref.current && ref.current.srcObject === stream) {
        ref.current.srcObject = null
      }
    }
  }, [stream, peerId])

  return (
    <video
      autoPlay
      playsInline
      ref={ref}
      className="w-full h-full object-cover rounded-2xl"
    />
  )
}

export default function VideoCallView({ roomId, mode = 'video', initiator = false, onLeave, participantNames = {} }: VideoCallViewProps) {
  const { startLocal, joinRoom, leave, localStream, remoteStreams, toggleAudio, toggleVideo, switchAudioInput, switchVideoInput, switchAudioOutput, currentAudioInput, currentVideoInput, currentAudioOutput, startScreenShare, stopScreenShare, screenSharePeerId, signalingClient, userId } = useVideoCall(roomId)
  const { theme } = useTheme()
  const { audioLevel } = useAudioLevel(localStream)
  const { messages, isTyping, sendMessage, sendTypingIndicator, clearMessages } = useVideoChat(signalingClient, userId || null)
  const isDark = theme === 'dark'
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hoveredControl, setHoveredControl] = useState<string | null>(null)
  const [callDuration, setCallDuration] = useState('00:00')
  const [showSettings, setShowSettings] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const setupRef = useRef(false)
  const callStartTimeRef = useRef<Date>(new Date())
  const containerRef = useRef<HTMLDivElement>(null)
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({})

  // Monitor connection state
  useEffect(() => {
    if (Object.keys(remoteStreams).length > 0) {
      setConnectionStatus('connected')
    } else if (Object.keys(remoteStreams).length === 0 && !isConnecting) {
      setConnectionStatus('disconnected')
    }
  }, [remoteStreams, isConnecting])

  const remoteEntries = useMemo(() => Object.entries(remoteStreams), [remoteStreams])
  const participantCount = remoteEntries.length + (localStream ? 1 : 0)

  const handleLeave = () => {
    leave()
    onLeave?.()
  }

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      try {
        await stopScreenShare()
        setIsScreenSharing(false)
      } catch (err) {
        console.error('Failed to stop screen share:', err)
      }
    } else {
      try {
        await startScreenShare()
        setIsScreenSharing(true)
      } catch (err) {
        console.error('Failed to start screen share:', err)
      }
    }
  }

  useEffect(() => {
    if (!roomId || setupRef.current) return

    async function setup() {
      try {
        setConnectionError(null)
        setIsConnecting(true)
        if (initiator) {
          await startLocal()
          await joinRoom(roomId, true)
        } else {
          if (mode === 'video') {
            await startLocal()
            await joinRoom(roomId, true)
          } else {
            await joinRoom(roomId, false)
          }
        }
        setIsConnecting(false)
      } catch (err: any) {
        console.error('[VideoCallView] setup error', err)
        setConnectionError(err?.message || 'Failed to connect to call')
        setIsConnecting(false)
      }
    }

    setupRef.current = true
    setup()

    return () => {
      // cleanup handled by hook
    }
  }, [roomId, mode, initiator, startLocal, joinRoom])

  // Sync UI state with actual track state on stream change
  useEffect(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      const videoTrack = localStream.getVideoTracks()[0]

      if (audioTrack) {
        setIsMuted(!audioTrack.enabled)
      }
      if (videoTrack) {
        setIsVideoOff(!videoTrack.enabled)
      }
    }
  }, [localStream])

  // Call duration timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const diff = Math.floor((now.getTime() - callStartTimeRef.current.getTime()) / 1000)
      const minutes = Math.floor(diff / 60)
      const seconds = diff % 60
      setCallDuration(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+M: Mute/Unmute
      if (e.altKey && e.key === 'm') {
        e.preventDefault()
        const newState = !isMuted
        if (toggleAudio(!newState)) {
          setIsMuted(newState)
        }
      }

      // Alt+V: Toggle video
      if (e.altKey && e.key === 'v') {
        e.preventDefault()
        const newState = !isVideoOff
        if (toggleVideo(!newState)) {
          setIsVideoOff(newState)
        }
      }

      // Alt+Q: Leave call
      if (e.altKey && e.key === 'q') {
        e.preventDefault()
        handleLeave()
      }

      // Alt+S: Toggle screen share
      if (e.altKey && e.key === 's') {
        e.preventDefault()
        handleScreenShare()
      }

      // F: Fullscreen
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        if (!isFullscreen && containerRef.current) {
          containerRef.current.requestFullscreen().then(() => {
            setIsFullscreen(true)
          }).catch(err => console.error('Failed to enter fullscreen:', err))
        } else if (isFullscreen && document.fullscreenElement) {
          document.exitFullscreen().then(() => {
            setIsFullscreen(false)
          }).catch(err => console.error('Failed to exit fullscreen:', err))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMuted, isVideoOff, isScreenSharing, isFullscreen, toggleAudio, toggleVideo, handleLeave, handleScreenShare])

  const ControlButton = ({ 
    icon: Icon, 
    label, 
    onClick, 
    variant = 'default',
    id 
  }: { 
    icon: React.ReactNode
    label: string
    onClick: () => void
    variant?: 'default' | 'danger'
    id: string
  }) => {
    const [isClicked, setIsClicked] = useState(false)

    const handleClick = () => {
      setIsClicked(true)
      onClick()
      setTimeout(() => setIsClicked(false), 200)
    }

    return (
      <button
        onClick={handleClick}
        title={label}
        className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-150 ${
          isClicked ? 'scale-95' : 'scale-100'
        } ${
          variant === 'danger'
            ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg hover:shadow-red-500/50'
            : 'bg-gradient-to-br from-slate-600/80 to-slate-700/80 backdrop-blur-sm'
        }`}
      >
        <div className="text-white text-lg">
          {Icon}
        </div>
      </button>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden relative ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}
    >
      {/* Background gradient effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl animate-pulse"></div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col relative z-10">
        {isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center z-40 bg-slate-950/50 backdrop-blur-sm rounded-3xl">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin mx-auto mb-4"></div>
              <p className="text-slate-300 text-lg font-medium">Connecting to call...</p>
              <p className="text-slate-400 text-sm mt-2">Setting up your devices</p>
            </div>
          </div>
        )}
        {mode === 'lecture' ? (
          // LECTURE MODE
          <div className="flex-1 flex flex-col">
            {/* Speaker video - Full screen */}
            <div className="flex-1 relative group">
              {initiator ? (
                <div className="w-full h-full relative">
                  <div className="absolute inset-0 rounded-3xl overflow-hidden">
                    <LocalVideoElement stream={localStream} />
                  </div>
                  {/* Speaker badge */}
                  <div className="absolute top-6 left-6 z-20 px-4 py-2 bg-gradient-to-r from-blue-500/90 to-blue-600/90 rounded-full text-white text-sm font-semibold flex items-center gap-2 backdrop-blur-sm">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    You are speaking
                  </div>
                </div>
              ) : remoteEntries.length > 0 ? (
                <div className="w-full h-full relative">
                  <div className="absolute inset-0 rounded-3xl overflow-hidden">
                    <RemoteVideoElement stream={remoteEntries[0][1]} peerId={remoteEntries[0][0]} />
                  </div>
                  {/* Speaker info */}
                  <div className="absolute top-6 left-6 z-20 px-4 py-2 bg-gradient-to-r from-emerald-500/90 to-emerald-600/90 rounded-full text-white text-sm font-semibold flex items-center gap-2 backdrop-blur-sm">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    Speaker is live
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-slate-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    <p className="text-slate-300 text-lg">Waiting for speaker...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Audience viewers - Bottom bar */}
            {remoteEntries.length > 0 && (
              <div className="h-24 bg-gradient-to-t from-slate-900 to-transparent px-6 py-4 flex items-center gap-4 overflow-x-auto">
                <p className="text-slate-400 text-sm font-medium whitespace-nowrap">Audience:</p>
                {remoteEntries.map(([id]) => (
                  <div key={id} className="flex flex-col items-center gap-1">
                    <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-slate-600/50">
                      <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    <p className="text-slate-300 text-xs font-medium text-center truncate w-16">
                      {participantNames[id] || `Participant ${id.slice(0, 6)}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // VIDEO CHAT MODE
          <div className={`flex-1 flex flex-col p-4 gap-4 ${screenSharePeerId ? 'lg:flex-row' : 'lg:flex-row'}`}>
            {/* Left panel - local video */}
            <div className="flex flex-col gap-4 flex-shrink-0">
              {/* Local video - bigger square size on left */}
              <div className="flex flex-col gap-2">
                <div className="relative w-56 h-56 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700/50 shadow-lg group">
                  <LocalVideoElement stream={localStream} />
                  
                  {/* Local video badge */}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-900/80 text-white text-xs font-semibold rounded-full backdrop-blur-sm border border-slate-600/50">
                    You
                  </div>
                  
                {/* Status indicator */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`}></div>
                  {isVideoOff && <span className="text-white text-xs font-semibold px-1.5 py-0.25 bg-red-600/70 rounded text-center">Camera Off</span>}
                </div>

                {/* Audio level indicator */}
                {!isMuted && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-1">
                    <div className="flex items-center gap-0.5 bg-slate-900/80 rounded-full px-1.5 py-0.5 backdrop-blur-sm border border-slate-600/50">
                      <div className="flex gap-0.5">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-0.5 h-2 rounded-sm transition-all duration-75 ${
                              audioLevel > i * 33
                                ? 'bg-emerald-400'
                                : 'bg-slate-600/50'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>

            {/* Center/Right panel - screen share or main content */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              {/* Screen share display - takes priority if active */}
              {screenSharePeerId && remoteStreams[screenSharePeerId] && (
                <div className="flex-1 min-h-0">
                  <ScreenShareDisplay 
                    stream={remoteStreams[screenSharePeerId]}
                    sharerName={participantNames[screenSharePeerId] || `Participant ${screenSharePeerId.slice(0, 6)}`}
                  />
                </div>
              )}

              {/* Other participants */}
              {remoteEntries.length > 0 && (
                <div className={screenSharePeerId ? 'h-32 overflow-x-auto' : 'flex-1 overflow-y-auto min-h-0'}>
                  <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider sticky top-0 bg-slate-950/80 backdrop-blur-sm py-1">
                    {screenSharePeerId ? 'Participants' : 'Other Participants'}
                  </p>
                  <div className={screenSharePeerId ? 'flex gap-3 overflow-x-auto pb-2' : 'grid grid-cols-1 gap-3'}>
                    {remoteEntries
                      .filter(([id]) => id !== screenSharePeerId) // Don't show screen sharer in participant list
                      .map(([id, stream]) => (
                        <div
                          key={id}
                          className={`relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-md group flex-shrink-0 ${
                            screenSharePeerId ? 'w-40 h-24 aspect-auto' : 'aspect-video'
                          }`}
                        >
                          <RemoteVideoElement stream={stream} peerId={id} />
                          
                          {/* Remote video label */}
                          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-slate-900/80 text-white text-xs font-semibold rounded backdrop-blur-sm border border-slate-600/50">
                            {participantNames[id] || `Participant ${id.slice(0, 6)}`}
                          </div>
                          
                          {/* Connection status */}
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5">
                            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`}></div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* No participants state */}
              {remoteEntries.length === 0 && !screenSharePeerId && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mx-auto mb-6 animate-pulse">
                      <svg className="w-12 h-12 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    <p className="text-slate-300 text-lg font-medium">Waiting for participants...</p>
                    <p className="text-slate-400 text-sm mt-2">Share the call link to invite others</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Control Bar - Bottom */}
      <div className="relative z-20 px-4 py-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
        <div className="flex items-center justify-between max-w-full mx-auto gap-4 flex-wrap">
          {/* Left: Participant count */}
          <div className="flex items-center gap-2 text-sm">
            <div className="px-3 py-1.5 bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-full backdrop-blur-sm border border-slate-600/30">
              <span className="text-slate-300 text-xs font-medium">
                <span className="text-blue-400 font-semibold">{participantCount}</span> {participantCount !== 1 ? 'participants' : 'participant'}
              </span>
            </div>
          </div>

          {/* Center: Controls */}
          <div className="flex items-center gap-2">
            <ControlButton
              id="mute"
              icon={isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              label={isMuted ? 'Unmute' : 'Mute'}
              onClick={() => {
                const newState = !isMuted
                if (toggleAudio(!newState)) {
                  setIsMuted(newState)
                }
              }}
            />
            <ControlButton
              id="video"
              icon={isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              label={isVideoOff ? 'Start Camera' : 'Stop Camera'}
              onClick={() => {
                const newState = !isVideoOff
                if (toggleVideo(!newState)) {
                  setIsVideoOff(newState)
                }
              }}
            />
            <ControlButton
              id="participants"
              icon={<Users className="w-5 h-5" />}
              label="Participants"
              onClick={() => setShowParticipants(!showParticipants)}
            />
            <ControlButton
              id="settings"
              icon={<Settings className="w-5 h-5" />}
              label="Settings"
              onClick={() => setShowSettings(true)}
            />
            <ControlButton
              id="share"
              icon={<Monitor className="w-5 h-5" />}
              label={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
              onClick={handleScreenShare}
            />
            <ControlButton
              id="chat"
              icon={<MessageSquare className="w-5 h-5" />}
              label="Chat"
              onClick={() => setShowChat(!showChat)}
            />
            <ControlButton
              id="fullscreen"
              icon={isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              onClick={async () => {
                if (!isFullscreen && containerRef.current) {
                  try {
                    await containerRef.current.requestFullscreen()
                    setIsFullscreen(true)
                  } catch (err) {
                    console.error('Failed to enter fullscreen:', err)
                  }
                } else if (isFullscreen && document.fullscreenElement) {
                  try {
                    await document.exitFullscreen()
                    setIsFullscreen(false)
                  } catch (err) {
                    console.error('Failed to exit fullscreen:', err)
                  }
                }
              }}
            />
            <ControlButton
              id="leave"
              icon={<PhoneOff className="w-5 h-5" />}
              label="Leave Call"
              variant="danger"
              onClick={handleLeave}
            />
          </div>

          {/* Right: Call duration */}
          <div className="px-3 py-1.5 bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-full backdrop-blur-sm border border-slate-600/30">
            <span className="text-slate-300 text-xs font-medium flex items-center gap-2 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono text-xs">{callDuration}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Error Dialog */}
      {connectionError && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 max-w-md w-full border border-slate-700/50 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Connection Error</h3>
            </div>
            <p className="text-slate-300 mb-6">{connectionError}</p>
            <button
              onClick={() => {
                setConnectionError(null)
                onLeave?.()
              }}
              className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <VideoCallSettings
          onClose={() => setShowSettings(false)}
          onAudioDeviceChange={switchAudioInput}
          onVideoDeviceChange={switchVideoInput}
          onAudioOutputChange={switchAudioOutput}
          currentAudioInput={currentAudioInput || undefined}
          currentVideoInput={currentVideoInput || undefined}
          currentAudioOutput={currentAudioOutput || undefined}
        />
      )}

      {/* Chat Panel - Right side overlay */}
      {showChat && (
        <div className="fixed right-4 bottom-24 w-80 h-96 z-40 shadow-2xl">
          <ChatPanel
            isOpen={showChat}
            messages={messages}
            isTyping={isTyping}
            onSendMessage={sendMessage}
            onSendTypingIndicator={sendTypingIndicator}
            onClose={() => setShowChat(false)}
          />
        </div>
      )}

      {/* Participants Panel - Left side overlay */}
      {showParticipants && (
        <div className="fixed left-4 bottom-24 w-80 h-96 z-40 shadow-2xl">
          <ParticipantsList
            isOpen={showParticipants}
            participants={remoteEntries}
            participantNames={participantNames}
            onClose={() => setShowParticipants(false)}
            isLectureMode={mode === 'lecture'}
            isInitiator={initiator}
          />
        </div>
      )}
    </div>
  )
}
