import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Edit2, Home, Loader2, MessageSquare, Plus, Search, Trash2, Users } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import Loader from '@/components/Loader'
import TeamChatView from '@/components/teams/TeamChatView'
import { supabase } from '@/lib/supabase'
import { fetchSupabasePage } from '@/lib/dataAccess'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'

interface Team { id:string; company_id:string; name:string; description:string|null; created_by:string|null; team_lead_id:string|null; avatar_color:string|null; created_at:string; updated_at:string; member_count:number; is_member:boolean; user_role:'lead'|'member'|null }
const fallbackColors=['from-primary to-primary/70','from-accent to-accent/70','from-emerald-500 to-teal-600','from-amber-500 to-orange-600','from-rose-500 to-red-600','from-violet-500 to-purple-600']

export default function TeamsPage(){
 const navigate=useNavigate(); const {user}=useAuth(); const {toast}=useToast()
 const [teams,setTeams]=useState<Team[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null)
 const [search,setSearch]=useState(''); const [selected,setSelected]=useState<string|null>(null); const [showSidebar,setShowSidebar]=useState(true)
 const [createOpen,setCreateOpen]=useState(false); const [editOpen,setEditOpen]=useState(false); const [deleteOpen,setDeleteOpen]=useState(false)
 const [editing,setEditing]=useState<Team|null>(null); const [deleting,setDeleting]=useState<Team|null>(null); const [saving,setSaving]=useState(false)
 const [form,setForm]=useState({name:'',description:''})
 const companyId=user?.company_id; const userId=user?.id

 const loadTeams=useCallback(async()=>{
  if(!companyId||!userId)return
  try{setLoading(true);setError(null)
   const page=await fetchSupabasePage<any>('teams',0,{pageSize:1000,columns:'id,company_id,name,description,created_by,team_lead_id,avatar_color,created_at,updated_at',orderBy:'updated_at'})
   const rows=page.data.filter(t=>t.company_id===companyId)
   const ids=rows.map(t=>t.id)
   const membership=ids.length?await supabase.from('team_members').select('team_id,role').eq('user_id',userId).in('team_id',ids):{data:[],error:null}
   if(membership.error)throw membership.error
   const map=new Map((membership.data??[]).map(m=>[m.team_id,m.role]))
   const counts=ids.length?await supabase.from('team_members').select('team_id').in('team_id',ids):{data:[],error:null}
   if(counts.error)throw counts.error
   const countMap=new Map<string,number>(); (counts.data??[]).forEach(m=>countMap.set(m.team_id,(countMap.get(m.team_id)??0)+1))
   setTeams(rows.map(t=>({...t,member_count:countMap.get(t.id)??0,is_member:map.has(t.id),user_role:map.get(t.id)==='lead'?'lead':map.has(t.id)?'member':null})))
  }catch(e){console.error(e);setError(e instanceof Error?e.message:'Failed to load teams');toast({title:'Unable to load teams',description:'Please try again.',variant:'destructive'})}finally{setLoading(false)}
 },[companyId,userId,toast])

 useEffect(()=>{loadTeams(); if(!companyId)return; const channel=supabase.channel(`teams:${companyId}`).on('postgres_changes',{event:'*',schema:'public',table:'teams',filter:`company_id=eq.${companyId}`},loadTeams).subscribe(); return()=>{supabase.removeChannel(channel)}},[companyId,loadTeams])

 const visible=useMemo(()=>teams.filter(t=>t.is_member&&(t.name.toLowerCase().includes(search.toLowerCase())||(t.description??'').toLowerCase().includes(search.toLowerCase()))),[teams,search])
 const selectedTeam=teams.find(t=>t.id===selected)||null
 const initials=(name:string)=>name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()
 const color=(team:Team)=>team.avatar_color||fallbackColors[parseInt(team.id.slice(0,8),16)%fallbackColors.length]

 const createTeam=async()=>{if(!companyId||!userId)return; if(!form.name.trim()){setError('Team name is required');return};setSaving(true);setError(null)
  try{const {data,error}=await supabase.from('teams').insert({company_id:companyId,name:form.name.trim(),description:form.description.trim()||null,created_by:userId,team_lead_id:userId}).select('id').single();if(error)throw error
   const member=await supabase.from('team_members').insert({team_id:data.id,user_id:userId,role:'lead'});if(member.error)throw member.error
   setForm({name:'',description:''});setCreateOpen(false);await loadTeams();setSelected(data.id);setShowSidebar(false);toast({title:'Team created',description:'Your team is ready.'})
  }catch(e){console.error(e);setError(e instanceof Error?e.message:'Failed to create team');toast({title:'Could not create team',variant:'destructive'})}finally{setSaving(false)} }

 const updateTeam=async()=>{if(!editing||!companyId)return; if(!editing.name.trim()){setError('Team name is required');return};setSaving(true);setError(null)
  try{const {error}=await supabase.from('teams').update({name:editing.name.trim(),description:editing.description?.trim()||null}).eq('id',editing.id).eq('company_id',companyId);if(error)throw error;setEditOpen(false);setEditing(null);await loadTeams();toast({title:'Team updated'})}catch(e){setError(e instanceof Error?e.message:'Failed to update team');toast({title:'Could not update team',variant:'destructive'})}finally{setSaving(false)} }

 const deleteTeam=async()=>{if(!deleting||!companyId)return;setSaving(true)
  try{const {error}=await supabase.from('teams').delete().eq('id',deleting.id).eq('company_id',companyId);if(error)throw error; if(selected===deleting.id){setSelected(null);setShowSidebar(true)} setDeleteOpen(false);setDeleting(null);await loadTeams();toast({title:'Team deleted'})}catch(e){toast({title:'Could not delete team',description:e instanceof Error?e.message:'Please try again.',variant:'destructive'})}finally{setSaving(false)} }

 return <div className="fixed inset-0 top-16 left-0 lg:left-16 flex bg-background">
  {selected&&!showSidebar&&<Button variant="ghost" size="icon" onClick={()=>setShowSidebar(true)} className="fixed top-20 left-4 z-50 rounded-full bg-card shadow-lg md:hidden"><ArrowLeft/></Button>}
  <aside className={`${showSidebar?'translate-x-0':'-translate-x-full'} fixed inset-y-0 left-0 z-40 w-full max-w-sm md:static md:translate-x-0 transition-transform border-r border-border bg-card flex flex-col`}>
   <div className="p-4 border-b border-border space-y-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workspace</p><h1 className="text-xl font-semibold">Teams</h1></div><Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogTrigger asChild><Button size="icon"><Plus/></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create team</DialogTitle><DialogDescription>Create a focused collaboration space.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label>Name</Label><Input value={form.name} maxLength={100} onChange={e=>setForm({...form,name:e.target.value})}/></div><div><Label>Description</Label><Textarea value={form.description} maxLength={500} onChange={e=>setForm({...form,description:e.target.value})}/></div>{error&&<p className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={saving} onClick={createTeam}>{saving?<Loader2 className="animate-spin"/>:<Plus/>}Create team</Button></div></DialogContent></Dialog></div><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your teams" className="pl-9"/></div><div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-border p-3"><p className="text-2xl font-semibold">{visible.length}</p><p className="text-xs text-muted-foreground">Your teams</p></div><div className="rounded-xl border border-border p-3"><p className="text-2xl font-semibold">{visible.reduce((n,t)=>n+t.member_count,0)}</p><p className="text-xs text-muted-foreground">Members</p></div></div></div>
   <div className="flex-1 overflow-y-auto p-2">{loading?<div className="h-full grid place-items-center"><Loader size="md"/></div>:error&&visible.length===0?<div className="h-full grid place-items-center p-6 text-center"><AlertCircle className="mx-auto mb-2 text-destructive"/><p className="text-sm text-muted-foreground">{error}</p></div>:visible.length===0?<div className="h-full grid place-items-center p-6 text-center"><Users className="mx-auto mb-2 text-muted-foreground"/><p className="font-medium">No teams found</p><p className="text-sm text-muted-foreground">Create a team or adjust your search.</p></div>:visible.map(t=><div key={t.id} className="group relative mb-1"><button onClick={()=>{setSelected(t.id);setShowSidebar(false)}} className={`w-full rounded-xl p-3 text-left border transition ${selected===t.id?'border-primary bg-primary/10':'border-transparent hover:border-border hover:bg-muted/50'}`}><div className="flex gap-3"><Avatar><AvatarFallback className={`bg-gradient-to-br ${color(t)} text-white`}>{initials(t.name)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-medium truncate">{t.name}</p>{t.user_role==='lead'&&<Badge variant="secondary" className="text-[10px]">Lead</Badge>}</div><p className="text-xs text-muted-foreground truncate">{t.description||'No description'}</p><p className="text-[11px] text-muted-foreground mt-1">{t.member_count} member{t.member_count===1?'':'s'}</p></div></div></button>{t.user_role==='lead'&&<div className="absolute right-2 bottom-2 hidden group-hover:flex gap-1"><Button variant="ghost" size="icon" onClick={()=>{setEditing({...t});setEditOpen(true)}}><Edit2 className="h-4 w-4"/></Button><Button variant="ghost" size="icon" onClick={()=>{setDeleting(t);setDeleteOpen(true)}}><Trash2 className="h-4 w-4 text-destructive"/></Button></div>}</div>)}</div>
  </aside>
  <main className="flex-1 min-w-0">{selectedTeam?<TeamChatView teamId={selectedTeam.id} userRole={selectedTeam.user_role??undefined} onClose={()=>{setSelected(null);setShowSidebar(true)}} onStartCall={mode=>navigate(`/app/teams/call/${selectedTeam.id}?mode=${mode}&initiator=1`)}/>:<div className="h-full grid place-items-center p-8 text-center"><div className="max-w-sm"><div className="mx-auto mb-4 h-16 w-16 rounded-2xl border border-border grid place-items-center"><MessageSquare className="text-muted-foreground"/></div><h2 className="text-xl font-semibold">Choose a team</h2><p className="mt-2 text-muted-foreground">Select one of your teams to open its collaboration space.</p></div></div>}</main>
  <Button onClick={()=>navigate('/app/dashboard')} size="icon" className="fixed bottom-5 right-5 rounded-full shadow-xl lg:hidden"><Home/></Button>
  <Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent><DialogHeader><DialogTitle>Edit team</DialogTitle></DialogHeader>{editing&&<div className="space-y-4"><div><Label>Name</Label><Input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></div><div><Label>Description</Label><Textarea value={editing.description??''} onChange={e=>setEditing({...editing,description:e.target.value})}/></div><Button className="w-full" disabled={saving} onClick={updateTeam}>{saving?<Loader2 className="animate-spin"/>:'Save changes'}</Button></div>}</DialogContent></Dialog>
  <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete team?</AlertDialogTitle><AlertDialogDescription>This permanently removes the team and its messages.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={deleteTeam}>{saving?<Loader2 className="animate-spin"/>:'Delete team'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </div>
}