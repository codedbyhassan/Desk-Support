import { useLocation } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/NotificationBell'
import { Sun, Moon, QrCode, Search } from 'lucide-react'
import { MobileMenu } from './MobileMenu'
import { UserMenu } from './UserMenu'
import { NavItem } from './types'

interface HeaderProps { navItems: NavItem[]; mobileMenuOpen: boolean; setMobileMenuOpen: (open:boolean)=>void }

export function Header({ navItems, mobileMenuOpen, setMobileMenuOpen }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const currentPage = navItems.find(item => pathname === item.href || pathname.startsWith(`${item.href}/`))

  return <header className="sticky top-0 z-40 h-[72px] border-b border-border bg-background">
    <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <div className="lg:hidden"><MobileMenu navItems={navItems} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} primaryColor="#2563eb" hidden={false}/></div>
        <div className="min-w-0">
          <div className="hidden items-center gap-2 sm:flex"><span className="text-[11px] font-medium text-muted-foreground">Workspace</span><span className="text-muted-foreground">/</span><span className="text-[11px] font-semibold text-foreground">{currentPage?.name || 'Dashboard'}</span></div>
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{currentPage?.name || 'Dashboard'}</h1>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="hidden h-9 w-56 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground xl:flex"><Search className="h-4 w-4"/><span>Search workspace</span><kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-[10px]">⌘K</kbd></div>
        <Button variant="ghost" size="icon" onClick={() => window.location.hash = '#/app/qr-scanner'} className="h-9 w-9 rounded-lg md:hidden" title="QR Scanner"><QrCode className="h-4 w-4"/></Button>
        <NotificationBell />
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 rounded-lg" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>{theme === 'dark' ? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}</Button>
        <div className="ml-1 hidden h-7 w-px bg-border sm:block" />
        <UserMenu primaryColor="#2563eb"/>
      </div>
    </div>
  </header>
}
