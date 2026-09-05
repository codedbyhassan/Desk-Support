import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export function usePresence(){
 const {user}=useAuth();const sessionKey=useRef(typeof crypto!=='undefined'&&'randomUUID'in crypto?crypto.randomUUID():`${Date.now()}-${Math.random()}`)
 useEffect(()=>{if(!user?.id)return;let disposed=false;const heartbeat=async(online:boolean)=>{if(disposed)return;try{await supabase.rpc('heartbeat_presence',{p_session_key:sessionKey.current,p_online:online})}catch(error){console.error('Presence heartbeat failed:',error)}};const refresh=()=>void heartbeat(document.visibilityState==='visible');void heartbeat(true);const interval=window.setInterval(()=>void heartbeat(document.visibilityState==='visible'),30000);const onVisibility=()=>refresh();const onPageHide=()=>void heartbeat(false);document.addEventListener('visibilitychange',onVisibility);window.addEventListener('pagehide',onPageHide);return()=>{disposed=true;window.clearInterval(interval);document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pagehide',onPageHide);void heartbeat(false)}},[user?.id])
}
