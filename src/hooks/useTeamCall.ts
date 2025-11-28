// src/hooks/useTeamCall.ts
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useToast } from './use-toast'

// NOTE: The legacy Daily.co service was removed. This hook provides a lightweight
// in-app room id generator for starting/joining calls and keeps the same public
// interface for other parts of the app. For production-grade presence and room
// recording, persist rooms in your backend (Supabase) and integrate an SFU.

export interface DailyCall {
  id: string
  team_id: string
  room_url: string
  started_by: string
  started_at: string
  status: 'active' | 'ended'
}

export interface CallParticipant {
  id: string
  call_id: string
  user_id: string
  joined_at: string
}

export function useTeamCall(teamId: string, teamName: string) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeCall, setActiveCall] = useState<DailyCall | null>(null)
  const [participants, setParticipants] = useState<CallParticipant[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [isInCall, setIsInCall] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load active call on mount
  useEffect(() => {
    if (teamId) {
      // In this simplified implementation we don't persist active calls yet.
      // Keep hook interface stable by leaving this placeholder.
      setLoading(false)
    }
  }, [teamId])

  // Subscribe to call changes
  // No realtime subscription in the simplified in-app flow. Persisting
  // rooms and participants in Supabase would be the next step.

  // Subscribe to participant changes when in a call
  // Participants are not tracked server-side in this simplified flow.

  const loadActiveCall = async () => {
    // placeholder for future server-backed active call lookup
    setLoading(false)
  }

  const startCall = async () => {
    if (!user || !teamId || !teamName) return

    try {
      setIsCreating(true)
      // Generate a simple room ID (client-side). For production persist this.
      const id = `${teamId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`
      const roomUrl = `/app/teams/call/${id}`
      const call: DailyCall = {
        id,
        team_id: teamId,
        room_url: roomUrl,
        started_by: user.id,
        started_at: new Date().toISOString(),
        status: 'active',
      }

      setActiveCall(call)
      setIsInCall(true)

      toast({
        title: 'Call started',
        description: 'Room created — share the link to join',
      })

      return call
    } finally {
      setIsCreating(false)
    }
  }

  const joinCall = useCallback(async () => {
    // In the simplified flow, joining is done by navigating to the room URL
    if (!activeCall) return
    setIsInCall(true)
    toast({ title: 'Joined call', description: 'Navigate to the room to join' })
  }, [activeCall, toast])

  const leaveCall = useCallback(async () => {
    // local cleanup only
    setIsInCall(false)
    setActiveCall(null)
    setParticipants([])
    toast({ title: 'Left call', description: 'You have left the call' })
  }, [toast])

  const endCall = async () => {
    // end locally; server-side metrics could be added later
    if (!activeCall) return
    setIsEnding(true)
    setActiveCall(null)
    setIsInCall(false)
    setParticipants([])
    toast({ title: 'Call ended', description: 'Call ended' })
    setIsEnding(false)
  }

  return {
    activeCall,
    participants,
    isCreating,
    isEnding,
    isInCall,
    loading,
    startCall,
    joinCall,
    leaveCall,
    endCall,
    participantCount: participants.length,
    isCallActive: !!activeCall && activeCall.status === 'active',
  }
}