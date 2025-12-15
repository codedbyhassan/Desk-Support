import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Sun, Moon, LogOut, BarChart3, Menu } from 'lucide-react'
import { NavItem } from './types'

interface MobileMenuProps {
  navItems: NavItem[]
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  primaryColor: string
  hidden?: boolean
}

export function MobileMenu({ 
  navItems, 
  mobileMenuOpen, 
  setMobileMenuOpen, 
  primaryColor,
  hidden = false
}: MobileMenuProps) {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Helper function to lighten a color
  const lightenColor = (color: string, percent: number): string => {
    const num = parseInt(primaryColor.replace("#", ""), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt
    return "#" + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1)
  }

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

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-xl ${hidden ? 'hidden' : 'lg:hidden'}`}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="glass-menu w-[280px] p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg bg-[hsla(0,0%,100%,0.15)] backdrop-blur-sm border border-[hsla(0,0%,100%,0.2)]">
              <BarChart3 className="h-5 w-5 text-foreground" />
            </div>
            <SheetTitle className="text-lg font-bold">Dashboard</SheetTitle>
          </div>
        </SheetHeader>
        
        <div className="py-4">
          {/* User Info */}
          <div className="px-4 pb-4 mb-4 border-b">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user?.avatar_url || undefined} />
                <AvatarFallback className="text-[hsl(var(--foreground))] bg-[hsla(0,0%,100%,0.15)] backdrop-blur-sm border border-[hsla(0,0%,100%,0.2)]">
                  {user?.full_name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {user?.role}
                </Badge>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavChange(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-[hsla(0,0%,100%,0.2)] backdrop-blur-sm text-[hsl(var(--foreground))]'
                      : 'bg-transparent text-[hsl(var(--muted-foreground))] hover:bg-[hsla(0,0%,100%,0.1)] hover:text-[hsl(var(--foreground))]'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0 text-foreground" />
                  <span className="flex-1 text-left">{item.name}</span>
                  {item.badge && (
                    <Badge 
                      className={`text-xs font-bold ${
                        isActive 
                          ? 'bg-[hsla(0,0%,100%,0.3)] backdrop-blur-sm text-[hsl(var(--foreground))]'
                          : 'bg-[hsla(0,0%,100%,0.15)] backdrop-blur-sm text-[hsl(var(--muted-foreground))]'
                      }`}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="mt-4 px-2 space-y-1">
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                theme === 'dark' 
                  ? 'text-[hsl(var(--menu-hover-text))] hover:bg-[hsl(var(--avatar-border-dark))]' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-5 w-5 text-foreground" />
                  <span className="text-foreground">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-5 w-5 text-foreground" />
                  <span className="text-foreground">Dark Mode</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleSignOut}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                theme === 'dark' 
                  ? 'text-[hsl(var(--menu-hover-text))] hover:bg-[hsl(var(--avatar-border-dark))]' 
                  : 'text-red-600 hover:bg-red-50'
              }`}
            >
              <LogOut className="h-5 w-5 text-foreground" />
              <span className="text-foreground">Sign Out</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

