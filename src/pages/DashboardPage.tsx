import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import Loader from '@/components/Loader'
import AdminDashboard from './dashboard/AdminDashboard'
import EmployeeDashboard from './dashboard/EmployeeDashboard'
import ManagerDashboard from './dashboard/ManagerDashboard'
import HRDashboard from './dashboard/HRDashboard'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const { pathname } = useLocation()
  const [pageLoading, setPageLoading] = useState(true)
  
  // Determine active tab from route - must match exactly
  const getActiveTab = () => {
    if (pathname === '/app/dashboard/users') return 'users'
    if (pathname === '/app/dashboard/assets') return 'assets'
    return 'overview'
  }
  
  const activeTab = getActiveTab()

  useEffect(() => {
    if (!authLoading) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setPageLoading(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [authLoading])
  
  // Reset loading when route changes
  useEffect(() => {
    setPageLoading(false)
  }, [pathname])

  if (pageLoading || !user) {
    return <Loader fullPage />
  }

  // Route based on user role
  if (user.role === 'admin') {
    return <AdminDashboard activeTab={activeTab} />
  }

  if (user.role === 'manager') {
    return <ManagerDashboard />
  }

  if (user.role === 'hr') {
    return <HRDashboard />
  }

  return <EmployeeDashboard />
}