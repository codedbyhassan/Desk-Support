import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase, Asset, Tickets } from '@/lib/supabase'
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
  AlertTriangle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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
        return 'bg-slate-100 text-slate-800 border-slate-200'
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
        return 'bg-slate-100 text-slate-800 border-slate-200'
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
        return 'bg-slate-100 text-slate-800 border-slate-200'
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
          <Button onClick={fetchData} className="mt-4 bg-slate-900 hover:bg-slate-800 h-11 lg:h-10">
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

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 lg:space-y-2">
          <div className="flex items-center gap-2 lg:gap-3 mb-1 lg:mb-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">My Dashboard</h1>
            <Badge className="bg-blue-100 text-blue-800 border-0 px-2 lg:px-3 py-1 text-xs lg:text-sm">
              Employee
            </Badge>
          </div>
          <p className="text-sm lg:text-base text-slate-500">
            Welcome back, <span className="font-medium text-slate-700">{user?.full_name}</span>
          </p>
        </div>

        {company && (
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">{company.name}</p>
            <p className="text-xs text-slate-500 mt-1">
              {stats.totalAssets} assets • {stats.totalTickets} tickets
            </p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* My Assets */}
        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <div className="p-3 lg:p-6">
            <div className="flex items-start justify-between mb-2 lg:mb-4">
              <div className="w-8 h-8 lg:w-12 lg:h-12 bg-slate-900 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                <Package className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 lg:h-8 lg:w-8 rounded-lg">
                <ArrowUpRight className="h-3 w-3 lg:h-4 lg:w-4 text-slate-400" />
              </Button>
            </div>
            <div>
              <p className="text-xs lg:text-sm font-medium text-slate-500 mb-1">My Assets</p>
              <h3 className="text-xl lg:text-3xl font-bold text-slate-900">{stats.totalAssets}</h3>
              <div className="mt-2 lg:mt-3 flex items-center gap-1 lg:gap-2">
                <div className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="text-[10px] lg:text-xs font-semibold">Assigned to you</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Total Tickets */}
        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <div className="p-3 lg:p-6">
            <div className="flex items-start justify-between mb-2 lg:mb-4">
              <div className="w-8 h-8 lg:w-12 lg:h-12 bg-blue-500 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Ticket className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 lg:h-8 lg:w-8 rounded-lg">
                <ArrowUpRight className="h-3 w-3 lg:h-4 lg:w-4 text-slate-400" />
              </Button>
            </div>
            <div>
              <p className="text-xs lg:text-sm font-medium text-slate-500 mb-1">Total Tickets</p>
              <h3 className="text-xl lg:text-3xl font-bold text-slate-900">{stats.totalTickets}</h3>
              <div className="mt-2 lg:mt-3 flex items-center gap-1 lg:gap-2">
                {stats.ticketGrowthPercentage >= 0 ? (
                  <>
                    <div className="flex items-center gap-1 text-emerald-600">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-[10px] lg:text-xs font-semibold">{stats.ticketGrowthPercentage}%</span>
                    </div>
                    <span className="text-[10px] lg:text-xs text-slate-500">vs last month</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1 text-red-600">
                      <TrendingDown className="h-3 w-3" />
                      <span className="text-[10px] lg:text-xs font-semibold">{Math.abs(stats.ticketGrowthPercentage)}%</span>
                    </div>
                    <span className="text-[10px] lg:text-xs text-slate-500">vs last month</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Active Tickets */}
        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <div className="p-3 lg:p-6">
            <div className="flex items-start justify-between mb-2 lg:mb-4">
              <div className="w-8 h-8 lg:w-12 lg:h-12 bg-amber-500 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <AlertCircle className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
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
              <div className="w-8 h-8 lg:w-12 lg:h-12 bg-emerald-500 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
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
            <Activity className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
            <span className="truncate">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs lg:text-sm flex-1 min-w-0">
            <Package className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
            <span className="truncate">My Assets</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs lg:text-sm flex-1 min-w-0">
            <Ticket className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
            <span className="truncate">My Tickets</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 lg:space-y-6">
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
            {/* Recent Assets */}
            <Card className="border-slate-200">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-4 lg:p-6 border-b border-slate-200">
                <div className="space-y-1">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-900">My Recent Assets</h3>
                  <p className="text-xs lg:text-sm text-slate-500">{stats.totalAssets} assets assigned</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-lg h-9 lg:h-10 w-full lg:w-auto"
                  onClick={() => navigate('/app/assets')}
                >
                  <span className="text-xs lg:text-sm">View All</span>
                </Button>
              </div>
              <div className="p-4 lg:p-6">
                {assets.length === 0 ? (
                  <div className="text-center py-6 lg:py-8">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-slate-100 rounded-lg lg:rounded-xl flex items-center justify-center mx-auto mb-2 lg:mb-3">
                      <Package className="h-5 w-5 lg:h-6 lg:w-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">No assets assigned yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 lg:space-y-3">
                    {assets.slice(0, 3).map((asset) => (
                      <div
                        key={asset.id}
                        className="p-3 lg:p-4 rounded-lg lg:rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => navigate(`/app/assets/${asset.id}`)}
                      >
                        <div className="flex items-start justify-between mb-1 lg:mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 text-sm lg:text-base mb-1 truncate">{asset.name}</div>
                            <div className="text-xs text-slate-500 truncate">{asset.serial_number}</div>
                          </div>
                          <Badge className={`text-xs ${getAssetStatusColor(asset.status)}`}>
                            {asset.status}
                          </Badge>
                        </div>
                        <div className="text-xs lg:text-sm text-slate-600 truncate">{asset.category}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Recent Tickets */}
            <Card className="border-slate-200">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-4 lg:p-6 border-b border-slate-200">
                <div className="space-y-1">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-900">Recent Tickets</h3>
                  <p className="text-xs lg:text-sm text-slate-500">
                    {stats.openTickets} open • {stats.resolvedTickets} resolved
                  </p>
                </div>
                <Button 
                  className="bg-slate-900 hover:bg-slate-800 rounded-lg h-11 lg:h-10 w-full lg:w-auto"
                  size="sm"
                  onClick={() => navigate('/app/tickets/new')}
                >
                  <Plus className="h-4 w-4 mr-1 lg:mr-2" />
                  <span className="text-sm">New Ticket</span>
                </Button>
              </div>
              <div className="p-4 lg:p-6">
                {tickets.length === 0 ? (
                  <div className="text-center py-6 lg:py-8">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-slate-100 rounded-lg lg:rounded-xl flex items-center justify-center mx-auto mb-2 lg:mb-3">
                      <Ticket className="h-5 w-5 lg:h-6 lg:w-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500 mb-2 lg:mb-3">No tickets submitted yet</p>
                    <Button 
                      size="sm"
                      onClick={() => navigate('/app/tickets/new')}
                      className="bg-slate-900 hover:bg-slate-800 h-9 lg:h-10"
                    >
                      <Plus className="h-4 w-4 mr-1 lg:mr-2" />
                      <span className="text-sm">Create Your First Ticket</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 lg:space-y-3">
                    {tickets.slice(0, 3).map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-3 lg:p-4 rounded-lg lg:rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => navigate(`/app/tickets/${ticket.id}`)}
                      >
                        <div className="flex items-start justify-between mb-1 lg:mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 text-sm lg:text-base mb-1 truncate">{ticket.title}</div>
                            <div className="text-xs text-slate-500 mb-1 lg:mb-2 line-clamp-1">
                              {ticket.description}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 ml-2 lg:ml-3">
                            <Badge className={`text-xs ${getStatusBadgeColor(ticket.status)}`}>
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                            <Badge className={`text-xs ${getPriorityBadgeColor(ticket.priority)}`}>
                              {ticket.priority}
                            </Badge>
                          </div>
                        </div>
                        {ticket.assignee && (
                          <div className="text-xs text-slate-500 truncate">
                            Assigned to: {ticket.assignee.full_name}
                          </div>
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
          <Card className="border-slate-200">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-4 lg:p-6 border-b border-slate-200">
              <div className="space-y-1">
                <h3 className="text-base lg:text-lg font-semibold text-slate-900">My Assets</h3>
                <p className="text-xs lg:text-sm text-slate-500">
                  {stats.totalAssets} assets assigned to you
                </p>
              </div>
            </div>
            <div className="p-4 lg:p-6">
              {assets.length === 0 ? (
                <div className="text-center py-8 lg:py-12">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-100 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-3 lg:mb-4">
                    <Package className="h-6 w-6 lg:h-8 lg:w-8 text-slate-400" />
                  </div>
                  <h3 className="text-base lg:text-lg font-semibold text-slate-900 mb-1 lg:mb-2">No assets assigned</h3>
                  <p className="text-sm text-slate-500">You don't have any assets assigned yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-4 lg:p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                      onClick={() => navigate(`/app/assets/${asset.id}`)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <div className="flex items-start justify-between mb-2 lg:mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 text-sm lg:text-base mb-1 truncate">
                              {asset.name}
                            </div>
                            <div className="text-xs text-slate-500 mb-1 lg:mb-2 truncate">
                              {asset.serial_number}
                            </div>
                          </div>
                          <Badge className={`text-xs ${getAssetStatusColor(asset.status)} flex-shrink-0 ml-2`}>
                            {asset.status}
                          </Badge>
                        </div>
                        <div className="text-xs lg:text-sm text-slate-600 mb-2 lg:mb-3 truncate">
                          {asset.category || 'Uncategorized'}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full rounded-lg hover:bg-slate-100 h-8 lg:h-9"
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
          <Card className="border-slate-200">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-4 lg:p-6 border-b border-slate-200">
              <div className="space-y-1">
                <h3 className="text-base lg:text-lg font-semibold text-slate-900">My Tickets</h3>
                <p className="text-xs lg:text-sm text-slate-500">
                  {stats.totalTickets} tickets • {stats.openTickets} open • {stats.resolvedTickets} resolved
                </p>
              </div>
              <Button 
                onClick={() => navigate('/app/tickets/new')}
                className="bg-slate-900 hover:bg-slate-800 rounded-lg h-11 lg:h-10 w-full lg:w-auto"
              >
                <Plus className="h-4 w-4 mr-1 lg:mr-2" />
                <span className="text-sm">New Ticket</span>
              </Button>
            </div>
            <div className="p-4 lg:p-6">
              {tickets.length === 0 ? (
                <div className="text-center py-8 lg:py-12">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-100 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-3 lg:mb-4">
                    <Ticket className="h-6 w-6 lg:h-8 lg:w-8 text-slate-400" />
                  </div>
                  <h3 className="text-base lg:text-lg font-semibold text-slate-900 mb-1 lg:mb-2">No tickets submitted yet</h3>
                  <p className="text-sm text-slate-500 mb-4 lg:mb-6">Create your first support ticket to get started</p>
                  <Button 
                    onClick={() => navigate('/app/tickets/new')}
                    className="bg-slate-900 hover:bg-slate-800 h-11 lg:h-10"
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
                      className="p-4 lg:p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                      onClick={() => navigate(`/app/tickets/${ticket.id}`)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <div className="flex items-start justify-between mb-2 lg:mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 text-sm lg:text-base mb-1 lg:mb-2">
                              {ticket.title}
                            </div>
                            <div className="text-xs lg:text-sm text-slate-600 mb-2 lg:mb-3 line-clamp-2">
                              {ticket.description}
                            </div>
                            {ticket.asset && (
                              <div className="text-xs text-slate-500 mb-1 lg:mb-2 truncate">
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
                          <span className="text-xs text-slate-500 truncate">
                            {ticket.assignee ? `Assigned to: ${ticket.assignee.full_name}` : 'Unassigned'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg hover:bg-slate-100 h-8 lg:h-9 w-full lg:w-auto"
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