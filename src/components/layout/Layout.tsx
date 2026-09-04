import { useMemo, useState, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Ticket, Package, Building2, Users, Settings, Bell, UserCircle, QrCode, BriefcaseBusiness, Video } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { DashboardTabProvider } from '@/context/DashboardTabContext'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { MobileBottomNav } from './MobileBottomNav'
import type { NavItem } from './types'

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { id: 'tickets', name: 'Tickets', href: '/app/tickets', icon: Ticket },
  { id: 'assets', name: 'Assets', href: '/app/assets', icon: Package },
  { id: 'departments', name: 'Departments', href: '/app/departments', icon: Building2 },
  { id: 'teams', name: 'Teams', href: '/app/teams', icon: Users },
  { id: 'users', name: 'Users', href: '/app/users', icon: Users, adminOrHR: true },
  { id: 'working-area', name: 'Working Area', href: '/app/working-area', icon: BriefcaseBusiness },
  { id: 'qr-scanner', name: 'QR Scanner', href: '/app/qr-scanner', icon: QrCode },
  { id: 'notifications', name: 'Notifications', href: '/app/notifications', icon: Bell },
  { id: 'settings', name: 'Settings', href: '/app/settings', icon: Settings },
  { id: 'profile', name: 'Profile', href: '/app/profile', icon: UserCircle },
  { id: 'calls', name: 'Calls', href: '/app/teams', icon: Video },
]

export function Layout({ children }: { children?: ReactNode }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = useMemo(() => NAV_ITEMS.filter(item => {
    if (item.adminOnly) return user?.role === 'admin'
    if (item.adminOrHR) return user?.role === 'admin' || user?.role === 'hr'
    return true
  }), [user?.role])

  const content = children ?? <Outlet />
  const isCallRoute = pathname.includes('/call/')

  return (
    <DashboardTabProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex min-h-screen">
          <Sidebar navItems={navItems} />
          <div className="flex min-w-0 flex-1 flex-col">
            {!isCallRoute && <Header navItems={navItems} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />}
            <main className={isCallRoute ? 'min-h-screen flex-1' : 'min-w-0 flex-1 overflow-x-hidden pb-20 lg:pb-0'}>
              {isCallRoute ? content : (
                <div data-page-content className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10">
                  {content}
                </div>
              )}
            </main>
            {!isCallRoute && <MobileBottomNav navItems={navItems} />}
          </div>
        </div>
      </div>
    </DashboardTabProvider>
  )
}

export default Layout
