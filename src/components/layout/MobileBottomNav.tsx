import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { BarChart3, Users2, FileBox, User, Ticket, Package } from 'lucide-react'

export function MobileBottomNav() {
  const navigate=useNavigate(); const { pathname }=useLocation(); const { user }=useAuth()
  const isActive=(href:string)=>href==='/app/dashboard' ? pathname==='/app/dashboard' : pathname===href || pathname.startsWith(`${href}/`)
  const privileged=user?.role==='admin'||user?.role==='hr'
  const navItems=[
    {id:'overview',label:'Overview',icon:BarChart3,href:'/app/dashboard'},
    {id:'tickets',label:'Tickets',icon:Ticket,href:'/app/tickets'},
    {id:'assets',label:'Assets',icon:Package,href:'/app/assets'},
    {id:'teams',label:'Teams',icon:Users2,href:'/app/teams'},
    privileged ? {id:'users',label:'Users',icon:User,href:'/app/users'} : {id:'files',label:'Files',icon:FileBox,href:'/app/workspace'},
  ]
  return <><div className="h-24 lg:hidden" aria-hidden="true"/><nav className="fixed bottom-0 left-0 right-0 lg:hidden z-50 px-3 pb-3 sm:px-4 sm:pb-4" role="navigation" aria-label="Mobile navigation"><div className="glass-surface relative overflow-hidden rounded-3xl border shadow-2xl"><div className="relative flex items-center justify-around h-20 px-2">{navItems.map(item=>{const Icon=item.icon;const active=isActive(item.href);return <button key={item.id} onClick={()=>navigate(item.href)} className={`relative flex flex-col items-center justify-center gap-1.5 flex-1 h-full py-2 px-1 rounded-2xl transition-all duration-300 active:scale-90 group ${active?'text-[hsl(var(--foreground))]':'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`} aria-label={item.label} aria-current={active?'page':undefined}>{active&&<div className="absolute inset-x-1 inset-y-1.5 rounded-xl bg-[hsla(0,0%,100%,0.25)] backdrop-blur-md border border-[hsla(0,0%,100%,0.3)] shadow-lg"/>}<div className="relative z-10"><div className={`p-2.5 rounded-xl transition-all duration-300 ${active?'bg-[hsla(0,0%,100%,0.2)] backdrop-blur-sm scale-125 shadow-lg':'group-hover:bg-[hsla(0,0%,100%,0.1)]'}`}><Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={active?2.5:2}/></div></div><span className={`relative z-10 text-[9px] sm:text-[10px] font-semibold leading-none ${active?'opacity-100':'opacity-70 group-hover:opacity-100'}`}>{item.label}</span>{active&&<div className="absolute bottom-0.5 h-1 w-6 rounded-full bg-[hsla(0,0%,100%,0.4)] animate-pulse"/>}</button>})}</div></div></nav></>
}
