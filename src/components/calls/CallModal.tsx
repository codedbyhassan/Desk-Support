// src/components/calls/CallModal.tsx
import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Phone, Minimize2, Maximize2, X } from 'lucide-react'
import TeamCallView from './TeamCallView'
import { DailyCall } from '@/lib/daily'
import { useTheme } from '@/context/ThemeContext'

interface CallModalProps {
  call: DailyCall | null
  isOpen: boolean
  onClose: () => void
  onMinimize: () => void
  onLeave: () => void
}

export function CallModal({ call, isOpen, onClose, onMinimize, onLeave }: CallModalProps) {
  const [isMaximized, setIsMaximized] = useState(true)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    if (!isOpen) {
      setIsMaximized(true)
    }
  }, [isOpen])

  if (!call) return null

  const handleLeave = () => {
    onLeave()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`${
          isMaximized ? 'max-w-7xl h-[90vh]' : 'max-w-4xl h-[70vh]'
        } p-0 gap-0 transition-all duration-300 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isDark
              ? 'border-slate-800 bg-slate-900/80'
              : 'border-slate-200 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Team Call
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMaximized(!isMaximized)}
              className="rounded-lg"
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMinimize}
              className="rounded-lg"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeave}
              className={`rounded-lg ${isDark ? 'text-red-400 hover:text-red-300 hover:bg-red-950' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
            >
              <Phone className="h-4 w-4" />
              <span className="ml-2">Leave</span>
            </Button>
          </div>
        </div>

        {/* Team Call View */}
        <div className="flex-1 relative overflow-hidden">
          <TeamCallView
            roomId={call.id}
            teamName={call.room_name || 'Team Call'}
            mode="video"
            onLeave={handleLeave}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}