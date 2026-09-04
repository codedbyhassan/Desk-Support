import { ReactNode, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useNotifications } from '@/context/NotificationContext'
import { DashboardTabProvider } from '@/context/DashboardTabContext'
import { ToastContainer } from '@/components/ToastNotification'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { LayoutDashboard, Ticket, Package, Building2, Users, User, Settings, FileText, Bell } from 'lucide-react'
import { NavItem } from '@/components/layout/types'

interface LayoutProps { children: ReactNode }

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const { toasts, dismissToast, setCurrentPath } = useNotifications()
  const [activeTicketCount, setActiveTicketCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => { setCurrentPath(pathname) }, [pathname, setCurrentPath])

  useEffect(() => {
    if (!user?.id || !user.company_id || pathname.startsWith('/app/tickets')) {
      setActiveTicketCount(0)
      return
    }
    let cancelled = false
    const fetchActiveTicketCount = async () => {
      const { data: assignments, error } = await supabase.from('ticket_assignments').select('ticket_id').eq('assignee_id', user.id).is('unassigned_at', null)
      if (cancelled || error) return
      const ids = (assignments || []).map(row => row.ticket_id)
      if (!ids.length) { setActiveTicketCount(0); return }
      const { count } = await supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('company_id', user.company_id).in('id', ids).in('status', ['open', 'in_progress'])
      if (!cancelled) setActiveTicketCount(count || 0)
    }
    fetchActiveTicketCount()
    const channel = supabase.channel(`active-ticket-badge-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_assignments' }, fetchActiveTicketCount).on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchActiveTicketCount).subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [user?.id, user?.company_id, pathname])

  const allNavItems: NavItem[] = [
    { id:'dashboard', name:'Dashboard', href:'/app/dashboard', icon:LayoutDashboard, description:'Overview and insights' },
    { id:'tickets', name:'Tickets', href:'/app/tickets', icon:Ticket, badge:activeTicketCount > 0 ? String(activeTicketCount) : undefined, description:'Manage support tickets' },
    { id:'assets', name:'Assets', href:'/app/assets', icon:Package, description:'Hardware and software' },
    { id:'departments', name:'Departments', href:'/app/departments', icon:Building2, description:'Company departments' },
    { id:'teams', name:'Teams', href:'/app/teams', icon:Users, description:'Team management' },
    { id:'working-area', name:'Files', href:'/app/workspace', icon:FileText, description:'File management and storage' },
    { id:'notifications', name:'Notifications', href:'/app/notifications', icon:Bell, description:'View all notifications' },
    { id:'users', name:'Users', href:'/app/users', icon:User, description:'User management', adminOrHR:true },
    { id:'settings', name:'Settings', href:'/app/settings', icon:Settings, description:'Preferences and config' },
  ]
  const navItems = allNavItems.filter(item => !(item.adminOnly && user?.role !== 'admin') && !(item.adminOrHR && user?.role !== 'admin' && user?.role !== 'hr'))

  return <DashboardTabProvider>
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <Sidebar navItems={navItems} />
      <div className="min-w-0">
        <Header navItems={navItems} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
        <main className="min-h-[calc(100vh-72px)] pb-24 lg:pb-10">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
      <MobileBottomNav />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  </DashboardTabProvider>
}
