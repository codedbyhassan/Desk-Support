import { useNotifications } from '@/context/NotificationContext'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Bell, AlertTriangle, CheckCircle2 } from 'lucide-react'

type MuteDuration = 'never' | '5min' | '30min' | '1hour' | '8hours'

export function NotificationSettingsTab() {
  const { preferences, updatePreferences } = useNotifications()
  const { status, loading, initialize, disable, isSupported } = usePushNotifications()

  const handlePushChange = async (enabled: boolean) => {
    if (enabled) await initialize()
    else await disable()
  }

  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/20 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Bell className="h-5 w-5" aria-hidden="true" /></div>
          <div className="min-w-0"><h2 className="text-base font-semibold text-foreground sm:text-lg">Notification Preferences</h2><p className="mt-0.5 text-sm text-muted-foreground">Choose which notifications you receive and how they behave.</p></div>
        </div>
      </div>

      <CardContent className="space-y-0 p-0">
        <div className="divide-y divide-border">
          {[
            ['enableTicketUpdates', 'Ticket updates', 'Get notified when tickets are assigned or their status changes.'],
            ['enableComments', 'Comment notifications', 'Get notified about new comments on your tickets.'],
            ['enableSoundNotifications', 'Sound notifications', 'Play a sound when a notification arrives.'],
          ].map(([key, title, description]) => {
            const preferenceKey = key as 'enableTicketUpdates' | 'enableComments' | 'enableSoundNotifications'
            return <div key={key} className="flex min-h-[76px] items-center justify-between gap-5 px-5 py-4 sm:px-6">
              <div className="min-w-0"><Label className="text-sm font-semibold text-foreground">{title}</Label><p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p></div>
              <Switch checked={preferences[preferenceKey]} onCheckedChange={(checked) => updatePreferences({ [preferenceKey]: checked })} aria-label={`Toggle ${title}`} className="shrink-0" />
            </div>
          })}

          <div className="flex min-h-[76px] items-center justify-between gap-5 px-5 py-4 sm:px-6">
            <div className="min-w-0"><Label className="text-sm font-semibold text-foreground">Push notifications</Label><p className="mt-1 text-sm leading-5 text-muted-foreground">Enabled only when this browser and the server confirm an active registration.</p></div>
            <Switch checked={status.subscribed} onCheckedChange={handlePushChange} disabled={!isSupported || loading} aria-label="Toggle push notifications" className="shrink-0" />
          </div>
        </div>

        {isSupported && <div className="border-t border-border bg-muted/10 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="text-sm font-semibold text-foreground">Browser push status</h3><p className="mt-1 text-sm text-muted-foreground">Browser: {status.supported ? 'Supported' : 'Unsupported'} · Service worker: {status.registered ? 'Ready' : 'Not ready'} · Server registration: {status.subscribed ? 'Active' : 'Inactive'}</p></div>
            <Button type="button" variant={status.subscribed ? 'outline' : 'default'} onClick={() => void handlePushChange(!status.subscribed)} disabled={loading || status.permission === 'denied'} className="shrink-0 rounded-xl">{loading ? 'Updating…' : status.subscribed ? 'Disable push' : 'Enable push'}</Button>
          </div>
          {status.permission === 'denied' && <Alert className="mt-4"><AlertTriangle className="h-4 w-4" aria-hidden="true" /><AlertDescription>Browser notifications are blocked. Re-enable them in browser permissions before enabling push.</AlertDescription></Alert>}
          {status.subscribed && <Alert className="mt-4"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /><AlertDescription>This browser is registered for push notifications.</AlertDescription></Alert>}
        </div>}

        {!isSupported && <Alert className="m-5 sm:m-6"><AlertTriangle className="h-4 w-4" aria-hidden="true" /><AlertDescription>Push notifications are not supported by this browser.</AlertDescription></Alert>}

        <div className="border-t border-border px-5 py-5 sm:px-6">
          <Label className="text-sm font-semibold text-foreground">Mute notifications</Label>
          <p className="mb-3 mt-1 text-sm text-muted-foreground">Temporarily silence notifications without changing notification preferences.</p>
          <Select value={preferences.notificationMuteDuration} onValueChange={(value) => updatePreferences({ notificationMuteDuration: value as MuteDuration })}>
            <SelectTrigger className="w-full sm:max-w-sm" aria-label="Mute notification duration"><SelectValue placeholder="Select mute duration" /></SelectTrigger>
            <SelectContent><SelectItem value="never">Never (always on)</SelectItem><SelectItem value="5min">Mute for 5 minutes</SelectItem><SelectItem value="30min">Mute for 30 minutes</SelectItem><SelectItem value="1hour">Mute for 1 hour</SelectItem><SelectItem value="8hours">Mute for 8 hours</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="border-t border-border bg-muted/10 px-5 py-4 sm:px-6"><p className="text-sm text-muted-foreground">Notification preferences are stored on this device; push registration is verified against the server.</p></div>
      </CardContent>
    </Card>
  )
}
