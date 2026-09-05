import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/NotificationBell'
import { Sun, Moon, QrCode } from 'lucide-react'
import { MobileMenu } from './MobileMenu'
import { UserMenu } from './UserMenu'
import { SearchCommand } from '@/components/SearchCommand'
import { NavItem } from './types'

interface HeaderProps {
  navItems: NavItem[]
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

export function Header({ navItems, mobileMenuOpen, setMobileMenuOpen }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-40 h-[72px] border-b border-border bg-background">
      <div className="relative flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center">
          <div className="lg:hidden">
            <MobileMenu navItems={navItems} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 w-[min(52vw,420px)] -translate-x-1/2 -translate-y-1/2">
          <SearchCommand />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.hash = '#/app/qr-scanner'}
            className="h-9 w-9 rounded-lg md:hidden"
            aria-label="Open QR scanner"
          >
            <QrCode className="h-4 w-4" aria-hidden="true" />
          </Button>
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          </Button>
          <div className="ml-1 hidden h-7 w-px bg-border sm:block" aria-hidden="true" />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
