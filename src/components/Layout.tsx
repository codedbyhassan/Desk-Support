import { ReactNode, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { NotificationBell } from '@/components/NotificationBell'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  User,
  LogOut,
  BarChart3,
  Sun,
  Moon,
  Search,
  Ticket,
  Package,
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  Menu,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useNotifications } from '@/context/NotificationContext'
import { ToastContainer } from '@/components/ToastNotification'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<any>
  badge?: string
  description?: string
  id: string
  adminOnly?: boolean
}

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme, customTheme } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [activeTicketCount, setActiveTicketCount] = useState<number>(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // ✅ Add notification system hooks
  const { toasts, dismissToast, setCurrentPath } = useNotifications()
  
  // ✅ Track route changes for smart notifications
  useEffect(() => {
    setCurrentPath(pathname)
  }, [pathname, setCurrentPath])

  // Get theme colors with fallbacks
  const primaryColor = customTheme?.primary || '#185ee0'

  useEffect(() => {
    if (user?.id && user?.company_id) {
      fetchActiveTicketCount()
      
      const channel = supabase
        .channel('active-tickets-count')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `assigned_to=eq.${user.id}`
        }, () => {
          fetchActiveTicketCount()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user?.id, user?.company_id])

  const fetchActiveTicketCount = async () => {
    if (!user?.id || !user?.company_id) return
    try {
      const { count, error } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('company_id', user.company_id)
        .in('status', ['open', 'in_progress'])
      if (error) throw error
      setActiveTicketCount(count || 0)
    } catch (error) {
      console.error('Error fetching active ticket count:', error)
      setActiveTicketCount(0)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const allNavItems: NavItem[] = [
    { 
      id: 'dashboard',
      name: 'Dashboard', 
      href: '/app/dashboard', 
      icon: LayoutDashboard,
      description: 'Overview and insights'
    },
    { 
      id: 'tickets',
      name: 'Tickets', 
      href: '/app/tickets', 
      icon: Ticket, 
      badge: activeTicketCount > 0 ? activeTicketCount.toString() : undefined,
      description: 'Manage support tickets'
    },
    { 
      id: 'assets',
      name: 'Assets', 
      href: '/app/assets', 
      icon: Package,
      description: 'Hardware and software'
    },
    { 
      id: 'departments',
      name: 'Departments', 
      href: '/app/departments', 
      icon: Building2,
      description: 'Company departments'
    },
    { 
      id: 'teams',
      name: 'Teams', 
      href: '/app/teams', 
      icon: Users,
      description: 'Team management'
    },
    { 
      id: 'analytics',
      name: 'Analytics', 
      href: '/app/analytics', 
      icon: BarChart3,
      description: 'Reports and metrics',
      adminOnly: true
    },
    { 
      id: 'users',
      name: 'Users', 
      href: '/app/users', 
      icon: User,
      description: 'User management',
      adminOnly: true
    },
    { 
      id: 'settings',
      name: 'Settings', 
      href: '/app/settings', 
      icon: Settings,
      description: 'Preferences and config'
    }
  ]

  const navItems = allNavItems.filter(item => !item.adminOnly || user?.role === 'admin')

  const handleNavChange = (href: string) => {
    navigate(href)
    setMobileMenuOpen(false)
  }

  // Helper function to lighten a color
  const lightenColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace("#", ""), 16)
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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
    }`}>
      {/* Floating Vertical Sidebar - Desktop Only */}
      <aside className="hidden lg:block fixed left-6 top-1/2 -translate-y-1/2 z-50">
        <div className="relative">
          {/* Floating Rounded Sidebar */}
          <div 
            className="relative w-20 rounded-[32px] shadow-2xl"
            style={{
              height: `${Math.min(navItems.length * 60 + 48, 500)}px`,
              background: `linear-gradient(to bottom right, ${primaryColor}, ${lightenColor(primaryColor, -10)})`,
              boxShadow: `0 20px 60px ${primaryColor}66, 0 0 0 1px rgba(255, 255, 255, 0.1)`
            }}
          >
            {/* Subtle Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/20 rounded-[32px]" />
            
            {/* Navigation Icons */}
            <div className="relative flex flex-col items-center justify-center h-full gap-2 py-6">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavChange(item.href)}
                    className={`relative w-12 h-12 rounded-2xl transition-all duration-300 flex items-center justify-center group ${
                      isActive 
                        ? 'bg-white shadow-xl scale-110' 
                        : 'bg-white/10 hover:bg-white/20 hover:scale-105'
                    }`}
                    title={item.name}
                  >
                    <Icon 
                      size={20} 
                      className={`transition-colors ${isActive ? 'text-slate-800' : 'text-white'}`}
                      style={{ color: isActive ? primaryColor : undefined }}
                    />
                    {item.badge && (
                      <span 
                        className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full text-white"
                        style={{ backgroundColor: isActive ? primaryColor : '#ef4444' }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <div 
                        className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full shadow-lg"
                        style={{ backgroundColor: '#ffffff' }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:ml-32">
        {/* Top Header - Transparent */}
        <header className="px-4 lg:px-8 py-4 lg:py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Left - Logo & Mobile Menu */}
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 lg:hidden rounded-xl"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0">
                  <SheetHeader className="p-4 border-b">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <BarChart3 className="h-5 w-5 text-white" />
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
                          <AvatarFallback 
                            className="text-white"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {user?.full_name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{user?.full_name}</p>
                          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
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
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                            style={{
                              backgroundColor: isActive ? lightenColor(primaryColor, 45) : 'transparent',
                              color: isActive ? primaryColor : undefined
                            }}
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className="flex-1 text-left">{item.name}</span>
                            {item.badge && (
                              <Badge 
                                className="text-xs font-bold"
                                style={{
                                  backgroundColor: isActive ? primaryColor : undefined,
                                  color: isActive ? '#ffffff' : undefined
                                }}
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
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        {theme === 'dark' ? (
                          <>
                            <Sun className="h-5 w-5" />
                            <span>Light Mode</span>
                          </>
                        ) : (
                          <>
                            <Moon className="h-5 w-5" />
                            <span>Dark Mode</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div 
                className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  {navItems.find(item => item.href === pathname)?.name || 'Dashboard'}
                </h1>
                <p className={`text-xs lg:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {navItems.find(item => item.href === pathname)?.description || 'Welcome back'}
                </p>
              </div>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-2 lg:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(!searchOpen)}
                className="h-9 w-9 lg:hidden rounded-xl"
              >
                <Search className="h-4 w-4" />
              </Button>

              <div className="hidden lg:block relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search everything..."
                  className={`h-10 w-64 pl-10 rounded-xl focus:ring-2 backdrop-blur-md ${
                    theme === 'dark' 
                      ? 'bg-slate-800/70 border-slate-700 text-white' 
                      : 'bg-white/70 border-slate-200/50 focus:bg-white/90'
                  }`}
                  style={{ 
                    // @ts-ignore - Custom CSS property for focus ring color
                    '--focus-ring-color': primaryColor 
                  } as React.CSSProperties}
                />
              </div>

              <Separator orientation="vertical" className="h-6 hidden lg:block" />

              <NotificationBell />

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className={`h-10 w-10 rounded-xl hidden lg:flex backdrop-blur-md ${
                  theme === 'dark' 
                    ? 'bg-slate-800/70 hover:bg-slate-800/90' 
                    : 'bg-white/70 hover:bg-white/90'
                }`}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative hidden lg:block">
                    <Avatar className={`h-10 w-10 ring-2 transition-all backdrop-blur-md ${
                      theme === 'dark' 
                        ? 'ring-slate-700 hover:ring-slate-600' 
                        : 'ring-slate-200 hover:ring-slate-300'
                    }`}>
                      <AvatarImage src={user?.avatar_url || undefined} />
                      <AvatarFallback 
                        className="text-white text-sm font-semibold"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {user?.full_name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="flex items-center gap-3 p-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user?.avatar_url || undefined} />
                      <AvatarFallback 
                        className="text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {user?.full_name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1 flex-1">
                      <p className="font-semibold text-sm">{user?.full_name}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                      <Badge variant="secondary" className="w-fit text-xs">
                        {user?.role}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/app/profile')} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Mobile Search Bar */}
        {searchOpen && (
          <div 
            className={`lg:hidden px-4 py-2 border-b shrink-0 backdrop-blur-md ${
              theme === 'dark' 
                ? 'bg-slate-900/70 border-slate-700/50' 
                : 'bg-white/70 border-slate-200/50'
            }`}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Search everything..."
                className={`h-9 w-full pl-10 rounded-lg text-sm ${
                  theme === 'dark' 
                    ? 'bg-slate-800/70 border-slate-700 text-white' 
                    : 'bg-white/70 border-slate-200 focus:bg-white/90'
                }`}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="px-4 lg:px-8 py-6 lg:py-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* ✅ Toast Container for Push-style Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-50">
        <div 
          className="relative flex shadow-2xl p-1.5 rounded-2xl"
          style={{
            background: `linear-gradient(to right, ${primaryColor}, ${lightenColor(primaryColor, -10)})`,
            boxShadow: `0 0 1px 0 ${primaryColor}26, 0 6px 20px 0 ${primaryColor}33`
          }}
        >
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <button
                key={item.id}
                onClick={() => handleNavChange(item.href)}
                className={`relative flex-1 flex flex-col items-center justify-center h-14 rounded-xl transition-all duration-300 ${
                  isActive ? 'bg-white shadow-lg' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="relative">
                  <Icon 
                    size={20} 
                    className={`transition-colors ${isActive ? 'text-slate-800' : 'text-white'}`}
                    style={{ color: isActive ? primaryColor : undefined }}
                  />
                  {item.badge && (
                    <span 
                      className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold rounded-full text-white"
                      style={{ backgroundColor: isActive ? primaryColor : '#ef4444' }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span 
                  className={`text-[10px] font-medium mt-0.5 ${isActive ? 'text-slate-800' : 'text-white'}`}
                  style={{ color: isActive ? primaryColor : undefined }}
                >
                  {item.name}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}