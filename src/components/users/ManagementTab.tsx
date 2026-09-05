import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, MoreHorizontal, Search, ShieldCheck, UserCheck, UserPlus, UserX, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { fetchSupabasePage, getExactCompanyCounts } from '@/lib/dataAccess'
import { useToast } from '@/hooks/use-toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const ROLES = [
  { value: 'admin', label: 'Admin' }, { value: 'hr', label: 'HR' }, { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' }, { value: 'contractor', label: 'Contractor' }, { value: 'viewer', label: 'Viewer' },
] as const

type Membership = {
  id: string; user_id: string; company_id: string; role: string; department_id: string | null; is_active: boolean; joined_at: string
  profile: { id:string; username:string; full_name: string; avatar_path: string | null; phone: string | null } | null
  department: { name: string } | null
}

const PAGE_SIZE = 100

export default function ManagementTab() {
  const { user: currentUser } = useAuth(); const { toast } = useToast(); const companyId = currentUser?.company_id
  const [memberships, setMemberships] = useState<Membership[]>([]); const [departments, setDepartments] = useState<{id:string;name:string}[]>([])
  const [totalUsers, setTotalUsers] = useState(0); const [activeUsers, setActiveUsers] = useState(0); const [inactiveUsers, setInactiveUsers] = useState(0)
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState(''); const [tab, setTab] = useState<'all'|'active'|'inactive'>('all')
  const [inviteOpen, setInviteOpen] = useState(false); const [edit, setEdit] = useState<Membership|null>(null); const [statusTarget, setStatusTarget] = useState<Membership|null>(null)
  const [form, setForm] = useState({email:'',full_name:'',role:'employee',department_id:'none',phone:''})

  const load = useCallback(async () => {
    if (!companyId) { setLoading(false); return }
    setLoading(true)
    try {
      const [members, depts, counts] = await Promise.all([
        fetchSupabasePage<Membership>('company_memberships', 0, {
          pageSize: PAGE_SIZE, orderBy:'joined_at', ascending:false,
          columns:'id,user_id,company_id,role,department_id,is_active,joined_at,profiles!company_memberships_user_id_fkey(id,username,full_name,avatar_path,phone),departments!company_memberships_department_id_fkey(name)',
          filter:q=>q.eq('company_id',companyId),
        }),
        supabase.from('departments').select('id,name').eq('company_id',companyId).order('name'),
        getExactCompanyCounts(companyId),
      ])
      if (depts.error) throw depts.error
      setMemberships(members.data); setDepartments(depts.data ?? [])
      setTotalUsers(counts.users_total); setActiveUsers(counts.users_active); setInactiveUsers(counts.users_inactive)
    } catch (error: unknown) {
      console.error('Failed to load people:', error)
      toast({ title:'Unable to load people', description:error instanceof Error ? error.message : 'Please try again.', variant:'destructive' })
    } finally { setLoading(false) }
  }, [companyId, toast])

  useEffect(()=>{void load()},[load])

  const visible = useMemo(()=>{const n=query.trim().toLowerCase(); return memberships.filter(m=>{
    const matches=tab==='all'||(tab==='active'?m.is_active:!m.is_active); const hay=`${m.profile?.username??''} ${m.profile?.full_name??''} ${m.role} ${m.department?.name??''}`.toLowerCase(); return matches&&(!n||hay.includes(n))
  })},[memberships,query,tab])

  const invite = async (event:React.FormEvent)=>{event.preventDefault();if(!companyId)return;const email=form.email.trim().toLowerCase();const fullName=form.full_name.trim();if(!email||!fullName){toast({title:'Required fields missing',description:'Full name and email are required.',variant:'destructive'});return}setSaving(true);try{const payload={company_id:companyId,email,full_name:fullName,role:form.role,department_id:form.department_id==='none'?null:form.department_id,phone:form.phone.trim()||null};const {data,error}=await supabase.functions.invoke('invite-user',{body:payload});if(error)throw error;if(!data?.ok)throw new Error(data?.error??'Invitation failed');toast({title:'Invitation sent',description:`${fullName} can now finish their account setup.`});setInviteOpen(false);setForm({email:'',full_name:'',role:'employee',department_id:'none',phone:''});await load()}catch(error:unknown){toast({title:'Invitation failed',description:error instanceof Error?error.message:'Please try again.',variant:'destructive'})}finally{setSaving(false)}}
  const saveEdit=async()=>{if(!companyId||!edit)return;setSaving(true);try{const payload={company_id:companyId,user_id:edit.user_id,full_name:edit.profile?.full_name??'User',role:edit.role,department_id:edit.department_id};const {data,error}=await supabase.functions.invoke('provision-user',{body:payload});if(error)throw error;if(!data?.ok)throw new Error(data?.error??'Update failed');toast({title:'Membership updated'});setEdit(null);await load()}catch(error:unknown){toast({title:'Update failed',description:error instanceof Error?error.message:'Please try again.',variant:'destructive'})}finally{setSaving(false)}}
  const toggleStatus=async()=>{if(!companyId||!statusTarget)return;setSaving(true);try{const payload={company_id:companyId,user_id:statusTarget.user_id,is_active:!statusTarget.is_active};const {data,error}=await supabase.functions.invoke('manage-user-status',{body:payload});if(error)throw error;if(!data?.ok)throw new Error(data?.error??'Status update failed');toast({title:statusTarget.is_active?'Member deactivated':'Member reactivated'});setStatusTarget(null);await load()}catch(error:unknown){toast({title:'Status update failed',description:error instanceof Error?error.message:'Please try again.',variant:'destructive'})}finally{setSaving(false)}}
  const initials=(name?:string)=>(name??'U').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3"><Card className="p-5"><p className="text-sm text-muted-foreground">Total members</p><p className="mt-1 text-2xl font-semibold">{totalUsers}</p></Card><Card className="p-5"><p className="text-sm text-muted-foreground">Active</p><p className="mt-1 text-2xl font-semibold">{activeUsers}</p></Card><Card className="p-5"><p className="text-sm text-muted-foreground">Inactive</p><p className="mt-1 text-2xl font-semibold">{inactiveUsers}</p></Card></div>
    <Card className="overflow-hidden"><div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-lg font-semibold">People</h2><p className="text-sm text-muted-foreground">Manage company membership, roles and access.</p></div><Button onClick={()=>setInviteOpen(true)}><UserPlus className="mr-2 h-4 w-4"/>Invite member</Button></div>
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search username, people, roles or departments..." className="pl-9"/></div><Tabs value={tab} onValueChange={v=>setTab(v as typeof tab)}><TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="active">Active</TabsTrigger><TabsTrigger value="inactive">Inactive</TabsTrigger></TabsList></Tabs></div>
      {loading?<div className="flex min-h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin"/></div>:visible.length===0?<div className="flex min-h-64 flex-col items-center justify-center gap-2 p-8 text-center"><Users className="h-8 w-8 text-muted-foreground"/><p className="font-medium">No members found</p></div>:<div className="divide-y">{visible.map(m=><div key={m.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><Avatar><AvatarFallback>{initials(m.profile?.full_name)}</AvatarFallback></Avatar><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-medium">@{m.profile?.username??'unknown'}</p><Badge variant={m.is_active?'secondary':'outline'}>{m.is_active?'Active':'Inactive'}</Badge></div><p className="truncate text-sm text-muted-foreground">{m.profile?.full_name??'Unnamed user'} · {m.role} · {m.department?.name??'No department'}</p></div></div><div className="flex items-center gap-2"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={()=>setEdit(m)}><ShieldCheck className="mr-2 h-4 w-4"/>Edit role</DropdownMenuItem><DropdownMenuItem onClick={()=>setStatusTarget(m)}>{m.is_active?<><UserX className="mr-2 h-4 w-4"/>Deactivate</>:<><UserCheck className="mr-2 h-4 w-4"/>Reactivate</>}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div>)}</div>}
    </Card>
    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogContent className="max-w-lg overflow-hidden p-0"><DialogHeader className="border-b border-border bg-card px-6 py-5 text-left"><DialogTitle className="text-lg font-semibold">Invite a team member</DialogTitle><DialogDescription className="mt-1 text-sm text-muted-foreground">Send an email invitation. The username is generated automatically from the member’s name.</DialogDescription></DialogHeader><form onSubmit={invite} className="bg-card"><div className="space-y-5 px-6 py-6"><div className="space-y-2"><Label htmlFor="invite-name">Full name</Label><Input id="invite-name" required autoFocus value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="e.g. Ama Mensah"/></div><div className="space-y-2"><Label htmlFor="invite-email">Email</Label><Input id="invite-email" required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@company.com"/></div><div className="space-y-2"><Label htmlFor="invite-phone">Phone <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="invite-phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone number"/></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="invite-role">Role</Label><Select value={form.role} onValueChange={v=>setForm({...form,role:v})}><SelectTrigger id="invite-role"><SelectValue/></SelectTrigger><SelectContent>{ROLES.map(r=><SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="invite-department">Department</Label><Select value={form.department_id} onValueChange={v=>setForm({...form,department_id:v})}><SelectTrigger id="invite-department"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">No department</SelectItem>{departments.map(d=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div></div></div><DialogFooter className="border-t border-border bg-muted/20 px-6 py-4"><Button type="button" variant="outline" onClick={()=>setInviteOpen(false)}>Cancel</Button><Button disabled={saving} type="submit">{saving&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Send invitation</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={!!edit} onOpenChange={o=>!o&&setEdit(null)}><DialogContent className="max-w-lg overflow-hidden p-0">{edit&&<><DialogHeader className="border-b border-border bg-card px-6 py-5 text-left"><DialogTitle className="text-lg font-semibold">Edit membership</DialogTitle><DialogDescription className="mt-1 text-sm text-muted-foreground">Change this member's company role or department.</DialogDescription></DialogHeader><div className="space-y-5 bg-card px-6 py-6"><div className="space-y-2"><Label htmlFor="edit-member-role">Role</Label><Select value={edit.role} onValueChange={v=>setEdit({...edit,role:v})}><SelectTrigger id="edit-member-role"><SelectValue/></SelectTrigger><SelectContent>{ROLES.map(r=><SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="edit-member-department">Department</Label><Select value={edit.department_id??'none'} onValueChange={v=>setEdit({...edit,department_id:v==='none'?null:v})}><SelectTrigger id="edit-member-department"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">No department</SelectItem>{departments.map(d=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div></div><DialogFooter className="border-t border-border bg-muted/20 px-6 py-4"><Button variant="outline" onClick={()=>setEdit(null)}>Cancel</Button><Button disabled={saving} onClick={saveEdit}>{saving&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save changes</Button></DialogFooter></>}</DialogContent></Dialog>
    <AlertDialog open={!!statusTarget} onOpenChange={o=>!o&&setStatusTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{statusTarget?.is_active?'Deactivate member?':'Reactivate member?'}</AlertDialogTitle><AlertDialogDescription>{statusTarget?.is_active?'This removes the member’s active access. Their profile and history remain intact.':'This restores the member’s active company membership.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={toggleStatus}>{statusTarget?.is_active?'Deactivate':'Reactivate'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}
