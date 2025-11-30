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
  Users,
  Briefcase,
  Award,
  PieChart,
  LineChart,
  Download,
  Sparkles
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDashboardTab } from '@/context/DashboardTabContext'

interface ManagerStats {
  departmentMembers: number
  departmentAssets: number
  departmentTickets: number
  openTickets: number
  resolvedTickets: number
  inProgressTickets: number
  ticketGrowthPercentage: number
  resolutionRate: number
  departmentName: string
}

export default function ManagerDashboard() {
  const { user, company } = useAuth()
  const navigate = useNavigate()
  const { activeTab, setActiveTab } = useDashboardTab()
  const [stats, setStats] = useState<ManagerStats>({
    departmentMembers: 0,
    departmentAssets: 0,
    departmentTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    inProgressTickets: 0,
    ticketGrowthPercentage: 0,
    resolutionRate: 0,
    departmentName: ''
  })
  const [assets, setAssets] = useState<Asset[]>([])
  const [tickets, setTickets] = useState<Tickets[]>([])
  const [departmentMembers, setDepartmentMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const managerTabs = ['overview', 'tickets', 'assets', 'members'] as const
  const normalizedTab = (managerTabs as readonly string[]).includes(activeTab) ? activeTab : managerTabs[0]

  useEffect(() => {
    if (activeTab !== normalizedTab) {
      setActiveTab(normalizedTab)
    }
  }, [activeTab, normalizedTab, setActiveTab])

  useEffect(() => {
    if (!user?.company_id) {
      console.error('Manager Dashboard: No company_id found for user')
      setError('Unable to load dashboard. Company information is missing.')
      setLoading(false)
      return
    }

    console.log('Manager Dashboard: Loading data for user:', user.id, 'company:', user.company_id)
    fetchData()

    const channels = [
      supabase.channel('manager_departments_changes')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'departments',
            filter: `manager_id=eq.${user.id}`
          },
          () => {
            console.log('Manager Dashboard: Department changed, refreshing data')
            fetchData()
          }
        )
        .subscribe(),
      
      supabase.channel('manager_assets_changes')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'assets',
            filter: `company_id=eq.${user.company_id}`
          },
          () => {
            console.log('Manager Dashboard: Assets changed, refreshing data')
            fetchData()
          }
        )
        .subscribe(),
      
      supabase.channel('manager_tickets_changes')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'tickets',
            filter: `company_id=eq.${user.company_id}`
          },
          () => {
            console.log('Manager Dashboard: Tickets changed, refreshing data')
            fetchData()
          }
        )
        .subscribe()
    ]

    return () => {
      console.log('Manager Dashboard: Cleaning up subscriptions')
      channels.forEach(channel => supabase.removeChannel(channel))
    }
  }, [user?.id, user?.company_id])

  const fetchData = async () => {
    if (!user?.company_id || !user?.id) {
      console.error('Manager Dashboard: Cannot fetch data without user info')
      setError('User information is missing')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('Manager Dashboard: Fetching data for manager:', user.id)

      // First, get the department this manager manages
      const { data: departmentData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('manager_id', user.id)
        .eq('company_id', user.company_id)
        .single()

      if (deptError && deptError.code !== 'PGRST116') {
        console.error('Manager Dashboard: Error fetching department:', deptError)
        throw new Error(`Failed to fetch department: ${deptError.message}`)
      }

      const department = departmentData

      // If no department, manager can still see company-wide data
      const departmentId = department?.id

      // Fetch department members (users in the department)
      let membersQuery = supabase
        .from('users')
        .select('*')
        .eq('company_id', user.company_id)
      
      if (departmentId) {
        membersQuery = membersQuery.eq('department_id', departmentId)
      }

      const { data: membersData, error: membersError } = await membersQuery

      if (membersError) {
        console.error('Manager Dashboard: Error fetching department members:', membersError)
        throw new Error(`Failed to fetch department members: ${membersError.message}`)
      }

      const members = membersData || []
      const memberIds = members.map(m => m.id)

      // Fetch department assets (assets assigned to department members)
      let assetsQuery = supabase
        .from('assets')
        .select('*')
        .eq('company_id', user.company_id)
      
      if (memberIds.length > 0) {
        assetsQuery = assetsQuery.in('assigned_to', memberIds)
      } else {
        assetsQuery = assetsQuery.is('assigned_to', null)
      }

      const { data: assetsData, error: assetsError } = await assetsQuery.order('created_at', { ascending: false })

      if (assetsError) {
        console.error('Manager Dashboard: Error fetching assets:', assetsError)
        throw new Error(`Failed to fetch assets: ${assetsError.message}`)
      }

      // Fetch department tickets (tickets created by or assigned to department members)
      let departmentTickets: any[] = []
      
      if (departmentId) {
        // If manager has a department, fetch tickets by department
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('tickets')
          .select(`
            *,
            asset:asset_id(name, serial_number),
            assignee:assigned_to(full_name),
            creator:created_by(full_name)
          `)
          .eq('company_id', user.company_id)
          .eq('department_id', departmentId)
          .order('created_at', { ascending: false })

        if (ticketsError) {
          console.error('Manager Dashboard: Error fetching tickets:', ticketsError)
          throw new Error(`Failed to fetch tickets: ${ticketsError.message}`)
        }
        
        departmentTickets = ticketsData || []
      } else if (memberIds.length > 0) {
        // Fetch tickets created by or assigned to department members
        const [createdTickets, assignedTickets] = await Promise.all([
          supabase
            .from('tickets')
            .select(`
              *,
              asset:asset_id(name, serial_number),
              assignee:assigned_to(full_name),
              creator:created_by(full_name)
            `)
            .eq('company_id', user.company_id)
            .in('created_by', memberIds)
            .order('created_at', { ascending: false }),
          
          supabase
            .from('tickets')
            .select(`
              *,
              asset:asset_id(name, serial_number),
              assignee:assigned_to(full_name),
              creator:created_by(full_name)
            `)
            .eq('company_id', user.company_id)
            .in('assigned_to', memberIds)
            .order('created_at', { ascending: false })
        ])
        
        if (createdTickets.error) {
          console.error('Manager Dashboard: Error fetching created tickets:', createdTickets.error)
          throw new Error(`Failed to fetch tickets: ${createdTickets.error.message}`)
        }
        if (assignedTickets.error) {
          console.error('Manager Dashboard: Error fetching assigned tickets:', assignedTickets.error)
          throw new Error(`Failed to fetch tickets: ${assignedTickets.error.message}`)
        }
        
        // Combine and deduplicate tickets
        const allTickets = [...(createdTickets.data || []), ...(assignedTickets.data || [])]
        departmentTickets = Array.from(new Map(allTickets.map(t => [t.id, t])).values())
      }

      const departmentAssets = assetsData || []

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      
      const recentTickets = departmentTickets.filter(t => new Date(t.created_at) > thirtyDaysAgo).length
      const previousTickets = departmentTickets.filter(t => {
        const createdAt = new Date(t.created_at)
        return createdAt > sixtyDaysAgo && createdAt <= thirtyDaysAgo
      }).length
      
      const ticketGrowthPercentage = previousTickets > 0 
        ? Math.round(((recentTickets - previousTickets) / previousTickets) * 100)
        : recentTickets > 0 ? 100 : 0

      const resolvedCount = departmentTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
      const resolutionRate = departmentTickets.length > 0 
        ? Math.round((resolvedCount / departmentTickets.length) * 100)
        : 0

      setDepartmentMembers(members)
      setAssets(departmentAssets)
      setTickets(departmentTickets)

      setStats({
        departmentMembers: members.length,
        departmentAssets: departmentAssets.length,
        departmentTickets: departmentTickets.length,
        openTickets: departmentTickets.filter(t => t.status === 'open').length,
        resolvedTickets: resolvedCount,
        inProgressTickets: departmentTickets.filter(t => t.status === 'in_progress').length,
        ticketGrowthPercentage,
        resolutionRate,
        departmentName: department?.name || 'No Department Assigned'
      })
    } catch (error: any) {
      console.error('Manager Dashboard: Error fetching data:', error)
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
      case 'urgent':
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
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold dark:text-white text-slate-900">Dashboard</h1>
            <Badge className="bg-purple-100 text-purple-800 border-0 px-2 lg:px-3 py-1 text-xs lg:text-sm">
              <Briefcase className="h-3 w-3 mr-1" />
              Manager
            </Badge>
          </div>
          <p className="text-xs sm:text-sm lg:text-base dark:text-white/80 text-slate-500">
            Welcome back, <span className="font-medium dark:text-white text-slate-700">{user?.full_name}</span>
          </p>
          {stats.departmentName && (
            <p className="text-xs dark:text-white/70 text-slate-500">
              <span className="font-medium dark:text-white text-slate-700">{stats.departmentName}</span>
            </p>
          )}
        </div>

        {company && (
          <div className="text-right">
            <p className="text-xs sm:text-sm font-medium dark:text-white text-slate-900">{company.name}</p>
            <p className="text-xs dark:text-white/70 text-slate-500 mt-1">
              {stats.departmentMembers} members • {stats.departmentAssets} assets • {stats.departmentTickets} tickets
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
          <TabsTrigger value="tickets" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm text-foreground">
            <Ticket className="h-4 w-4 mr-2" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="assets" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm text-foreground">
            <Package className="h-4 w-4 mr-2" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm text-foreground">
            <Users className="h-4 w-4 mr-2" />
            Members
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 lg:space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 text-white">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl" />
              <div className="relative p-3 sm:p-4">
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm dark:text-white/80 text-slate-300 font-medium">Team Members</p>
                  <h3 className="text-xl sm:text-2xl font-bold dark:text-white text-white">{stats.departmentMembers}</h3>
                  <p className="text-xs dark:text-white/60 text-slate-400">In your department</p>
                </div>
              </div>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600 dark:from-blue-700 dark:via-blue-600 dark:to-blue-700 text-white">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl" />
              <div className="relative p-3 sm:p-4">
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm dark:text-white/80 text-blue-100 font-medium">Assets</p>
                  <h3 className="text-xl sm:text-2xl font-bold dark:text-white text-white">{stats.departmentAssets}</h3>
                  <p className="text-xs dark:text-white/60 text-blue-100">Managed in department</p>
                </div>
              </div>
            </Card>

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
              <div className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center gap-3 mb-4 lg:mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900">Manager Shortcuts</h3>
                    <p className="text-xs lg:text-sm text-slate-500">Lead faster with favorites</p>
                  </div>
                </div>
                <div className="space-y-2 lg:space-y-3">
                  <Button 
                    onClick={() => navigate('/app/users')}
                    className="w-full justify-start h-12 md:h-auto md:py-3 px-4 rounded-xl hover:bg-slate-50 border border-slate-200"
                    variant="ghost"
                  >
                    <Users className="h-4 w-4 mr-3 text-slate-600" />
                    <div className="flex-1 text-left hidden sm:block">
                      <div className="font-medium text-slate-900 text-xs sm:text-sm">Review Department</div>
                      <div className="text-xs text-slate-500">See everyone in your department</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Button>
                  <Button 
                    onClick={() => navigate('/app/assets')}
                    className="w-full justify-start h-12 md:h-auto md:py-3 px-4 rounded-xl hover:bg-slate-50 border border-slate-200"
                    variant="ghost"
                  >
                    <Package className="h-4 w-4 mr-3 text-slate-600" />
                    <div className="flex-1 text-left hidden sm:block">
                      <div className="font-medium text-slate-900 text-xs sm:text-sm">Assign Assets</div>
                      <div className="text-xs text-slate-500">Track laptops & equipment</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Button>
                  <Button 
                    onClick={() => navigate('/app/tickets')}
                    className="w-full justify-start h-12 md:h-auto md:py-3 px-4 rounded-xl hover:bg-slate-50 border border-slate-200"
                    variant="ghost"
                  >
                    <Ticket className="h-4 w-4 mr-3 text-slate-600" />
                    <div className="flex-1 text-left hidden sm:block">
                      <div className="font-medium text-slate-900 text-xs sm:text-sm">Monitor Tickets</div>
                      <div className="text-xs text-slate-500">Balance workloads & priorities</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow lg:col-span-2">
              <div className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between gap-2 lg:gap-3 mb-4 lg:mb-6 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <LineChart className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900">Department Performance</h3>
                      <p className="text-xs lg:text-sm text-slate-500">Key metrics at a glance</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-lg text-xs sm:text-sm h-10">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:gap-4">
                  <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <PieChart className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                      <span className="text-xs font-medium text-slate-600">Ticket Volume</span>
                    </div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-1">
                      {stats.departmentTickets}
                    </div>
                    <div className="text-xs text-slate-500">
                      {stats.openTickets} open • {stats.resolvedTickets} resolved
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600" />
                      <span className="text-xs font-medium text-slate-600">In Progress</span>
                    </div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-1">
                      {stats.inProgressTickets}
                    </div>
                    <div className="text-xs text-slate-500">
                      Tickets currently being worked on
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                      <span className="text-xs font-medium text-slate-600">Assets / Member</span>
                    </div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-1">
                      {stats.departmentMembers ? (stats.departmentAssets / stats.departmentMembers).toFixed(1) : '0'} 
                    </div>
                    <div className="text-xs text-slate-500">
                      Average assets issued per department member
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                      <span className="text-xs font-medium text-slate-600">Resolution Rate</span>
                    </div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-1">{stats.resolutionRate}%</div>
                    <div className="text-xs text-slate-500">Closed vs total tickets</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Activity Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <Card className="border-slate-200 shadow-md">
              <div className="p-3 sm:p-4 lg:p-6 border-b border-slate-200">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                      <Ticket className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900">Recent Department Tickets</h3>
                      <p className="text-xs lg:text-sm text-slate-500">Latest requests from your department</p>
                    </div>
                  </div>
                  <Button 
                    className="bg-slate-900 hover:bg-slate-800 rounded-lg text-xs sm:text-sm h-10"
                    size="sm"
                    onClick={() => navigate('/app/tickets')}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </div>
              </div>
              <div className="p-3 sm:p-4 lg:p-6">
                {tickets.length === 0 ? (
                  <div className="text-center py-4 lg:py-6">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Ticket className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500">No department tickets yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 lg:space-y-3">
                    {tickets.slice(0, 4).map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-3 sm:p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => navigate(`/app/tickets/${ticket.id}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 text-xs sm:text-sm truncate">{ticket.title}</div>
                            <div className="text-xs text-slate-500 line-clamp-1">{ticket.description}</div>
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
                          <p className="text-xs text-slate-500 truncate">Assigned to {ticket.assignee.full_name}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-slate-200 shadow-md">
              <div className="p-3 sm:p-4 lg:p-6 border-b border-slate-200">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900">Department Assets</h3>
                      <p className="text-xs lg:text-sm text-slate-500">Most recent assignments</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-lg text-xs sm:text-sm h-10"
                    onClick={() => navigate('/app/assets')}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    View All
                  </Button>
                </div>
              </div>
              <div className="p-3 sm:p-4 lg:p-6">
                {assets.length === 0 ? (
                  <div className="text-center py-4 lg:py-6">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Package className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500">No assets assigned to your department</p>
                  </div>
                ) : (
                  <div className="space-y-2 lg:space-y-3">
                    {assets.slice(0, 4).map((asset) => (
                      <div
                        key={asset.id}
                        className="p-3 sm:p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => navigate(`/app/assets/${asset.id}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 text-xs sm:text-sm truncate">{asset.name}</div>
                            <div className="text-xs text-slate-500 truncate">{asset.serial_number}</div>
                          </div>
                          <Badge className={`text-xs ${getAssetStatusColor(asset.status)}`}>
                            {asset.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{asset.category || 'Uncategorized asset'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets">
          <Card className="border-slate-200">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between p-3 sm:p-4 lg:p-6 border-b border-slate-200">
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm lg:text-lg font-semibold text-slate-900">Department Tickets</h3>
                <p className="text-xs lg:text-sm text-slate-500">
                  {stats.departmentTickets} tickets • {stats.openTickets} open • {stats.resolvedTickets} resolved
                </p>
              </div>
              <Button 
                onClick={() => navigate('/app/tickets')}
                className="bg-slate-900 hover:bg-slate-800 rounded-lg h-11 lg:h-10 w-full lg:w-auto text-xs sm:text-sm"
              >
                <Plus className="h-4 w-4 mr-1 lg:mr-2" />
                View All Tickets
              </Button>
            </div>
            <div className="p-3 sm:p-4 lg:p-6">
              {tickets.length === 0 ? (
                <div className="text-center py-8 lg:py-12">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-100 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-3 lg:mb-4">
                    <Ticket className="h-6 w-6 lg:h-8 lg:w-8 text-slate-400" />
                  </div>
                  <h3 className="text-xs sm:text-sm lg:text-lg font-semibold text-slate-900 mb-1 lg:mb-2">No department tickets</h3>
                  <p className="text-xs sm:text-sm text-slate-500">No tickets have been created by your department yet</p>
                </div>
              ) : (
                <div className="space-y-2 lg:space-y-4">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-3 sm:p-4 lg:p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                      onClick={() => navigate(`/app/tickets/${ticket.id}`)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <div className="flex items-start justify-between mb-2 lg:mb-3 gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 text-xs sm:text-sm lg:text-base mb-1 lg:mb-2">
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

        {/* Assets Tab */}
        <TabsContent value="assets">
          <Card className="border-slate-200">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-4 lg:p-6 border-b border-slate-200">
              <div className="space-y-1">
                <h3 className="text-base lg:text-lg font-semibold text-slate-900">Department Assets</h3>
                <p className="text-xs lg:text-sm text-slate-500">
                  {stats.departmentAssets} assets assigned to your department
                </p>
              </div>
            </div>
            <div className="p-4 lg:p-6">
              {assets.length === 0 ? (
                <div className="text-center py-8 lg:py-12">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-100 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-3 lg:mb-4">
                    <Package className="h-6 w-6 lg:h-8 lg:w-8 text-slate-400" />
                  </div>
                  <h3 className="text-base lg:text-lg font-semibold text-slate-900 mb-1 lg:mb-2">No department assets</h3>
                  <p className="text-sm text-slate-500">No assets are assigned to your department members yet</p>
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

        {/* Members Tab */}
        <TabsContent value="members">
          <Card className="border-slate-200">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-4 lg:p-6 border-b border-slate-200">
              <div className="space-y-1">
                <h3 className="text-base lg:text-lg font-semibold text-slate-900">Department Members</h3>
                <p className="text-xs lg:text-sm text-slate-500">
                  {stats.departmentMembers} members in your department
                </p>
              </div>
            </div>
            <div className="p-4 lg:p-6">
              {departmentMembers.length === 0 ? (
                <div className="text-center py-8 lg:py-12">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-100 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-3 lg:mb-4">
                    <Users className="h-6 w-6 lg:h-8 lg:w-8 text-slate-400" />
                  </div>
                  <h3 className="text-base lg:text-lg font-semibold text-slate-900 mb-1 lg:mb-2">No department members</h3>
                  <p className="text-sm text-slate-500">No members are assigned to your department yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                  {departmentMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-4 lg:p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center gap-3 mb-2 lg:mb-3">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm lg:text-base">
                          {member.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-sm lg:text-base truncate">
                            {member.full_name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{member.email}</div>
                        </div>
                      </div>
                      {member.role && (
                        <Badge className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                          {member.role}
                        </Badge>
                      )}
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

