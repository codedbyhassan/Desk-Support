import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card } from '../components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { useToast } from '../hooks/use-toast'
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
} from 'lucide-react'

interface Department {
  id: string
  name: string
  description?: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

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
    }
    fetchDepartments()
  }, [user])

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
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      let avatarUrl = user.avatar_url

      // Upload avatar if changed
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

      // Update profile in database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          department_id: departmentId || null,
          avatar_url: avatarUrl
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Update password if provided
      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        })

        if (passwordError) throw passwordError
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully!'
      })
      setEditing(false)
      setNewPassword('')
      setConfirmPassword('')
      setAvatarFile(null)

      // Refresh page to reload user context
      window.location.reload()
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive'
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

  const userDepartment = departments.find(d => d.id === user.department_id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-gray-500 flex items-center gap-1">
            <UserCircle className="h-4 w-4" />
            Manage your account information
          </p>
        </div>
        {!editing && (
          <Button onClick={() => setEditing(true)} className="gap-2">
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Profile Card */}
      <Card className="p-6">
        {editing ? (
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* Avatar Upload Section */}
            <div className="flex flex-col items-center gap-4 pb-6 border-b">
              <div className="relative group">
                <Avatar className="h-32 w-32 ring-4 ring-orange-100">
                  <AvatarImage src={avatarPreview} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
                    {fullName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-3 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-full cursor-pointer hover:from-orange-600 hover:to-red-600 transition-all shadow-lg group-hover:scale-110"
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
                <p className="text-sm text-gray-500">Click the icon to upload a new photo</p>
                <p className="text-xs text-gray-400">JPG, PNG or GIF (max 5MB)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  Full Name *
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    if (errors.fullName) setErrors({ ...errors, fullName: '' })
                  }}
                  disabled={loading}
                  className={errors.fullName ? 'border-red-500' : ''}
                  placeholder="John Doe"
                />
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  Email
                </Label>
                <Input
                  value={user.email}
                  disabled
                  className="bg-gray-50 dark:bg-gray-900"
                />
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  Phone Number
                </Label>
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
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  Department
                </Label>
                <Select value={departmentId} onValueChange={setDepartmentId} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Lock className="h-5 w-5 text-gray-500" />
                Change Password (Optional)
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
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
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
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
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          // Display Mode
          <div className="space-y-8">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 pb-6 border-b">
              <Avatar className="h-32 w-32 ring-4 ring-orange-100">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="text-4xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
                  {user.full_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left space-y-3">
                <div>
                  <h2 className="text-3xl font-bold">{user.full_name}</h2>
                  <p className="text-gray-500 mt-1">{user.email}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <Badge 
                    className={
                      user.role === 'admin' 
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    }
                  >
                    {user.role === 'admin' ? (
                      <Crown className="mr-1 h-3 w-3" />
                    ) : (
                      <User className="mr-1 h-3 w-3" />
                    )}
                    {user.role}
                  </Badge>
                  {userDepartment && (
                    <Badge variant="outline" className="border-orange-200 text-orange-700">
                      <Building2 className="mr-1 h-3 w-3" />
                      {userDepartment.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent" />
                <div className="relative space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </div>
                  <p className="font-medium text-lg">{user.email}</p>
                </div>
              </Card>

              <Card className="p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent" />
                <div className="relative space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </div>
                  <p className="font-medium text-lg">{user.phone || 'Not provided'}</p>
                </div>
              </Card>

              <Card className="p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent" />
                <div className="relative space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Building2 className="h-4 w-4" />
                    Department
                  </div>
                  <p className="font-medium text-lg">
                    {userDepartment?.name || 'Not assigned'}
                  </p>
                </div>
              </Card>

              <Card className="p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent" />
                <div className="relative space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    Member Since
                  </div>
                  <p className="font-medium text-lg">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </Card>
            </div>

            {/* User ID (for reference) */}
            <div className="pt-6 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Shield className="h-4 w-4" />
                User ID
              </div>
              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded">
                {user.id}
              </code>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}