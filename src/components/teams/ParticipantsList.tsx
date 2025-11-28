import React, { useState } from 'react'
import { X, Users, Mic, MicOff, Video, VideoOff } from 'lucide-react'

interface Participant {
  id: string
  stream?: MediaStream
}

interface ParticipantsListProps {
  isOpen: boolean
  participants: [string, MediaStream][]
  participantNames: Record<string, string>
  onClose: () => void
  isLectureMode?: boolean
  isInitiator?: boolean
}

export default function ParticipantsList({
  isOpen,
  participants,
  participantNames,
  onClose,
  isLectureMode = false,
  isInitiator = false,
}: ParticipantsListProps) {
  const [muteStates, setMuteStates] = useState<Record<string, boolean>>({})

  if (!isOpen) return null

  const handleMuteParticipant = (participantId: string) => {
    setMuteStates(prev => ({
      ...prev,
      [participantId]: !prev[participantId],
    }))
    // In a real implementation, this would send a signal to the participant
    console.debug('[ParticipantsList] Toggle mute for:', participantId)
  }

  const handleRemoveParticipant = (participantId: string) => {
    // In a real implementation, this would disconnect the peer
    console.debug('[ParticipantsList] Remove participant:', participantId)
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700/50 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-900">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">
            Participants ({participants.length + 1})
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {participants.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No other participants</p>
            </div>
          </div>
        ) : (
          participants.map(([participantId, stream]) => {
            const name = participantNames[participantId] || `Participant ${participantId.slice(0, 6)}`
            const hasAudio = stream?.getAudioTracks().some(t => t.enabled) ?? false
            const hasVideo = stream?.getVideoTracks().some(t => t.enabled) ?? false
            const isMuted = muteStates[participantId] ?? false

            return (
              <div
                key={participantId}
                className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors border border-slate-600/30"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{name}</p>
                    <p className="text-xs text-slate-400 truncate">{participantId.slice(0, 8)}...</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {hasAudio ? (
                      <div className="w-5 h-5 flex items-center justify-center rounded bg-emerald-500/20">
                        <Mic className="w-3 h-3 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 flex items-center justify-center rounded bg-red-500/20">
                        <MicOff className="w-3 h-3 text-red-400" />
                      </div>
                    )}
                    {hasVideo ? (
                      <div className="w-5 h-5 flex items-center justify-center rounded bg-emerald-500/20">
                        <Video className="w-3 h-3 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 flex items-center justify-center rounded bg-red-500/20">
                        <VideoOff className="w-3 h-3 text-red-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Host controls for lecture mode */}
                {isLectureMode && isInitiator && (
                  <div className="flex gap-2 pt-2 border-t border-slate-600/30">
                    <button
                      onClick={() => handleMuteParticipant(participantId)}
                      className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                        isMuted
                          ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                          : 'bg-slate-600/50 text-slate-200 hover:bg-slate-600/70'
                      }`}
                    >
                      {isMuted ? 'Unmute' : 'Mute'}
                    </button>
                    <button
                      onClick={() => handleRemoveParticipant(participantId)}
                      className="flex-1 px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer info */}
      <div className="border-t border-slate-700/50 px-3 py-2 bg-slate-950/50">
        <p className="text-xs text-slate-400">
          {isLectureMode ? (
            <>
              {isInitiator ? 'You are the host' : 'You are viewing the lecture'}
            </>
          ) : (
            <>
              {participants.length} other {participants.length !== 1 ? 'participants' : 'participant'}
            </>
          )}
        </p>
      </div>
    </div>
  )
}
