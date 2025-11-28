
import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Video } from 'lucide-react'

interface CallTypeSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (mode: 'lecture' | 'video') => void
}

export default function CallTypeSelector({ open, onOpenChange, onSelect }: CallTypeSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl p-4">
        <DialogHeader>
          <DialogTitle className="text-lg">Start a Video Call</DialogTitle>
        </DialogHeader>

        <div className="mt-3 grid gap-3">
          <div className="p-3 rounded-lg border border-border bg-card">
            <h4 className="font-semibold">Lecture (Listeners)</h4>
            <p className="text-sm text-muted-foreground">Participants join as listeners. Only hosts/speakers publish video/audio.</p>
            <div className="mt-3">
              <Button onClick={() => onSelect('lecture')} className="w-full">Start Lecture</Button>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border bg-card">
            <h4 className="font-semibold">Video Chat</h4>
            <p className="text-sm text-muted-foreground">All participants can share their video and audio live.</p>
            <div className="mt-3">
              <Button onClick={() => onSelect('video')} className="w-full">Start Video Chat</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
