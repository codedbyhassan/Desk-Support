import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Building2, CheckCircle, Clock, Edit3, Lock, Mail, QrCode, Save, Trash2, Upload, User, X } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card } from '../components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useToast } from '../hooks/use-toast'
import { useQRCode } from '../context/QRCodeContext'
import { useQRScanner } from '../hooks/useQRScanner'
import { useAttendance } from '../hooks/useAttendance'

interface Department { id: string; name: string; description: string | null }
interface AttendanceRecord { attendance_date: string; check_in: string | null; check_out: string | null; status: string }

const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024
const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()
  const { isScanning, startScanning, stopScanning } = useQRCode()
  const { attendanceStatus, fetchAttendanceStatus, registerAttendance, loading: attendanceActionLoading } = useAttendance()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const avatarObjectUrlRef = useRef<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)

  const loadDepartments = useCallback(async () => {
    if (!user?.company_id) return
    const { data, error } = await supabase.from('departments').select('id,name,description').eq('company_id', user.company_id).order('name')
    if (error) { console.error('Error loading departments:', error); return }
    setDepartments(data ?? [])
  }, [user?.company_id])

  const loadAttendance = useCallback(async () => {
    if (!user?.id) return
    setAttendanceLoading(true)
    try {
      const { data, error } = await supabase.from('attendance').select('attendance_date,check_in,check_out,status').eq('user_id', user.id).order('attendance_date', { ascending: false }).limit(365)
      if (error) throw error
      setAttendanceRecords((data ?? []) as AttendanceRecord[])
    } catch (error) { console.error('Error loading attendance:', error) }
    finally { setAttendanceLoading(false) }
  }, [user?.id])

  useQRScanner({
    videoRef, canvasRef, continuous: true,
    onScanSuccess: async (data) => {
      try {
        stopScanning()
        await registerAttendance(data)
        await fetchAttendanceStatus()
        await loadAttendance()
        toast({ title: 'Attendance updated', description: 'Your attendance has been recorded.' })
      } catch (error) {
        toast({ title: 'Attendance failed', description: error instanceof Error ? error.message : 'Unable to record attendance.', variant: 'destructive' })
      }
    },
    onScanError: () => undefined,
  })

  useEffect(() => {
    if (!user) return
    setFullName(user.full_name ?? '')
    setPhone(user.phone ?? '')
    setDepartmentId(user.department_id ?? '')
    setAvatarPath(user.avatar_path ?? null)
    setAvatarPreview(user.avatar_url ?? '')
    void fetchAttendanceStatus()
    void loadDepartments()
    void loadAttendance()
  }, [user?.id, fetchAttendanceStatus, loadDepartments, loadAttendance])

  useEffect(() => () => {
    if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current)
  }, [])

  const attendanceSummary = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 6); startOfWeek.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const worked = (records: AttendanceRecord[]) => records.filter(r => r.check_in)
    const hours = (records: AttendanceRecord[]) => records.reduce((total, r) => r.check_in && r.check_out ? total + Math.max(0, (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 3600000) : total, 0)
    const todayKey = now.toISOString().slice(0, 10)
    const today = attendanceRecords.filter(r => r.attendance_date === todayKey)
    const week = attendanceRecords.filter(r => new Date(r.attendance_date) >= startOfWeek)
    const month = attendanceRecords.filter(r => new Date(r.attendance_date) >= startOfMonth)
    const year = attendanceRecords.filter(r => new Date(r.attendance_date) >= startOfYear)
    return { today: worked(today).length > 0, todayHours: hours(today), weekPresent: worked(week).length, weekHours: hours(week), monthPresent: worked(month).length, monthHours: hours(month), yearPresent: worked(year).length, yearHours: hours(year) }
  }, [attendanceRecords])

  function validateForm() {
    const next: Record<string, string> = {}
    if (!fullName.trim()) next.fullName = 'Full name is required.'
    if (phone && !/^[\d\s()+-]+$/.test(phone)) next.phone = 'Enter a valid phone number.'
    if (newPassword && newPassword.length < 6) next.password = 'Password must be at least 6 characters.'
    if (newPassword && newPassword !== confirmPassword) next.confirmPassword = 'Passwords do not match.'
    if (avatarFile && avatarFile.size > PROFILE_IMAGE_MAX_BYTES) next.avatar = 'Photo must be 5 MB or smaller.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleAvatarChange(file: File | undefined) {
    if (!file) return
    if (!PROFILE_IMAGE_TYPES.includes(file.type as typeof PROFILE_IMAGE_TYPES[number])) {
      setErrors(prev => ({ ...prev, avatar: 'Use JPG, PNG, WebP or GIF.' }))
      return
    }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      setErrors(prev => ({ ...prev, avatar: 'Photo must be 5 MB or smaller.' }))
      return
    }
    if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current)
    const objectUrl = URL.createObjectURL(file)
    avatarObjectUrlRef.current = objectUrl
    setAvatarFile(file)
    setAvatarPreview(objectUrl)
    setErrors(prev => { const next = { ...prev }; delete next.avatar; return next })
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !validateForm()) return
    setSaving(true)
    let uploadedPath: string | null = null
    const previousPath = user.avatar_path
    try {
      let nextAvatarPath = avatarPath
      if (avatarFile) {
        const extension = avatarFile.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
        uploadedPath = `avatars/${user.id}/${crypto.randomUUID()}.${extension}`
        const { error } = await supabase.storage.from('profile-images').upload(uploadedPath, avatarFile, { cacheControl: '3600', upsert: false, contentType: avatarFile.type })
        if (error) throw error
        nextAvatarPath = uploadedPath
      }

      await updateProfile({ full_name: fullName.trim(), phone: phone.trim() || null, department_id: departmentId || null, avatar_path: nextAvatarPath })

      if (previousPath && previousPath !== nextAvatarPath) {
        const { error: removeError } = await supabase.storage.from('profile-images').remove([previousPath])
        if (removeError) console.warn('Previous profile image could not be removed:', removeError.message)
      }

      if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error
      }
      toast({ title: 'Profile saved', description: 'Your profile changes were saved successfully.' })
      setEditing(false); setNewPassword(''); setConfirmPassword(''); setAvatarFile(null); setAvatarPath(nextAvatarPath)
      if (avatarObjectUrlRef.current) { URL.revokeObjectURL(avatarObjectUrlRef.current); avatarObjectUrlRef.current = null }
    } catch (error) {
      if (uploadedPath) await supabase.storage.from('profile-images').remove([uploadedPath])
      toast({ title: 'Could not save profile', description: error instanceof Error ? error.message : 'An unexpected error occurred.', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  function cancelEdit() {
    if (!user) return
    if (avatarObjectUrlRef.current) { URL.revokeObjectURL(avatarObjectUrlRef.current); avatarObjectUrlRef.current = null }
    setFullName(user.full_name ?? ''); setPhone(user.phone ?? ''); setDepartmentId(user.department_id ?? '')
    setAvatarPath(user.avatar_path ?? null); setAvatarPreview(user.avatar_url ?? ''); setAvatarFile(null); setNewPassword(''); setConfirmPassword(''); setErrors({}); setEditing(false)
  }

  function removePhoto() {
    if (avatarObjectUrlRef.current) { URL.revokeObjectURL(avatarObjectUrlRef.current); avatarObjectUrlRef.current = null }
    setAvatarFile(null); setAvatarPath(null); setAvatarPreview('')
    setErrors(prev => { const next = { ...prev }; delete next.avatar; return next })
  }

  if (!user) return null
  const department = departments.find(item => item.id === user.department_id)
  const isClockedIn = attendanceStatus.status === 'clocked_in' || attendanceStatus.status === 'on_break'
  const initials = user.full_name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'U'

  return <div className="space-y-6">
    <Card className="overflow-hidden border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/30 p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-4"><Avatar className="h-16 w-16 shrink-0 border-2 border-background shadow-sm sm:h-20 sm:w-20"><AvatarImage src={user.avatar_url ?? undefined}/><AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">{initials}</AvatarFallback></Avatar><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{user.full_name}</h1><Badge variant="secondary">{user.role}</Badge></div><p className="mt-1 flex items-center gap-2 truncate text-sm text-muted-foreground"><Mail className="h-4 w-4"/>{user.email}</p>{department&&<p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="h-4 w-4"/>{department.name}</p>}</div></div>{!editing&&<Button onClick={()=>setEditing(true)}><Edit3 className="mr-2 h-4 w-4"/>Edit profile</Button>}</div></div>
      <Tabs defaultValue="profile" className="w-full"><div className="border-b border-border px-5 sm:px-6"><TabsList className="h-12 bg-transparent p-0"><TabsTrigger value="profile" className="mr-6 h-12 rounded-none border-b-2 border-transparent px-1 data-[state=active]:border-primary data-[state=active]:bg-transparent">Profile</TabsTrigger><TabsTrigger value="attendance" className="h-12 rounded-none border-b-2 border-transparent px-1 data-[state=active]:border-primary data-[state=active]:bg-transparent">Attendance</TabsTrigger></TabsList></div>
        <TabsContent value="profile" className="m-0">{editing?<form onSubmit={handleSave} className="bg-card"><div className="space-y-8 p-5 sm:p-6 lg:p-8"><section className="space-y-5"><div className="flex items-center gap-3 border-b border-border pb-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><User className="h-5 w-5"/></div><div><h2 className="font-semibold">Personal information</h2><p className="text-sm text-muted-foreground">Keep your profile details up to date.</p></div></div><div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/20 p-5 sm:flex-row"><Avatar className="h-20 w-20 border-2 border-background shadow-sm"><AvatarImage src={avatarPreview || undefined}/><AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback></Avatar><div className="text-center sm:text-left"><div className="flex flex-wrap justify-center gap-2 sm:justify-start"><label htmlFor="avatar-upload" className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-input bg-card px-4 text-sm font-medium shadow-sm hover:bg-muted"><Upload className="mr-2 h-4 w-4"/>Change photo<input id="avatar-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={saving} onChange={event=>handleAvatarChange(event.target.files?.[0])}/></label><Button type="button" variant="outline" onClick={removePhoto} disabled={saving||(!avatarFile&&!avatarPath)}><Trash2 className="mr-2 h-4 w-4"/>Remove</Button></div><p className="mt-2 text-xs text-muted-foreground">JPG, PNG, WebP or GIF · max 5 MB · stored securely in Supabase Storage.</p>{errors.avatar&&<p className="mt-1 text-sm text-destructive">{errors.avatar}</p>}</div></div><div className="grid grid-cols-1 gap-5 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="profile-full-name">Full name</Label><Input id="profile-full-name" value={fullName} onChange={e=>setFullName(e.target.value)} disabled={saving} aria-invalid={!!errors.fullName}/>{errors.fullName&&<p className="text-sm text-destructive">{errors.fullName}</p>}</div><div className="space-y-2"><Label htmlFor="profile-email">Email</Label><Input id="profile-email" value={user.email} disabled className="bg-muted"/><p className="text-xs text-muted-foreground">Email is managed by authentication.</p></div><div className="space-y-2"><Label htmlFor="profile-phone">Phone number</Label><Input id="profile-phone" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} disabled={saving} aria-invalid={!!errors.phone} placeholder="+233 20 000 0000"/>{errors.phone&&<p className="text-sm text-destructive">{errors.phone}</p>}</div><div className="space-y-2"><Label htmlFor="profile-department">Department</Label><Select value={departmentId||'none'} onValueChange={v=>setDepartmentId(v==='none'?'':v)} disabled={saving}><SelectTrigger id="profile-department"><SelectValue placeholder="Select department"/></SelectTrigger><SelectContent><SelectItem value="none">No department</SelectItem>{departments.map(item=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div></div></section><section className="space-y-5 border-t border-border pt-7"><div className="flex items-center gap-3 border-b border-border pb-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600"><Lock className="h-5 w-5"/></div><div><h2 className="font-semibold">Password</h2><p className="text-sm text-muted-foreground">Leave both fields empty to keep your current password.</p></div></div><div className="grid grid-cols-1 gap-5 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="profile-new-password">New password</Label><Input id="profile-new-password" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} disabled={saving}/>{errors.password&&<p className="text-sm text-destructive">{errors.password}</p>}</div><div className="space-y-2"><Label htmlFor="profile-confirm-password">Confirm password</Label><Input id="profile-confirm-password" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} disabled={saving}/>{errors.confirmPassword&&<p className="text-sm text-destructive">{errors.confirmPassword}</p>}</div></div></section></div><div className="flex flex-col-reverse gap-3 border-t border-border bg-muted/20 p-5 sm:flex-row sm:justify-end sm:p-6"><Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}><X className="mr-2 h-4 w-4"/>Cancel</Button><Button type="submit" disabled={saving}><Save className="mr-2 h-4 w-4"/>{saving?'Saving…':'Save profile'}</Button></div></form>:<div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:p-8">{[['Full name',user.full_name],['Email',user.email],['Phone',user.phone||'Not provided'],['Department',department?.name||'Not assigned']].map(([label,value])=><div key={label} className="rounded-xl border border-border bg-card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>)}</div>}</TabsContent>
        <TabsContent value="attendance" className="m-0 p-5 sm:p-6 lg:p-8"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Today',attendanceSummary.today?'Present':'Not recorded'],['This week',`${attendanceSummary.weekPresent} days`],['This month',`${attendanceSummary.monthPresent} days`],['This year',`${attendanceSummary.yearPresent} days`]].map(([label,value])=><Card key={label} className="border-border bg-card p-4 shadow-none"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></Card>)}</div><div className="mt-6 rounded-xl border border-border bg-card p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Clock className="h-5 w-5"/></div><div><h2 className="font-semibold">Attendance history</h2><p className="text-sm text-muted-foreground">Your latest attendance records.</p></div></div><Button variant={isClockedIn?'outline':'default'} disabled={attendanceActionLoading} onClick={()=>isScanning?stopScanning():startScanning()}><QrCode className="mr-2 h-4 w-4"/>{isScanning?'Stop scanner':isClockedIn?'Scan to clock out':'Scan to clock in'}</Button></div>{isScanning&&<div className="mt-5 overflow-hidden rounded-xl border border-border bg-black"><video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover"/><canvas ref={canvasRef} className="hidden"/></div>}{attendanceLoading?<div className="py-12 text-center text-sm text-muted-foreground">Loading attendance…</div>:attendanceRecords.length===0?<div className="py-12 text-center text-sm text-muted-foreground">No attendance records yet.</div>:<div className="mt-5 divide-y border-y border-border">{attendanceRecords.slice(0,30).map(record=><div key={`${record.attendance_date}-${record.check_in??''}`} className="flex items-center justify-between gap-4 py-3"><div><p className="font-medium">{new Date(record.attendance_date).toLocaleDateString()}</p><p className="text-xs text-muted-foreground">{record.check_in?new Date(record.check_in).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'—'} to {record.check_out?new Date(record.check_out).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'—'}</p></div><Badge variant="outline">{record.status}</Badge></div>)}</div>}</div></TabsContent>
      </Tabs>
    </Card>
  </div>
}