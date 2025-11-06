import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import AdminDashboard from './dashboard/AdminDashboard'
import EmployeeDashboard from './dashboard/EmployeeDashboard'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setPageLoading(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [authLoading])

  if (pageLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] lg:min-h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-10 w-10 lg:h-12 lg:w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="text-sm lg:text-base text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Route based on user role
  if (user.role === 'admin') {
    return <AdminDashboard />
  }

  return <EmployeeDashboard />
}