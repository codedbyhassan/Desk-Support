import webpush from 'npm:web-push@3.6.7'
import { adminClient, errorResponse, json, body } from '../_shared.ts'

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return json({ error: 'POST required' }, 405)
    const db = adminClient()
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@desk-support.local'
    if (!publicKey || !privateKey) return json({ ok: false, error: 'Push delivery is not configured' }, 503)
    webpush.setVapidDetails(subject, publicKey, privateKey)

    const input = await body(req)
    const limit = Math.min(Math.max(Number(input.limit ?? 100), 1), 500)
    const { data: rows, error } = await db.from('notification_deliveries')
      .select('id,notification_id,channel,status,device_id,attempts')
      .eq('status', 'pending').eq('channel', 'push').order('created_at').limit(limit)
    if (error) throw error

    let sent = 0
    let failed = 0
    for (const row of rows ?? []) {
      const { data: notification, error: notificationError } = await db.from('notifications')
        .select('id,title,body,data:metadata').eq('id', row.notification_id).maybeSingle()
      if (notificationError) throw notificationError
      const { data: device, error: deviceError } = await db.from('notification_devices')
        .select('id,token').eq('id', row.device_id).maybeSingle()
      if (deviceError) throw deviceError
      if (!notification || !device) {
        await db.from('notification_deliveries').update({ status: 'failed', failed_at: new Date().toISOString(), error_message: 'Notification or device no longer exists', attempts: (row.attempts ?? 0) + 1 }).eq('id', row.id).eq('status', 'pending')
        failed++
        continue
      }
      try {
        const subscription = JSON.parse(device.token)
        if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) throw new Error('Invalid web push subscription')
        const response = await webpush.sendNotification(subscription, JSON.stringify({ title: notification.title, body: notification.body, data: notification.data ?? {} }))
        await db.from('notification_deliveries').update({ status: 'sent', sent_at: new Date().toISOString(), provider_message_id: response.headers?.get('location') ?? null, attempts: (row.attempts ?? 0) + 1 }).eq('id', row.id).eq('status', 'pending')
        sent++
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Push delivery failed'
        const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error ? Number((error as { statusCode?: number }).statusCode) : 0
        if (statusCode === 404 || statusCode === 410) await db.from('notification_devices').delete().eq('id', device.id)
        await db.from('notification_deliveries').update({ status: 'failed', failed_at: new Date().toISOString(), error_message: message.slice(0, 1000), attempts: (row.attempts ?? 0) + 1 }).eq('id', row.id).eq('status', 'pending')
        failed++
      }
    }
    return json({ ok: true, processed: (rows ?? []).length, sent, failed })
  } catch (e) { return errorResponse(e) }
})
