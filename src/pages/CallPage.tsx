import React from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import VideoCallView from '@/components/teams/VideoCallView'

export default function CallPage() {
  const { roomId } = useParams()
  const { search } = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(search)
  const mode = (params.get('mode') as 'lecture' | 'video') || 'video'
  const initiator = params.get('initiator') === '1'

  if (!roomId) return <div className="p-6">No room specified</div>

  const handleLeave = () => {
    navigate(`/app/teams`)
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <h2 className="text-xl font-semibold mb-4">Team Call — {roomId}</h2>
      <VideoCallView roomId={roomId} mode={mode} initiator={initiator} onLeave={handleLeave} />
    </div>
  )
}
