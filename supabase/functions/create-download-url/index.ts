import { body, errorResponse, json, requireUser } from "../_shared.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  try {
    const { user, supabase } = await requireUser(req);
    const input = await body(req);
    const bucket = String(input.bucket ?? "workspace");
    const path = String(input.path ?? "").trim();
    const companyId = String(input.company_id ?? req.headers.get("x-company-id") ?? "").trim();
    const expiresIn = Math.min(Math.max(Number(input.expires_in ?? 900), 60), 3600);

    if (bucket !== "workspace") throw new Error("Invalid storage bucket");
    if (!companyId || !path) throw new Error("company_id and path are required");

    const { data: membership, error: membershipError } = await supabase
      .from("company_memberships")
      .select("id")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (membershipError || !membership) throw new Error("Forbidden");

    const { data: file, error: fileError } = await supabase
      .from("workspace_files")
      .select("id")
      .eq("company_id", companyId)
      .eq("storage_path", path)
      .maybeSingle();

    if (fileError || !file) throw new Error("File not found");

    const { data: share } = await supabase
      .from("workspace_shares")
      .select("id,expires_at")
      .eq("file_id", file.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!share && !path.startsWith(`${companyId}/`)) throw new Error("Forbidden");
    if (share?.expires_at && new Date(share.expires_at) <= new Date()) throw new Error("Share expired");

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) throw error;

    return json({ ok: true, url: data.signedUrl, expires_in: expiresIn });
  } catch (error) {
    return errorResponse(error);
  }
});
