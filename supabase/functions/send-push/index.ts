import { adminClient, body, errorResponse, json, requireUser } from "../_shared.ts";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "POST required" }, 405);
    const { user } = await requireUser(req);
    const input = await body(req);
    const requestedUserId = String(input.user_id ?? user.id);
    if (requestedUserId !== user.id) throw new Error("You may only access your own notification devices");

    const db = adminClient();
    let query = db.from("notification_devices").select("id,user_id,platform,token").eq("user_id", user.id);
    if (Array.isArray(input.device_ids) && input.device_ids.length) query = query.in("id", input.device_ids);
    const { data: devices, error } = await query.limit(500);
    if (error) throw error;
    return json({ ok: true, configured: Boolean(Deno.env.get("VAPID_PRIVATE_KEY")), queued_devices: devices ?? [] });
  } catch (e) { return errorResponse(e); }
});
