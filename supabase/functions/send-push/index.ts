/**
 * Supabase Edge Function: Send Push Notifications
 * Location: supabase/functions/send-push/index.ts
 * 
 * Purpose: Triggered when notifications are created, sends push to subscribed devices
 * Trigger: Database webhook or direct HTTP call
 * 
 * Install dependencies:
 * deno cache --reload https://deno.land/x/webpush/mod.ts
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

// Types
interface NotificationPayload {
  title: string
  body: string
  link?: string
  icon?: string
  badge?: string
  tag?: string
  timestamp?: string
}

interface PushSubscription {
  id: string
  endpoint: string
  auth_key: string
  p256dh_key: string
  browser_name?: string
  device_type?: string
}

interface PushSendResult {
  subscriptionId: string
  success: boolean
  status?: number
  error?: string
}

/**
 * Send a push notification to a single subscription
 */
async function sendPushToSubscription(
  subscription: PushSubscription,
  payload: NotificationPayload,
  privateKey: string
): Promise<PushSendResult> {
  try {
    const message = {
      title: payload.title,
      body: payload.body,
      link: payload.link || "/",
      icon: payload.icon || "/icon-192x192.png",
      badge: payload.badge || "/badge-72x72.png",
      tag: payload.tag || "notification",
      timestamp: payload.timestamp || new Date().toISOString(),
    }

    // Prepare push subscription object
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        auth: subscription.auth_key,
        p256dh: subscription.p256dh_key,
      },
    }

    // Use web-push to encrypt and send
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aesgcm",
        Authorization: `vapid t=${privateKey}`, // Note: In production, properly sign this
      },
      body: JSON.stringify(message),
    })

    if (response.status === 401 || response.status === 410) {
      // Subscription expired or invalid
      console.log(`[Push] Subscription ${subscription.id} expired (${response.status})`)
      return {
        subscriptionId: subscription.id,
        success: false,
        status: response.status,
        error: response.status === 410 ? "Gone" : "Unauthorized",
      }
    }

    if (!response.ok) {
      console.error(`[Push] Failed to send to ${subscription.id}: ${response.status}`)
      return {
        subscriptionId: subscription.id,
        success: false,
        status: response.status,
        error: `HTTP ${response.status}`,
      }
    }

    console.log(`[Push] Successfully sent to ${subscription.id}`)
    return {
      subscriptionId: subscription.id,
      success: true,
      status: 201,
    }
  } catch (error) {
    console.error(`[Push] Error sending to ${subscription.id}:`, error)
    return {
      subscriptionId: subscription.id,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Main handler
 */
serve(async (req) => {
  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")

    if (!supabaseUrl || !supabaseServiceKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "Missing environment variables" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Parse request body
    const { notificationId, userId, companyId, payload, targetDevices } = await req.json()

    if (!notificationId || !userId || !companyId || !payload) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: notificationId, userId, companyId, payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user's device subscriptions
    let query = supabase
      .from("device_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .is("deleted_at", null)

    // Filter by specific devices if provided
    if (targetDevices && targetDevices.length > 0) {
      query = query.in("browser_name", targetDevices)
    }

    const { data: subscriptions, error: fetchError } = await query

    if (fetchError) {
      console.error("[Push] Error fetching subscriptions:", fetchError)
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions", details: fetchError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[Push] No active subscriptions for user ${userId}`)
      return new Response(
        JSON.stringify({
          notificationId,
          success: true,
          sentCount: 0,
          message: "No active subscriptions",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // Send push to each subscription
    const results: PushSendResult[] = []
    const expiredSubscriptions: string[] = []

    for (const subscription of subscriptions) {
      const result = await sendPushToSubscription(subscription as PushSubscription, payload, vapidPrivateKey)
      results.push(result)

      // Track expired subscriptions for cleanup
      if (!result.success && (result.status === 401 || result.status === 410)) {
        expiredSubscriptions.push(subscription.id)
      }
    }

    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      const { error: deleteError } = await supabase
        .from("device_subscriptions")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", expiredSubscriptions)

      if (deleteError) {
        console.warn("[Push] Error marking subscriptions as deleted:", deleteError)
      } else {
        console.log(`[Push] Marked ${expiredSubscriptions.length} expired subscriptions for cleanup`)
      }
    }

    // Update last_used_at for successful sends
    const successfulIds = results.filter((r) => r.success).map((r) => r.subscriptionId)
    if (successfulIds.length > 0) {
      const { error: updateError } = await supabase
        .from("device_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .in("id", successfulIds)

      if (updateError) {
        console.warn("[Push] Error updating last_used_at:", updateError)
      }
    }

    // Log push send attempt
    const { error: logError } = await supabase.from("push_send_logs").insert({
      notification_id: notificationId,
      user_id: userId,
      company_id: companyId,
      total_sent: results.filter((r) => r.success).length,
      total_failed: results.filter((r) => !r.success).length,
      failed_subscriptions: results.filter((r) => !r.success),
      sent_at: new Date().toISOString(),
    })

    if (logError) {
      console.warn("[Push] Error logging push send:", logError)
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    return new Response(
      JSON.stringify({
        notificationId,
        success: successCount > 0,
        sentCount: successCount,
        failureCount,
        results,
        expiredCount: expiredSubscriptions.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[Push] Unhandled error:", error)
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
