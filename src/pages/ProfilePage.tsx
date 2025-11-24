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

interface Department {
  id: string
  name: string
  description?: string
}

export default function ProfilePage() {
  const { user } = useAuth()
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
  const [activeTab, setActiveTab] = useState('profile')

  // Form state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '')
      setPhone(user.phone || '')
      setDepartmentId(user.department_id || '')
      setAvatarPreview(user.avatar_url || '')
      fetchAttendanceStatus()
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

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `avatars/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, avatarFile)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('photos').getPublicUrl(filePath)
        avatarUrl = data.publicUrl
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          department_id: departmentId || null,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

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

      window.location.reload()
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
      color: 'bg-slate-500',
      textColor: 'text-slate-600',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
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
    <div className="space-y-6 lg:space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0YzAtMS4xLS45LTItMi0ySDI2Yy0xLjEgMC0yIC45LTIgMnYyNGMwIDEuMS45IDIgMiAyaDhjMS4xIDAgMi0uOSAyLTJWMzR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-10" />
        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20 lg:h-24 lg:w-24 ring-4 ring-white/20 shadow-2xl">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="text-2xl lg:text-3xl bg-gradient-to-br from-blue-400 to-cyan-400 text-white font-bold">
                    {user.full_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!editing && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 lg:w-7 lg:h-7 bg-emerald-500 rounded-full border-4 border-slate-900 flex items-center justify-center">
                    <div className="w-2 h-2 lg:w-2.5 lg:h-2.5 bg-white rounded-full animate-pulse" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl lg:text-3xl font-bold">{user.full_name}</h1>
                  <Badge
                    className={`${
                      user.role === 'admin'
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg'
                    }`}
                  >
                    {user.role === 'admin' ? <Crown className="mr-1 h-3 w-3" /> : <User className="mr-1 h-3 w-3" />}
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>
                <p className="text-slate-300 text-sm lg:text-base flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
                {userDepartment && (
                  <p className="text-slate-400 text-xs lg:text-sm mt-1 flex items-center gap-2">
                    <Building2 className="h-3 w-3 lg:h-4 lg:w-4" />
                    {userDepartment.name}
                  </p>
                )}
              </div>
            </div>
            {!editing && (
              <Button
                onClick={() => setEditing(true)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm shadow-lg"
                size="lg"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
          <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
            <QrCode className="h-4 w-4 mr-2" />
            Attendance
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {editing ? (
            <Card className="border-slate-200 shadow-lg">
              <form onSubmit={handleUpdateProfile} className="p-6 lg:p-8 space-y-8">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-6 pb-8 border-b border-slate-200">
                  <div className="relative group">
                    <Avatar className="h-32 w-32 lg:h-36 lg:w-36 ring-4 ring-slate-200 shadow-xl">
                      <AvatarImage src={avatarPreview} />
                      <AvatarFallback className="text-4xl lg:text-5xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold">
                        {fullName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 p-3 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-full cursor-pointer hover:from-blue-600 hover:to-cyan-600 transition-all shadow-xl hover:scale-110 group-hover:scale-110"
                    >
                      <Upload className="h-5 w-5" />
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
                    <p className="text-sm font-medium text-slate-600">Upload Profile Photo</p>
                    <p className="text-xs text-slate-500 mt-1">JPG, PNG or GIF (max 5MB)</p>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Personal Information</h3>
                      <p className="text-sm text-slate-500">Update your personal details</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-medium text-slate-700">
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
                        className={`h-11 ${errors.fullName ? 'border-red-500 focus:border-red-500' : ''}`}
                        placeholder="John Doe"
                      />
                      {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Email</Label>
                      <Input value={user.email} disabled className="h-11 bg-slate-50" />
                      <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium text-slate-700">Phone Number</Label>
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
                        className={`h-11 ${errors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                      />
                      {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Department</Label>
                      <Select value={departmentId} onValueChange={setDepartmentId} disabled={loading}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No department</SelectItem>
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
                <div className="space-y-6 pt-6 border-t border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <Lock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Change Password</h3>
                      <p className="text-sm text-slate-500">Optional - Leave blank to keep current password</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-slate-700">New Password</Label>
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
                        className={`h-11 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                      />
                      {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">Confirm Password</Label>
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
                        className={`h-11 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                      />
                      {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-11 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white shadow-lg"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 h-11 border-slate-300 hover:bg-slate-50"
                    size="lg"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Profile Card */}
              <Card className="lg:col-span-2 border-slate-200 shadow-lg">
                <div className="p-6 lg:p-8 space-y-8">
                  <div className="flex items-center gap-3 pb-6 border-b border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <UserCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Profile Details</h3>
                      <p className="text-sm text-slate-500">Your account information</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Email</p>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5">{user.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                          <Phone className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Phone</p>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5">{user.phone || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Department</p>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5">{userDepartment?.name || 'Not assigned'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Member Since</p>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5">
                            {new Date(user.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200">
                    <div className="flex items-center gap-3 mb-3">
                      <Shield className="h-5 w-5 text-slate-400" />
                      <p className="text-sm font-medium text-slate-600">User ID</p>
                    </div>
                    <code className="text-xs bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-mono block w-full overflow-x-auto">
                      {user.id}
                    </code>
                  </div>
                </div>
              </Card>

              {/* Stats Card */}
              <Card className="border-slate-200 shadow-lg">
                <div className="p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                      <Award className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Account Stats</h3>
                      <p className="text-sm text-slate-500">Quick overview</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Role</p>
                      <Badge
                        className={`mt-2 ${
                          user.role === 'admin'
                            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0'
                            : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0'
                        }`}
                      >
                        {user.role === 'admin' ? <Crown className="mr-1 h-3 w-3" /> : <User className="mr-1 h-3 w-3" />}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </div>

                    {userDepartment && (
                      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Department</p>
                        <p className="text-sm font-semibold text-slate-900 mt-2">{userDepartment.name}</p>
                        {userDepartment.description && (
                          <p className="text-xs text-slate-500 mt-1">{userDepartment.description}</p>
                        )}
                      </div>
                    )}

                    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Account Status</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <p className="text-sm font-semibold text-slate-900">Active</p>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Card */}
            <Card className="lg:col-span-2 border-slate-200 shadow-lg">
              <div className="p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Today's Attendance</h3>
                    <p className="text-sm text-slate-500">Current status and time tracking</p>
                  </div>
                </div>

                <div className={`relative overflow-hidden rounded-2xl p-8 ${status.bgColor} border-2 ${status.borderColor}`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="relative text-center space-y-4">
                    <div className="flex justify-center">
                      <div className={`w-16 h-16 lg:w-20 lg:h-20 ${status.color} rounded-2xl flex items-center justify-center shadow-xl`}>
                        <StatusIcon className="h-8 w-8 lg:h-10 lg:w-10 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">{status.label}</h3>
                      {attendanceStatus.clockInTime && (
                        <div className="space-y-2 mt-4">
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg">
                            <Clock className="h-4 w-4 text-slate-600" />
                            <span className="text-sm font-semibold text-slate-900">
                              Clocked in at {attendanceStatus.clockInTime}
                            </span>
                          </div>
                          {attendanceStatus.elapsedHours && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg ml-2">
                              <Sparkles className="h-4 w-4 text-slate-600" />
                              <span className="text-sm font-semibold text-slate-900">
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
            <Card className="border-slate-200 shadow-lg">
              <div className="p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <QrCode className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
                    <p className="text-sm text-slate-500">Check in or out</p>
                  </div>
                </div>

                {!isScanning ? (
                  <Button
                    onClick={startScanning}
                    disabled={attendanceLoading}
                    className="w-full h-14 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-xl hover:shadow-2xl transition-all"
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

                <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-semibold text-slate-900 text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-slate-600" />
                    Instructions
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400 mt-0.5">•</span>
                      <span>Click the button to open camera</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400 mt-0.5">•</span>
                      <span>Position QR code in the center</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400 mt-0.5">•</span>
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
