import { adminClient, json } from "../_shared.ts";

const MAX_SKEW_SECONDS = 300;
const ALLOWED_STATUS = new Set(["trialing", "active", "past_due", "paused", "canceled", "cancelled", "expired", "incomplete", "unpaid"]);

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sign(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "POST required" }, 405);
    const secret = Deno.env.get("PAYMENT_WEBHOOK_SECRET");
    if (!secret) return json({ error: "Webhook verification is not configured" }, 503);

    const timestamp = req.headers.get("x-webhook-timestamp") ?? "";
    const signature = req.headers.get("x-webhook-signature") ?? req.headers.get("x-paystack-signature") ?? "";
    if (!/^\d+$/.test(timestamp) || !signature) return json({ error: "Missing webhook signature" }, 401);
    const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
    if (age > MAX_SKEW_SECONDS) return json({ error: "Expired webhook" }, 401);

    const raw = await req.text();
    const expected = await sign(secret, `${timestamp}.${raw}`);
    const alternate = await sign(secret, raw);
    if (!safeEqual(signature.toLowerCase(), expected) && !safeEqual(signature.toLowerCase(), alternate)) return json({ error: "Invalid webhook signature" }, 401);

    const payload = JSON.parse(raw);
    const provider = String(req.headers.get("x-payment-provider") ?? payload.provider ?? "unknown").toLowerCase();
    const eventId = String(payload.event_id ?? payload.id ?? "");
    const subscriptionId = String(payload.subscription_id ?? payload.data?.subscription_id ?? "");
    if (!eventId || !subscriptionId) return json({ error: "Webhook event_id and subscription_id are required" }, 400);

    const db = adminClient();
    const { data: existing, error: existingError } = await db.from("subscription_events").select("id").eq("provider_event_id", eventId).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return json({ ok: true, duplicate: true, event_id: eventId });

    const eventType = String(payload.event_type ?? payload.type ?? "webhook");
    const status = payload.status ?? payload.data?.status;
    const normalizedStatus = status == null ? null : String(status).toLowerCase();
    if (normalizedStatus && !ALLOWED_STATUS.has(normalizedStatus)) return json({ error: "Unsupported subscription status" }, 400);

    const { data: subscription, error: subscriptionError } = await db.from("subscriptions").select("id,company_id,status,provider").eq("id", subscriptionId).maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (!subscription) return json({ error: "Subscription not found" }, 404);

    const { error: eventError } = await db.from("subscription_events").insert({ subscription_id: subscriptionId, event_type: eventType, provider_event_id: eventId, payload, occurred_at: new Date().toISOString() });
    if (eventError) throw eventError;

    if (normalizedStatus) {
      const { error: updateError } = await db.from("subscriptions").update({ status: normalizedStatus, provider, provider_subscription_id: payload.provider_subscription_id ?? payload.data?.subscription_code ?? null, updated_at: new Date().toISOString() }).eq("id", subscription.id);
      if (updateError) throw updateError;
    }
    return json({ ok: true, provider, event_id: eventId, processed: true });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Webhook failed" }, 400);
  }
});
