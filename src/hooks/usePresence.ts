import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export function usePresence(){
 const {user}=useAuth()
 useEffect(()=>{if(!user?.id)return;let disposed=false;const set=async(online:boolean)=>{if(!disposed)await supabase.rpc('set_presence',{p_online:online})};void set(true);const onVisibility=()=>void set(document.visibilityState==='visible');const onPageHide=()=>void set(false);document.addEventListener('visibilitychange',onVisibility);window.addEventListener('pagehide',onPageHide);return()=>{disposed=true;document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pagehide',onPageHide);void supabase.rpc('set_presence',{p_online:false})}},[user?.id])
}
