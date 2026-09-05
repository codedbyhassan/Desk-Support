import { useEffect, useState } from 'react'
import { Phone, PhoneOff, Video } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export default function IncomingCallOverlay(){
 const {user}=useAuth(); const navigate=useNavigate(); const [call,setCall]=useState<any>(null); const [caller,setCaller]=useState('Someone')
 useEffect(()=>{if(!user?.id)return;let alive=true;const load=async(id:string)=>{const {data:participant}=await supabase.from('call_participants_v2').select('call_id').eq('call_id',id).eq('user_id',user.id).maybeSingle();if(!participant)return;const {data}=await supabase.from('calls').select('id,initiator_id,call_type,status,created_at').eq('id',id).maybeSingle();if(!data||data.initiator_id===user.id||data.status!=='ringing')return;const {data:p}=await supabase.from('profiles').select('full_name').eq('id',data.initiator_id).maybeSingle();if(alive){setCaller(p?.full_name||'Incoming call');setCall(data)}};const channel=supabase.channel(`incoming-calls:${user.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'calls',filter:`company_id=eq.${user.company_id}`},p=>void load(p.new.id)).on('postgres_changes',{event:'UPDATE',schema:'public',table:'calls',filter:`company_id=eq.${user.company_id}`},p=>{if(p.new.status!=='ringing')setCall((current:any)=>current?.id===p.new.id?null:current)}).subscribe();return()=>{alive=false;void supabase.removeChannel(channel)}},[user?.id,user?.company_id])
 if(!call)return null
 const decline=async()=>{await supabase.rpc('update_call_status',{p_call_id:call.id,p_status:'declined',p_reason:'declined'});setCall(null)}
 const accept=()=>{setCall(null);navigate(`/app/calls/${call.id}?type=${call.call_type}`)}
 return <div className="fixed right-4 top-4 z-[200] w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-2xl"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><Video className="h-5 w-5"/></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{call.call_type==='video'?'Incoming video call':'Incoming audio call'}</p><p className="truncate text-sm text-muted-foreground">{caller}</p></div></div><div className="mt-4 flex gap-2"><button onClick={()=>void decline()} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium hover:bg-muted"><PhoneOff className="h-4 w-4"/>Decline</button><button onClick={accept} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"><Phone className="h-4 w-4"/>Answer</button></div></div>
}
