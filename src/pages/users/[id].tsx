import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, CalendarDays, Loader2, Mail, Phone, ShieldCheck, Trash2, UserCheck, UserRound, UserX } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

const ROLES = [
  { value: 'admin', label: 'Admin' }, { value: 'hr', label: 'HR' }, { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' }, { value: 'contractor', label: 'Contractor' }, { value: 'viewer', label: 'Viewer' },
] as const

type Profile = { id:string; username:string; full_name:string; avatar_path:string|null; phone:string|null }
type Department = { id:string; name:string }
type Membership = { id:string; user_id:string; company_id:string; role:string; department_id:string|null; is_active:boolean; joined_at:string }

const initials = (name?:string) => (name ?? 'User').split(/\s+/).map(part => part[0]).slice(0,2).join('').toUpperCase()

export default function UserDetailPage() {
  const { id } = useParams<{id:string}>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const companyId = currentUser?.company_id
  const [membership, setMembership] = useState<Membership|null>(null)
  const [profile, setProfile] = useState<Profile|null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string|null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)

  const load = useCallback(async () => {
    if (!companyId || !id) { setLoading(false); return }
    setLoading(true)
    try {
      const { data: membershipRows, error: membershipError } = await supabase.from('company_memberships')
        .select('id,user_id,company_id,role,department_id,is_active,joined_at')
        .eq('id', id).eq('company_id', companyId).limit(1)
      if (membershipError) throw membershipError
      const row = membershipRows?.[0] as Membership|undefined
      if (!row) throw new Error('User membership not found.')

      const [{ data: profileRows, error: profileError }, { data: departmentRows, error: departmentError }] = await Promise.all([
        supabase.from('profiles').select('id,username,full_name,avatar_path,phone').eq('id', row.user_id).limit(1),
        supabase.from('departments').select('id,name').eq('company_id', companyId).order('name'),
      ])
      if (profileError) throw profileError
      if (departmentError) throw departmentError

      const nextProfile = (profileRows?.[0] as Profile|undefined) ?? null
      setMembership(row); setProfile(nextProfile); setDepartments((departmentRows ?? []) as Department[])
      if (nextProfile?.avatar_path) {
        const { data } = await supabase.storage.from('profile-images').createSignedUrl(nextProfile.avatar_path, 3600)
        setAvatarUrl(data?.signedUrl ?? null)
      } else setAvatarUrl(null)
    } catch (error:unknown) {
      toast({ title:'Unable to load user', description:error instanceof Error ? error.message : 'Please try again.', variant:'destructive' })
      navigate('/app/users', { replace:true })
    } finally { setLoading(false) }
  }, [companyId, id, navigate, toast])

  useEffect(() => { void load() }, [load])

  const saveChanges = async () => {
    if (!membership || !profile || !companyId) return
    setSaving(true)
    try {
      const { data, error } = await supabase.functions.invoke('provision-user', {
        body: { company_id:companyId, user_id:membership.user_id, full_name:profile.full_name, role:membership.role, department_id:membership.department_id },
      })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error ?? 'Update failed')
      toast({ title:'User updated', description:`@${profile.username} has been updated.` })
      await load()
    } catch (error:unknown) {
      toast({ title:'Update failed', description:error instanceof Error ? error.message : 'Please try again.', variant:'destructive' })
    } finally { setSaving(false) }
  }

  const toggleStatus = async () => {
    if (!membership || !companyId) return
    setSaving(true)
    try {
      const { data, error } = await supabase.functions.invoke('manage-user-status', { body:{ company_id:companyId, user_id:membership.user_id, is_active:!membership.is_active } })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error ?? 'Status update failed')
      toast({ title:membership.is_active ? 'User deactivated' : 'User reactivated' })
      await load()
    } catch (error:unknown) {
      toast({ title:'Status update failed', description:error instanceof Error ? error.message : 'Please try again.', variant:'destructive' })
    } finally { setSaving(false) }
  }

  const removeUser = async () => {
    if (!membership || !companyId) return
    setSaving(true)
    try {
      const { error } = await supabase.from('company_memberships').delete().eq('id', membership.id).eq('company_id', companyId)
      if (error) throw error
      toast({ title:'User removed', description:`@${profile?.username ?? 'user'} was removed from the company.` })
      navigate('/app/users', { replace:true })
    } catch (error:unknown) {
      toast({ title:'Unable to remove user', description:error instanceof Error ? error.message : 'Please try again.', variant:'destructive' })
    } finally { setSaving(false); setRemoveOpen(false) }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div>
  if (!membership || !profile) return null

  const departmentName = departments.find(department => department.id === membership.department_id)?.name ?? 'No department'
  const roleLabel = ROLES.find(role => role.value === membership.role)?.label ?? membership.role

  return <div className="mx-auto w-full max-w-5xl space-y-6">
    <Button variant="ghost" className="-ml-3" onClick={() => navigate('/app/users')}><ArrowLeft className="mr-2 h-4 w-4"/>Back to people</Button>

    <Card className="overflow-hidden">
      <div className="border-b bg-muted/20 px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <Avatar className="h-20 w-20 border-4 border-background shadow-sm"><AvatarImage src={avatarUrl ?? undefined} alt={profile.full_name}/><AvatarFallback className="text-xl">{initials(profile.full_name)}</AvatarFallback></Avatar>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-2xl font-semibold tracking-tight">{profile.full_name}</h1><Badge variant={membership.is_active?'secondary':'outline'}>{membership.is_active?'Active':'Inactive'}</Badge></div><p className="mt-1 text-sm font-medium text-muted-foreground">@{profile.username}</p><p className="mt-1 text-sm text-muted-foreground">{roleLabel} · {departmentName}</p></div>
          </div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={saving} onClick={toggleStatus}>{membership.is_active?<><UserX className="mr-2 h-4 w-4"/>Deactivate</>:<><UserCheck className="mr-2 h-4 w-4"/>Reactivate</>}</Button><Button variant="destructive" disabled={saving || membership.user_id === currentUser?.id} onClick={() => setRemoveOpen(true)}><Trash2 className="mr-2 h-4 w-4"/>Remove</Button></div>
        </div>
      </div>

      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-7">
          <section><h2 className="text-base font-semibold">Profile</h2><p className="mt-1 text-sm text-muted-foreground">The member information used across Desk Support.</p><div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div><Label>Username</Label><div className="mt-2 flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm font-medium">@{profile.username}</div></div>
            <div><Label>Full name</Label><div className="mt-2 flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm">{profile.full_name}</div></div>
            <div><Label>Phone</Label><div className="mt-2 flex h-10 items-center gap-2 rounded-md border bg-muted/30 px-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground"/>{profile.phone || 'Not provided'}</div></div>
            <div><Label>Account email</Label><div className="mt-2 flex h-10 items-center gap-2 rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground"><Mail className="h-4 w-4"/>Managed by authentication</div></div>
          </div></section>

          <section className="border-t pt-7"><h2 className="text-base font-semibold">Company access</h2><p className="mt-1 text-sm text-muted-foreground">Change the member's role and department.</p><div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2"><Label>Role</Label><Select value={membership.role} onValueChange={value => setMembership({...membership, role:value})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{ROLES.map(role => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Department</Label><Select value={membership.department_id ?? 'none'} onValueChange={value => setMembership({...membership, department_id:value === 'none' ? null : value})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">No department</SelectItem>{departments.map(department => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}</SelectContent></Select></div>
          </div><Button className="mt-5" disabled={saving} onClick={saveChanges}>{saving&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}<ShieldCheck className="mr-2 h-4 w-4"/>Save access changes</Button></section>
        </div>

        <aside className="space-y-4">
          <Card className="p-5"><div className="flex items-center gap-3"><UserRound className="h-5 w-5 text-muted-foreground"/><div><p className="text-sm font-medium">Member ID</p><p className="mt-1 break-all text-xs text-muted-foreground">{membership.id}</p></div></div></Card>
          <Card className="p-5"><div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-muted-foreground"/><div><p className="text-sm font-medium">Department</p><p className="mt-1 text-sm text-muted-foreground">{departmentName}</p></div></div></Card>
          <Card className="p-5"><div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-muted-foreground"/><div><p className="text-sm font-medium">Joined</p><p className="mt-1 text-sm text-muted-foreground">{new Date(membership.joined_at).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}</p></div></div></Card>
        </aside>
      </div>
    </Card>

    <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove @{profile.username}?</AlertDialogTitle><AlertDialogDescription>This removes the user's company membership. Their profile and account history are not deleted.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={removeUser}>Remove user</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}
