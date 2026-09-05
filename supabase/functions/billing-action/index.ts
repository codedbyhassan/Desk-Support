import { body, errorResponse, json, requireUser, roleCheck } from '../_shared.ts'

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return json({ error: 'POST required' }, 405)
    const { user, supabase } = await requireUser(req)
    const input = await body(req)
    const companyId = String(input.company_id ?? req.headers.get('x-company-id') ?? '')
    if (!companyId) throw new Error('company_id is required')
    await roleCheck(supabase, user.id, companyId, ['admin'])
    const action = String(input.action ?? '')
    const { data: sub, error } = await supabase.from('subscriptions').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw error
    if (!sub) throw new Error('Subscription not found')

    if (sub.provider) {
      throw new Error(`Provider-managed subscription: ${sub.provider}. Cancellation/resume must be completed through the provider lifecycle and its signed webhook; local status mutation is disabled.`)
    }

    if (action === 'cancel' && ['trialing'].includes(sub.status)) {
      const { data: updated, error: updateError } = await supabase.from('subscriptions').update({ cancel_at_period_end: true }).eq('id', sub.id).select().single()
      if (updateError) throw updateError
      return json({ ok: true, subscription: updated, local_trial: true })
    }
    if (action === 'resume' && ['trialing'].includes(sub.status)) {
      const { data: updated, error: updateError } = await supabase.from('subscriptions').update({ cancel_at_period_end: false, cancelled_at: null }).eq('id', sub.id).select().single()
      if (updateError) throw updateError
      return json({ ok: true, subscription: updated, local_trial: true })
    }
    throw new Error('Unsupported billing action for this subscription')
  } catch (e) { return errorResponse(e) }
})
