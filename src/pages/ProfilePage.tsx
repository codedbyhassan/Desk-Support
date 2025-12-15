import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card } from '../components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useToast } from '../hooks/use-toast'
import { useQRCode } from '../context/QRCodeContext'
import { useQRScanner } from '../hooks/useQRScanner'
import { useAttendance } from '../hooks/useAttendance'
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Upload,
  Lock,
  Building2,
  Edit3,
  Save,
  X,
  Crown,
  UserCircle,
  QrCode,
  Camera,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Award,
  MapPin,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useDashboardTab } from '../context/DashboardTabContext'

interface Department {
  id: string
  name: string
  description?: string
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // QR Code and Attendance hooks
  const { isScanning, startScanning, stopScanning, scannedData } = useQRCode()
  const { attendanceStatus, fetchAttendanceStatus, registerAttendance, loading: attendanceLoading } = useAttendance()

  // QR Scanner hook
  useQRScanner({
    videoRef,
    canvasRef,
    onScanSuccess: async (data) => {
      try {
        stopScanning()
        const currentStatus = attendanceStatus.status
        await registerAttendance(data)
        const action = currentStatus === 'clocked_in' || currentStatus === 'on_break' ? 'out' : 'in'
        toast({
          title: 'Scanning Complete',
          description: `Successfully clocked ${action}! Timer started.`,
        })
        await fetchAttendanceStatus()
        await fetchAttendanceHistory() // Refresh attendance history
      } catch (error) {
        console.error('Error registering attendance:', error)
      }
    },
    onScanError: (error) => {
      console.error('QR scan error:', error)
    },
    continuous: true,
  })

  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { activeTab, setActiveTab } = useDashboardTab()
  const profileTabs = ['profile', 'attendance'] as const
  const normalizedTab = (profileTabs as readonly string[]).includes(activeTab) ? activeTab : profileTabs[0]

  useEffect(() => {
    if (activeTab !== normalizedTab) {
      setActiveTab(normalizedTab)
    }
  }, [activeTab, normalizedTab, setActiveTab])

