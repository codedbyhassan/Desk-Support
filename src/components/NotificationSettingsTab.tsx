import { useNotifications } from '@/context/NotificationContext'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Bell, AlertTriangle, CheckCircle2 } from 'lucide-react'

export function NotificationSettingsTab() {
  const { preferences, updatePreferences } = useNotifications()
  const { status, loading, initialize, disable, isSupported } = usePushNotifications()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Notification Preferences</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Manage how you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-3 py-2 sm:py-3">
          <div className="space-y-0.5 min-w-0">
            <Label className="text-xs sm:text-sm">Ticket Updates</Label>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Get notified when tickets are assigned or status changes
            </p>
          </div>
          <Switch 
            checked={preferences.enableTicketUpdates}
            onCheckedChange={(checked) => updatePreferences({ enableTicketUpdates: checked })}
            className="flex-shrink-0" 
          />
        </div>
        <div className="flex items-center justify-between gap-3 py-2 sm:py-3">
          <div className="space-y-0.5 min-w-0">
            <Label className="text-xs sm:text-sm">Comment Notifications</Label>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Notifications for new comments on your tickets
            </p>
          </div>
          <Switch 
            checked={preferences.enableComments}
            onCheckedChange={(checked) => updatePreferences({ enableComments: checked })}
            className="flex-shrink-0" 
          />
        </div>
        <div className="flex items-center justify-between gap-3 py-2 sm:py-3">
          <div className="space-y-0.5 min-w-0">
            <Label className="text-xs sm:text-sm">Sound Notifications</Label>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Play a sound when you receive notifications
            </p>
          </div>
          <Switch 
            checked={preferences.enableSoundNotifications}
            onCheckedChange={(checked) => updatePreferences({ enableSoundNotifications: checked })}
            className="flex-shrink-0" 
          />
        </div>
        <div className="flex items-center justify-between gap-3 py-2 sm:py-3">
          <div className="space-y-0.5 min-w-0">
            <Label className="text-xs sm:text-sm">Push Notifications</Label>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Receive push notifications in your browser
            </p>
          </div>
          <Switch 
            checked={preferences.enablePushNotifications}
            onCheckedChange={(checked) => updatePreferences({ enablePushNotifications: checked })}
            className="flex-shrink-0" 
            disabled={!isSupported}
          />
        </div>

        {/* Push Notification Management */}
        {isSupported && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground">Push Notification Status</h4>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  Browser support: {status.supported ? '✅' : '❌'} | 
                  Service Worker: {status.registered ? '✅' : '❌'} | 
                  Subscribed: {status.subscribed ? '✅' : '❌'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {status.subscribed ? (
                <Button
                  onClick={disable}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  {loading ? 'Disabling...' : 'Disable Push Notifications'}
                </Button>
              ) : (
                <Button
                  onClick={initialize}
                  disabled={loading || status.permission === 'denied'}
                  size="sm"
                  className="text-xs bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  {loading ? 'Enabling...' : 'Enable Push Notifications'}
                </Button>
              )}
            </div>

            {status.permission === 'denied' && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-800">
                  You have blocked notifications in your browser settings. Check browser permissions to re-enable.
                </AlertDescription>
              </Alert>
            )}

            {status.subscribed && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs text-green-800">
                  Push notifications are enabled. You'll receive notifications for important updates.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {!isSupported && (
          <Alert className="bg-amber-50 border-amber-200 mt-4">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-800">
              Push notifications are not supported in your browser. Please use a modern browser like Chrome, Firefox, or Edge.
            </AlertDescription>
          </Alert>
        )}

        {/* Notification Mute Duration */}
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs sm:text-sm">Mute Notifications</Label>
          <Select 
            value={preferences.notificationMuteDuration}
            onValueChange={(value: any) => updatePreferences({ notificationMuteDuration: value })}
          >
            <SelectTrigger className="h-10 sm:h-11 text-xs sm:text-sm">
              <SelectValue placeholder="Select mute duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Never (Always On)</SelectItem>
              <SelectItem value="5min">Mute for 5 minutes</SelectItem>
              <SelectItem value="30min">Mute for 30 minutes</SelectItem>
              <SelectItem value="1hour">Mute for 1 hour</SelectItem>
              <SelectItem value="8hours">Mute for 8 hours</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Temporarily silence notifications without changing preferences
          </p>
        </div>

        <Alert className="mt-4">
          <Bell className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm">
            Changes are saved automatically and stored locally on your device
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
