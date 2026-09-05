import { adminClient, body, errorResponse, json, requireUser } from '../_shared.ts'

const ROLES = ['admin', 'hr', 'manager', 'employee', 'contractor', 'viewer'] as const

function validUsername(value: string) {
  return /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/.test(value)
}

Deno.serve(async (req) => {
  try {
    const { user, supabase } = await requireUser(req)
    const input = await body(req)
    const companyId = String(input.company_id ?? req.headers.get('x-company-id') ?? '')
    const userId = String(input.user_id ?? '')
    const requestedRole = String(input.role ?? 'employee')
    if (!companyId || !userId) throw new Error('company_id and user_id are required')
    if (!(ROLES as readonly string[]).includes(requestedRole)) throw new Error('Invalid membership role')
    const { data: allowed, error: roleError } = await supabase.rpc('can_actor_assign_role', { p_company_id: companyId, p_target_role: requestedRole })
    if (roleError) throw roleError
    if (!allowed) throw new Error('Not authorized to grant this role')
    if (userId === user.id) throw new Error('You cannot change your own role')

    const { data: targetMembership, error: targetError } = await supabase
      .from('company_memberships').select('id,user_id,role,is_active,department_id')
      .eq('company_id', companyId).eq('user_id', userId).maybeSingle()
    if (targetError) throw targetError
    if (!targetMembership) throw new Error('Target user is not a member of this company')

    let departmentId = input.department_id == null || input.department_id === '' ? null : String(input.department_id)
    if (departmentId) {
      const { data: department, error } = await supabase.from('departments').select('id').eq('id', departmentId).eq('company_id', companyId).maybeSingle()
      if (error) throw error
      if (!department) throw new Error('Department does not belong to this company')
    }

    const username = input.username == null ? null : String(input.username).trim().toLowerCase()
    if (username !== null && !validUsername(username)) throw new Error('Username must contain 3-30 lowercase letters, numbers, dots, underscores or hyphens')

    const admin = adminClient()
    const beforeProfile = await admin.from('profiles').select('id,username,full_name,phone,avatar_path').eq('id', userId).maybeSingle()
    if (beforeProfile.error) throw beforeProfile.error

    const { error: membershipError } = await admin.from('company_memberships').update({
      role: requestedRole,
      department_id: departmentId,
      is_active: targetMembership.is_active,
    }).eq('company_id', companyId).eq('user_id', userId)
    if (membershipError) throw membershipError

    const profilePatch: Record<string, unknown> = {}
    if (input.full_name !== undefined) profilePatch.full_name = String(input.full_name).trim()
    if (input.phone !== undefined) profilePatch.phone = input.phone ? String(input.phone).trim() : null
    if (username !== null) profilePatch.username = username
    if (Object.keys(profilePatch).length) {
      const { error: profileError } = await admin.from('profiles').update(profilePatch).eq('id', userId)
      if (profileError) throw profileError
    }

    const afterProfile = await admin.from('profiles').select('id,username,full_name,phone,avatar_path').eq('id', userId).maybeSingle()
    if (afterProfile.error) throw afterProfile.error
    await admin.from('audit_logs').insert({
      company_id: companyId,
      actor_id: user.id,
      action: 'update',
      entity_type: 'company_membership',
      entity_id: targetMembership.id,
      description: 'User membership/profile updated',
      changes: { membership: { before: { role: targetMembership.role, department_id: targetMembership.department_id, is_active: targetMembership.is_active }, after: { role: requestedRole, department_id: departmentId, is_active: targetMembership.is_active } }, profile: { before: beforeProfile.data, after: afterProfile.data } },
      metadata: { source: 'provision-user' },
    })

    return json({ ok: true, user_id: userId, company_id: companyId })
  } catch (e) { return errorResponse(e) }
})
