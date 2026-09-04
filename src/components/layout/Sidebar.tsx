import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import { NavItem } from './types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface SidebarProps { navItems: NavItem[]; primaryColor: string }

export function Sidebar({ navItems }: SidebarProps) {
  const navigate = useNavigate(); const { pathname } = useLocation(); const { theme } = useTheme()
  void theme

  const isActive = (href: string) => {
    if (href === '/app/dashboard') return pathname === '/app' || pathname === '/app/dashboard' || pathname.startsWith('/app/dashboard/')
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return <TooltipProvider delayDuration={300}><aside className="hidden lg:block fixed left-0 top-0 h-screen z-50"><div className="glass-sidebar relative h-full w-16 flex flex-col items-center py-6 gap-2 overflow-hidden">
    <div className="dark:hidden absolute inset-0" style={{background:'var(--bg-gradient-sidebar)'}}/><div className="hidden dark:block absolute inset-0" style={{background:'var(--bg-gradient-sidebar-dark, linear-gradient(180deg, hsl(var(--primary-900)) 0%, hsl(var(--primary-950)) 50%, hsl(var(--secondary-900)) 100%)'}}/>
    <div className="relative z-10 w-full h-full flex flex-col items-center py-6 gap-2"><div className="flex flex-col items-center gap-2 w-full flex-1">
      {navItems.map(item=>{const Icon=item.icon;const active=isActive(item.href);const isSettings=item.id==='settings'||item.name?.toLowerCase()==='settings';return <Tooltip key={item.id}><TooltipTrigger asChild><button onClick={()=>navigate(item.href)} className={`relative w-10 h-10 rounded-full transition-all duration-300 flex items-center justify-center group ${isSettings?'mt-auto':''} ${active?'bg-[hsl(var(--primary))]/20 border-2 border-[hsl(var(--primary))]/40 shadow-lg backdrop-blur-sm':'bg-transparent hover:bg-[hsl(var(--primary))]/10 border border-transparent hover:border-[hsl(var(--primary))]/20 backdrop-blur-sm'}`} aria-label={item.name} aria-current={active?'page':undefined}><Icon size={18} className={active?'text-[hsl(var(--primary))]':'text-[hsl(var(--foreground))]/70 group-hover:text-[hsl(var(--primary))]'}/>{item.badge&&<span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-[20px] px-0.5 text-[10px] font-bold rounded-full bg-[hsl(var(--primary))]/30 backdrop-blur-sm border border-[hsl(var(--primary))]/40 text-[hsl(var(--primary-foreground))]">{item.badge}</span>}</button></TooltipTrigger><TooltipContent side="right" className="ml-2"><p>{item.name}</p></TooltipContent></Tooltip>})}
    </div></div>
  </div></aside></TooltipProvider>
}
