import { body, errorResponse, json, requireUser } from "../_shared.ts";

Deno.serve(async (req) => {
  try {
    const { user, supabase } = await requireUser(req);
    const input = await body(req);
    const code = String(input.code ?? "").trim();
    if (!code) throw new Error("code is required");

    const { data: memberships, error: membershipError } = await supabase.from("company_memberships").select("company_id").eq("user_id", user.id).eq("is_active", true);
    if (membershipError) throw membershipError;
    const companyIds = (memberships ?? []).map((m) => m.company_id);
    if (!companyIds.length) throw new Error("Active company membership required");

    const { data: qr, error: qrError } = await supabase.from("qr_codes").select("id,company_id,status,expires_at").eq("code", code).in("company_id", companyIds).maybeSingle();
    if (qrError) throw qrError;
    if (!qr) throw new Error("QR code not found or not authorized for this company");
    if (qr.status !== "active" || (qr.expires_at && new Date(qr.expires_at) < new Date())) {
      await supabase.from("qr_scan_logs").insert({ qr_code_id: qr.id, user_id: user.id, result: "invalid", metadata: { reason: "inactive_or_expired" } });
      return json({ ok: false, valid: false }, 400);
    }
    const { data: log, error } = await supabase.from("qr_scan_logs").insert({ qr_code_id: qr.id, user_id: user.id, result: "valid", ip_address: null, user_agent: req.headers.get("user-agent"), latitude: input.latitude ?? null, longitude: input.longitude ?? null, metadata: input.metadata ?? {} }).select().single();
    if (error) throw error;
    return json({ ok: true, valid: true, scan: log, company_id: qr.company_id });
  } catch (e) { return errorResponse(e); }
});
