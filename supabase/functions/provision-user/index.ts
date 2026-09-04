import { adminClient, body, errorResponse, json, requireUser, roleCheck } from "../_shared.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-company-id" } });

  try {
    const { user, supabase } = await requireUser(req);
    const input = await body(req);
    const companyId = String(input.company_id ?? req.headers.get("x-company-id") ?? "");
    const userId = String(input.user_id ?? "");
    const requestedRole = String(input.role ?? "employee");
    if (!companyId || !userId) throw new Error("company_id and user_id are required");
    if (!["admin", "hr", "manager", "employee", "contractor", "viewer"].includes(requestedRole)) throw new Error("Invalid membership role");

    await roleCheck(supabase, user.id, companyId, ["admin", "hr"]);
    const { data: actor } = await supabase.from("company_memberships").select("role").eq("company_id", companyId).eq("user_id", user.id).eq("is_active", true).single();
    if (!actor) throw new Error("Active membership required");
    if (actor.role === "hr" && requestedRole === "admin") throw new Error("HR cannot grant admin access");
    if (userId === user.id && requestedRole !== actor.role) throw new Error("You cannot change your own role");

    if (input.department_id) {
      const { data: department } = await supabase.from("departments").select("id").eq("id", String(input.department_id)).eq("company_id", companyId).maybeSingle();
      if (!department) throw new Error("Department does not belong to this company");
    }

    const admin = adminClient();
    const { error: membershipError } = await admin.from("company_memberships").upsert({ company_id: companyId, user_id: userId, role: requestedRole, department_id: input.department_id ?? null, is_active: true }, { onConflict: "company_id,user_id" });
    if (membershipError) throw membershipError;

    if (input.full_name) {
      const { error: profileError } = await admin.from("profiles").upsert({ id: userId, full_name: String(input.full_name), phone: input.phone ? String(input.phone) : null, avatar_url: input.avatar_url ? String(input.avatar_url) : null });
      if (profileError) throw profileError;
    }

    return json({ ok: true, user_id: userId, company_id: companyId });
  } catch (e) {
    return errorResponse(e);
  }
});
