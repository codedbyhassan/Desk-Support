import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Toast } from '@/components/ToastNotification'

export interface AppNotification {
  id: string
  company_id: string
  recipient_id: string
  title: string
  body: string
  type: string
  entity_type: string | null
  entity_id: string | null
  action_url: string | null
  metadata: Record<string, unknown>
  read_at: string | null
  created_at: string
}
interface NotificationContextType {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  toasts: Toast[]
  currentPath: string
  setCurrentPath: (path:string)=>void
  markAsRead:(id:string)=>Promise<void>
  markAllAsRead:()=>Promise<void>
  deleteNotification:(id:string)=>Promise<void>
  deleteAllRead:()=>Promise<void>
  refreshNotifications:()=>Promise<void>
  dismissToast:(id:string)=>void
  fetchError:string|null
}
const NotificationContext=createContext<NotificationContextType|undefined>(undefined)

function routeFor(n: AppNotification){ if(n.action_url)return n.action_url; if(!n.entity_type||!n.entity_id)return undefined; const map:Record<string,string>={ticket:'/app/tickets',team:'/app/teams',asset:'/app/assets',department:'/app/departments'}; return map[n.entity_type]?`${map[n.entity_type]}/${n.entity_id}`:undefined }
function isCurrentEntity(path:string,n:AppNotification){const route=routeFor(n);return !!route&& (path===route||path.startsWith(`${route}/`))}

export function NotificationProvider({children}:{children:ReactNode}){
 const {user}=useAuth(); const [notifications,setNotifications]=useState<AppNotification[]>([]); const [toasts,setToasts]=useState<Toast[]>([]); const [loading,setLoading]=useState(false); const [fetchError,setFetchError]=useState<string|null>(null); const [currentPath,setCurrentPath]=useState(()=>window.location.hash.replace(/^#/,'')||window.location.pathname); const loaded=useRef(false); const seen=useRef(new Set<string>())
 const refreshNotifications=useCallback(async()=>{if(!user?.id){setNotifications([]);setLoading(false);return} setLoading(true);setFetchError(null); const {data,error}=await supabase.from('notifications').select('*').eq('recipient_id',user.id).order('created_at',{ascending:false}).range(0,999); if(error){setFetchError(error.message);setNotifications([])}else{const rows=(data??[]) as AppNotification[];setNotifications(rows);seen.current=new Set(rows.map(n=>n.id));loaded.current=true} setLoading(false)},[user?.id])
 useEffect(()=>{const onRoute=()=>setCurrentPath(window.location.hash.replace(/^#/,'')||window.location.pathname);window.addEventListener('hashchange',onRoute);window.addEventListener('popstate',onRoute);return()=>{window.removeEventListener('hashchange',onRoute);window.removeEventListener('popstate',onRoute)}},[])
 useEffect(()=>{loaded.current=false;seen.current.clear();setToasts([]);void refreshNotifications();if(!user?.id)return;const channel=supabase.channel(`notifications:${user.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`recipient_id=eq.${user.id}`},payload=>{const n=payload.new as AppNotification;if(seen.current.has(n.id))return;seen.current.add(n.id);setNotifications(prev=>[n,...prev]);if(!loaded.current||isCurrentEntity(currentPath,n))return;const toast:Toast={id:n.id,title:n.title,message:n.body,type:n.type.includes('error')?'error':n.type.includes('success')?'success':n.type.includes('status')?'warning':'info',notificationType:n.type,onClick:routeFor(n)?()=>{window.location.hash=routeFor(n)!}:undefined,duration:5000};setToasts(prev=>prev.some(t=>t.id===n.id)?prev:[...prev,toast])}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'notifications',filter:`recipient_id=eq.${user.id}`},payload=>{setNotifications(prev=>prev.map(n=>n.id===payload.new.id?payload.new as AppNotification:n))}).subscribe();return()=>{void supabase.removeChannel(channel)}},[user?.id,refreshNotifications,currentPath])
 const markAsRead=useCallback(async(id:string)=>{const {error}=await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('recipient_id',user?.id??'');if(error)throw error;setNotifications(prev=>prev.map(n=>n.id===id?{...n,read_at:new Date().toISOString()}:n))},[user?.id])
 const markAllAsRead=useCallback(async()=>{if(!user?.id)return;const now=new Date().toISOString();const {error}=await supabase.from('notifications').update({read_at:now}).eq('recipient_id',user.id).is('read_at',null);if(error)throw error;setNotifications(prev=>prev.map(n=>n.read_at? n:{...n,read_at:now}))},[user?.id])
 const deleteNotification=useCallback(async(id:string)=>{const {error}=await supabase.from('notifications').delete().eq('id',id).eq('recipient_id',user?.id??'');if(error)throw error;setNotifications(prev=>prev.filter(n=>n.id!==id));setToasts(prev=>prev.filter(t=>t.id!==id))},[user?.id])
 const deleteAllRead=useCallback(async()=>{if(!user?.id)return;const {error}=await supabase.from('notifications').delete().eq('recipient_id',user.id).not('read_at','is',null);if(error)throw error;setNotifications(prev=>prev.filter(n=>!n.read_at))},[user?.id])
 const dismissToast=useCallback((id:string)=>setToasts(prev=>prev.filter(t=>t.id!==id)),[])
 const unreadCount=useMemo(()=>notifications.reduce((count,n)=>count+(n.read_at?0:1),0),[notifications])
 return <NotificationContext.Provider value={{notifications,unreadCount,loading,toasts,currentPath,setCurrentPath,markAsRead,markAllAsRead,deleteNotification,deleteAllRead,refreshNotifications,dismissToast,fetchError}}>{children}</NotificationContext.Provider>
}
export function useNotifications(){const value=useContext(NotificationContext);if(!value)throw new Error('useNotifications must be used within NotificationProvider');return value}
