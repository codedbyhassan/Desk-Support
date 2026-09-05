import { adminClient, body, errorResponse, json, requireUser, roleCheck } from "../_shared.ts";

const ROLES = ["admin", "hr", "manager", "employee", "contractor", "viewer"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-company-id" } });
  }

  try {
    const { user, supabase } = await requireUser(req);
    const input = await body(req);
    const companyId = String(input.company_id ?? req.headers.get("x-company-id") ?? "");
    if (!companyId) throw new Error("company_id is required");

    const actorRole = await roleCheck(supabase, user.id, companyId, ["admin", "hr"]);
    const email = String(input.email ?? "").trim().toLowerCase();
    const fullName = String(input.full_name ?? "").trim();
    const role = String(input.role ?? "employee");
    const departmentId = input.department_id ? String(input.department_id) : null;

    if (!email) throw new Error("email is required");
    if (!fullName) throw new Error("full_name is required");
    if (!(ROLES as readonly string[]).includes(role)) throw new Error("Invalid membership role");
    if (actorRole === "hr" && role === "admin") throw new Error("HR cannot grant admin access");

    // Validate company-owned routing data before creating the Auth user. The
    // service-role client used for provisioning bypasses normal table RLS.
    if (departmentId) {
      const { data: department, error: departmentError } = await supabase
        .from("departments")
        .select("id")
        .eq("id", departmentId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (departmentError) throw departmentError;
      if (!department) throw new Error("Department does not belong to this company");
    }

    const admin = adminClient();
    const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName } });
    if (inviteError) throw inviteError;
    if (!invite.user?.id) throw new Error("Supabase did not return the invited user id");

    const userId = invite.user.id;
    try {
      const { error: profileError } = await admin.from("profiles").upsert({
        id: userId,
        full_name: fullName,
        phone: input.phone ? String(input.phone) : null,
        avatar_url: null,
      });
      if (profileError) throw profileError;

      const { error: membershipError } = await admin.from("company_memberships").upsert({
        company_id: companyId,
        user_id: userId,
        role,
        department_id: departmentId,
        is_active: true,
      }, { onConflict: "company_id,user_id" });
      if (membershipError) throw membershipError;
    } catch (provisioningError) {
      // Do not leave an Auth account behind when database provisioning fails.
      await admin.from("company_memberships").delete().eq("company_id", companyId).eq("user_id", userId);
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      throw provisioningError;
    }

    return json({ ok: true, user_id: userId, company_id: companyId, email });
  } catch (e) {
    return errorResponse(e);
  }
});
