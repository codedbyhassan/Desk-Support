import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useToast } from './use-toast'

export interface AttendanceStatus {
  status: 'clocked_in' | 'clocked_out' | 'not_started'
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
  is_active: boolean
  expires_at?: string
}

type ScanResult = {
  ok: boolean
  action: 'clock_in' | 'clock_out'
  company_id: string
  session: { id: string; started_at: string; ended_at: string | null; type: string; source: string }
  scan_id: string
}

export function useAttendance() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>({ status: 'not_started' })

  const fetchAttendanceStatus = useCallback(async () => {
    if (!user?.id || !user.company_id) return
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select('started_at,ended_at')
      .eq('company_id', user.company_id)
      .eq('user_id', user.id)
      .eq('type', 'work')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) return
    if (!data) { setAttendanceStatus({ status: 'not_started' }); return }
    const checkedIn = !!data.started_at && !data.ended_at
    const checkIn = data.started_at ? new Date(data.started_at) : null
    const elapsedMs = checkIn && checkedIn ? Math.max(0, Date.now() - checkIn.getTime()) : 0
    const hours = Math.floor(elapsedMs / 3600000)
    const minutes = Math.floor((elapsedMs % 3600000) / 60000)
    setAttendanceStatus({
      status: checkedIn ? 'clocked_in' : 'clocked_out',
      check_in_time: data.started_at ?? undefined,
      check_out_time: data.ended_at ?? undefined,
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
    const { data, error } = await supabase
      .from('qr_codes')
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
      is_active: true,
      expires_at: data.expires_at ?? undefined,
    }
  }, [user?.company_id])

  const determineAction = useCallback((_qrCode: QRCodeInfo, currentStatus: AttendanceStatus['status']): 'clock_in' | 'clock_out' => {
    return currentStatus === 'clocked_in' ? 'clock_out' : 'clock_in'
  }, [])

  const registerAttendance = useCallback(async (qrData: string, location?: { latitude: number; longitude: number }) => {
    if (!user?.id || !user.company_id) throw new Error('User is not authenticated.')
    setLoading(true)
    try {
      const code = parseQRCodeData(qrData)
      if (!code) throw new Error('Invalid attendance QR code format.')
      const { data, error } = await supabase.rpc('scan_attendance_qr', {
        p_code: code,
        p_latitude: location?.latitude ?? null,
        p_longitude: location?.longitude ?? null,
        p_metadata: { source: 'attendance_scanner' },
      })
      if (error) throw error
      if (!data) throw new Error('Attendance scan returned no result.')
      const result = data as unknown as ScanResult
      await fetchAttendanceStatus()
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to register attendance.'
      toast({ title: 'Attendance error', description: message, variant: 'destructive' })
      throw error
    } finally { setLoading(false) }
  }, [fetchAttendanceStatus, parseQRCodeData, toast, user?.company_id, user?.id])

  return { loading, attendanceStatus, fetchAttendanceStatus, registerAttendance, parseQRCodeData, validateQRCode, determineAction }
}
