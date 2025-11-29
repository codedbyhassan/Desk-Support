import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
    { value: 'incoming', label: 'Incoming', icon: AlertCircle },
    { value: 'outgoing', label: 'Outgoing', icon: Activity }
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
  const navigate = useNavigate()
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
      <header className="fixed top-0 right-0 left-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border dark:bg-[#0d1117]/95 dark:border-[#151a1f]">
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
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 dark:bg-[#0d1117] dark:border dark:border-[#151a1f]"
                    style={{ backgroundColor: theme === 'dark' ? undefined : primaryColor }}
                  >
                    <BarChart3 className={`h-5 w-5 ${theme === 'dark' ? 'text-white' : 'text-white'}`} />
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
                  className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 dark:bg-[#0d1117] dark:border dark:border-[#151a1f]"
                  style={{ backgroundColor: theme === 'dark' ? undefined : primaryColor }}
                >
                  <BarChart3 className={`h-4 w-4 ${theme === 'dark' ? 'text-white' : 'text-white'}`} />
                </div>

                <div className="lg:hidden min-w-0">
                  <h2 className="text-base font-semibold truncate text-foreground">
                    {currentPage?.name || 'Dashboard'}
                  </h2>
                </div>
              </div>

              {/* Right - Actions */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Navigation Tabs - Show on desktop and other pages with tabs */}
                {shouldRenderTabs && (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden lg:block mr-2">
                    <TabsList className="bg-transparent dark:bg-transparent p-1 rounded-lg h-auto border-0">
                      {tabsToShow.map((tab) => {
                        const Icon = tab.icon
                        const isTabActive = activeTab === tab.value
                        return (
                          <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              isTabActive
                                ? 'bg-transparent text-slate-900 dark:bg-white dark:text-black shadow-md'
                                : 'bg-transparent text-slate-900 dark:text-white/60 hover:text-slate-700 dark:hover:text-white/90'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="truncate">{tab.label}</span>
                          </TabsTrigger>
                        )
                      })}
                    </TabsList>
                  </Tabs>
                )}

                {/* QR Code Scanner - Mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/app/qr-scanner')}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg lg:hidden hover:bg-muted active:scale-95 transition-transform"
                  title="QR Code Attendance"
                >
                  <QrCode className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-400" />
                </Button>

                {/* Notifications */}
                <NotificationBell />

                {/* Theme Toggle - Mobile & Desktop */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-muted active:scale-95 transition-transform"
                  title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 transition-transform" />
                  ) : (
                    <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 transition-transform" />
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