  // Form state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  
  // Attendance history state
  const [attendanceHistory, setAttendanceHistory] = useState<{
    today: { present: number; hours: number }
    week: { present: number; total: number; hours: number }
    month: { present: number; total: number; hours: number }
    year: { present: number; total: number; hours: number }
  }>({
    today: { present: 0, hours: 0 },
    week: { present: 0, total: 7, hours: 0 },
    month: { present: 0, total: 0, hours: 0 },
    year: { present: 0, total: 365, hours: 0 },
  })
  const [attendanceLoadingHistory, setAttendanceLoadingHistory] = useState(false)

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '')
      setPhone(user.phone || '')
      setDepartmentId(user.department_id || '')
      setAvatarPreview(user.avatar_url || '')
      fetchAttendanceStatus()
      fetchAttendanceHistory()
    }
    fetchDepartments()
  }, [user, fetchAttendanceStatus])

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, description')
        .order('name')
      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

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
      
      // Month (current month)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      
      // Year (current year)
      const yearStart = new Date(now.getFullYear(), 0, 1)
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      
      // Fetch all attendance records
      const { data: allRecords, error } = await supabase
        .from('attendance')
        .select('date, check_in, check_out, status')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
      
      if (error) throw error
      
      // Calculate statistics
      const todayRecords = (allRecords || []).filter(record => {
        const recordDate = new Date(record.date)
        return recordDate >= todayStart && recordDate <= todayEnd
      })
      
      const weekRecords = (allRecords || []).filter(record => {
        const recordDate = new Date(record.date)
        return recordDate >= weekStart && recordDate <= todayEnd
      })
      
      const monthRecords = (allRecords || []).filter(record => {
        const recordDate = new Date(record.date)
        return recordDate >= monthStart && recordDate <= monthEnd
      })
      
      const yearRecords = (allRecords || []).filter(record => {
        const recordDate = new Date(record.date)
        return recordDate >= yearStart && recordDate <= yearEnd
      })
      
      // Helper function to calculate hours
      const calculateHours = (records: any[]) => {
        return records.reduce((total, record) => {
          if (record.check_in && record.check_out) {
            const checkIn = new Date(record.check_in)
            const checkOut = new Date(record.check_out)
            const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
            return total + hours
          }
          return total
        }, 0)
      }
      
      // Calculate working days in month
      const workingDaysInMonth = (() => {
        let count = 0
        const current = new Date(monthStart)
        while (current <= monthEnd) {
          const dayOfWeek = current.getDay()
          if (dayOfWeek !== 0 && dayOfWeek !== 6) count++ // Exclude weekends
          current.setDate(current.getDate() + 1)
        }
        return count
      })()
      
      // Calculate working days in year
      const workingDaysInYear = (() => {
        let count = 0
        const current = new Date(yearStart)
        while (current <= yearEnd) {
          const dayOfWeek = current.getDay()
          if (dayOfWeek !== 0 && dayOfWeek !== 6) count++ // Exclude weekends
          current.setDate(current.getDate() + 1)
        }
        return count
      })()
      
      setAttendanceHistory({
        today: {
          present: todayRecords.filter(r => r.status === 'clocked_in' || r.status === 'clocked_out').length,
          hours: calculateHours(todayRecords),
        },
        week: {
          present: weekRecords.filter(r => r.status === 'clocked_in' || r.status === 'clocked_out').length,
          total: 7,
          hours: calculateHours(weekRecords),
        },
        month: {
          present: monthRecords.filter(r => r.status === 'clocked_in' || r.status === 'clocked_out').length,
          total: workingDaysInMonth,
          hours: calculateHours(monthRecords),
        },
        year: {
          present: yearRecords.filter(r => r.status === 'clocked_in' || r.status === 'clocked_out').length,
          total: workingDaysInYear,
          hours: calculateHours(yearRecords),
        },
      })
    } catch (error) {
      console.error('Error fetching attendance history:', error)
    } finally {
      setAttendanceLoadingHistory(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }

    if (phone && !/^[\d\s\-\+\(\)]+$/.test(phone)) {
      newErrors.phone = 'Invalid phone number format'
    }

    if (newPassword && newPassword.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (newPassword && newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleUpdateProfile(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!user) return

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors below',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      let avatarUrl = user.avatar_url

      // Upload avatar if a new file is selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `avatars/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, avatarFile, {
            upsert: true
          })

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('photos').getPublicUrl(filePath)
        avatarUrl = data.publicUrl
      }

      // Update profile using auth context method
      await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        department_id: departmentId || null,
        avatar_url: avatarUrl,
      })

      // Update password separately if provided
      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        })

        if (passwordError) throw passwordError
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully!',
      })
      setEditing(false)
      setNewPassword('')
      setConfirmPassword('')
      setAvatarFile(null)
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleCancel(): void {
    setEditing(false)
    setFullName(user?.full_name || '')
    setPhone(user?.phone || '')
    setDepartmentId(user?.department_id || '')
    setNewPassword('')
    setConfirmPassword('')
    setAvatarFile(null)
    setAvatarPreview(user?.avatar_url || '')
    setErrors({})
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  if (!user) return null

  const userDepartment = departments.find((d) => d.id === user.department_id)
  const statusConfig = {
    clocked_in: {
      icon: CheckCircle,
      label: 'Clocked In',
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    clocked_out: {
      icon: Clock,
      label: 'Clocked Out',
      color: 'bg-[hsl(var(--muted))]',
      textColor: 'text-[hsl(var(--muted-foreground))]',
      bgColor: 'bg-[hsl(var(--muted))]',
      borderColor: 'border-[hsl(var(--border))]',
    },
    not_started: {
      icon: AlertCircle,
      label: 'Not Started',
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
  }
  const status = statusConfig[attendanceStatus.status]
  const StatusIcon = status.icon

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-[hsl(var(--card-foreground))] shadow-xl mx-4 sm:mx-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0YzAtMS4xLS45LTItMi0ySDI2Yy0xLjEgMC0yIC45LTIgMnYyNGMwIDEuMS45IDIgMiAyaDhjMS4xIDAgMi0uOSAyLTJWMzR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-10" />
        <div className="relative p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="relative flex-shrink-0">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 ring-4 ring-white/20 shadow-2xl">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="text-lg sm:text-xl lg:text-3xl bg-gradient-to-br from-blue-400 to-cyan-400 text-[hsl(var(--card-foreground))] font-bold">
                    {user.full_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!editing && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 bg-emerald-500 rounded-full border-3 sm:border-4 border-slate-900 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 lg:w-2.5 lg:h-2.5 bg-[hsl(var(--card))] rounded-full animate-pulse" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl lg:text-3xl font-bold break-words">{user.full_name}</h1>
                  <Badge
                    className={`text-[10px] sm:text-xs lg:text-sm px-2 sm:px-3 py-0.5 sm:py-1 flex-shrink-0 ${
                      user.role === 'admin'
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-[hsl(var(--card-foreground))] border-0 shadow-lg'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-[hsl(var(--card-foreground))] border-0 shadow-lg'
                    }`}
                  >
                    {user.role === 'admin' ? <Crown className="mr-1 h-3 w-3" /> : <User className="mr-1 h-3 w-3" />}
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>
                <p className="text-[hsl(var(--muted-foreground))] text-xs sm:text-sm lg:text-base flex items-center gap-2 truncate">
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
                {userDepartment && (
                  <p className="text-[hsl(var(--muted-foreground))] text-[11px] sm:text-xs lg:text-sm mt-1 flex items-center gap-2 truncate">
                    <Building2 className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
                    <span className="truncate">{userDepartment.name}</span>
                  </p>
                )}
              </div>
            </div>
            {!editing && (
              <Button
                onClick={() => setEditing(true)}
                className="bg-[hsl(var(--card))]/10 hover:bg-[hsl(var(--card))]/20 text-[hsl(var(--card-foreground))] border border-white/20 backdrop-blur-sm shadow-lg rounded-lg lg:rounded-xl h-10 sm:h-11 lg:h-12 text-xs sm:text-sm w-full sm:w-auto flex-shrink-0"
              >
                <Edit3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={normalizedTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6 px-0">
        <TabsList className="hidden">
          <TabsTrigger value="profile" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm text-foreground">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm text-foreground">
            <QrCode className="h-4 w-4 mr-2" />
            Attendance
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 sm:space-y-6 px-4 sm:px-0">
          {editing ? (
            <Card className="border-[hsl(var(--border))] shadow-lg rounded-2xl lg:rounded-3xl">
              <form onSubmit={handleUpdateProfile} className="p-3 sm:p-4 lg:p-8 space-y-6 sm:space-y-8">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4 sm:gap-6 pb-6 sm:pb-8 border-b border-[hsl(var(--border))]">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 sm:h-32 sm:w-32 lg:h-36 lg:w-36 ring-4 ring-[hsl(var(--border))] shadow-xl">
                      <AvatarImage src={avatarPreview} />
                      <AvatarFallback className="text-3xl sm:text-4xl lg:text-5xl bg-gradient-to-br from-blue-500 to-cyan-500 text-[hsl(var(--card-foreground))] font-bold">
                        {fullName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-cyan-500 text-[hsl(var(--card-foreground))] rounded-full cursor-pointer hover:from-blue-600 hover:to-cyan-600 transition-all shadow-xl hover:scale-110 group-hover:scale-110"
                    >
                      <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                        disabled={loading}
                      />
                    </label>
                  </div>
                  <div className="text-center">
                    <p className="text-xs sm:text-sm font-medium text-[hsl(var(--muted-foreground))]">Upload Profile Photo</p>
                    <p className="text-[10px] sm:text-xs text-[hsl(var(--muted-foreground))] mt-1">JPG, PNG or GIF (max 5MB)</p>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-[hsl(var(--border))]">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <User className="h-5 w-5 text-[hsl(var(--card-foreground))]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Personal Information</h3>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Update your personal details</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-xs sm:text-sm font-medium text-[hsl(var(--muted-foreground))]">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value)
                          if (errors.fullName) setErrors({ ...errors, fullName: '' })
                        }}
                        disabled={loading}
                        className={`h-9 lg:h-11 text-xs lg:text-sm ${errors.fullName ? 'border-red-500 focus:border-red-500' : ''}`}
                        placeholder="John Doe"
                      />
                      {errors.fullName && <p className="text-[10px] lg:text-xs text-red-500 mt-1">{errors.fullName}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm font-medium text-[hsl(var(--muted-foreground))]">Email</Label>
                      <Input value={user.email} disabled className="h-9 lg:h-11 text-xs lg:text-sm bg-[hsl(var(--muted))]" />
                      <p className="text-[10px] lg:text-xs text-[hsl(var(--muted-foreground))] mt-1">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs sm:text-sm font-medium text-[hsl(var(--muted-foreground))]">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value)
                          if (errors.phone) setErrors({ ...errors, phone: '' })
                        }}
                        placeholder="+1 (555) 000-0000"
                        disabled={loading}
                        className={`h-9 lg:h-11 text-xs lg:text-sm ${errors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                      />
                      {errors.phone && <p className="text-[10px] lg:text-xs text-red-500 mt-1">{errors.phone}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm font-medium text-[hsl(var(--muted-foreground))]">Department</Label>
                      <Select value={departmentId || "none"} onValueChange={(value) => setDepartmentId(value === "none" ? "" : value)} disabled={loading}>
                        <SelectTrigger className="h-9 lg:h-11 text-xs lg:text-sm">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No department</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Password Section */}
                <div className="space-y-6 pt-6 border-t border-[hsl(var(--border))]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <Lock className="h-5 w-5 text-[hsl(var(--card-foreground))]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Change Password</h3>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Optional - Leave blank to keep current password</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-[hsl(var(--muted-foreground))]">New Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value)
                          if (errors.password) setErrors({ ...errors, password: '' })
                        }}
                        placeholder="••••••••"
                        disabled={loading}
                        className={`h-9 lg:h-11 text-xs lg:text-sm ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                      />
                      {errors.password && <p className="text-[10px] lg:text-xs text-red-500 mt-1">{errors.password}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-xs sm:text-sm font-medium text-[hsl(var(--muted-foreground))]">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' })
                        }}
                        placeholder="••••••••"
                        disabled={loading}
                        className={`h-9 lg:h-11 text-xs lg:text-sm ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                      />
                      {errors.confirmPassword && <p className="text-[10px] lg:text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-6 border-t border-[hsl(var(--border))]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading}
                    className="h-10 sm:h-11 text-xs sm:text-sm border-slate-300 hover:bg-[hsl(var(--muted))]"
                    size="lg"
                  >
                    <X className="h-4 w-4 mr-1 sm:mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-10 sm:h-11 text-xs sm:text-sm bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-[hsl(var(--card-foreground))] shadow-lg"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1 sm:mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Profile Card */}
              <Card className="lg:col-span-2 border-[hsl(var(--border))] shadow-lg">
                <div className="p-6 lg:p-8 space-y-8">
                  <div className="flex items-center gap-3 pb-6 border-b border-[hsl(var(--border))]">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <UserCircle className="h-5 w-5 text-[hsl(var(--card-foreground))]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Profile Details</h3>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Your account information</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:gap-6">
                    <div className="p-3 lg:p-5 rounded-lg lg:rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <Mail className="h-4 lg:h-5 w-4 lg:w-5 text-[hsl(var(--card-foreground))]" />
                        </div>
                        <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Email</p>
                      </div>
                      <p className="text-xs lg:text-sm font-semibold text-[hsl(var(--foreground))] truncate">{user.email}</p>
                    </div>

                    <div className="p-3 lg:p-5 rounded-lg lg:rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                          <Phone className="h-4 lg:h-5 w-4 lg:w-5 text-[hsl(var(--card-foreground))]" />
                        </div>
                        <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Phone</p>
                      </div>
                      <p className="text-xs lg:text-sm font-semibold text-[hsl(var(--foreground))]">{user.phone || 'Not provided'}</p>
                    </div>

                    <div className="p-3 lg:p-5 rounded-lg lg:rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 lg:h-5 w-4 lg:w-5 text-[hsl(var(--card-foreground))]" />
                        </div>
                        <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Department</p>
                      </div>
                      <p className="text-xs lg:text-sm font-semibold text-[hsl(var(--foreground))] truncate">{userDepartment?.name || 'Not assigned'}</p>
                    </div>

                    <div className="p-3 lg:p-5 rounded-lg lg:rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-4 lg:h-5 w-4 lg:w-5 text-[hsl(var(--card-foreground))]" />
                        </div>
                        <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Member Since</p>
                      </div>
                      <p className="text-xs lg:text-sm font-semibold text-[hsl(var(--foreground))]">
                        {new Date(user.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[hsl(var(--border))]">
                    <div className="flex items-center gap-3 mb-3">
                      <Shield className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                      <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">User ID</p>
                    </div>
                    <code className="text-xs bg-slate-100 text-[hsl(var(--muted-foreground))] px-4 py-2 rounded-lg font-mono block w-full overflow-x-auto">
                      {user.id}
                    </code>
                  </div>
                </div>
              </Card>

              {/* Stats Card */}
              <Card className="border-[hsl(var(--border))] shadow-lg">
                <div className="p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                      <Award className="h-5 w-5 text-[hsl(var(--card-foreground))]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Account Stats</h3>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Quick overview</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-[hsl(var(--border))]">
                      <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1">Role</p>
                      <Badge
                        className={`mt-2 ${
                          user.role === 'admin'
                            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-[hsl(var(--card-foreground))] border-0'
                            : 'bg-gradient-to-r from-blue-500 to-blue-600 text-[hsl(var(--card-foreground))] border-0'
                        }`}
                      >
                        {user.role === 'admin' ? <Crown className="mr-1 h-3 w-3" /> : <User className="mr-1 h-3 w-3" />}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </div>

                    {userDepartment && (
                      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-[hsl(var(--border))]">
                        <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1">Department</p>
                        <p className="text-sm font-semibold text-[hsl(var(--foreground))] mt-2">{userDepartment.name}</p>
                        {userDepartment.description && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{userDepartment.description}</p>
                        )}
                      </div>
                    )}

                    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-[hsl(var(--border))]">
                      <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1">Account Status</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Active</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-6">
          {/* Attendance History Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            {/* Today */}
            <Card className="border-[hsl(var(--border))] shadow-lg">
              <div className="p-3 lg:p-6">
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-lg lg:rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 lg:h-5 w-4 lg:w-5 text-[hsl(var(--card-foreground))]" />
                  </div>
                  {attendanceLoadingHistory && (
                    <div className="h-3 w-3 lg:h-4 lg:w-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-0.5">Today</p>
                  <p className="text-lg lg:text-2xl font-bold text-[hsl(var(--foreground))] dark:text-[hsl(var(--card-foreground))]">
                    {attendanceHistory.today.present > 0 ? 'Present' : 'Absent'}
                  </p>
                  <p className="text-xs lg:text-sm text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))] mt-0.5 lg:mt-1">
                    {attendanceHistory.today.hours > 0 
                      ? `${attendanceHistory.today.hours.toFixed(1)}h`
                      : 'No hours'}
                  </p>
                </div>
              </div>
            </Card>

            {/* This Week */}
            <Card className="border-[hsl(var(--border))] shadow-lg">
              <div className="p-3 lg:p-6">
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-lg lg:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 lg:h-5 w-4 lg:w-5 text-[hsl(var(--card-foreground))]" />
                  </div>
                  {attendanceLoadingHistory && (
                    <div className="h-3 w-3 lg:h-4 lg:w-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-0.5">This Week</p>
                  <p className="text-lg lg:text-2xl font-bold text-[hsl(var(--foreground))] dark:text-[hsl(var(--card-foreground))]">
                    {attendanceHistory.week.present}/{attendanceHistory.week.total}
                  </p>
                  <p className="text-xs lg:text-sm text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))] mt-0.5 lg:mt-1">
                    {attendanceHistory.week.hours > 0 
                      ? `${attendanceHistory.week.hours.toFixed(1)}h`
                      : 'No hours'}
                  </p>
                </div>
              </div>
            </Card>

            {/* This Month */}
            <Card className="border-[hsl(var(--border))] shadow-lg">
              <div className="p-3 lg:p-6">
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-lg lg:rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <Award className="h-4 lg:h-5 w-4 lg:w-5 text-[hsl(var(--card-foreground))]" />
                  </div>
                  {attendanceLoadingHistory && (
                    <div className="h-3 w-3 lg:h-4 lg:w-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-0.5">This Month</p>
                  <p className="text-lg lg:text-2xl font-bold text-[hsl(var(--foreground))] dark:text-[hsl(var(--card-foreground))]">
                    {attendanceHistory.month.present}/{attendanceHistory.month.total}
                  </p>
                  <p className="text-xs lg:text-sm text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))] mt-0.5 lg:mt-1">
                    {attendanceHistory.month.hours > 0 
                      ? `${attendanceHistory.month.hours.toFixed(1)}h`
                      : 'No hours'}
                  </p>
                </div>
              </div>
            </Card>

            {/* This Year */}
            <Card className="border-[hsl(var(--border))] shadow-lg">
              <div className="p-3 lg:p-6">
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-lg lg:rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 lg:h-5 w-4 lg:w-5 text-[hsl(var(--card-foreground))]" />
                  </div>
                  {attendanceLoadingHistory && (
                    <div className="h-3 w-3 lg:h-4 lg:w-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-0.5">This Year</p>
                  <p className="text-lg lg:text-2xl font-bold text-[hsl(var(--foreground))] dark:text-[hsl(var(--card-foreground))]">
                    {attendanceHistory.year.present}/{attendanceHistory.year.total}
                  </p>
                  <p className="text-xs lg:text-sm text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))] mt-0.5 lg:mt-1">
                    {attendanceHistory.year.hours > 0 
                      ? `${attendanceHistory.year.hours.toFixed(1)}h`
                      : 'No hours'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Card */}
            <Card className="lg:col-span-2 border-[hsl(var(--border))] shadow-lg">
              <div className="p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-[hsl(var(--card-foreground))]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] dark:text-[hsl(var(--card-foreground))]">Today's Attendance</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))]">Current status and time tracking</p>
                  </div>
                </div>

                <div className={`relative overflow-hidden rounded-2xl p-8 ${status.bgColor} border-2 ${status.borderColor}`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(var(--card))]/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="relative text-center space-y-4">
                    <div className="flex justify-center">
                      <div className={`w-16 h-16 lg:w-20 lg:h-20 ${status.color} rounded-2xl flex items-center justify-center shadow-xl`}>
                        <StatusIcon className="h-8 w-8 lg:h-10 lg:w-10 text-[hsl(var(--card-foreground))]" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl lg:text-3xl font-bold text-[hsl(var(--foreground))] dark:text-[hsl(var(--card-foreground))] mb-2">{status.label}</h3>
                      {attendanceStatus.clockInTime && (
                        <div className="space-y-2 mt-4">
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--card))]/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-lg">
                            <Clock className="h-4 w-4 text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))]" />
                            <span className="text-sm font-semibold text-[hsl(var(--foreground))] dark:text-[hsl(var(--card-foreground))]">
                              Clocked in at {attendanceStatus.clockInTime}
                            </span>
                          </div>
                          {attendanceStatus.elapsedHours && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--card))]/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-lg ml-2">
                              <Sparkles className="h-4 w-4 text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))]" />
                              <span className="text-sm font-semibold text-[hsl(var(--foreground))] dark:text-[hsl(var(--card-foreground))]">
                                {attendanceStatus.elapsedHours} elapsed
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

            {/* Quick Actions Card */}
            <Card className="border-[hsl(var(--border))] shadow-lg">
              <div className="p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <QrCode className="h-5 w-5 text-[hsl(var(--card-foreground))]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Quick Actions</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Check in or out</p>
                  </div>
                </div>

                {!isScanning ? (
                  <Button
                    onClick={startScanning}
                    disabled={attendanceLoading}
                    className="w-full h-14 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-[hsl(var(--card-foreground))] shadow-xl hover:shadow-2xl transition-all"
                    size="lg"
                  >
                    <QrCode className="h-5 w-5 mr-2" />
                    {attendanceStatus.status === 'clocked_in' || attendanceStatus.status === 'on_break' ? 'Clock Out' : 'Clock In'}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="relative w-full rounded-xl bg-black aspect-video overflow-hidden shadow-xl">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="border-4 border-blue-500 rounded-xl w-48 h-48 animate-pulse shadow-2xl" />
                      </div>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                    <Button
                      onClick={stopScanning}
                      disabled={attendanceLoading}
                      variant="outline"
                      className="w-full h-11 border-slate-300"
                      size="lg"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Stop Scanning
                    </Button>
                    {attendanceLoading && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                        Processing...
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
                  <h4 className="font-semibold text-[hsl(var(--foreground))] text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    Instructions
                  </h4>
                  <ul className="text-xs text-[hsl(var(--muted-foreground))] space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-[hsl(var(--muted-foreground))] mt-0.5">•</span>
                      <span>Click the button to open camera</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[hsl(var(--muted-foreground))] mt-0.5">•</span>
                      <span>Position QR code in the center</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[hsl(var(--muted-foreground))] mt-0.5">•</span>
                      <span>You'll be automatically clocked in/out</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
