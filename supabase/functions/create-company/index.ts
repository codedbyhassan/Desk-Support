import { adminClient, body, errorResponse, json, corsHeaders } from "../_shared.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) throw new Error("Unauthorized");

    const admin = adminClient();
    const token = auth.slice(7);
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const input = await body(req);
    const name = String(input.name ?? "").trim();
    if (!name) throw new Error("Company name is required");

    const { data: existing, error: existingError } = await admin
      .from("company_memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);
    if (existingError) throw existingError;
    if (existing?.length) throw new Error("User already belongs to a company");

    const { data: company, error: companyError } = await admin
      .from("companies")
      .insert({
        name,
        email: input.email ?? user.email ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        website: input.website ?? null,
      })
      .select()
      .single();
    if (companyError || !company) throw companyError ?? new Error("Company creation failed");

    const { error: profileError } = await admin
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: input.full_name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Administrator",
      });
    if (profileError) throw profileError;

    const { error: membershipError } = await admin
      .from("company_memberships")
      .insert({
        company_id: company.id,
        user_id: user.id,
        role: "admin",
        is_active: true,
      });
    if (membershipError) throw membershipError;

    const { error: settingsError } = await admin
      .from("company_settings")
      .insert({ company_id: company.id });
    if (settingsError) throw settingsError;

    return json({ ok: true, company });
  } catch (error) {
    return errorResponse(error);
  }
});
