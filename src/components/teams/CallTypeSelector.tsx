import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface CallTypeSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (mode: 'lecture' | 'video') => void
}

export default function CallTypeSelector({ open, onOpenChange, onSelect }: CallTypeSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-card px-5 py-5 sm:px-6">
          <DialogTitle className="text-lg">Start a Video Call</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 bg-card p-5 sm:p-6">
          <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">Lecture (Listeners)</h3>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              Participants join as listeners. Only hosts and speakers publish video or audio.
            </p>
            <Button type="button" onClick={() => onSelect('lecture')} className="mt-4 w-full">
              Start Lecture
            </Button>
          </section>

          <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">Video Chat</h3>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              All participants can share their video and audio live.
            </p>
            <Button type="button" onClick={() => onSelect('video')} className="mt-4 w-full">
              Start Video Chat
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
