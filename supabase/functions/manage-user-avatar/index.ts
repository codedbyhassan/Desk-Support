import { adminClient, body, errorResponse, json, requireUser } from '../_shared.ts'

const MIME = new Set(['image/jpeg','image/png','image/webp'])
Deno.serve(async (req) => {
  try {
    const { user, supabase } = await requireUser(req)
    const input = await body(req)
    const companyId = String(input.company_id ?? '')
    const userId = String(input.user_id ?? '')
    const mime = String(input.mime_type ?? '')
    const base64 = String(input.data_base64 ?? '')
    if (!companyId || !userId || !mime || !base64) throw new Error('company_id, user_id, mime_type and data_base64 are required')
    if (!MIME.has(mime)) throw new Error('Unsupported avatar image type')
    if (base64.length > 3_000_000) throw new Error('Avatar is too large')
    const { data: allowed, error: roleError } = await supabase.rpc('can_actor_assign_role', { p_company_id: companyId, p_target_role: 'employee' })
    if (roleError) throw roleError
    if (!allowed) throw new Error('Not authorized to manage company avatars')
    const { data: membership, error: membershipError } = await supabase.from('company_memberships').select('id').eq('company_id', companyId).eq('user_id', userId).maybeSingle()
    if (membershipError) throw membershipError
    if (!membership) throw new Error('Target user is not a company member')
    const before = await supabase.from('profiles').select('avatar_path').eq('id', userId).maybeSingle()
    if (before.error) throw before.error
    const bytes = Uint8Array.from(atob(base64.replace(/^data:[^;]+;base64,/, '')), c => c.charCodeAt(0))
    const ext = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1]
    const path = `${companyId}/${userId}/${crypto.randomUUID()}.${ext}`
    const db = adminClient()
    const { error: uploadError } = await db.storage.from('profile-images').upload(path, bytes, { contentType: mime, upsert: false })
    if (uploadError) throw uploadError
    const { error: profileError } = await db.from('profiles').update({ avatar_path: path }).eq('id', userId)
    if (profileError) { await db.storage.from('profile-images').remove([path]); throw profileError }
    if (before.data?.avatar_path) await db.storage.from('profile-images').remove([before.data.avatar_path])
    await db.from('audit_logs').insert({ company_id: companyId, actor_id: user.id, action: 'update', entity_type: 'profile', entity_id: userId, description: 'Profile avatar updated', changes: { avatar_path: { before: before.data?.avatar_path ?? null, after: path } }, metadata: { source: 'manage-user-avatar' } })
    return json({ ok: true, avatar_path: path })
  } catch (e) { return errorResponse(e) }
})
