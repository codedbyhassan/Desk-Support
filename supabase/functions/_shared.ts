import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-company-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function requireUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Unauthorized");
  return { user: data.user, supabase };
}

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function body(req: Request) {
  try { return await req.json(); } catch { return {}; }
}

export function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  const status = /unauthorized/i.test(message) ? 401 : 400;
  return json({ error: message }, status);
}

export async function roleCheck(supabase: SupabaseClient, userId: string, companyId: string, roles: string[]) {
  const { data, error } = await supabase
    .from("company_memberships")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data || !roles.includes(data.role)) throw new Error("Forbidden");
  return data.role;
}

export function ok(data: unknown) { return json({ ok: true, data }); }
