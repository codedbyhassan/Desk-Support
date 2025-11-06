import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import UsersTable from '@/components/dashboard/UsersTable'
import AssetsInventory from '@/components/dashboard/AssetsInventory'
import ReportsPanel from '@/components/dashboard/ReportsPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
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
  Plus
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

export default function AdminDashboard() {
  const { user, company } = useAuth()
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-10 w-10 lg:h-12 lg:w-12 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-sm lg:text-base text-slate-500">Loading dashboard...</p>
      </div>
    )
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
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Dashboard</h1>
            {user?.role === 'admin' && (
              <Badge className="bg-slate-900 text-white border-0 px-2 lg:px-3 py-1 text-xs lg:text-sm">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>
          <p className="text-sm lg:text-base text-slate-500">
            Welcome back, <span className="font-medium text-slate-700">{user?.full_name}</span>
          </p>
        </div>

        {company && (
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">{company.name}</p>
            <p className="text-xs text-slate-500 mt-1">
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
            <Button variant="outline" size="sm" className="bg-white border-amber-300 text-amber-900 hover:bg-amber-50 flex-shrink-0 h-9 lg:h-10 text-xs lg:text-sm">
              Upgrade
            </Button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Total Users */}
        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <div className="p-3 lg:p-6">
            <div className="flex items-start justify-between mb-2 lg:mb-4">
              <div className="w-8 h-8 lg:w-12 lg:h-12 bg-slate-900 rounded-lg lg:rounded-xl flex items-center justify-center">
                <Users className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 lg:h-8 lg:w-8 rounded-lg">
                <ArrowUpRight className="h-3 w-3 lg:h-4 lg:w-4 text-slate-400" />
              </Button>
            </div>
            <div>
              <p className="text-xs lg:text-sm font-medium text-slate-500 mb-1">Total Users</p>
              <h3 className="text-xl lg:text-3xl font-bold text-slate-900">{stats.totalUsers}</h3>
              <div className="mt-2 lg:mt-3 flex items-center gap-1 lg:gap-2">
                {stats.userGrowthPercentage >= 0 ? (
                  <>
                    <div className="flex items-center gap-1 text-emerald-600">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-[10px] lg:text-xs font-semibold">{stats.userGrowthPercentage}%</span>
                    </div>
                    <span className="text-[10px] lg:text-xs text-slate-500">vs last month</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1 text-red-600">
                      <TrendingDown className="h-3 w-3" />
                      <span className="text-[10px] lg:text-xs font-semibold">{Math.abs(stats.userGrowthPercentage)}%</span>
                    </div>
                    <span className="text-[10px] lg:text-xs text-slate-500">vs last month</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Total Assets */}
        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <div className="p-3 lg:p-6">
            <div className="flex items-start justify-between mb-2 lg:mb-4">
              <div className="w-8 h-8 lg:w-12 lg:h-12 bg-blue-500 rounded-lg lg:rounded-xl flex items-center justify-center">
                <Package className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 lg:h-8 lg:w-8 rounded-lg">
                <ArrowUpRight className="h-3 w-3 lg:h-4 lg:w-4 text-slate-400" />
              </Button>
            </div>
            <div>
              <p className="text-xs lg:text-sm font-medium text-slate-500 mb-1">Total Assets</p>
              <h3 className="text-xl lg:text-3xl font-bold text-slate-900">{stats.totalAssets}</h3>
              <div className="mt-2 lg:mt-3 flex items-center gap-1 lg:gap-2">
                <div className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="text-[10px] lg:text-xs font-semibold">{stats.availableAssets} available</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Active Tickets */}
        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <div className="p-3 lg:p-6">
            <div className="flex items-start justify-between mb-2 lg:mb-4">
              <div className="w-8 h-8 lg:w-12 lg:h-12 bg-amber-500 rounded-lg lg:rounded-xl flex items-center justify-center">
                <Ticket className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 lg:h-8 lg:w-8 rounded-lg">
                <ArrowUpRight className="h-3 w-3 lg:h-4 lg:w-4 text-slate-400" />
              </Button>
            </div>
            <div>
              <p className="text-xs lg:text-sm font-medium text-slate-500 mb-1">Active Tickets</p>
              <h3 className="text-xl lg:text-3xl font-bold text-slate-900">{stats.openTickets + stats.inProgressTickets}</h3>
              <div className="mt-2 lg:mt-3 flex items-center gap-1 lg:gap-2">
                {stats.openTickets > 0 ? (
                  <>
                    <div className="flex items-center gap-1 text-amber-600">
                      <Clock className="h-3 w-3" />
                      <span className="text-[10px] lg:text-xs font-semibold">{stats.openTickets} pending</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      <span className="text-[10px] lg:text-xs font-semibold">All handled</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Resolution Rate */}
        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <div className="p-3 lg:p-6">
            <div className="flex items-start justify-between mb-2 lg:mb-4">
              <div className="w-8 h-8 lg:w-12 lg:h-12 bg-emerald-500 rounded-lg lg:rounded-xl flex items-center justify-center">
                <Target className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 lg:h-8 lg:w-8 rounded-lg">
                <ArrowUpRight className="h-3 w-3 lg:h-4 lg:w-4 text-slate-400" />
              </Button>
            </div>
            <div>
              <p className="text-xs lg:text-sm font-medium text-slate-500 mb-1">Resolution Rate</p>
              <h3 className="text-xl lg:text-3xl font-bold text-slate-900">{stats.resolutionRate}%</h3>
              <div className="mt-2 lg:mt-3 flex items-center gap-1 lg:gap-2">
                {stats.resolutionRate >= 90 ? (
                  <>
                    <div className="flex items-center gap-1 text-emerald-600">
                      <Zap className="h-3 w-3" />
                      <span className="text-[10px] lg:text-xs font-semibold">Excellent</span>
                    </div>
                  </>
                ) : stats.resolutionRate >= 70 ? (
                  <>
                    <div className="flex items-center gap-1 text-amber-600">
                      <Activity className="h-3 w-3" />
                      <span className="text-[10px] lg:text-xs font-semibold">Good</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      <span className="text-[10px] lg:text-xs font-semibold">Needs work</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4 lg:space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-lg lg:rounded-xl w-full overflow-x-auto">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs lg:text-sm flex-1 min-w-0">
            <BarChart3 className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
            <span className="truncate">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs lg:text-sm flex-1 min-w-0">
            <Users className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
            <span className="truncate">Users</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs lg:text-sm flex-1 min-w-0">
            <Package className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
            <span className="truncate">Assets</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 lg:space-y-6">
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
            <Card className="border-slate-200">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-4 lg:p-6 border-b border-slate-200">
                <h3 className="text-base lg:text-lg font-semibold text-slate-900">Performance Overview</h3>
                <Button variant="outline" size="sm" className="rounded-lg h-9 lg:h-10 w-full lg:w-auto">
                  <TrendingUp className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                  <span className="text-xs lg:text-sm">View Report</span>
                </Button>
              </div>
              <ReportsPanel />
            </Card>

            <Card className="border-slate-200">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-4 lg:p-6 border-b border-slate-200">
                <h3 className="text-base lg:text-lg font-semibold text-slate-900">Asset Distribution</h3>
                <Button variant="outline" size="sm" className="rounded-lg h-9 lg:h-10 w-full lg:w-auto">
                  <Package className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                  <span className="text-xs lg:text-sm">Manage</span>
                </Button>
              </div>
              <AssetsInventory />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <Card className="border-slate-200">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-4 lg:p-6 border-b border-slate-200">
              <div className="space-y-1">
                <h3 className="text-base lg:text-lg font-semibold text-slate-900">Users Management</h3>
                <p className="text-xs lg:text-sm text-slate-500">
                  {stats.totalUsers} users in {company?.name}
                </p>
              </div>
              <Button className="bg-slate-900 hover:bg-slate-800 rounded-lg h-11 lg:h-10 w-full lg:w-auto">
                <UserPlus className="h-4 w-4 mr-1 lg:mr-2" />
                <span className="text-sm">Add User</span>
              </Button>
            </div>
            <UsersTable />
          </Card>
        </TabsContent>

        <TabsContent value="assets">
          <Card className="border-slate-200">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-4 lg:p-6 border-b border-slate-200">
              <div className="space-y-1">
                <h3 className="text-base lg:text-lg font-semibold text-slate-900">Assets Inventory</h3>
                <p className="text-xs lg:text-sm text-slate-500">
                  {stats.totalAssets} assets • {stats.availableAssets} available • {stats.assignedAssets} assigned
                </p>
              </div>
              <Button className="bg-slate-900 hover:bg-slate-800 rounded-lg h-11 lg:h-10 w-full lg:w-auto">
                <Plus className="h-4 w-4 mr-1 lg:mr-2" />
                <span className="text-sm">Add Asset</span>
              </Button>
            </div>
            <AssetsInventory fullView />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}