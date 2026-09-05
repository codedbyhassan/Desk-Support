import { adminClient, body, errorResponse, json, requireUser, roleCheck } from "../_shared.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-company-id" } });

  try {
    const { user, supabase } = await requireUser(req);
    const input = await body(req);
    const companyId = String(input.company_id ?? req.headers.get("x-company-id") ?? "");
    const userId = String(input.user_id ?? "");
    if (!companyId || !userId) throw new Error("company_id and user_id are required");
    if (typeof input.is_active !== "boolean") throw new Error("is_active must be a boolean");
    const isActive = input.is_active;
    if (userId === user.id) throw new Error("You cannot change your own membership status");

    const actorRole = await roleCheck(supabase, user.id, companyId, ["admin", "hr"]);
    const admin = adminClient();
    const { data: target, error: targetError } = await admin
      .from("company_memberships")
      .select("role,is_active")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) throw new Error("Membership not found");

    if (actorRole === "hr" && target.role === "admin") {
      throw new Error("HR cannot change an administrator's access status");
    }

    if (!isActive && target.is_active && target.role === "admin") {
      const { count, error: countError } = await admin
        .from("company_memberships")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("role", "admin")
        .eq("is_active", true);
      if (countError) throw countError;
      if ((count ?? 0) <= 1) throw new Error("The company must retain at least one active admin");
    }

    const { error } = await admin
      .from("company_memberships")
      .update({ is_active: isActive })
      .eq("company_id", companyId)
      .eq("user_id", userId);
    if (error) throw error;

    return json({ ok: true, user_id: userId, is_active: isActive });
  } catch (e) {
    return errorResponse(e);
  }
});
