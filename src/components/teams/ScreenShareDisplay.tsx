import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { colors } from '@/lib/theme'

interface ScreenShareDisplayProps {
  stream: MediaStream | null
  sharerName: string
  onClose?: () => void
}

export default function ScreenShareDisplay({ stream, sharerName, onClose }: ScreenShareDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!videoRef.current) return

    if (stream) {
      videoRef.current.srcObject = stream
      console.debug('[ScreenShareDisplay] setting screen share stream')
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject === stream) {
        videoRef.current.srcObject = null
      }
    }
  }, [stream])

  if (!stream) return null

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700/50 shadow-2xl group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />

      {/* Screen share badge */}
      <div className="absolute top-4 left-4 px-4 py-2 bg-gradient-to-r from-purple-500/90 to-purple-600/90 rounded-full text-white text-sm font-semibold flex items-center gap-2 backdrop-blur-sm border border-purple-400/50 z-10">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        {sharerName} sharing screen
      </div>

      {/* Close button (if provided) */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-destructive/80 hover:bg-destructive flex items-center justify-center text-white transition-all duration-300 z-10 backdrop-blur-sm"
          title="Close screen share"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Screen share indicator bottom right */}
      <div className={`absolute bottom-4 right-4 px-3 py-1.5 bg-[${colors.neutral.darker}]/80 text-white text-xs font-semibold rounded-full backdrop-blur-sm border border-[${colors.neutral.main}]/50`}>
        Screen Share
      </div>
    </div>
  )
}
