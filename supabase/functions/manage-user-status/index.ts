import { adminClient, body, errorResponse, json, requireUser, roleCheck } from "../_shared.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-company-id" } });

  try {
    const { user, supabase } = await requireUser(req);
    const input = await body(req);
    const companyId = String(input.company_id ?? req.headers.get("x-company-id") ?? "");
    const userId = String(input.user_id ?? "");
    const isActive = Boolean(input.is_active);
    if (!companyId || !userId) throw new Error("company_id and user_id are required");
    if (userId === user.id) throw new Error("You cannot change your own membership status");
    await roleCheck(supabase, user.id, companyId, ["admin", "hr"]);

    const admin = adminClient();
    if (!isActive) {
      const { data: target } = await admin.from("company_memberships").select("role,is_active").eq("company_id", companyId).eq("user_id", userId).maybeSingle();
      if (!target) throw new Error("Membership not found");
      if (target.is_active && target.role === "admin") {
        const { count } = await admin.from("company_memberships").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("role", "admin").eq("is_active", true);
        if ((count ?? 0) <= 1) throw new Error("The company must retain at least one active admin");
      }
    }

    const { error } = await admin.from("company_memberships").update({ is_active: isActive }).eq("company_id", companyId).eq("user_id", userId);
    if (error) throw error;
    return json({ ok: true, user_id: userId, is_active: isActive });
  } catch (e) {
    return errorResponse(e);
  }
});
