import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import { useDashboardTab } from '@/context/DashboardTabContext'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/NotificationBell'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sun,
  Moon,
  BarChart3,
  ChevronRight,
  Activity,
  Users,
  Package,
  Ticket,
  Building2,
  Clock,
  QrCode,
  AlertCircle,
  CheckCircle2,
  Target,
  User,
  Bell,
  Palette,
  Shield
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { MobileMenu } from './MobileMenu'
import { UserMenu } from './UserMenu'
import { NavItem } from './types'

type RoleKey = 'admin' | 'manager' | 'hr' | 'employee'

interface RoleTab {
  value: string
  label: string
  icon: LucideIcon
}

const ROLE_TAB_CONFIG: Record<RoleKey, RoleTab[]> = {
  admin: [
    { value: 'overview', label: 'Overview', icon: Activity },
    { value: 'users', label: 'Users', icon: Users },
    { value: 'assets', label: 'Assets', icon: Package }
  ],
  manager: [
    { value: 'overview', label: 'Overview', icon: Activity },
    { value: 'tickets', label: 'Department Tickets', icon: Ticket },
    { value: 'assets', label: 'Department Assets', icon: Package },
    { value: 'members', label: 'Department Members', icon: Users }
  ],
  hr: [
    { value: 'overview', label: 'Overview', icon: Activity },
    { value: 'employees', label: 'Employees', icon: Users },
    { value: 'departments', label: 'Departments', icon: Building2 }
  ],
  employee: [
    { value: 'overview', label: 'Overview', icon: Activity },
    { value: 'assets', label: 'My Assets', icon: Package },
    { value: 'tickets', label: 'My Tickets', icon: Ticket }
  ]
}

const getRoleTabs = (role?: string) => {
  if (!role) return ROLE_TAB_CONFIG.employee
  const normalizedRole = role.toLowerCase() as RoleKey
  return ROLE_TAB_CONFIG[normalizedRole] || ROLE_TAB_CONFIG.employee
}

// Page-specific tab configurations
const PAGE_TAB_CONFIG: Record<string, RoleTab[]> = {
  '/app/users': [
    { value: 'management', label: 'Management', icon: Users },
    { value: 'attendance', label: 'Attendance', icon: Clock },
    { value: 'qrcode', label: 'QR Codes', icon: QrCode }
  ],
  '/app/tickets': [
    { value: 'open', label: 'Open', icon: AlertCircle },
    { value: 'progress', label: 'Progress', icon: Activity },
    { value: 'resolved', label: 'Resolved', icon: CheckCircle2 },
    { value: 'rate', label: 'Rate', icon: Target }
  ],
  '/app/profile': [
    { value: 'profile', label: 'Profile', icon: User },
    { value: 'attendance', label: 'Attendance', icon: Clock }
  ],
  '/app/settings': [
    { value: 'profile', label: 'Profile', icon: User },
    { value: 'company', label: 'Company', icon: Building2 },
    { value: 'appearance', label: 'Appearance', icon: Palette },
    { value: 'notifications', label: 'Notifications', icon: Bell },
    { value: 'security', label: 'Security', icon: Shield }
  ]
}

const getPageTabs = (pathname: string) => {
  return PAGE_TAB_CONFIG[pathname] || []
}

interface HeaderProps {
  navItems: NavItem[]
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  primaryColor: string
}

export function Header({ 
  navItems, 
  mobileMenuOpen, 
  setMobileMenuOpen, 
  primaryColor 
}: HeaderProps) {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const { activeTab, setActiveTab } = useDashboardTab()

  const currentPage = navItems.find(item => item.href === pathname)
  const isDashboardRoute = pathname.startsWith('/app/dashboard')
  const roleTabs = getRoleTabs(user?.role)
  const pageTabs = getPageTabs(pathname)
  const tabsToShow = isDashboardRoute ? roleTabs : pageTabs
  const shouldRenderTabs = tabsToShow.length > 0

  useEffect(() => {
    if (!shouldRenderTabs) return
    const hasActiveTab = tabsToShow.some(tab => tab.value === activeTab)
    if (!hasActiveTab) {
      setActiveTab(tabsToShow[0].value)
    }
  }, [activeTab, tabsToShow, setActiveTab, shouldRenderTabs])

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border dark:bg-[#190019]/80 dark:border-[#522B5B]/30">
        <div className="flex h-full">
          {/* Sidebar spacer on desktop */}
          <div className="hidden lg:block w-16 flex-shrink-0" />
          
          {/* Header content */}
          <div className="flex-1 px-4 lg:px-8 py-3 lg:py-4">
            <div className="flex items-center justify-between gap-4">
              
              {/* Left - Title & Breadcrumb */}
              <div className="flex items-center gap-3 min-w-0">
                <MobileMenu 
                  navItems={navItems}
                  mobileMenuOpen={mobileMenuOpen}
                  setMobileMenuOpen={setMobileMenuOpen}
                  primaryColor={primaryColor}
                />
                
                <div className="hidden lg:flex items-center gap-2">
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 dark:bg-[#2B124C]"
                    style={{ backgroundColor: theme === 'dark' ? undefined : primaryColor }}
                  >
                    <BarChart3 className={`h-5 w-5 ${theme === 'dark' ? 'text-[#DFB6B2]' : 'text-white'}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold text-foreground">
                      {currentPage?.name || 'Dashboard'}
                    </h1>
                    {currentPage?.description && (
                      <>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {currentPage.description}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div 
                  className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 dark:bg-[#2B124C]"
                  style={{ backgroundColor: theme === 'dark' ? undefined : primaryColor }}
                >
                  <BarChart3 className={`h-4 w-4 ${theme === 'dark' ? 'text-[#DFB6B2]' : 'text-white'}`} />
                </div>

                <div className="lg:hidden min-w-0">
                  <h2 className="text-base font-semibold truncate text-foreground">
                    {currentPage?.name || 'Dashboard'}
                  </h2>
                </div>
              </div>

              {/* Right - Actions */}
              <div className="flex items-center gap-2">
                {/* Navigation Tabs - Show on dashboard and other pages with tabs */}
                {shouldRenderTabs && (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden lg:block mr-2">
                    <TabsList className="bg-slate-100 p-1 rounded-lg h-auto">
                      {tabsToShow.map((tab) => {
                        const Icon = tab.icon
                        return (
                          <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                          >
                            <Icon className="h-4 w-4" />
                            <span className="truncate">{tab.label}</span>
                          </TabsTrigger>
                        )
                      })}
                    </TabsList>
                  </Tabs>
                )}

                {/* Notifications */}
                <NotificationBell />

                {/* Theme Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="h-8 w-8 rounded-lg hidden lg:flex hover:bg-muted"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Moon className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>

                {/* User Menu */}
                <UserMenu primaryColor={primaryColor} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer to prevent content overlap */}
      <div className="h-20 lg:h-16" />
    </>
  )
}