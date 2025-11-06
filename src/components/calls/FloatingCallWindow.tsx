// src/components/calls/FloatingCallWindow.tsx
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Phone, Maximize2, X } from 'lucide-react'
import { DailyCall } from '@/lib/daily'

interface FloatingCallWindowProps {
  call: DailyCall | null
  participantCount: number
  onMaximize: () => void
  onLeave: () => void
}

export function FloatingCallWindow({ 
  call, 
  participantCount,
  onMaximize, 
  onLeave 
}: FloatingCallWindowProps) {
  if (!call) return null

  return (
    <Card className="fixed bottom-6 right-6 w-80 shadow-2xl border-slate-200 z-50 overflow-hidden">
      {/* Video Preview */}
      <div className="relative h-48 bg-slate-900">
        <iframe
          src={call.room_url}
          allow="camera; microphone; display-capture; autoplay"
          className="w-full h-full border-none pointer-events-none"
        />
        
        {/* Overlay Controls */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-white text-sm font-semibold">In call</span>
              </div>
              <p className="text-white/80 text-xs">{participantCount} participants</p>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onMaximize}
                className="h-8 w-8 p-0 rounded-full bg-white/20 hover:bg-white/30 text-white"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onLeave}
                className="h-8 w-8 p-0 rounded-full bg-red-500/80 hover:bg-red-500 text-white"
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}