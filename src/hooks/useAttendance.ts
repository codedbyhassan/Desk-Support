import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useToast } from './use-toast'

interface AttendanceStatus {
  status: 'clocked_in' | 'clocked_out' | 'not_started' | 'on_break'
  check_in_time?: string
  check_out_time?: string
  clockInTime?: string
  elapsedHours?: string
}

interface QRCodeInfo {
  id: string
  qr_code_id: string
  company_id: string
  type: 'location' | 'individual'
  location_name: string
  action: 'clock_in' | 'clock_out' | 'toggle'
  is_active: boolean
  expires_at?: string
  use_active_hours: boolean
  active_hours_start?: string
  active_hours_end?: string
  requires_auth: boolean
  requires_gps: boolean
  requires_photo: boolean
}

export function useAttendance() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>({
    status: 'not_started',
  })

  // Fetch current attendance status
  const fetchAttendanceStatus = useCallback(async () => {
    if (!user?.id) return

    try {
        // Check for today's attendance record
        const today = new Date().toISOString().split('T')[0]
        const startOfDay = new Date(today)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(today)
        endOfDay.setHours(23, 59, 59, 999)

        // Query attendance - use date range filter like UserAttendanceTab does
        const { data, error } = await supabase
          .from('attendance')
          .select('status, check_in, check_out')
          .eq('user_id', user.id)
          .gte('date', today)
          .lte('date', today)
          .order('check_in', { ascending: false })
          .limit(1)
          .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching attendance status:', error)
        return
      }

      if (data) {
        const checkInTime = data.check_in ? new Date(data.check_in) : null
        const checkOutTime = data.check_out ? new Date(data.check_out) : null
        const now = new Date()
        
        let elapsedHours = ''
        if (checkInTime && !checkOutTime) {
          const elapsedMs = now.getTime() - checkInTime.getTime()
          const hours = Math.floor(elapsedMs / (1000 * 60 * 60))
          const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60))
          elapsedHours = `${hours}h ${minutes}m`
        }

        setAttendanceStatus({
          status: data.status as AttendanceStatus['status'],
          check_in_time: data.check_in || undefined,
          check_out_time: data.check_out || undefined,
          clockInTime: checkInTime?.toLocaleTimeString(),
          elapsedHours,
        })
      } else {
        setAttendanceStatus({ status: 'not_started' })
      }
    } catch (error) {
      console.error('Error fetching attendance status:', error)
    }
  }, [user?.id])

  // Parse QR code data from scanned string
  const parseQRCodeData = useCallback((qrData: string): string | null => {
    // QR code format: attendance://{qrCodeId}
    const match = qrData.match(/^attendance:\/\/(.+)$/i)
    return match ? match[1] : null
  }, [])

  // Validate QR code
  const validateQRCode = useCallback(
    async (qrCodeId: string): Promise<QRCodeInfo | null> => {
      if (!user?.company_id) {
        throw new Error('User not authenticated')
      }

      try {
        const { data, error } = await supabase
          .from('qr_codes')
          .select('*')
          .eq('qr_code_id', qrCodeId)
          .eq('company_id', user.company_id)
          .eq('is_active', true)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            throw new Error('QR code not found or invalid')
          }
          throw error
        }

        // Check if QR code is expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          throw new Error('QR code has expired')
        }

        // Check active hours if enabled
        if (data.use_active_hours && data.active_hours_start && data.active_hours_end) {
          const now = new Date()
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
          
          if (currentTime < data.active_hours_start || currentTime > data.active_hours_end) {
            throw new Error(`QR code is only active between ${data.active_hours_start} and ${data.active_hours_end}`)
          }
        }

        return data as QRCodeInfo
      } catch (error: any) {
        throw error
      }
    },
    [user?.company_id]
  )

  // Determine action based on QR code and current status
  const determineAction = useCallback(
    (qrCode: QRCodeInfo, currentStatus: AttendanceStatus['status']): 'clock_in' | 'clock_out' => {
      if (qrCode.action === 'clock_in') return 'clock_in'
      if (qrCode.action === 'clock_out') return 'clock_out'
      
      // Toggle mode: determine based on current status
      if (currentStatus === 'clocked_in' || currentStatus === 'on_break') {
        return 'clock_out'
      }
      return 'clock_in'
    },
    []
  )

  // Register attendance
  const registerAttendance = useCallback(
    async (qrData: string, location?: { latitude: number; longitude: number }) => {
      if (!user?.id || !user?.company_id) {
        throw new Error('User not authenticated')
      }

      setLoading(true)

      try {
        // Parse QR code ID
        const qrCodeId = parseQRCodeData(qrData)
        if (!qrCodeId) {
          throw new Error('Invalid QR code format')
        }

        // Validate QR code
        const qrCode = await validateQRCode(qrCodeId)
        if (!qrCode) {
          throw new Error('QR code validation failed')
        }

        // Determine action
        const action = determineAction(qrCode, attendanceStatus.status)

        // Check if user already has attendance record for today
        const today = new Date().toISOString().split('T')[0]
        const { data: existingRecord } = await supabase
          .from('attendance')
          .select('id, status, check_in, check_out')
          .eq('user_id', user.id)
          .eq('date', today)
          .order('check_in', { ascending: false })
          .limit(1)
          .maybeSingle()

        let result

        if (action === 'clock_in') {
          // Check if already clocked in
          if (existingRecord && (existingRecord.status === 'clocked_in' || existingRecord.status === 'on_break')) {
            throw new Error('You are already clocked in')
          }

          // Create new attendance record
          const { data, error } = await supabase
            .from('attendance')
            .insert({
              user_id: user.id,
              company_id: user.company_id,
              date: today,
              check_in: new Date().toISOString(),
              status: 'clocked_in',
              location: qrCode.location_name,
            })
            .select()
            .single()

          if (error) throw error
          result = data
        } else {
          // Clock out
          if (!existingRecord || existingRecord.status === 'clocked_out') {
            throw new Error('You are not clocked in')
          }

          // Update existing record
          const { data, error } = await supabase
            .from('attendance')
            .update({
              check_out: new Date().toISOString(),
              status: 'clocked_out',
            })
            .eq('id', existingRecord.id)
            .select()
            .single()

          if (error) throw error
          result = data
        }

        // Update QR code usage count
        await supabase
          .from('qr_codes')
          .update({
            usage_count: (qrCode.usage_count || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', qrCode.id)

        // Refresh attendance status
        await fetchAttendanceStatus()

        return result
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to register attendance'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        throw error
      } finally {
        setLoading(false)
      }
    },
    [user, attendanceStatus.status, parseQRCodeData, validateQRCode, determineAction, fetchAttendanceStatus, toast]
  )

  return {
    loading,
    attendanceStatus,
    fetchAttendanceStatus,
    registerAttendance,
    parseQRCodeData,
    validateQRCode,
  }
}

