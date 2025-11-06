// src/components/calls/CallBanner.tsx
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Phone, Users, X } from 'lucide-react'
import { DailyCall, CallParticipant } from '@/lib/daily'

interface CallBannerProps {
  call: DailyCall
  participants: CallParticipant[]
  isInCall: boolean
  onJoin: () => void
  onDismiss: () => void
}

export function CallBanner({ 
  call, 
  participants, 
  isInCall,
  onJoin, 
  onDismiss 
}: CallBannerProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getAvatarColor = (userId: string) => {
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-emerald-500 to-teal-500',
      'from-amber-500 to-orange-500',
    ]
    const index = parseInt(userId.slice(0, 8), 16) % colors.length
    return colors[index]
  }

  return (
    <Card className="mb-4 border-green-200 bg-green-50 shadow-sm">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Pulse indicator */}
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
            </div>

            {/* Call info */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-green-900">
                  {isInCall ? 'You are in a call' : 'Call in progress'}
                </h3>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {participants.slice(0, 4).map((participant: any) => (
                    <Avatar key={participant.id} className="h-6 w-6 border-2 border-white">
                      <AvatarFallback 
                        className={`bg-gradient-to-br ${getAvatarColor(participant.user_id)} text-white text-xs`}
                      >
                        {getInitials(participant.user?.full_name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-sm text-green-700">
                  {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!isInCall && (
              <Button
                onClick={onJoin}
                className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg shadow-green-600/30"
              >
                <Phone className="h-4 w-4 mr-2" />
                Join Call
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="rounded-lg text-green-700 hover:bg-green-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}