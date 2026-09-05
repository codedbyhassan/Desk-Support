import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Sun, Moon, LogOut, Menu, ChevronRight } from 'lucide-react'
import { NavItem } from './types'
import { useAuth } from '@/lib/auth'

interface MobileMenuProps {
  navItems: NavItem[]
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

export function MobileMenu({ navItems, mobileMenuOpen, setMobileMenuOpen }: MobileMenuProps) {
  const { signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isActive = (href: string) => href === '/app/dashboard'
    ? pathname === '/app' || pathname === '/app/dashboard' || pathname.startsWith('/app/dashboard/')
    : pathname === href || pathname.startsWith(`${href}/`)

  const handleNavChange = (href: string) => {
    navigate(href)
    setMobileMenuOpen(false)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const mainItems = navItems.filter(item => !['settings', 'notifications', 'profile'].includes(item.id))
  const utilityItems = navItems.filter(item => ['notifications', 'settings', 'profile'].includes(item.id))

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg lg:hidden" aria-label="Open navigation menu">
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(88vw,300px)] p-0">
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-5 py-5">
            <p className="text-base font-bold tracking-tight">Desk-Support</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Service workspace</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Workspace</p>
            <nav className="space-y-1" aria-label="Workspace navigation">
              {mainItems.map(item => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleNavChange(item.href)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${active ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  >
                    {active && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-primary" aria-hidden="true" />}
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.9} aria-hidden="true" />
                    <span className="flex-1 text-left">{item.name}</span>
                    {item.badge && <Badge className="bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">{item.badge}</Badge>}
                    {active && <ChevronRight className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />}
                  </button>
                )
              })}
            </nav>

            <p className="mb-2 mt-7 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Account</p>
            <nav className="space-y-1" aria-label="Account navigation">
              {utilityItems.map(item => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleNavChange(item.href)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${active ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    <span className="flex-1 text-left">{item.name}</span>
                    {item.badge && <Badge className="bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">{item.badge}</Badge>}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="space-y-1 border-t border-border p-3">
            <button type="button" onClick={toggleTheme} className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" aria-hidden="true" /> : <Moon className="h-[18px] w-[18px]" aria-hidden="true" />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <button type="button" onClick={handleSignOut} className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-destructive hover:bg-destructive/10" aria-label="Sign out">
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
