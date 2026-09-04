import { body, errorResponse, json, requireUser } from "../_shared.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  try {
    const { user, supabase } = await requireUser(req);
    const input = await body(req);
    const bucket = String(input.bucket ?? "workspace");
    const path = String(input.path ?? "").trim();
    const companyId = String(input.company_id ?? req.headers.get("x-company-id") ?? "").trim();

    if (bucket !== "workspace") throw new Error("Invalid storage bucket");
    if (!companyId || !path) throw new Error("company_id and path are required");
    if (!path.startsWith(`${companyId}/`)) throw new Error("Invalid storage path");

    const { data: membership, error: membershipError } = await supabase
      .from("company_memberships")
      .select("id")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (membershipError || !membership) throw new Error("Forbidden");

    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error) throw error;

    return json({ ok: true, path, bucket, upload: data });
  } catch (error) {
    return errorResponse(error);
  }
});
