/**
 * Admin Panel: Push Notification Tester
 * Location: src/components/admin/PushNotificationTester.tsx
 * 
 * Purpose: Manual testing interface for push notifications
 * Access: Admin users only (check in parent component)
 * 
 * Features:
 * - Send test push to user/device
 * - View subscription health
 * - Monitor delivery statistics
 * - Inspect push_send_logs
 * - Manually trigger notifications
 */

'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Loader2, Send, Eye, Trash2 } from 'lucide-react'

interface PushSubscription {
  id: string
  user_id: string
  browser_name: string
  device_type: string
  last_used_at: string
  created_at: string
  endpoint: string
}

interface SendLog {
  id: string
  notification_id: string
  user_id: string
  total_sent: number
  total_failed: number
  sent_at: string
}

export function PushNotificationTester() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([])
  const [logs, setLogs] = useState<SendLog[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [testTitle, setTestTitle] = useState('Test Notification')
  const [testBody, setTestBody] = useState('This is a test push notification from admin panel')
  const [testLink, setTestLink] = useState('/app/dashboard')

  /**
   * Fetch subscriptions for a user
   */
  const handleFetchSubscriptions = async () => {
    if (!selectedUserId) {
      toast({ title: 'Error', description: 'Please enter a user ID' })
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('device_subscriptions')
        .select('*')
        .eq('user_id', selectedUserId)
        .is('deleted_at', null)

      if (error) throw error

      setSubscriptions(data || [])
      toast({
        title: 'Success',
        description: `Found ${data?.length || 0} active subscriptions`,
      })
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch subscriptions',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Send test push notification
   */
  const handleSendTestPush = async () => {
    if (!selectedUserId) {
      toast({ title: 'Error', description: 'Please select a user' })
      return
    }

    if (subscriptions.length === 0) {
      toast({
        title: 'Error',
        description: 'No subscriptions found. Fetch subscriptions first.',
      })
      return
    }

    setLoading(true)
    try {
      // Get session for auth
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Not authenticated')
      }

      // Call edge function
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-push`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            notificationId: `test-${Date.now()}`,
            userId: selectedUserId,
            companyId: session.user.user_metadata?.company_id || 'test',
            payload: {
              title: testTitle,
              body: testBody,
              link: testLink,
              icon: '/icon-192x192.png',
              badge: '/badge-72x72.png',
              tag: 'test-notification',
            },
          }),
        }
      )

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Success',
          description: `Push sent to ${result.sentCount} device(s)`,
        })
        // Refresh logs
        handleFetchLogs()
      } else {
        toast({
          title: 'Partial Failure',
          description: `Sent to ${result.sentCount}, failed: ${result.failureCount}`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error sending push:', error)
      toast({
        title: 'Error',
        description: 'Failed to send push notification',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Fetch recent push send logs
   */
  const handleFetchLogs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('push_send_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setLogs(data || [])
    } catch (error) {
      console.error('Error fetching logs:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch logs',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Delete a subscription (for testing)
   */
  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (!confirm('Delete this subscription?')) return

    try {
      const { error } = await supabase
        .from('device_subscriptions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', subscriptionId)

      if (error) throw error

      setSubscriptions(subscriptions.filter((s) => s.id !== subscriptionId))
      toast({ title: 'Success', description: 'Subscription deleted' })
    } catch (error) {
      console.error('Error deleting subscription:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete subscription',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 p-6 bg-slate-50 rounded-lg border">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Push Notification Tester</h2>
        <p className="text-sm text-slate-600">
          Admin tool for testing push notifications. All sends are logged.
        </p>
      </div>

      {/* User Selection */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <h3 className="font-semibold">1. Select User</h3>
        <input
          type="text"
          placeholder="Enter user UUID"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
        <Button onClick={handleFetchSubscriptions} disabled={loading} className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
          Fetch Subscriptions
        </Button>
      </div>

      {/* Subscriptions List */}
      {subscriptions.length > 0 && (
        <div className="bg-white p-4 rounded-lg border space-y-3">
          <h3 className="font-semibold">Active Subscriptions ({subscriptions.length})</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border">
                <div className="text-sm">
                  <p className="font-medium">{sub.browser_name || 'Unknown'}</p>
                  <p className="text-xs text-slate-600">{sub.device_type || 'Unknown'}</p>
                  <p className="text-xs text-slate-500">
                    Last used: {new Date(sub.last_used_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteSubscription(sub.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Payload */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <h3 className="font-semibold">2. Configure Test Notification</h3>

        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Body</label>
          <textarea
            value={testBody}
            onChange={(e) => setTestBody(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Link</label>
          <input
            type="text"
            value={testLink}
            onChange={(e) => setTestLink(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <Button
          onClick={handleSendTestPush}
          disabled={loading || subscriptions.length === 0}
          className="w-full"
          size="lg"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Send Test Push
        </Button>
      </div>

      {/* Recent Logs */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">3. Recent Push Logs</h3>
          <Button onClick={handleFetchLogs} disabled={loading} variant="outline" size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>

        {logs.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border text-sm">
                <div className="flex-1">
                  <p className="font-medium truncate">{log.notification_id}</p>
                  <p className="text-xs text-slate-600">
                    {new Date(log.sent_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    {log.total_failed > 0 ? (
                      <>
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{log.total_sent}</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span>{log.total_failed}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{log.total_sent}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600 py-4">No logs found. Click refresh or send a test push.</p>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
        <p className="text-sm font-medium text-blue-900">📝 Tips</p>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Enter user UUID to find their subscriptions</li>
          <li>Each subscription represents one device/browser</li>
          <li>Test push is sent immediately to all active subscriptions</li>
          <li>Check browser notifications in bottom-right corner</li>
          <li>Failed sends (410) are automatically cleaned up</li>
          <li>All sends are logged in push_send_logs table</li>
        </ul>
      </div>
    </div>
  )
}
