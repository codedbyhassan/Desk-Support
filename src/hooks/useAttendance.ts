import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useToast } from './use-toast'

export interface AttendanceStatus {
  status: 'clocked_in' | 'clocked_out' | 'not_started' | 'on_break'
  check_in_time?: string
  check_out_time?: string
  clockInTime?: string
  elapsedHours?: string
}

export interface QRCodeInfo {
  id: string
  qr_code_id: string
  company_id: string
  type: string
  location_name: string
  action: 'clock_in' | 'clock_out' | 'toggle'
  is_active: boolean
  expires_at?: string
  requires_auth: boolean
  requires_gps: boolean
  requires_photo: boolean
}

export function useAttendance() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>({ status: 'not_started' })

  const fetchAttendanceStatus = useCallback(async () => {
    if (!user?.id || !user.company_id) return
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase.from('attendance')
      .select('status,check_in,check_out')
      .eq('company_id', user.company_id)
      .eq('user_id', user.id)
      .eq('attendance_date', today)
      .maybeSingle()
    if (error) { console.error('Error fetching attendance:', error); return }
    if (!data) { setAttendanceStatus({ status: 'not_started' }); return }

    const checkedIn = !!data.check_in && !data.check_out
    const checkIn = data.check_in ? new Date(data.check_in) : null
    const elapsedMs = checkIn && checkedIn ? Math.max(0, Date.now() - checkIn.getTime()) : 0
    const hours = Math.floor(elapsedMs / 3600000)
    const minutes = Math.floor((elapsedMs % 3600000) / 60000)
    setAttendanceStatus({
      status: checkedIn ? 'clocked_in' : 'clocked_out',
      check_in_time: data.check_in ?? undefined,
      check_out_time: data.check_out ?? undefined,
      clockInTime: checkIn?.toLocaleTimeString(),
      elapsedHours: checkedIn ? `${hours}h ${minutes}m` : undefined,
    })
  }, [user?.company_id, user?.id])

  const parseQRCodeData = useCallback((qrData: string): string | null => {
    const match = qrData.trim().match(/^attendance:\/\/(.+)$/i)
    return match?.[1] ?? null
  }, [])

  const validateQRCode = useCallback(async (code: string): Promise<QRCodeInfo | null> => {
    if (!user?.company_id) throw new Error('User is not authenticated.')
    const { data, error } = await supabase.from('qr_codes')
      .select('id,code,company_id,name,status,expires_at')
      .eq('code', code)
      .eq('company_id', user.company_id)
      .eq('status', 'active')
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('QR code not found or inactive.')
    if (data.expires_at && new Date(data.expires_at) <= new Date()) throw new Error('QR code has expired.')
    return {
      id: data.id,
      qr_code_id: data.code,
      company_id: data.company_id,
      type: 'attendance',
      location_name: data.name,
      action: 'toggle',
      is_active: data.status === 'active',
      expires_at: data.expires_at ?? undefined,
      requires_auth: true,
      requires_gps: false,
      requires_photo: false,
    }
  }, [user?.company_id])

  const determineAction = useCallback((qrCode: QRCodeInfo, currentStatus: AttendanceStatus['status']): 'clock_in' | 'clock_out' => {
    if (qrCode.action === 'clock_in' || qrCode.action === 'clock_out') return qrCode.action
    return currentStatus === 'clocked_in' || currentStatus === 'on_break' ? 'clock_out' : 'clock_in'
  }, [])

  const registerAttendance = useCallback(async (qrData: string, location?: { latitude: number; longitude: number }) => {
    if (!user?.id || !user.company_id) throw new Error('User is not authenticated.')
    setLoading(true)
    try {
      const code = parseQRCodeData(qrData)
      if (!code) throw new Error('Invalid attendance QR code format.')
      const qrCode = await validateQRCode(code)
      if (!qrCode) throw new Error('QR code validation failed.')
      const action = determineAction(qrCode, attendanceStatus.status)
      const today = new Date().toISOString().slice(0, 10)
      const { data: existing, error: existingError } = await supabase.from('attendance')
        .select('id,status,check_in,check_out,metadata')
        .eq('company_id', user.company_id).eq('user_id', user.id).eq('attendance_date', today).maybeSingle()
      if (existingError) throw existingError

      const now = new Date().toISOString()
      let result
      if (action === 'clock_in') {
        if (existing?.check_in && !existing.check_out) throw new Error('You are already clocked in.')
        if (existing) {
          const { data, error } = await supabase.from('attendance').update({ check_in: now, check_out: null, status: 'present', metadata: { ...(existing.metadata ?? {}), qr_code_id: qrCode.id, ...(location ? { latitude: location.latitude, longitude: location.longitude } : {}) }, updated_at: now }).eq('id', existing.id).select().single()
          if (error) throw error
          result = data
        } else {
          const { data, error } = await supabase.from('attendance').insert({ company_id: user.company_id, user_id: user.id, attendance_date: today, status: 'present', check_in: now, created_by: user.id, metadata: { qr_code_id: qrCode.id, ...(location ? { latitude: location.latitude, longitude: location.longitude } : {}) } }).select().single()
          if (error) throw error
          result = data
        }
      } else {
        if (!existing?.check_in || existing.check_out) throw new Error('You are not currently clocked in.')
        const { data, error } = await supabase.from('attendance').update({ check_out: now, updated_at: now }).eq('id', existing.id).eq('company_id', user.company_id).select().single()
        if (error) throw error
        result = data
      }

      await fetchAttendanceStatus()
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to register attendance.'
      toast({ title: 'Attendance error', description: message, variant: 'destructive' })
      throw error
    } finally { setLoading(false) }
  }, [attendanceStatus.status, determineAction, fetchAttendanceStatus, parseQRCodeData, toast, user?.company_id, user?.id, validateQRCode])

  return { loading, attendanceStatus, fetchAttendanceStatus, registerAttendance, parseQRCodeData, validateQRCode, determineAction }
}
