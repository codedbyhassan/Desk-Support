import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Loader from '@/components/Loader'
import UsersTable from '@/components/dashboard/UsersTable'
import AssetsInventory from '@/components/dashboard/AssetsInventory'
import ReportsPanel from '@/components/dashboard/ReportsPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { useAttendance } from '@/hooks/useAttendance'
import { useToast } from '@/hooks/use-toast'
import { useDashboardTab } from '@/context/DashboardTabContext'
import { 
  Users, 
  Package, 
  Ticket, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  Shield,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  Target,
  Clock,
  UserPlus,
  Plus,
  FileText,
  Download,
  Sparkles,
  Award,
  PieChart,
  LineChart,
  LogIn,
  LogOut
} from 'lucide-react'

interface DashboardStats {
  totalUsers: number
  totalAssets: number
  totalTickets: number
  openTickets: number
  resolvedTickets: number
  inProgressTickets: number
  availableAssets: number
  assignedAssets: number
  userGrowthPercentage: number
  resolutionRate: number
}

interface AdminDashboardProps {
  activeTab?: string
}

export default function AdminDashboard({ activeTab: initialTab = 'overview' }: AdminDashboardProps) {
  const { user, company } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { attendanceStatus, fetchAttendanceStatus } = useAttendance()
  const { activeTab: mainTab, setActiveTab: setMainTab } = useDashboardTab()
  
  useEffect(() => {
    fetchAttendanceStatus()
  }, [fetchAttendanceStatus])
  
  // Update main tab when prop changes (from route)
  useEffect(() => {
    if (initialTab) {
      setMainTab(initialTab)
    }
  }, [initialTab, setMainTab])
  
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAssets: 0,
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    inProgressTickets: 0,
    availableAssets: 0,
    assignedAssets: 0,
    userGrowthPercentage: 0,
    resolutionRate: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.company_id) {
      console.error('Dashboard: No company_id found for user')
      setError('Unable to load dashboard. Company information is missing.')
      setLoading(false)
      return
    }

    console.log('Dashboard: Loading data for company:', user.company_id)
    fetchStats()

    const channels = [
      supabase.channel('admin_users_changes')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'users',
            filter: `company_id=eq.${user.company_id}`
          },
          () => {
            console.log('Dashboard: Users changed, refreshing stats')
            fetchStats()
          }
        )
        .subscribe(),
      
      supabase.channel('admin_assets_changes')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'assets',
            filter: `company_id=eq.${user.company_id}`
          },
          () => {
            console.log('Dashboard: Assets changed, refreshing stats')
            fetchStats()
          }
        )
        .subscribe(),
      
      supabase.channel('admin_tickets_changes')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'tickets',
            filter: `company_id=eq.${user.company_id}`
          },
          () => {
            console.log('Dashboard: Tickets changed, refreshing stats')
            fetchStats()
          }
        )
        .subscribe()
    ]

    return () => {
      console.log('Dashboard: Cleaning up subscriptions')
      channels.forEach(channel => supabase.removeChannel(channel))
    }
  }, [user?.company_id])

  const fetchStats = async () => {
    if (!user?.company_id) {
      console.error('Dashboard: Cannot fetch stats without company_id')
      setError('Company information is missing')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('Dashboard: Fetching stats for company:', user.company_id)

      const [usersRes, assetsRes, ticketsRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, created_at', { count: 'exact' })
          .eq('company_id', user.company_id),
        
        supabase
          .from('assets')
          .select('id, status, assigned_to, company_id')
          .eq('company_id', user.company_id),
        
        supabase
          .from('tickets')
          .select('id, status, created_at, resolved_at, company_id')
          .eq('company_id', user.company_id)
      ])

      if (usersRes.error) {
        console.error('Dashboard: Error fetching users:', usersRes.error)
        throw new Error(`Failed to fetch users: ${usersRes.error.message}`)
      }
      if (assetsRes.error) {
        console.error('Dashboard: Error fetching assets:', assetsRes.error)
        throw new Error(`Failed to fetch assets: ${assetsRes.error.message}`)
      }
      if (ticketsRes.error) {
        console.error('Dashboard: Error fetching tickets:', ticketsRes.error)
        throw new Error(`Failed to fetch tickets: ${ticketsRes.error.message}`)
      }

      const users = usersRes.data || []
      const assets = assetsRes.data || []
      const tickets = ticketsRes.data || []

      const invalidAssets = assets.filter(a => a.company_id !== user.company_id)
      const invalidTickets = tickets.filter(t => t.company_id !== user.company_id)
      
      if (invalidAssets.length > 0 || invalidTickets.length > 0) {
        console.error('Dashboard: Data leak detected!', {
          invalidAssets: invalidAssets.length,
          invalidTickets: invalidTickets.length
        })
        throw new Error('Data integrity check failed')
      }

      console.log('Dashboard: Stats fetched successfully', {
        users: users.length,
        assets: assets.length,
        tickets: tickets.length
      })

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      
      const recentUsers = users.filter(u => new Date(u.created_at) > thirtyDaysAgo).length
      const previousUsers = users.filter(u => {
        const createdAt = new Date(u.created_at)
        return createdAt > sixtyDaysAgo && createdAt <= thirtyDaysAgo
      }).length
      
      const userGrowthPercentage = previousUsers > 0 
        ? Math.round(((recentUsers - previousUsers) / previousUsers) * 100)
        : recentUsers > 0 ? 100 : 0

      const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
      const resolutionRate = tickets.length > 0 
        ? Math.round((resolvedCount / tickets.length) * 100)
        : 0

      setStats({
        totalUsers: users.length,
        totalAssets: assets.length,
        totalTickets: tickets.length,
        openTickets: tickets.filter(t => t.status === 'open').length,
        resolvedTickets: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
        inProgressTickets: tickets.filter(t => t.status === 'in_progress').length,
        availableAssets: assets.filter(a => a.status === 'available').length,
        assignedAssets: assets.filter(a => a.assigned_to !== null).length,
        userGrowthPercentage,
        resolutionRate
      })
    } catch (error: any) {
     console.error('Dashboard: Error fetching stats:', error)
      setError(error.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loader />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="w-12 h-12 lg:w-16 lg:h-16 bg-red-50 rounded-xl lg:rounded-2xl flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 lg:h-8 lg:w-8 text-red-500" />
        </div>
        <div className="text-center">
          <h3 className="text-base lg:text-lg font-semibold text-slate-900">Unable to load dashboard</h3>
          <p className="text-sm lg:text-base text-slate-500 mt-2 max-w-md">{error}</p>
          <Button onClick={fetchStats} className="mt-4 bg-slate-900 hover:bg-slate-800 h-11 lg:h-10">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!user?.company_id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="w-12 h-12 lg:w-16 lg:h-16 bg-amber-50 rounded-xl lg:rounded-2xl flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 lg:h-8 lg:w-8 text-amber-500" />
        </div>
        <div className="text-center">
          <h3 className="text-base lg:text-lg font-semibold text-slate-900">Company information missing</h3>
          <p className="text-sm lg:text-base text-slate-500 mt-2">Your account is not associated with a company.</p>
          <p className="text-sm lg:text-base text-slate-500">Please contact support.</p>
        </div>
      </div>
    )
  }

  const approachingUserLimit = company && stats.totalUsers >= company.max_users * 0.8
  const approachingAssetLimit = company && stats.totalAssets >= company.max_assets * 0.8

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 lg:space-y-2">
          <div className="flex items-center gap-2 lg:gap-3 mb-1 lg:mb-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold dark:text-white text-slate-900">Dashboard</h1>
            {user?.role === 'admin' && (
              <Badge className="bg-slate-900 text-white border-0 px-2 lg:px-3 py-1 text-xs lg:text-sm">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm lg:text-base dark:text-white/80 text-slate-500">
            Welcome back, <span className="font-medium dark:text-white text-slate-700">{user?.full_name}</span>
          </p>
        </div>

        {company && (
          <div className="text-right">
            <p className="text-xs sm:text-sm font-medium dark:text-white text-slate-900">{company.name}</p>
            <p className="text-xs dark:text-white/70 text-slate-500 mt-1">
              {stats.totalUsers} / {company.max_users} users • {stats.totalAssets} / {company.max_assets} assets
            </p>
          </div>
        )}
      </div>

      {/* Warning Banner */}
      {(approachingUserLimit || approachingAssetLimit) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl lg:rounded-2xl p-3 lg:p-4">
          <div className="flex items-start gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-amber-100 rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-4 w-4 lg:h-5 lg:w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-amber-900 text-sm lg:text-base">Approaching Plan Limits</h3>
              <div className="mt-1 text-xs lg:text-sm text-amber-700 space-y-1">
                {approachingUserLimit && (
                  <p className="truncate">• You're using {stats.totalUsers} of {company?.max_users} user slots</p>
                )}
                {approachingAssetLimit && (
                  <p className="truncate">• You're using {stats.totalAssets} of {company?.max_assets} asset slots</p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" className="bg-white border-amber-300 text-amber-900 hover:bg-amber-50 flex-shrink-0 h-10 md:h-9 text-xs lg:text-sm">
              Upgrade
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-4 lg:space-y-6">
        <TabsList className="hidden">
          <TabsTrigger value="overview" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm text-foreground">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm text-foreground">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="assets" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm text-foreground">
            <Package className="h-4 w-4 mr-2" />
            Assets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 lg:space-y-8">
          {/* Key Performance Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {/* Total Users Card */}
            <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 text-white">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl" />
              <div className="relative p-3 sm:p-4">
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm dark:text-white/80 text-slate-300 font-medium">Total Users</p>
                  <h3 className="text-xl sm:text-2xl font-bold dark:text-white text-white">{stats.totalUsers}</h3>
                  <p className="text-xs dark:text-white/60 text-slate-400">Active team members</p>
                </div>
              </div>
            </Card>

            {/* Total Assets Card */}
            <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600 dark:from-blue-700 dark:via-blue-600 dark:to-blue-700 text-white">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl" />
              <div className="relative p-3 sm:p-4">
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm dark:text-white/80 text-blue-100 font-medium">Total Assets</p>
                  <h3 className="text-xl sm:text-2xl font-bold dark:text-white text-white">{stats.totalAssets}</h3>
                  <p className="text-xs dark:text-white/60 text-blue-100">{stats.assignedAssets} assigned</p>
                </div>
              </div>
            </Card>

            {/* Active Tickets Card */}
            <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-amber-600 via-amber-500 to-amber-600 dark:from-amber-700 dark:via-amber-600 dark:to-amber-700 text-white">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl" />
              <div className="relative p-3 sm:p-4">
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm dark:text-white/80 text-amber-100 font-medium">Active Tickets</p>
                  <h3 className="text-xl sm:text-2xl font-bold dark:text-white text-white">{stats.openTickets + stats.inProgressTickets}</h3>
                  <p className="text-xs dark:text-white/60 text-amber-100">{stats.resolvedTickets} resolved</p>
                </div>
              </div>
            </Card>

            {/* Resolution Rate Card */}
            <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-600 dark:from-emerald-700 dark:via-emerald-600 dark:to-emerald-700 text-white">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl" />
              <div className="relative p-3 sm:p-4">
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm dark:text-white/80 text-emerald-100 font-medium">Resolution Rate</p>
                  <h3 className="text-xl sm:text-2xl font-bold dark:text-white text-white">{stats.resolutionRate}%</h3>
                  <p className="text-xs dark:text-white/60 text-emerald-100">Ticket resolution efficiency</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions & Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
                    <p className="text-xs text-slate-500">Common tasks at your fingertips</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Button 
                    onClick={() => navigate('/app/users')}
                    className="w-full justify-start h-12 md:h-auto md:py-3 px-4 rounded-xl hover:bg-slate-50 border border-slate-200"
                    variant="ghost"
                  >
                    <UserPlus className="h-4 w-4 mr-3 text-slate-600" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-slate-900 text-xs sm:text-sm">Add New User</div>
                      <div className="text-xs text-slate-500">Invite team member</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Button>
                  <Button 
                    onClick={() => navigate('/app/assets')}
                    className="w-full justify-start h-12 md:h-auto md:py-3 px-4 rounded-xl hover:bg-slate-50 border border-slate-200"
                    variant="ghost"
                  >
                    <Plus className="h-4 w-4 mr-3 text-slate-600" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-slate-900 text-sm">Add Asset</div>
                      <div className="text-xs text-slate-500">Register new equipment</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Button>
                  <Button 
                    onClick={() => navigate('/app/tickets')}
                    className="w-full justify-start h-12 md:h-auto md:py-3 px-4 rounded-xl hover:bg-slate-50 border border-slate-200"
                    variant="ghost"
                  >
                    <Ticket className="h-4 w-4 mr-3 text-slate-600" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-slate-900 text-sm">View Tickets</div>
                      <div className="text-xs text-slate-500">Manage support requests</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Button>
                  <Button 
                    onClick={async () => {
                      try {
                        // For clock in/out, we need a QR code. For now, we'll use a simple toggle
                        // In a real scenario, this would open a QR scanner or use location-based check-in
                        const isClockedIn = attendanceStatus.status === 'clocked_in' || attendanceStatus.status === 'on_break'
                        if (isClockedIn) {
                          // For clock out, we'd need the QR code from the check-in
                          toast({
                            title: 'Clock Out',
                            description: 'Please use the QR code scanner in your profile to clock out.',
                            variant: 'default'
                          })
                        } else {
                          toast({
                            title: 'Clock In',
                            description: 'Please use the QR code scanner in your profile to clock in.',
                            variant: 'default'
                          })
                        }
                        navigate('/app/profile')
                      } catch (error) {
                        console.error('Error:', error)
                      }
                    }}
                    className={`w-full justify-start h-12 md:h-auto md:py-3 px-4 rounded-xl border ${
                      attendanceStatus.status === 'clocked_in' || attendanceStatus.status === 'on_break'
                        ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                        : 'hover:bg-slate-50 border-slate-200'
                    }`}
                    variant="ghost"
                  >
                    {attendanceStatus.status === 'clocked_in' || attendanceStatus.status === 'on_break' ? (
                      <LogOut className={`h-4 w-4 mr-3 ${attendanceStatus.status === 'clocked_in' ? 'text-emerald-600' : 'text-slate-600'}`} />
                    ) : (
                      <LogIn className="h-4 w-4 mr-3 text-slate-600" />
                    )}
                    <div className="flex-1 text-left">
                      <div className={`font-medium text-sm ${
                        attendanceStatus.status === 'clocked_in' || attendanceStatus.status === 'on_break'
                          ? 'text-emerald-900'
                          : 'text-slate-500'
                      }`}>
                        {attendanceStatus.status === 'clocked_in' || attendanceStatus.status === 'on_break' ? 'Clock Out' : 'Clock In'}
                      </div>
                      <div className={`text-xs ${
                        attendanceStatus.status === 'clocked_in' || attendanceStatus.status === 'on_break'
                          ? 'text-emerald-700'
                          : 'text-slate-500'
                      }`}>
                        {attendanceStatus.status === 'clocked_in' || attendanceStatus.status === 'on_break'
                          ? attendanceStatus.elapsedHours 
                            ? 'Time: ' + attendanceStatus.elapsedHours
                            : 'Currently clocked in'
                          : 'Record your attendance'}
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Performance Insights */}
            <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow lg:col-span-2">
              <div className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between gap-3 mb-4 lg:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center flex-shrink-0">
                      <LineChart className="h-4 sm:h-5 w-4 sm:w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900 dark:text-white truncate">Performance Insights</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Key metrics at a glance</p>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 dark:bg-blue-900 dark:hover:bg-blue-800 text-white border-0 h-9 px-2 sm:px-3"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1 text-xs">Export</span>
                  </Button>
                </div>
                <div className="space-y-3 lg:space-y-4">
                  {/* First Row */}
                  <div className="flex items-center gap-3 p-3 lg:p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/30">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                        <PieChart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">Asset Utilization</p>
                        <p className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white">
                          {stats.totalAssets > 0 ? Math.round((stats.assignedAssets / stats.totalAssets) * 100) : 0}%
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-right whitespace-nowrap flex-shrink-0">
                      {stats.assignedAssets}/{stats.totalAssets}
                    </p>
                  </div>

                  {/* Second Row */}
                  <div className="flex items-center gap-3 p-3 lg:p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/30">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0">
                        <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">Ticket Activity</p>
                        <p className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white">{stats.totalTickets}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-right whitespace-nowrap flex-shrink-0">
                      {stats.inProgressTickets} in progress
                    </p>
                  </div>

                  {/* Third Row */}
                  <div className="flex items-center gap-3 p-3 lg:p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/30">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                        <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">Team Growth</p>
                        <p className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white">
                          {stats.userGrowthPercentage >= 0 ? '+' : ''}{stats.userGrowthPercentage}%
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-right whitespace-nowrap flex-shrink-0">
                      vs last 30 days
                    </p>
                  </div>

                  {/* Fourth Row */}
                  <div className="flex items-center gap-3 p-3 lg:p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/30">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                        <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">Efficiency</p>
                        <p className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white">{stats.resolutionRate}%</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-right whitespace-nowrap flex-shrink-0">
                      Success rate
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Reports & Asset Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-md">
              <div className="p-4 lg:p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base lg:text-lg font-semibold text-slate-900 dark:text-white">Reports & Export</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Generate comprehensive reports</p>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    className="ml-2 flex-shrink-0 bg-blue-600 hover:bg-blue-700 dark:bg-blue-900 dark:hover:bg-blue-800 text-white border-0"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline text-sm">Export</span>
                  </Button>
                </div>
              </div>
              <div className="p-4 lg:p-6">
                <ReportsPanel noCard />
              </div>
            </Card>

            <Card className="border-slate-200 shadow-md">
              <div className="p-4 lg:p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-900 dark:to-emerald-800 flex items-center justify-center">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base lg:text-lg font-semibold text-slate-900 dark:text-white">Asset Distribution</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Overview of asset status</p>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    className="ml-2 flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-900 dark:hover:bg-emerald-800 text-white border-0"
                    onClick={() => navigate('/app/assets')}
                  >
                    <Package className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline text-sm">Manage</span>
                  </Button>
                </div>
              </div>
              <div className="p-4 lg:p-6">
                <AssetsInventory noCard />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card className="border-slate-200">
            <div className="p-3 sm:p-4 lg:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900 dark:text-white truncate">Users Management</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {stats.totalUsers} users in {company?.name}
                </p>
              </div>
              <Button className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 dark:bg-blue-900 dark:hover:bg-blue-800 text-white border-0 h-9 px-2 sm:px-3 w-full sm:w-auto">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline ml-1 text-xs">Add User</span>
              </Button>
            </div>
            <UsersTable />
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <Card className="border-slate-200">
            <div className="p-3 sm:p-4 lg:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900 dark:text-white truncate">Assets Inventory</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {stats.totalAssets} assets • {stats.availableAssets} available • {stats.assignedAssets} assigned
                </p>
              </div>
              <Button className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 dark:bg-blue-900 dark:hover:bg-blue-800 text-white border-0 h-9 px-2 sm:px-3 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline ml-1 text-xs">Add Asset</span>
              </Button>
            </div>
            <AssetsInventory fullView />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}