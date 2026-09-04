import { useNavigate, useLocation } from 'react-router-dom'
import { NavItem } from './types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/lib/auth'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Headphones, ChevronRight } from 'lucide-react'

interface SidebarProps { navItems: NavItem[]; primaryColor: string }

export function Sidebar({ navItems }: SidebarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, company } = useAuth()

  const isActive = (href: string) => href === '/app/dashboard'
    ? pathname === '/app' || pathname === '/app/dashboard' || pathname.startsWith('/app/dashboard/')
    : pathname === href || pathname.startsWith(`${href}/`)

  const primary = navItems.filter(item => !['settings'].includes(item.id))
  const settings = navItems.filter(item => item.id === 'settings')

  return <TooltipProvider delayDuration={200}>
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-[248px] flex-col border-r border-border bg-card">
      <div className="flex h-[72px] items-center border-b border-border px-5">
        <button onClick={() => navigate('/app/dashboard')} className="flex items-center gap-3 text-left group">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm group-hover:scale-[1.03] transition-transform">
            <Headphones className="h-5 w-5" />
          </span>
          <span><span className="block text-[15px] font-bold tracking-tight">Desk-Support</span><span className="block text-[11px] text-muted-foreground">Service workspace</span></span>
        </button>
      </div>

      <div className="px-3 pt-5">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
        <nav className="space-y-1">
          {primary.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            return <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button onClick={() => navigate(item.href)} aria-current={active ? 'page' : undefined} className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${active ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />}
                  <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  <span className="flex-1 text-left">{item.name}</span>
                  {item.badge && <span className="min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-bold text-primary-foreground">{item.badge}</span>}
                  {active && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="lg:hidden">{item.name}</TooltipContent>
            </Tooltip>
          })}
        </nav>
      </div>

      <div className="mt-auto px-3 pb-4">
        <nav className="mb-3 space-y-1">
          {settings.map(item => { const Icon = item.icon; const active = isActive(item.href); return <button key={item.id} onClick={() => navigate(item.href)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="h-[18px] w-[18px]"/><span>{item.name}</span></button> })}
        </nav>
        <div className="rounded-2xl border border-border bg-muted/40 p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9"><AvatarImage src={user?.avatar_url || undefined}/><AvatarFallback>{user?.full_name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user?.full_name || 'User'}</p><p className="truncate text-[11px] text-muted-foreground">{company?.name || user?.role || 'Workspace'}</p></div>
          </div>
        </div>
      </div>
    </aside>
  </TooltipProvider>
}
