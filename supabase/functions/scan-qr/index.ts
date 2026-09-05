import { body, errorResponse, json, rateLimit, requireUser } from '../_shared.ts'

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return json({ error: 'POST required' }, 405)
    const { user, supabase } = await requireUser(req)
    await rateLimit(`qr-scan:${user.id}`, 30, 60)
    const input = await body(req)
    const code = String(input.code ?? '').trim()
    if (!code) throw new Error('code is required')
    const { data, error } = await supabase.rpc('scan_attendance_qr', { p_code: code, p_latitude: input.latitude ?? null, p_longitude: input.longitude ?? null, p_metadata: { ...(input.metadata ?? {}), user_agent: req.headers.get('user-agent'), actor_id: user.id } })
    if (error) throw error
    return json({ ok: true, valid: true, result: data })
  } catch (e) { return errorResponse(e) }
})
