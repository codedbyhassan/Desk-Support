import { adminClient, body, errorResponse, json, requireUser } from "../_shared.ts";

const ROLES = ["admin", "hr", "manager", "employee", "contractor", "viewer"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-company-id" } });
  try {
    const { user, supabase } = await requireUser(req);
    const input = await body(req);
    const companyId = String(input.company_id ?? req.headers.get("x-company-id") ?? "");
    const userId = String(input.user_id ?? "");
    const requestedRole = String(input.role ?? "employee");
    if (!companyId || !userId) throw new Error("company_id and user_id are required");
    if (!(ROLES as readonly string[]).includes(requestedRole)) throw new Error("Invalid membership role");
    const { data: allowed, error: roleError } = await supabase.rpc("can_actor_assign_role", { p_company_id: companyId, p_target_role: requestedRole });
    if (roleError) throw roleError;
    if (!allowed) throw new Error("Not authorized to grant this role");
    if (userId === user.id) throw new Error("You cannot change your own role");

    const { data: targetMembership, error: targetError } = await supabase.from("company_memberships").select("id,user_id,role,is_active").eq("company_id", companyId).eq("user_id", userId).maybeSingle();
    if (targetError) throw targetError;
    if (!targetMembership) throw new Error("Target user is not a member of this company");
    if (input.department_id) {
      const { data: department, error } = await supabase.from("departments").select("id").eq("id", String(input.department_id)).eq("company_id", companyId).maybeSingle();
      if (error) throw error;
      if (!department) throw new Error("Department does not belong to this company");
    }

    const admin = adminClient();
    const { error: membershipError } = await admin.from("company_memberships").update({ role: requestedRole, department_id: input.department_id ?? null, is_active: targetMembership.is_active }).eq("company_id", companyId).eq("user_id", userId);
    if (membershipError) throw membershipError;
    if (input.full_name) {
      const { error: profileError } = await admin.from("profiles").update({ full_name: String(input.full_name), phone: input.phone ? String(input.phone) : null }).eq("id", userId);
      if (profileError) throw profileError;
    }
    return json({ ok: true, user_id: userId, company_id: companyId });
  } catch (e) { return errorResponse(e); }
});
