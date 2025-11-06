// src/hooks/useTeamCall.ts
import { useState, useEffect, useCallback } from 'react'
import { DailyClient, DailyCall, CallParticipant } from '@/lib/daily'
import { useAuth } from '@/lib/auth'
import { useToast } from './use-toast'

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
      loadActiveCall()
    }
  }, [teamId])

  // Subscribe to call changes
  useEffect(() => {
    if (!teamId) return

    const unsubscribe = DailyClient.subscribeToCallChanges(teamId, (call) => {
      setActiveCall(call)
      if (!call) {
        setIsInCall(false)
        setParticipants([])
      }
    })

    return unsubscribe
  }, [teamId])

  // Subscribe to participant changes when in a call
  useEffect(() => {
    if (!activeCall?.id) return

    const unsubscribe = DailyClient.subscribeToParticipantChanges(
      activeCall.id,
      (newParticipants) => {
        setParticipants(newParticipants)
      }
    )

    return unsubscribe
  }, [activeCall?.id])

  const loadActiveCall = async () => {
    try {
      setLoading(true)
      const call = await DailyClient.getActiveCall(teamId)
      setActiveCall(call)
      
      if (call) {
        const activeParticipants = await DailyClient.getActiveParticipants(call.id)
        setParticipants(activeParticipants)
        
        // Check if current user is in the call
        const userInCall = activeParticipants.some(p => p.user_id === user?.id)
        setIsInCall(userInCall)
      }
    } catch (error) {
      console.error('Error loading active call:', error)
    } finally {
      setLoading(false)
    }
  }

  const startCall = async () => {
    if (!user || !teamId || !teamName) return

    try {
      setIsCreating(true)
      
      const call = await DailyClient.createRoom(teamId, teamName)
      setActiveCall(call)
      setIsInCall(true)

      toast({
        title: 'Call started',
        description: 'Team members can now join the call',
      })

      return call
    } catch (error: any) {
      console.error('Error starting call:', error)
      toast({
        title: 'Failed to start call',
        description: error.message || 'Please try again',
        variant: 'destructive',
      })
      throw error
    } finally {
      setIsCreating(false)
    }
  }

  const joinCall = useCallback(async () => {
    if (!activeCall || !user) return

    try {
      await DailyClient.joinCall(activeCall.id, user.id)
      setIsInCall(true)
      
      toast({
        title: 'Joined call',
        description: 'You are now in the call',
      })
    } catch (error: any) {
      console.error('Error joining call:', error)
      toast({
        title: 'Failed to join call',
        description: error.message || 'Please try again',
        variant: 'destructive',
      })
    }
  }, [activeCall, user, toast])

  const leaveCall = useCallback(async () => {
    if (!activeCall || !user) return

    try {
      await DailyClient.leaveCall(activeCall.id, user.id)
      setIsInCall(false)
      
      toast({
        title: 'Left call',
        description: 'You have left the call',
      })
    } catch (error: any) {
      console.error('Error leaving call:', error)
      toast({
        title: 'Failed to leave call',
        description: error.message || 'Please try again',
        variant: 'destructive',
      })
    }
  }, [activeCall, user, toast])

  const endCall = async () => {
    if (!activeCall) return

    try {
      setIsEnding(true)
      
      const result = await DailyClient.endRoom(activeCall.id)
      setActiveCall(null)
      setIsInCall(false)
      setParticipants([])

      toast({
        title: 'Call ended',
        description: `Duration: ${result.duration} • ${result.participants} participants`,
      })
    } catch (error: any) {
      console.error('Error ending call:', error)
      toast({
        title: 'Failed to end call',
        description: error.message || 'Please try again',
        variant: 'destructive',
      })
      throw error
    } finally {
      setIsEnding(false)
    }
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