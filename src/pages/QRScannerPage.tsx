import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { App } from '@capacitor/app'
import jsQR from 'jsqr'
import { useAuth } from '@/lib/auth'
import { useQRCode } from '@/context/QRCodeContext'
import { useQRScanner } from '@/hooks/useQRScanner'
import { useNativeQRScanner } from '@/hooks/useNativeQRScanner'
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  // QR Code and Attendance hooks
  const { isScanning, startScanning, stopScanning, error: qrError } = useQRCode()
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
  const [manualQRCode, setManualQRCode] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [isNativeApp, setIsNativeApp] = useState(false)

  // Native QR Scanner
  const { scanQRCode, canvasRef: nativeCanvasRef } = useNativeQRScanner({
    onSuccess: async (data) => {
      try {
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
    }
  })

  useEffect(() => {
    // Only fetch on mount, not on every render
    fetchAttendanceStatus()
    fetchAttendanceHistory()
    
    // Check if running in native app
    App.getInfo().then(() => {
      setIsNativeApp(true)
      console.log('[QR Scanner] Running in native app')
    }).catch(() => {
      setIsNativeApp(false)
      console.log('[QR Scanner] Running in web browser')
    })
    
    // Return cleanup - stop scanning if component unmounts
    return () => {
      stopScanning()
    }
  }, []) // Empty dependency array - run only once on mount

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

  // Handle manual QR code submission
  const handleManualQRSubmit = async () => {
    if (!manualQRCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a QR code value',
        variant: 'destructive'
      })
      return
    }

    try {
      const currentStatus = attendanceStatus.status
      await registerAttendance(manualQRCode)
      const action = currentStatus === 'clocked_in' || currentStatus === 'on_break' ? 'out' : 'in'
      toast({
        title: '✓ Success',
        description: `Successfully clocked ${action}!`,
      })
      setManualQRCode('')
      setShowManualEntry(false)
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
  }

  // Handle file upload for QR code image
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      toast({
        title: 'Processing...',
        description: 'Scanning QR code from image...',
      })

      const canvas = canvasRef.current
      if (!canvas) return

      const img = new Image()
      img.onload = async () => {
        try {
          const context = canvas.getContext('2d')
          if (!context) return

          canvas.width = img.width
          canvas.height = img.height
          context.drawImage(img, 0, 0)

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          })

          if (code) {
            console.log('[QR Scanner] ✓ QR code found:', code.data)
            const currentStatus = attendanceStatus.status
            await registerAttendance(code.data)
            const action = currentStatus === 'clocked_in' || currentStatus === 'on_break' ? 'out' : 'in'
            toast({
              title: '✓ Success',
              description: `Successfully clocked ${action}!`,
            })
            await fetchAttendanceStatus()
            await fetchAttendanceHistory()
          } else {
            console.log('[QR Scanner] No QR code found in image')
            toast({
              title: 'No QR Code Found',
              description: 'Could not detect QR code in image. Try again with a clearer photo.',
              variant: 'destructive'
            })
          }
        } catch (error) {
          console.error('[QR Scanner] Error processing image:', error)
          toast({
            title: 'Error',
            description: 'Failed to process image',
            variant: 'destructive'
          })
        }
      }
      img.onerror = () => {
        toast({
          title: 'Error',
          description: 'Failed to load image',
          variant: 'destructive'
        })
      }
      img.src = URL.createObjectURL(file)
    } catch (error) {
      console.error('Error processing image:', error)
      toast({
        title: 'Error',
        description: 'Failed to process image',
        variant: 'destructive'
      })
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
              <p className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1">Today</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">
                {attendanceHistory.today.present > 0 ? '✓' : '✗'}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 mt-1">
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
              <p className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1">This Week</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">
                {attendanceHistory.week.present}/{attendanceHistory.week.total}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 mt-1">
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
              <p className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1">This Month</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">
                {attendanceHistory.month.present}/{attendanceHistory.month.total}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 mt-1">
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
              <p className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1">This Year</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">
                {attendanceHistory.year.present}/{attendanceHistory.year.total}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 mt-1">
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
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Today's Status</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300">Current attendance status</p>
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
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">{status.label}</h3>
                    {attendanceStatus.clockInTime && (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-3 lg:mt-4">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-lg">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-300" />
                          <span className="text-[10px] sm:text-sm font-semibold text-slate-900 dark:text-white">
                            {attendanceStatus.clockInTime}
                          </span>
                        </div>
                        {attendanceStatus.elapsedHours && (
                          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-lg">
                            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-300" />
                            <span className="text-[10px] sm:text-sm font-semibold text-slate-900 dark:text-white">
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
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Scanner</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300">Scan QR code</p>
                </div>
              </div>

              {!isScanning && !showManualEntry ? (
                <div className="space-y-3">
                  {qrError && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-amber-800 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Camera Setup</p>
                        <p className="mt-1 break-words text-xs">Use the buttons below to scan</p>
                      </div>
                    </div>
                  )}
                  {isNativeApp ? (
                    <Button
                      onClick={scanQRCode}
                      disabled={attendanceLoading}
                      className="w-full h-11 sm:h-12 lg:h-14 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
                      size="lg"
                    >
                      <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      📸 Native Camera Scanner
                    </Button>
                  ) : (
                    <Button
                      onClick={startScanning}
                      disabled={attendanceLoading}
                      className="w-full h-11 sm:h-12 lg:h-14 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
                      size="lg"
                    >
                      <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Open Live Scanner
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      const input = fileInputRef.current
                      if (input) {
                        input.accept = 'image/*'
                        if ('capture' in input) {
                          (input as any).capture = false
                        }
                        input.click()
                      }
                    }}
                    disabled={attendanceLoading}
                    variant="outline"
                    className="w-full h-10 sm:h-11 text-sm sm:text-base"
                    size="lg"
                  >
                    <QrCode className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Upload from Library
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => setShowManualEntry(true)}
                    disabled={attendanceLoading}
                    variant="outline"
                    className="w-full h-10 sm:h-11 text-sm sm:text-base"
                    size="lg"
                  >
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Enter Code Manually
                  </Button>
                  {isNativeApp && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3 text-xs text-green-700">
                      ✓ Native app detected - Using native camera
                    </div>
                  )}
                </div>
              ) : showManualEntry ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-blue-800">
                    <p className="font-semibold mb-2">Enter QR Code Value</p>
                    <p>Paste or type the QR code text value below</p>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter QR code value..."
                    value={manualQRCode}
                    onChange={(e) => setManualQRCode(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleManualQRSubmit}
                      disabled={attendanceLoading || !manualQRCode.trim()}
                      className="flex-1 h-10 sm:h-11 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm sm:text-base"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Submit
                    </Button>
                    <Button
                      onClick={() => {
                        setShowManualEntry(false)
                        setManualQRCode('')
                      }}
                      variant="outline"
                      className="flex-1 h-10 sm:h-11 text-sm sm:text-base"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {qrError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-red-800 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Camera Error</p>
                        <p className="mt-1 break-words">{qrError}</p>
                        <p className="mt-2 text-xs text-red-700">💡 Tip: Use the other options below to clock in</p>
                      </div>
                    </div>
                  )}
                  <div className="relative w-full bg-black rounded-lg overflow-hidden shadow-lg border-4 border-blue-500" style={{ minHeight: '300px', maxWidth: '100%' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      webkit-playsinline="true"
                      className="w-full h-full object-cover absolute top-0 left-0"
                      style={{ 
                        WebkitPlaysinline: 'true',
                        transform: 'scaleX(-1)',
                        display: 'block'
                      } as any}
                      onLoadedMetadata={() => console.log('[QR Scanner] onLoadedMetadata fired')}
                      onCanPlay={() => console.log('[QR Scanner] onCanPlay fired')}
                      onError={(e) => console.error('[QR Scanner] Video error:', e.currentTarget.error)}
                    />
                    {!qrError && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="border-3 border-blue-400 rounded-lg w-24 h-24 sm:w-32 sm:h-32 animate-pulse shadow-xl" />
                      </div>
                    )}
                    {qrError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="text-center">
                          <Camera className="h-12 w-12 text-red-500 mx-auto mb-2" />
                          <p className="text-white text-sm font-semibold">Camera Unavailable</p>
                        </div>
                      </div>
                    )}
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

        {/* Hidden canvases for QR processing */}
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={nativeCanvasRef} className="hidden" />
      </div>
    </div>
  )
}
