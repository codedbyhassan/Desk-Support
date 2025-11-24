import { supabase } from './supabase'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

export async function logAudit(
  table: string,
  action: AuditAction,
  targetId: string,
  details: any
) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user?.id) {
      console.warn('Cannot log audit: user not authenticated')
      return
    }

    const { error } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      action,
      target_type: table,
      target_id: targetId,
      details: details || {},
      created_at: new Date().toISOString()
    })

    if (error) {
      console.error('Audit log error:', error)
    }
  } catch (err) {
    console.error('Failed to log audit:', err)
  }
}