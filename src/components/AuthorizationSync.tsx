import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export default function AuthorizationSync(){
 const{user,refreshProfile}=useAuth()
 useEffect(()=>{if(!user?.id||!user.company_id)return;const channel=supabase.channel(`authorization:${user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'company_memberships',filter:`user_id=eq.${user.id}`},()=>{void refreshProfile()}).subscribe();return()=>{void supabase.removeChannel(channel)}},[refreshProfile,user?.company_id,user?.id])
 return null
}
