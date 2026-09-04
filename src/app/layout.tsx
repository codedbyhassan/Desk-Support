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
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { LayoutDashboard, Ticket, Package, Building2, Users, User, Settings, FileText, Bell } from 'lucide-react'
import { NavItem } from '@/components/layout/types'

interface LayoutProps { children: ReactNode }

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth(); const { customTheme } = useTheme(); const { pathname } = useLocation(); const { toasts, dismissToast, setCurrentPath } = useNotifications()
  const [activeTicketCount, setActiveTicketCount] = useState(0); const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const primaryColor = customTheme?.primary || '#185ee0'

  useEffect(() => { setCurrentPath(pathname) }, [pathname, setCurrentPath])

  useEffect(() => {
    if (!user?.id || !user.company_id || pathname.startsWith('/app/tickets')) { setActiveTicketCount(0); return }
    let cancelled = false
    const fetchActiveTicketCount = async () => {
      const { data: assignments, error } = await supabase.from('ticket_assignments').select('ticket_id').eq('assignee_id', user.id).is('unassigned_at', null)
      if (cancelled || error) { if (error) console.error('Ticket badge error:', error); return }
      const ids = (assignments || []).map(row => row.ticket_id)
      if (!ids.length) { setActiveTicketCount(0); return }
      const { count, error: ticketError } = await supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('company_id', user.company_id).in('id', ids).in('status', ['open', 'in_progress'])
      if (!cancelled) setActiveTicketCount(ticketError ? 0 : count || 0)
    }
    fetchActiveTicketCount()
    const channel = supabase.channel(`active-ticket-badge-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_assignments' }, fetchActiveTicketCount).on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchActiveTicketCount).subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [user?.id, user?.company_id, pathname])

  const allNavItems: NavItem[] = [
    { id:'dashboard', name:'Dashboard', href:'/app/dashboard', icon:LayoutDashboard, description:'Overview and insights' },
    { id:'tickets', name:'Tickets', href:'/app/tickets', icon:Ticket, badge:activeTicketCount>0?String(activeTicketCount):undefined, description:'Manage support tickets' },
    { id:'assets', name:'Assets', href:'/app/assets', icon:Package, description:'Hardware and software' },
    { id:'departments', name:'Departments', href:'/app/departments', icon:Building2, description:'Company departments' },
    { id:'teams', name:'Teams', href:'/app/teams', icon:Users, description:'Team management' },
    { id:'working-area', name:'Files', href:'/app/workspace', icon:FileText, description:'File management and storage' },
    { id:'notifications', name:'Notifications', href:'/app/notifications', icon:Bell, description:'View all notifications' },
    { id:'users', name:'Users', href:'/app/users', icon:User, description:'User management', adminOrHR:true },
    { id:'settings', name:'Settings', href:'/app/settings', icon:Settings, description:'Preferences and config' },
  ]
  const navItems = allNavItems.filter(item => !(item.adminOnly && user?.role !== 'admin') && !(item.adminOrHR && user?.role !== 'admin' && user?.role !== 'hr'))

  return <DashboardTabProvider><div className="min-h-screen transition-colors duration-300 relative overflow-hidden">
    <div className="dark:hidden fixed inset-0" style={{background:'var(--bg-gradient-main)'}} /><div className="hidden dark:block fixed inset-0" style={{background:'var(--bg-gradient-main-dark)'}} />
    <div className="fixed inset-0 pointer-events-none z-0 opacity-30 dark:opacity-20" style={{background:'linear-gradient(135deg, hsl(var(--primary-100)) 0%, hsl(var(--secondary-100)) 50%, hsl(var(--primary-100)) 100%)'}} />
    <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-white/40 dark:bg-white/8 rounded-full blur-3xl pointer-events-none z-0 animate-pulse" style={{animationDuration:'8s'}} />
    <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-white/30 dark:bg-white/6 rounded-full blur-3xl pointer-events-none z-0 animate-pulse" style={{animationDuration:'10s',animationDelay:'1s'}} />
    <Sidebar navItems={navItems} primaryColor={primaryColor} /><Header navItems={navItems} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} primaryColor={primaryColor}/>
    <main className="lg:ml-16 pt-3 lg:pt-4 pb-28 lg:pb-0 px-4 lg:px-8 py-4 lg:py-6 relative z-10 overflow-hidden"><div className="dark:hidden absolute inset-0 pointer-events-none opacity-25" style={{background:'var(--bg-gradient-card)'}}/><div className="hidden dark:block absolute inset-0 pointer-events-none opacity-20" style={{background:'var(--bg-gradient-card-dark, linear-gradient(135deg, hsl(var(--primary-950)) 0%, hsl(var(--secondary-950)) 100%)'}}/><div className="relative z-10 max-w-7xl mx-auto space-y-6">{children}</div></main>
    <MobileBottomNav/><ToastContainer toasts={toasts} onDismiss={dismissToast}/>
  </div></DashboardTabProvider>
}
