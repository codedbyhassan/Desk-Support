import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-company-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
export async function requireUser(req: Request) {
  const auth = req.headers.get("Authorization"); if (!auth?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data, error } = await supabase.auth.getUser(); if (error || !data.user) throw new Error("Unauthorized");
  return { user: data.user, supabase };
}
export function adminClient(): SupabaseClient { return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } }); }
export async function body(req: Request) { try { return await req.json(); } catch { return {}; } }
export function errorResponse(error: unknown) { const message = error instanceof Error ? error.message : "Request failed"; const status = /unauthorized/i.test(message) ? 401 : /rate limit/i.test(message) ? 429 : 400; return json({ error: message }, status); }
export async function roleCheck(supabase: SupabaseClient, userId: string, companyId: string, roles: string[]) { const { data, error } = await supabase.from("company_memberships").select("role").eq("company_id", companyId).eq("user_id", userId).eq("is_active", true).maybeSingle(); if (error || !data || !roles.includes(data.role)) throw new Error("Forbidden"); return data.role; }
export function ok(data: unknown) { return json({ ok: true, data }); }

export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const db = adminClient();
  const { data, error } = await db.rpc("consume_rate_limit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
  if (error) throw error;
  if (!data) throw new Error("Rate limit exceeded. Please try again later.");
}

export async function recordOperationalEvent(input: { eventType:string; success:boolean; startedAt:number; companyId?:string|null; entityType?:string|null; entityId?:string|null; metadata?:Record<string,unknown> }) {
  try {
    await adminClient().from("operational_events").insert({ event_type:input.eventType, success:input.success, latency_ms:Math.max(0,Date.now()-input.startedAt), company_id:input.companyId??null, entity_type:input.entityType??null, entity_id:input.entityId??null, metadata:input.metadata??{} });
  } catch (error) { console.error("Failed to record operational event", error); }
}
