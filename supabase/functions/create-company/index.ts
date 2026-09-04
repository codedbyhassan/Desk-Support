import { adminClient, body, errorResponse, json } from "../_shared.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  try {
    const auth = req.headers.get("Authorization"); if (!auth?.startsWith("Bearer ")) throw new Error("Unauthorized");
    const admin = adminClient(); const token = auth.slice(7);
    const { data: { user }, error: ue } = await admin.auth.getUser(token); if (ue || !user) throw new Error("Unauthorized");
    const input = await body(req); const name = String(input.name ?? "").trim(); if (!name) throw new Error("Company name is required");
    const { data: existing } = await admin.from("company_memberships").select("id").eq("user_id", user.id).eq("is_active", true).limit(1);
    if (existing?.length) throw new Error("User already belongs to a company");
    const { data: company, error } = await admin.from("companies").insert({ name, email: input.email ?? user.email ?? null, phone: input.phone ?? null, address: input.address ?? null, website: input.website ?? null }).select().single();
    if (error) throw error;
    const { error: pe } = await admin.from("profiles").upsert({ id: user.id, full_name: input.full_name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Administrator" }); if (pe) throw pe;
    const { error: me } = await admin.from("company_memberships").insert({ company_id: company.id, user_id: user.id, role: "admin", is_active: true }); if (me) throw me;
    await admin.from("company_settings").insert({ company_id: company.id });
    return json({ ok: true, company });
  } catch (e) { return errorResponse(e); }
});
