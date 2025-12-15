import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase, Asset, Tickets } from '@/lib/supabase'
import Loader from '@/components/Loader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Package, 
  Ticket, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Activity,
  Target,
  Clock,
  ArrowUpRight,
  Plus,
  Eye,
  AlertTriangle,
  Award,
  PieChart,
  LineChart,
  Download,
  Sparkles,
  Users
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDashboardTab } from '@/context/DashboardTabContext'

interface EmployeeStats {
  totalAssets: number
  totalTickets: number
  openTickets: number
  resolvedTickets: number
  inProgressTickets: number
  ticketGrowthPercentage: number
  resolutionRate: number
}

export default function EmployeeDashboard() {
  const { user, company } = useAuth()
  const navigate = useNavigate()
  const { activeTab, setActiveTab } = useDashboardTab()
  const [stats, setStats] = useState<EmployeeStats>({
    totalAssets: 0,
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    inProgressTickets: 0,
    ticketGrowthPercentage: 0,
    resolutionRate: 0
  })
  const [assets, setAssets] = useState<Asset[]>([])
  const [tickets, setTickets] = useState<Tickets[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const employeeTabs = ['overview', 'assets', 'tickets'] as const
  const normalizedTab = (employeeTabs as readonly string[]).includes(activeTab) ? activeTab : employeeTabs[0]

  useEffect(() => {
    if (activeTab !== normalizedTab) {
      setActiveTab(normalizedTab)
    }
  }, [activeTab, normalizedTab, setActiveTab])

  useEffect(() => {
    if (!user?.company_id) {
      console.error('Employee Dashboard: No company_id found for user')
      setError('Unable to load dashboard. Company information is missing.')
      setLoading(false)
      return
    }

    console.log('Employee Dashboard: Loading data for user:', user.id, 'company:', user.company_id)
    fetchData()

    const channels = [
      supabase.channel('employee_assets_changes')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'assets',
            filter: `assigned_to=eq.${user.id}`
          },
          () => {
            console.log('Employee Dashboard: Assets changed, refreshing data')
            fetchData()
          }
        )
        .subscribe(),
      
      supabase.channel('employee_tickets_changes')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'tickets',
            filter: `created_by=eq.${user.id}`
          },
          () => {
            console.log('Employee Dashboard: Tickets changed, refreshing data')
            fetchData()
          }
        )
        .subscribe()
    ]

    return () => {
      console.log('Employee Dashboard: Cleaning up subscriptions')
      channels.forEach(channel => supabase.removeChannel(channel))
    }
  }, [user?.id, user?.company_id])

  const fetchData = async () => {
    if (!user?.company_id || !user?.id) {
      console.error('Employee Dashboard: Cannot fetch data without user info')
      setError('User information is missing')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('Employee Dashboard: Fetching data for user:', user.id)

      const [assetsRes, ticketsRes] = await Promise.all([
        supabase
          .from('assets')
          .select('*')
          .eq('assigned_to', user.id)
          .eq('company_id', user.company_id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('tickets')
          .select(`
            *,
            asset:asset_id(name, serial_number),
            assignee:assigned_to(full_name)
          `)
          .eq('created_by', user.id)
          .eq('company_id', user.company_id)
          .order('created_at', { ascending: false })
      ])

      if (assetsRes.error) {
        console.error('Employee Dashboard: Error fetching assets:', assetsRes.error)
        throw new Error(`Failed to fetch assets: ${assetsRes.error.message}`)
      }
      if (ticketsRes.error) {
        console.error('Employee Dashboard: Error fetching tickets:', ticketsRes.error)
        throw new Error(`Failed to fetch tickets: ${ticketsRes.error.message}`)
      }

      const myAssets = assetsRes.data || []
      const myTickets = ticketsRes.data || []

      const invalidAssets = myAssets.filter(a => 
        a.company_id !== user.company_id || a.assigned_to !== user.id
      )
      const invalidTickets = myTickets.filter(t => 
        t.company_id !== user.company_id || t.created_by !== user.id
      )
      
      if (invalidAssets.length > 0 || invalidTickets.length > 0) {
        console.error('Employee Dashboard: Data leak detected!', {
          invalidAssets: invalidAssets.length,
          invalidTickets: invalidTickets.length
        })
        throw new Error('Data integrity check failed')
      }

      console.log('Employee Dashboard: Data fetched successfully', {
        assets: myAssets.length,
        tickets: myTickets.length
      })

      setAssets(myAssets)
      setTickets(myTickets)

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      
      const recentTickets = myTickets.filter(t => new Date(t.created_at) > thirtyDaysAgo).length
      const previousTickets = myTickets.filter(t => {
        const createdAt = new Date(t.created_at)
        return createdAt > sixtyDaysAgo && createdAt <= thirtyDaysAgo
      }).length
      
      const ticketGrowthPercentage = previousTickets > 0 
        ? Math.round(((recentTickets - previousTickets) / previousTickets) * 100)
        : recentTickets > 0 ? 100 : 0

      const resolvedCount = myTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
      const resolutionRate = myTickets.length > 0 
        ? Math.round((resolvedCount / myTickets.length) * 100)
        : 0

      setStats({
        totalAssets: myAssets.length,
        totalTickets: myTickets.length,
        openTickets: myTickets.filter(t => t.status === 'open').length,
        resolvedTickets: resolvedCount,
        inProgressTickets: myTickets.filter(t => t.status === 'in_progress').length,
        ticketGrowthPercentage,
        resolutionRate
      })
    } catch (error: any) {
      console.error('Employee Dashboard: Error fetching data:', error)
      setError(error.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'resolved':
      case 'closed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      default:
        return 'bg-[hsl(var(--muted))] text-slate-800 border-[hsl(var(--border))]'
    }
  }

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'low':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      default:
        return 'bg-[hsl(var(--muted))] text-slate-800 border-[hsl(var(--border))]'
    }
  }

  const getAssetStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'assigned':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'maintenance':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'retired':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-[hsl(var(--muted))] text-slate-800 border-[hsl(var(--border))]'
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
          <h3 className="text-base lg:text-lg font-semibold text-[hsl(var(--foreground))]">Unable to load dashboard</h3>
          <p className="text-sm lg:text-base text-[hsl(var(--muted-foreground))] mt-2 max-w-md">{error}</p>
          <Button onClick={fetchData} className="mt-4 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] h-11 lg:h-10">
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
          <h3 className="text-base lg:text-lg font-semibold text-[hsl(var(--foreground))]">Company information missing</h3>
          <p className="text-sm lg:text-base text-[hsl(var(--muted-foreground))] mt-2">Your account is not associated with a company.</p>
          <p className="text-sm lg:text-base text-[hsl(var(--muted-foreground))]">Please contact support.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 lg:space-y-2">
          <div className="flex items-center gap-2 lg:gap-3 mb-1 lg:mb-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold dark:text-[hsl(var(--card-foreground))] text-[hsl(var(--foreground))]">My Dashboard</h1>
            <Badge className="bg-blue-100 text-blue-800 border-0 px-2 lg:px-3 py-1 text-xs lg:text-sm">
              Employee
            </Badge>
          </div>
          <p className="text-xs sm:text-sm lg:text-base dark:text-[hsl(var(--card-foreground))]/80 text-[hsl(var(--muted-foreground))]">
            Welcome back, <span className="font-medium dark:text-[hsl(var(--card-foreground))] text-[hsl(var(--muted-foreground))]">{user?.full_name}</span>
          </p>
        </div>

        {company && (
          <div className="text-right">
            <p className="text-xs sm:text-sm font-medium dark:text-[hsl(var(--card-foreground))] text-[hsl(var(--foreground))]">{company.name}</p>
            <p className="text-xs dark:text-[hsl(var(--card-foreground))]/70 text-[hsl(var(--muted-foreground))] mt-1">
              {stats.totalAssets} assets • {stats.totalTickets} tickets
            </p>
          </div>
        )}
      </div>

     
      {/* Main Content Tabs */}
      <Tabs value={normalizedTab} onValueChange={setActiveTab} className="space-y-4 lg:space-y-6">
        <TabsList className="hidden">
          <TabsTrigger value="overview" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm text-foreground">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="assets" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm text-foreground">
            <Package className="h-4 w-4 mr-2" />
            My Assets
          </TabsTrigger>
          <TabsTrigger value="tickets" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm text-foreground">
            <Ticket className="h-4 w-4 mr-2" />
            My Tickets
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 lg:space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Card variant="glass" className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[hsla(0,0%,100%,0.1)] rounded-full -mr-12 -mt-12 blur-2xl" />
              <div className="relative p-3 sm:p-4">
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] font-medium">My Tickets</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">{stats.totalTickets}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">All requests submitted</p>
                </div>
              </div>
            </Card>

            <Card variant="glass" className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[hsla(0,0%,100%,0.1)] rounded-full -mr-12 -mt-12 blur-2xl" />
              <div className="relative p-3 sm:p-4">
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] font-medium">My Assets</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">{stats.totalAssets}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Assigned to me</p>
                </div>
              </div>
            </Card>

            <Card variant="glass" className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[hsla(0,0%,100%,0.1)] rounded-full -mr-12 -mt-12 blur-2xl" />
              <div className="relative p-3 sm:p-4">
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] font-medium">Active Tickets</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">{stats.openTickets + stats.inProgressTickets}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{stats.resolvedTickets} resolved</p>
                </div>
              </div>
            </Card>

            <Card variant="glass" className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[hsla(0,0%,100%,0.1)] rounded-full -mr-12 -mt-12 blur-2xl" />
              <div className="relative p-3 sm:p-4">
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] font-medium">Resolution Rate</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">{stats.resolutionRate}%</h3>
                  <p className="text-xs dark:text-[hsl(var(--card-foreground))]/60 text-emerald-100">Ticket resolution efficiency</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions & Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card variant="glass" className="hover:shadow-lg transition-all">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-[hsl(var(--card-foreground))]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Quick Actions</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Stay productive from here</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Button 
                    onClick={() => navigate('/app/assets')}
                    className="w-full justify-start h-12 md:h-auto md:py-3 px-4 rounded-xl hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))]"
                    variant="ghost"
                  >
                    <Package className="h-4 w-4 mr-3 text-[hsl(var(--muted-foreground))]" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-[hsl(var(--foreground))] text-xs sm:text-sm">Review My Assets</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">Inspect assigned equipment</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Button>
                  <Button 
                    onClick={() => navigate('/app/tickets/new')}
                    className="w-full justify-start h-12 md:h-auto md:py-3 px-4 rounded-xl hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))]"
                    variant="ghost"
                  >
                    <Plus className="h-4 w-4 mr-3 text-[hsl(var(--muted-foreground))]" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-[hsl(var(--foreground))] text-sm">Open Support Ticket</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">Report an issue instantly</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Button>
                  <Button 
                    onClick={() => navigate('/app/tickets')}
                    className="w-full justify-start h-12 md:h-auto md:py-3 px-4 rounded-xl hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))]"
                    variant="ghost"
                  >
                    <Ticket className="h-4 w-4 mr-3 text-[hsl(var(--muted-foreground))]" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-[hsl(var(--foreground))] text-sm">Track Requests</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">Follow every update</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Button>
                  <Button 
                    onClick={() => navigate('/app/profile')}
                    className="w-full justify-start h-12 md:h-auto md:py-3 px-4 rounded-xl hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))]"
                    variant="ghost"
                  >
                    <Activity className="h-4 w-4 mr-3 text-[hsl(var(--muted-foreground))]" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-[hsl(var(--foreground))] text-sm">Attendance & Profile</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">Clock-in guidance & details</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Performance Insights */}
            <Card className="border-[hsl(var(--border))] shadow-md hover:shadow-lg transition-shadow lg:col-span-2">
              <div className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between gap-3 mb-4 lg:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center flex-shrink-0">
                      <LineChart className="h-4 sm:h-5 w-4 sm:w-5 text-[hsl(var(--card-foreground))]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-[hsl(var(--foreground))] dark:text-[hsl(var(--card-foreground))] truncate">Performance Snapshot</h3>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] dark:text-slate-400 hidden sm:block">How your workstreams look today</p>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 dark:bg-blue-900 dark:hover:bg-blue-800 text-[hsl(var(--card-foreground))] border-0 h-9 px-2 sm:px-3"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1 text-xs">Export</span>
                  </Button>
                </div>
                <div className="space-y-3 lg:space-y-4">
                  {/* First Row */}
                  <div className="flex items-center gap-3 p-3 lg:p-4 rounded-lg border border-[hsl(var(--border))] dark:border-slate-700 bg-[hsl(var(--card))]/50 dark:bg-[hsl(var(--primary))]/30">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                        <PieChart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] dark:text-slate-400 truncate">Ticket Trend</p>
                        <p className="text-lg lg:text-xl font-bold text-[hsl(var(--foreground))] dark:text-[hsl(var(--card-foreground))]">
                          {stats.ticketGrowthPercentage >= 0 ? '+' : ''}{stats.ticketGrowthPercentage}%
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] dark:text-slate-400 text-right whitespace-nowrap flex-shrink-0">
                      vs last 30 days
                    </p>
                  </div>

                  {/* Second Row */}
                  <div className="flex items-center gap-3 p-3 lg:p-4 rounded-lg border border-[hsl(var(--border))] dark:border-slate-700 bg-[hsl(var(--card))]/50 dark:bg-[hsl(var(--primary))]/30">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0">
                        <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] dark:text-slate-400 truncate">Active Tickets</p>
                        <p className="text-lg lg:text-xl font-bold text-[hsl(var(--foreground))] dark:text-[hsl(var(--card-foreground))]">
                          {stats.openTickets + stats.inProgressTickets}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] dark:text-slate-400 text-right whitespace-nowrap flex-shrink-0">
                      {stats.openTickets} waiting
                    </p>
                  </div>

                  {/* Third Row */}
                  <div className="flex items-center gap-3 p-3 lg:p-4 rounded-lg border border-[hsl(var(--border))] dark:border-slate-700 bg-[hsl(var(--card))]/50 dark:bg-[hsl(var(--primary))]/30">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                        <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] dark:text-slate-400 truncate">Asset Coverage</p>
                        <p className="text-lg lg:text-xl font-bold text-[hsl(var(--foreground))] dark:text-[hsl(var(--card-foreground))]">
                          {stats.totalAssets > 0 ? stats.totalAssets : 'None'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] dark:text-slate-400 text-right whitespace-nowrap flex-shrink-0">
                      assigned to you
                    </p>
                  </div>

                  {/* Fourth Row */}
                  <div className="flex items-center gap-3 p-3 lg:p-4 rounded-lg border border-[hsl(var(--border))] dark:border-slate-700 bg-[hsl(var(--card))]/50 dark:bg-[hsl(var(--primary))]/30">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                        <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] dark:text-slate-400 truncate">Resolution Rate</p>
                        <p className="text-lg lg:text-xl font-bold text-[hsl(var(--foreground))] dark:text-[hsl(var(--card-foreground))]">{stats.resolutionRate}%</p>
                      </div>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] dark:text-slate-400 text-right whitespace-nowrap flex-shrink-0">
                      success rate
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Activity Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-[hsl(var(--border))] shadow-md">
              <div className="p-4 lg:p-6 border-b border-[hsl(var(--border))]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                      <Package className="h-5 w-5 text-[hsl(var(--card-foreground))]" />
                    </div>
                    <div>
                      <h3 className="text-base lg:text-lg font-semibold text-[hsl(var(--foreground))]">Recent Assets</h3>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Latest equipment assigned to you</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-lg"
                    onClick={() => navigate('/app/assets')}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    View All
                  </Button>
                </div>
              </div>
              <div className="p-4 lg:p-6">
                {assets.length === 0 ? (
                  <div className="text-center py-6 lg:py-8">
                    <div className="w-12 h-12 bg-[hsl(var(--muted))] rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Package className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">No assets assigned yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assets.slice(0, 4).map((asset) => (
                      <div
                        key={asset.id}
                        className="p-4 rounded-xl border border-[hsl(var(--border))] hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => navigate(`/app/assets/${asset.id}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[hsl(var(--foreground))] text-sm lg:text-base truncate">{asset.name}</div>
                            <div className="text-xs text-[hsl(var(--muted-foreground))] truncate">{asset.serial_number}</div>
                          </div>
                          <Badge className={`text-xs ${getAssetStatusColor(asset.status)}`}>
                            {asset.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{asset.category || 'Uncategorized asset'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-[hsl(var(--border))] shadow-md">
              <div className="p-4 lg:p-6 border-b border-[hsl(var(--border))]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                      <Ticket className="h-5 w-5 text-[hsl(var(--card-foreground))]" />
                    </div>
                    <div>
                      <h3 className="text-base lg:text-lg font-semibold text-[hsl(var(--foreground))]">Recent Tickets</h3>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Follow the latest updates</p>
                    </div>
                  </div>
                  <Button 
                    className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] rounded-lg"
                    size="sm"
                    onClick={() => navigate('/app/tickets/new')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Ticket
                  </Button>
                </div>
              </div>
              <div className="p-4 lg:p-6">
                {tickets.length === 0 ? (
                  <div className="text-center py-6 lg:py-8">
                    <div className="w-12 h-12 bg-[hsl(var(--muted))] rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Ticket className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">No tickets submitted yet</p>
                    <Button 
                      size="sm"
                      onClick={() => navigate('/app/tickets/new')}
                      className="mt-3 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Ticket
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.slice(0, 4).map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-4 rounded-xl border border-[hsl(var(--border))] hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => navigate(`/app/tickets/${ticket.id}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[hsl(var(--foreground))] text-sm lg:text-base truncate">{ticket.title}</div>
                            <div className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-1">{ticket.description}</div>
                          </div>
                          <div className="flex flex-col gap-1 ml-3">
                            <Badge className={`text-xs ${getStatusBadgeColor(ticket.status)}`}>
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                            <Badge className={`text-xs ${getPriorityBadgeColor(ticket.priority)}`}>
                              {ticket.priority}
                            </Badge>
                          </div>
                        </div>
                        {ticket.assignee && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">Assigned to {ticket.assignee.full_name}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets">
          <Card className="border-[hsl(var(--border))]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-3 sm:p-4 lg:p-6 border-b border-[hsl(var(--border))]">
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-[hsl(var(--foreground))]">My Assets</h3>
                <p className="text-xs lg:text-sm text-[hsl(var(--muted-foreground))]">
                  {stats.totalAssets} assets assigned to you
                </p>
              </div>
            </div>
            <div className="p-3 sm:p-4 lg:p-6">
              {assets.length === 0 ? (
                <div className="text-center py-8 lg:py-12">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-[hsl(var(--muted))] rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-3 lg:mb-4">
                    <Package className="h-6 w-6 lg:h-8 lg:w-8 text-slate-400" />
                  </div>
                  <h3 className="text-base lg:text-lg font-semibold text-[hsl(var(--foreground))] mb-1 lg:mb-2">No assets assigned</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">You don't have any assets assigned yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-4 lg:p-5 rounded-xl border border-[hsl(var(--border))] hover:border-slate-300 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                      onClick={() => navigate(`/app/assets/${asset.id}`)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <div className="flex items-start justify-between mb-2 lg:mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-[hsl(var(--foreground))] text-sm lg:text-base mb-1 truncate">
                              {asset.name}
                            </div>
                            <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1 lg:mb-2 truncate">
                              {asset.serial_number}
                            </div>
                          </div>
                          <Badge className={`text-xs ${getAssetStatusColor(asset.status)} flex-shrink-0 ml-2`}>
                            {asset.status}
                          </Badge>
                        </div>
                        <div className="text-xs lg:text-sm text-[hsl(var(--muted-foreground))] mb-2 lg:mb-3 truncate">
                          {asset.category || 'Uncategorized'}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full rounded-lg hover:bg-[hsl(var(--muted))] h-8 lg:h-9"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/app/assets/${asset.id}`)
                          }}
                        >
                          <Eye className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                          <span className="text-xs lg:text-sm">View Details</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets">
          <Card className="border-[hsl(var(--border))]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-3 sm:p-4 lg:p-6 border-b border-[hsl(var(--border))]">
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-[hsl(var(--foreground))]">My Tickets</h3>
                <p className="text-xs lg:text-sm text-[hsl(var(--muted-foreground))]">
                  {stats.totalTickets} tickets • {stats.openTickets} open • {stats.resolvedTickets} resolved
                </p>
              </div>
              <Button 
                onClick={() => navigate('/app/tickets/new')}
                className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] rounded-lg h-11 lg:h-10 w-full lg:w-auto"
              >
                <Plus className="h-4 w-4 mr-1 lg:mr-2" />
                <span className="text-sm">New Ticket</span>
              </Button>
            </div>
            <div className="p-3 sm:p-4 lg:p-6">
              {tickets.length === 0 ? (
                <div className="text-center py-8 lg:py-12">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-[hsl(var(--muted))] rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-3 lg:mb-4">
                    <Ticket className="h-6 w-6 lg:h-8 lg:w-8 text-slate-400" />
                  </div>
                  <h3 className="text-base lg:text-lg font-semibold text-[hsl(var(--foreground))] mb-1 lg:mb-2">No tickets submitted yet</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4 lg:mb-6">Create your first support ticket to get started</p>
                  <Button 
                    onClick={() => navigate('/app/tickets/new')}
                    className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] h-11 lg:h-10"
                  >
                    <Plus className="h-4 w-4 mr-1 lg:mr-2" />
                    <span className="text-sm">Create Your First Ticket</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 lg:space-y-4">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-4 lg:p-5 rounded-xl border border-[hsl(var(--border))] hover:border-slate-300 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                      onClick={() => navigate(`/app/tickets/${ticket.id}`)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <div className="flex items-start justify-between mb-2 lg:mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-[hsl(var(--foreground))] text-sm lg:text-base mb-1 lg:mb-2">
                              {ticket.title}
                            </div>
                            <div className="text-xs lg:text-sm text-[hsl(var(--muted-foreground))] mb-2 lg:mb-3 line-clamp-2">
                              {ticket.description}
                            </div>
                            {ticket.asset && (
                              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1 lg:mb-2 truncate">
                                Asset: {ticket.asset.name} ({ticket.asset.serial_number})
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 lg:gap-2 ml-2 lg:ml-4 flex-shrink-0">
                            <Badge className={`text-xs ${getStatusBadgeColor(ticket.status)}`}>
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                            {ticket.priority && (
                              <Badge className={`text-xs ${getPriorityBadgeColor(ticket.priority)}`}>
                                {ticket.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pt-2 lg:pt-3 border-t border-slate-100 gap-2 lg:gap-0">
                          <span className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                            {ticket.assignee ? `Assigned to: ${ticket.assignee.full_name}` : 'Unassigned'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg hover:bg-[hsl(var(--muted))] h-8 lg:h-9 w-full lg:w-auto"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/app/tickets/${ticket.id}`)
                            }}
                          >
                            <Eye className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                            <span className="text-xs lg:text-sm">View</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}