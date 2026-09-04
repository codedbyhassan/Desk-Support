import { useNavigate, useLocation } from 'react-router-dom'
import { NavItem } from './types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/lib/auth'
import { Headphones } from 'lucide-react'

interface SidebarProps { navItems: NavItem[]; primaryColor: string }

export function Sidebar({ navItems }: SidebarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, company } = useAuth()

  const isActive = (href: string) => href === '/app/dashboard'
    ? pathname === '/app' || pathname === '/app/dashboard' || pathname.startsWith('/app/dashboard/')
    : pathname === href || pathname.startsWith(`${href}/`)

  const mainItems = navItems.filter(item => !['settings', 'notifications'].includes(item.id))
  const utilityItems = navItems.filter(item => ['notifications', 'settings'].includes(item.id))

  return <aside className="fixed inset-y-0 left-0 z-50 hidden w-[248px] flex-col border-r border-border bg-card lg:flex">
    <div className="flex h-[72px] shrink-0 items-center border-b border-border px-5">
      <button onClick={() => navigate('/app/dashboard')} className="flex items-center gap-3 text-left">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Headphones className="h-[18px] w-[18px]" /></span>
        <span className="min-w-0"><span className="block text-[15px] font-bold tracking-tight">Desk-Support</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Service workspace</span></span>
      </button>
    </div>

    <div className="flex-1 overflow-y-auto px-3 py-5">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Workspace</p>
      <nav className="space-y-0.5">
        {mainItems.map(item => {
          const Icon = item.icon; const active = isActive(item.href)
          return <button key={item.id} onClick={() => navigate(item.href)} aria-current={active ? 'page' : undefined} className={`relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
            {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />}
            <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={active ? 2.2 : 1.9} />
            <span className="flex-1 text-left">{item.name}</span>
            {item.badge && <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{item.badge}</span>}
          </button>
        })}
      </nav>

      <div className="my-5 border-t border-border" />
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">System</p>
      <nav className="space-y-0.5">
        {utilityItems.map(item => { const Icon=item.icon; const active=isActive(item.href); return <button key={item.id} onClick={() => navigate(item.href)} className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="h-[17px] w-[17px]"/><span>{item.name}</span></button> })}
      </nav>
    </div>

    <div className="shrink-0 border-t border-border p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <Avatar className="h-8 w-8"><AvatarImage src={user?.avatar_url || undefined}/><AvatarFallback className="text-xs">{user?.full_name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{user?.full_name || 'User'}</p><p className="truncate text-[10px] text-muted-foreground">{company?.name || 'Workspace'}</p></div>
      </div>
    </div>
  </aside>
}
