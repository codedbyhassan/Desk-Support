import { ReactNode, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/context/ThemeContext'
import { useNotifications } from '@/context/NotificationContext'
import { DashboardTabProvider } from '@/context/DashboardTabContext'
import { ToastContainer } from '@/components/ToastNotification'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import {
  LayoutDashboard,
  Ticket,
  Package,
  Building2,
  Users,
  User,
  Settings,
  FileText,
} from 'lucide-react'
import { NavItem } from '@/components/layout/types'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth()
  const { customTheme } = useTheme()
  const { pathname } = useLocation()
  const { toasts, dismissToast, setCurrentPath } = useNotifications()
  const [activeTicketCount, setActiveTicketCount] = useState<number>(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const primaryColor = customTheme?.primary || '#185ee0'

  useEffect(() => {
    setCurrentPath(pathname)
  }, [pathname, setCurrentPath])

  useEffect(() => {
    if (!user?.id || !user?.company_id) return

    // If user is actively viewing tickets, hide the sidebar badge
    if (pathname.startsWith('/app/tickets')) {
      setActiveTicketCount(0)
      return
    }

    fetchActiveTicketCount()

    const channel = supabase
      .channel('active-tickets-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `assigned_to=eq.${user.id}`,
        },
        () => {
          // Only update the badge when we're not on the tickets pages
          if (!pathname.startsWith('/app/tickets')) {
            fetchActiveTicketCount()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, user?.company_id, pathname])

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
      id: 'working-area',
      name: 'Files', 
      href: '/app/working-area', 
      icon: FileText,
      description: 'File management and storage'
    },
    { 
      id: 'users',
      name: 'Users', 
      href: '/app/users', 
      icon: User,
      description: 'User management',
      adminOrHR: true
    },
    { 
      id: 'settings',
      name: 'Settings', 
      href: '/app/settings', 
      icon: Settings,
      description: 'Preferences and config'
    }
  ]

  const navItems = allNavItems.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') return false
    if (item.adminOrHR && user?.role !== 'admin' && user?.role !== 'hr') return false
    return true
  })

  return (
    <DashboardTabProvider>
      <div className="min-h-screen bg-background transition-colors duration-300">
        <Sidebar navItems={navItems} primaryColor={primaryColor} />
        <Header 
          navItems={navItems}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          primaryColor={primaryColor}
        />

        <main className="lg:ml-16 pt-20 lg:pt-16 px-4 lg:px-8 py-6 lg:py-8 relative">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </DashboardTabProvider>
  )
}