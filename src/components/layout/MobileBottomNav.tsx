import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { BarChart3, Users2, FileBox, User, Ticket, Package } from 'lucide-react'
import type { NavItem } from './types'

export function MobileBottomNav({ navItems }: { navItems?: NavItem[] }) {
  const navigate=useNavigate(); const { pathname }=useLocation(); const { user }=useAuth()
  const isActive=(href:string)=>href==='/app/dashboard' ? pathname==='/app' || pathname==='/app/dashboard' : pathname===href || pathname.startsWith(`${href}/`)
  const privileged=user?.role==='admin'||user?.role==='hr'
  const visibleNavItems: NavItem[] = navItems && navItems.length > 0 ? navItems.filter(item => !['settings','notifications'].includes(item.id)) : [
    {id:'overview',name:'Overview',icon:BarChart3,href:'/app/dashboard'},
    {id:'tickets',name:'Tickets',icon:Ticket,href:'/app/tickets'},
    {id:'assets',name:'Assets',icon:Package,href:'/app/assets'},
    {id:'teams',name:'Teams',icon:Users2,href:'/app/teams'},
    privileged ? {id:'users',name:'Users',icon:User,href:'/app/users'} : {id:'files',name:'Files',icon:FileBox,href:'/app/workspace'},
  ]
  return <><div className="h-20 lg:hidden" aria-hidden="true"/><nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background lg:hidden" role="navigation" aria-label="Mobile navigation"><div className="mx-auto flex h-16 max-w-lg">{visibleNavItems.map(item=>{const Icon=item.icon;const active=isActive(item.href);return <button key={item.id} onClick={()=>navigate(item.href)} className={`relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${active?'text-primary':'text-muted-foreground hover:text-foreground'}`} aria-label={item.name} aria-current={active?'page':undefined}>{active&&<span className="absolute top-0 h-0.5 w-7 rounded-full bg-primary"/>}<Icon className="h-[18px] w-[18px]" strokeWidth={active?2.2:1.8}/><span>{item.name}</span></button>})}</div></nav></>
}
