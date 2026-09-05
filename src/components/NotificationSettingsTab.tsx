import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Bell, AlertTriangle, CheckCircle2 } from 'lucide-react'

export function NotificationSettingsTab() {
  const { status, loading, initialize, disable, isSupported } = usePushNotifications()
  const handlePushChange = async (enabled: boolean) => { if (enabled) await initialize(); else await disable() }

  return <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
    <div className="border-b border-border bg-muted/20 px-5 py-5 sm:px-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Bell className="h-5 w-5" aria-hidden="true" /></div><div><h2 className="text-base font-semibold sm:text-lg">Notification delivery</h2><p className="mt-0.5 text-sm text-muted-foreground">Manage the notification channel that has a real server-backed registration.</p></div></div></div>
    <CardContent className="space-y-5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-semibold">Browser push notifications</p><p className="mt-1 text-sm text-muted-foreground">The switch is on only when this browser subscription and its server registration both exist.</p></div><Switch checked={status.subscribed} onCheckedChange={handlePushChange} disabled={!isSupported || loading} aria-label="Toggle browser push notifications" /></div>
      <div className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">In-app notification delivery is controlled by workspace events. Local-only preference switches are intentionally not shown until they are connected to persisted backend preferences.</div>
      {isSupported ? <div className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Registration status</p><p className="mt-1 text-sm text-muted-foreground">Permission: {status.permission} · Service worker: {status.registered ? 'ready' : 'not registered'} · Server: {status.subscribed ? 'registered' : 'not registered'}</p></div><Button type="button" variant={status.subscribed ? 'outline' : 'default'} onClick={() => void handlePushChange(!status.subscribed)} disabled={loading || status.permission === 'denied'} className="rounded-xl">{loading ? 'Updating…' : status.subscribed ? 'Disable push' : 'Enable push'}</Button></div>{status.permission === 'denied' && <Alert><AlertTriangle className="h-4 w-4" aria-hidden="true" /><AlertDescription>Browser notifications are blocked. Re-enable them in browser permissions first.</AlertDescription></Alert>}{status.subscribed && <Alert><CheckCircle2 className="h-4 w-4" aria-hidden="true" /><AlertDescription>This browser is registered for push delivery.</AlertDescription></Alert>}</div> : <Alert><AlertTriangle className="h-4 w-4" aria-hidden="true" /><AlertDescription>Push notifications are not supported by this browser.</AlertDescription></Alert>}
    </CardContent>
  </Card>
}
