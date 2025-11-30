import { useNotifications } from '@/context/NotificationContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Bell } from 'lucide-react'

export function NotificationSettingsTab() {
  const { preferences, updatePreferences } = useNotifications()

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
          />
        </div>

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
