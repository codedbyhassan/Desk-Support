import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useQRCode } from '@/context/QRCodeContext'
import { useQRScanner } from '@/hooks/useQRScanner'
import { useAttendance } from '@/hooks/useAttendance'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  QrCode,
  X,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Camera,
  Calendar,
  Award,
  MapPin,
  Zap,
} from 'lucide-react'

interface AttendanceHistoryType {
  today: { present: number; hours: number }
  week: { present: number; total: number; hours: number }
  month: { present: number; total: number; hours: number }
  year: { present: number; total: number; hours: number }
}

export default function QRScannerPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // QR Code and Attendance hooks
  const { isScanning, startScanning, stopScanning } = useQRCode()
  const { attendanceStatus, fetchAttendanceStatus, registerAttendance, loading: attendanceLoading } = useAttendance()

  // QR Scanner hook
  useQRScanner({
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
    onScanSuccess: async (data) => {
      try {
        stopScanning()
        const currentStatus = attendanceStatus.status
        await registerAttendance(data)
        const action = currentStatus === 'clocked_in' || currentStatus === 'on_break' ? 'out' : 'in'
        toast({
          title: '✓ Success',
          description: `Successfully clocked ${action}! Timer started.`,
        })
        await fetchAttendanceStatus()
        await fetchAttendanceHistory()
      } catch (error) {
        console.error('Error registering attendance:', error)
        toast({
          title: 'Error',
          description: 'Failed to register attendance',
          variant: 'destructive'
        })
      }
    },
    onScanError: (error) => {
      console.error('QR scan error:', error)
    },
    continuous: true,
  })

  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistoryType>({
    today: { present: 0, hours: 0 },
    week: { present: 0, total: 7, hours: 0 },
    month: { present: 0, total: 0, hours: 0 },
    year: { present: 0, total: 365, hours: 0 },
  })
  const [attendanceLoadingHistory, setAttendanceLoadingHistory] = useState(false)

  useEffect(() => {
    fetchAttendanceStatus()
    fetchAttendanceHistory()
  }, [fetchAttendanceStatus])

  const fetchAttendanceHistory = async () => {
    if (!user?.id) return
    
    setAttendanceLoadingHistory(true)
    try {
      const now = new Date()
      
      // Today
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(now)
      todayEnd.setHours(23, 59, 59, 999)
      
      // Week (last 7 days)
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - 6)
      weekStart.setHours(0, 0, 0, 0)
      
      // For demo: Calculate based on current status
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      
      setAttendanceHistory({
        today: { present: attendanceStatus.status === 'clocked_in' ? 1 : 0, hours: 4.5 },
        week: { present: 5, total: 7, hours: 38.5 },
        month: { present: 18, total: daysInMonth, hours: 156 },
        year: { present: 245, total: 365, hours: 1960 },
      })
    } catch (error) {
      console.error('Error fetching attendance history:', error)
    } finally {
      setAttendanceLoadingHistory(false)
    }
  }

  // Status determination
  const getStatus = () => {
    switch (attendanceStatus.status) {
      case 'clocked_in':
        return { label: 'Clocked In', color: 'bg-emerald-500', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', icon: CheckCircle2, textColor: 'text-emerald-900' }
      case 'on_break':
        return { label: 'On Break', color: 'bg-amber-500', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', icon: Zap, textColor: 'text-amber-900' }
      case 'clocked_out':
      default:
        return { label: 'Clocked Out', color: 'bg-slate-500', bgColor: 'bg-slate-50', borderColor: 'border-slate-200', icon: Clock, textColor: 'text-slate-900' }
    }
  }

  const status = getStatus()
  const StatusIcon = status.icon

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header with Hamburger */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border lg:hidden">
        <div className="flex items-center justify-between h-16 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-lg hover:bg-muted"
            title="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <QrCode className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-base font-semibold truncate">QR Attendance</h1>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app/dashboard')}
            className="h-10 w-10 rounded-lg hover:bg-muted"
            title="Home"
          >
            <MapPin className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 lg:pt-0 pb-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Desktop Header */}
        <div className="hidden lg:block mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <QrCode className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">QR Code Attendance</h1>
              <p className="text-sm text-muted-foreground">Scan QR codes to clock in or out</p>
            </div>
          </div>
        </div>

        {/* Quick Stats - Mobile Optimized */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-6">
          {/* Today */}
          <Card className="border-slate-200 shadow-sm lg:shadow-lg">
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2 lg:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-10 lg:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                {attendanceLoadingHistory && (
                  <div className="h-3 w-3 sm:h-4 sm:w-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                )}
              </div>
              <p className="text-[10px] sm:text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Today</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">
                {attendanceHistory.today.present > 0 ? '✓' : '✗'}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {attendanceHistory.today.hours > 0 ? `${attendanceHistory.today.hours}h` : 'No hours'}
              </p>
            </div>
          </Card>

          {/* This Week */}
          <Card className="border-slate-200 shadow-sm lg:shadow-lg">
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2 lg:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-10 lg:h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </div>
              <p className="text-[10px] sm:text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">This Week</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">
                {attendanceHistory.week.present}/{attendanceHistory.week.total}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {attendanceHistory.week.hours}h total
              </p>
            </div>
          </Card>

          {/* This Month */}
          <Card className="border-slate-200 shadow-sm lg:shadow-lg">
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2 lg:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-10 lg:h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <Award className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </div>
              <p className="text-[10px] sm:text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">This Month</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">
                {attendanceHistory.month.present}/{attendanceHistory.month.total}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {attendanceHistory.month.hours}h total
              </p>
            </div>
          </Card>

          {/* This Year */}
          <Card className="border-slate-200 shadow-sm lg:shadow-lg">
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2 lg:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-10 lg:h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </div>
              <p className="text-[10px] sm:text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">This Year</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">
                {attendanceHistory.year.present}/{attendanceHistory.year.total}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {attendanceHistory.year.hours}h total
              </p>
            </div>
          </Card>
        </div>

        {/* Main Content - Mobile Optimized */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {/* Status Card */}
          <Card className="lg:col-span-2 border-slate-200 shadow-sm lg:shadow-lg">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 lg:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">Today's Status</h3>
                  <p className="text-xs sm:text-sm text-slate-500">Current attendance status</p>
                </div>
              </div>

              <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 ${status.bgColor} border-2 ${status.borderColor}`}>
                <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-white/10 rounded-full -mr-8 sm:-mr-16 -mt-8 sm:-mt-16 blur-2xl" />
                <div className="relative text-center space-y-2 sm:space-y-4">
                  <div className="flex justify-center">
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 ${status.color} rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg`}>
                      <StatusIcon className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">{status.label}</h3>
                    {attendanceStatus.clockInTime && (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-3 lg:mt-4">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/60 backdrop-blur-sm rounded-lg">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-slate-600" />
                          <span className="text-[10px] sm:text-sm font-semibold text-slate-900">
                            {attendanceStatus.clockInTime}
                          </span>
                        </div>
                        {attendanceStatus.elapsedHours && (
                          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/60 backdrop-blur-sm rounded-lg">
                            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-slate-600" />
                            <span className="text-[10px] sm:text-sm font-semibold text-slate-900">
                              {attendanceStatus.elapsedHours}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* QR Scanner Card */}
          <Card className="border-slate-200 shadow-sm lg:shadow-lg">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 lg:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                  <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">Scanner</h3>
                  <p className="text-xs sm:text-sm text-slate-500">Scan QR code</p>
                </div>
              </div>

              {!isScanning ? (
                <Button
                  onClick={startScanning}
                  disabled={attendanceLoading}
                  className="w-full h-11 sm:h-12 lg:h-14 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
                  size="lg"
                >
                  <QrCode className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  {attendanceStatus.status === 'clocked_in' || attendanceStatus.status === 'on_break' ? 'Clock Out' : 'Clock In'}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="relative w-full rounded-lg bg-black aspect-square overflow-hidden shadow-lg border-4 border-blue-500">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="border-3 border-blue-400 rounded-lg w-32 h-32 animate-pulse shadow-xl" />
                    </div>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <Button
                    onClick={stopScanning}
                    disabled={attendanceLoading}
                    variant="outline"
                    className="w-full h-10 sm:h-11 border-slate-300 text-sm sm:text-base"
                    size="lg"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                  {attendanceLoading && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm text-blue-800 flex items-center gap-2">
                      <div className="h-3 w-3 sm:h-4 sm:w-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
                      <span>Processing...</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 lg:mt-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-semibold text-slate-900 text-xs sm:text-sm mb-2 flex items-center gap-2">
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-slate-600 flex-shrink-0" />
                  <span className="truncate">Instructions</span>
                </h4>
                <ul className="text-[10px] sm:text-xs text-slate-600 space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-slate-400 flex-shrink-0">•</span>
                    <span>Tap button to open camera</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-400 flex-shrink-0">•</span>
                    <span>Center QR code in frame</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-400 flex-shrink-0">•</span>
                    <span>Auto clocks in or out</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Status Badge */}
        <div className="mt-6 flex justify-center">
          <Badge className={`text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 font-semibold ${status.color}`}>
            {status.label.toUpperCase()}
          </Badge>
        </div>
      </div>
    </div>
  )
}
