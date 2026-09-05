import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Loader2, Search, UserPlus, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const ROLES = [
  { value: 'admin', label: 'Admin' }, { value: 'hr', label: 'HR' }, { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' }, { value: 'contractor', label: 'Contractor' }, { value: 'viewer', label: 'Viewer' },
] as const

type Profile = { id:string; username:string; full_name:string; avatar_path:string|null; phone:string|null }
type Membership = { id:string; user_id:string; company_id:string; role:string; department_id:string|null; is_active:boolean; joined_at:string; profile:Profile|null; department:{name:string}|null }
const PAGE_SIZE = 100
const initials = (name?:string) => (name ?? 'User').split(/\s+/).map(x => x[0]).slice(0,2).join('').toUpperCase()

export default function ManagementTab() {
  const navigate = useNavigate(); const { user: currentUser } = useAuth(); const { toast } = useToast(); const companyId = currentUser?.company_id
  const [memberships,setMemberships] = useState<Membership[]>([]); const [departments,setDepartments] = useState<{id:string;name:string}[]>([])
  const [totalUsers,setTotalUsers]=useState(0); const [activeUsers,setActiveUsers]=useState(0); const [inactiveUsers,setInactiveUsers]=useState(0)
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [query,setQuery]=useState(''); const [tab,setTab]=useState<'all'|'active'|'inactive'>('all')
  const [inviteOpen,setInviteOpen]=useState(false); const [form,setForm]=useState({email:'',full_name:'',role:'employee',department_id:'none',phone:''})

  const load = useCallback(async()=>{
    if(!companyId){setLoading(false);return}; setLoading(true)
    try{
      const [members,depts,counts]=await Promise.all([
        fetchSupabasePage<Omit<Membership,'profile'|'department'>>('company_memberships',0,{pageSize:PAGE_SIZE,orderBy:'joined_at',ascending:false,columns:'id,user_id,company_id,role,department_id,is_active,joined_at',filter:q=>q.eq('company_id',companyId)}),
        supabase.from('departments').select('id,name').eq('company_id',companyId).order('name'), getExactCompanyCounts(companyId)
      ])
      if(depts.error) throw depts.error
      const userIds=[...new Set(members.data.map(m=>m.user_id).filter(Boolean))]
      const profileRows=userIds.length?await supabase.from('profiles').select('id,username,full_name,avatar_path,phone').in('id',userIds):{data:[],error:null}
      if(profileRows.error) throw profileRows.error
      const profilesById=new Map<string,Profile>((profileRows.data??[]).map(p=>[p.id,p as Profile]))
      const departmentsById=new Map<string,{name:string}>((depts.data??[]).map(d=>[d.id,{name:d.name}]))
      setMemberships(members.data.map(m=>({...m,profile:profilesById.get(m.user_id)??null,department:m.department_id?departmentsById.get(m.department_id)??null:null})) as Membership[])
      setDepartments(depts.data??[]); setTotalUsers(counts.users_total); setActiveUsers(counts.users_active); setInactiveUsers(counts.users_inactive)
    }catch(error:unknown){toast({title:'Unable to load people',description:error instanceof Error?error.message:'Please try again.',variant:'destructive'})}finally{setLoading(false)}
  },[companyId,toast])
  useEffect(()=>{void load()},[load])

  const visible=useMemo(()=>{const n=query.trim().toLowerCase();return memberships.filter(m=>{const status=tab==='all'||(tab==='active'?m.is_active:!m.is_active);const hay=`${m.profile?.username??''} ${m.profile?.full_name??''} ${m.role} ${m.department?.name??''}`.toLowerCase();return status&&(!n||hay.includes(n))})},[memberships,query,tab])

  const invite=async(event:React.FormEvent)=>{event.preventDefault();if(!companyId)return;const email=form.email.trim().toLowerCase();const fullName=form.full_name.trim();if(!email||!fullName){toast({title:'Required fields missing',description:'Full name and email are required.',variant:'destructive'});return};setSaving(true);try{const payload={company_id:companyId,email,full_name:fullName,role:form.role,department_id:form.department_id==='none'?null:form.department_id,phone:form.phone.trim()||null};const {data,error}=await supabase.functions.invoke('invite-user',{body:payload});if(error)throw error;if(!data?.ok)throw new Error(data?.error??'Invitation failed');toast({title:'Invitation sent',description:`${fullName} can now finish their account setup.`});setInviteOpen(false);setForm({email:'',full_name:'',role:'employee',department_id:'none',phone:''});await load()}catch(error:unknown){toast({title:'Invitation failed',description:error instanceof Error?error.message:'Please try again.',variant:'destructive'})}finally{setSaving(false)}}

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3"><Card className="p-5"><p className="text-sm text-muted-foreground">Total members</p><p className="mt-1 text-2xl font-semibold">{totalUsers}</p></Card><Card className="p-5"><p className="text-sm text-muted-foreground">Active</p><p className="mt-1 text-2xl font-semibold">{activeUsers}</p></Card><Card className="p-5"><p className="text-sm text-muted-foreground">Inactive</p><p className="mt-1 text-2xl font-semibold">{inactiveUsers}</p></Card></div>
    <Card className="overflow-hidden"><div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-lg font-semibold">People</h2><p className="text-sm text-muted-foreground">Select a member to view their profile, access and account actions.</p></div><Button onClick={()=>setInviteOpen(true)}><UserPlus className="mr-2 h-4 w-4"/>Invite member</Button></div><div className="flex flex-col gap-3 border-b p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search username, people, roles or departments..." className="pl-9"/></div><Tabs value={tab} onValueChange={v=>setTab(v as typeof tab)}><TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="active">Active</TabsTrigger><TabsTrigger value="inactive">Inactive</TabsTrigger></TabsList></Tabs></div>{loading?<div className="flex min-h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin"/></div>:visible.length===0?<div className="flex min-h-64 flex-col items-center justify-center gap-2 p-8 text-center"><Users className="h-8 w-8 text-muted-foreground"/><p className="font-medium">No members found</p><p className="text-sm text-muted-foreground">Try changing your search or filter.</p></div>:<div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(m=>{const name=m.profile?.full_name??'Unnamed user';const username=m.profile?.username??'unknown';const role=ROLES.find(r=>r.value===m.role)?.label??m.role;return <button key={m.id} type="button" onClick={()=>navigate(`/app/users/${encodeURIComponent(username)}`)} className="group text-left"><Card className="h-full overflow-hidden border-border/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md"><div className="relative h-28 bg-muted/50"><div className="absolute right-4 top-4"><Badge variant={m.is_active?'secondary':'outline'}>{m.is_active?'Active':'Inactive'}</Badge></div></div><div className="relative px-5 pb-5"><Avatar className="-mt-10 h-20 w-20 border-4 border-card shadow-sm"><AvatarFallback className="text-lg">{initials(name)}</AvatarFallback></Avatar><div className="mt-4 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-base font-semibold">{name}</h3><p className="mt-0.5 truncate text-sm text-muted-foreground">@{username}</p></div><ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"/></div><div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4"><div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Role</p><p className="mt-1 truncate text-sm font-medium">{role}</p></div><div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Department</p><p className="mt-1 truncate text-sm font-medium">{m.department?.name??'No department'}</p></div></div></div></Card></button>})}</div>}</Card>
    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Invite a team member</DialogTitle><DialogDescription>Send an email invitation.</DialogDescription></DialogHeader><form onSubmit={invite} className="space-y-5"><div className="space-y-2"><Label>Full name</Label><Input required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></div><div className="space-y-2"><Label>Email</Label><Input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div><div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Role</Label><Select value={form.role} onValueChange={v=>setForm({...form,role:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{ROLES.map(r=><SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Department</Label><Select value={form.department_id} onValueChange={v=>setForm({...form,department_id:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">No department</SelectItem>{departments.map(d=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div></div><DialogFooter><Button type="button" variant="outline" onClick={()=>setInviteOpen(false)}>Cancel</Button><Button disabled={saving} type="submit">{saving?'Sending…':'Send invitation'}</Button></DialogFooter></form></DialogContent></Dialog>
  </div>
}
