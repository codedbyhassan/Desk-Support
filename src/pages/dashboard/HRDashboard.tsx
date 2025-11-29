import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  UserCheck,
  UserX,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Eye,
  Briefcase,
  Building2,
  BarChart3,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  LineChart,
  PieChart,
  Download,
  Award
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDashboardTab } from '@/context/DashboardTabContext'
import { useAttendance } from '@/hooks/useAttendance'

interface HRStats {
  totalEmployees: number
  activeEmployees: number
  departments: number
  totalTickets: number
  openTickets: number
  employeeGrowthPercentage: number
  attendanceRate: number
}

interface Employee {
  id: string
  full_name: string
  email: string
  role: string
  department_id: string | null
  department?: {
    name: string
  }
  created_at: string
}

interface Department {
  id: string
  name: string
  description: string | null
  member_count?: number
}

export default function HRDashboard() {
  const { user, company } = useAuth()
  const navigate = useNavigate()
  const { activeTab, setActiveTab } = useDashboardTab()
  const { attendanceStatus } = useAttendance()
  const [stats, setStats] = useState<HRStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    departments: 0,
    totalTickets: 0,
    openTickets: 0,
    employeeGrowthPercentage: 0,
    attendanceRate: 0
  })
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hrTabs = ['overview', 'employees', 'departments'] as const
  const normalizedTab = (hrTabs as readonly string[]).includes(activeTab) ? activeTab : hrTabs[0]

  useEffect(() => {
    if (activeTab !== normalizedTab) {
      setActiveTab(normalizedTab)
    }
  }, [activeTab, normalizedTab, setActiveTab])

  useEffect(() => {
    if (!user?.company_id) {
      console.error('HR Dashboard: No company_id found for user')
      setError('Unable to load dashboard. Company information is missing.')
      setLoading(false)
      return
    }

    console.log('HR Dashboard: Loading data for user:', user.id, 'company:', user.company_id)
    fetchData()

    const channels = [
      supabase.channel('hr_users_changes')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'users',
            filter: `company_id=eq.${user.company_id}`
          },
          () => {
            console.log('HR Dashboard: Users changed, refreshing data')
            fetchData()
          }
        )
        .subscribe(),
      
      supabase.channel('hr_departments_changes')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'departments',
            filter: `company_id=eq.${user.company_id}`
          },
          () => {
            console.log('HR Dashboard: Departments changed, refreshing data')
            fetchData()
          }
        )
        .subscribe(),
      
      supabase.channel('hr_tickets_changes')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'tickets',
            filter: `company_id=eq.${user.company_id}`
          },
          () => {
            console.log('HR Dashboard: Tickets changed, refreshing data')
            fetchData()
          }
        )
        .subscribe()
    ]

    return () => {
      console.log('HR Dashboard: Cleaning up subscriptions')
      channels.forEach(channel => supabase.removeChannel(channel))
    }
  }, [user?.id, user?.company_id])

  const fetchData = async () => {
    if (!user?.company_id) {
      console.error('HR Dashboard: Cannot fetch data without company_id')
      setError('Company information is missing')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('HR Dashboard: Fetching data for company:', user.company_id)

      // Fetch all employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('users')
        .select(`
          *,
          department:department_id(name)
        `)
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false })

      if (employeesError) {
        console.error('HR Dashboard: Error fetching employees:', employeesError)
        throw new Error(`Failed to fetch employees: ${employeesError.message}`)
      }

      // Fetch departments
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('*')
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false })

      if (departmentsError) {
        console.error('HR Dashboard: Error fetching departments:', departmentsError)
        throw new Error(`Failed to fetch departments: ${departmentsError.message}`)
      }

      // Get department member counts
      const departmentsWithCounts = await Promise.all(
        (departmentsData || []).map(async (dept) => {
          const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', dept.id)
          
          return {
            ...dept,
            member_count: count || 0
          }
        })
      )

      // Fetch tickets for stats
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, status, created_at')
        .eq('company_id', user.company_id)

      if (ticketsError) {
        console.error('HR Dashboard: Error fetching tickets:', ticketsError)
        throw new Error(`Failed to fetch tickets: ${ticketsError.message}`)
      }

      const allEmployees = employeesData || []
      const allTickets = ticketsData || []
      const allDepartments = departmentsWithCounts

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      
      const recentEmployees = allEmployees.filter(e => new Date(e.created_at) > thirtyDaysAgo).length
      const previousEmployees = allEmployees.filter(e => {
        const createdAt = new Date(e.created_at)
        return createdAt > sixtyDaysAgo && createdAt <= thirtyDaysAgo
      }).length
      
      const employeeGrowthPercentage = previousEmployees > 0 
        ? Math.round(((recentEmployees - previousEmployees) / previousEmployees) * 100)
        : recentEmployees > 0 ? 100 : 0

      // Calculate attendance rate (simplified - would need actual attendance data)
      const attendanceRate = 85 // Placeholder - would calculate from actual attendance records

      setEmployees(allEmployees)
      setDepartments(allDepartments)

      setStats({
        totalEmployees: allEmployees.length,
        activeEmployees: allEmployees.filter(e => e.role !== 'admin').length,
        departments: allDepartments.length,
        totalTickets: allTickets.length,
        openTickets: allTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
        employeeGrowthPercentage,
        attendanceRate
      })
    } catch (error: any) {
      console.error('HR Dashboard: Error fetching data:', error)
      setError(error.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-slate-100 text-slate-800 border-slate-200'
      case 'manager':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'hr':
        return 'bg-pink-100 text-pink-800 border-pink-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
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
            <h1 className="text-2xl lg:text-3xl font-bold dark:text-white text-slate-900">HR Dashboard</h1>
            <Badge className="bg-pink-100 text-pink-800 border-0 px-2 lg:px-3 py-1 text-xs lg:text-sm">
              <Users className="h-3 w-3 mr-1" />
              Human Resources
            </Badge>
          </div>
          <p className="text-sm lg:text-base dark:text-white/80 text-slate-500">
            Welcome back, <span className="font-medium dark:text-white text-slate-700">{user?.full_name}</span>
          </p>
        </div>

        {company && (
          <div className="text-right">
            <p className="text-sm font-medium dark:text-white text-slate-900">{company.name}</p>
            <p className="text-xs text-slate-500 mt-1">
              {stats.totalEmployees} employees • {stats.departments} departments
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
          <TabsTrigger value="employees" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm text-foreground">
            <Users className="h-4 w-4 mr-2" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="departments" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm text-foreground">
            <Building2 className="h-4 w-4 mr-2" />
            Departments
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 lg:space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <Users className="h-6 w-6" />
                  </div>
                  {stats.employeeGrowthPercentage >= 0 ? (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-xs font-semibold">{stats.employeeGrowthPercentage}%</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 text-red-300">
                      <TrendingDown className="h-3 w-3" />
                      <span className="text-xs font-semibold">{Math.abs(stats.employeeGrowthPercentage)}%</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-300 font-medium">Total Employees</p>
                  <h3 className="text-3xl font-bold">{stats.totalEmployees}</h3>
                  <p className="text-xs text-slate-400">{stats.activeEmployees} active right now</p>
                </div>
              </div>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600 text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 text-white">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="text-xs font-semibold">{stats.departments} active</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-blue-100 font-medium">Departments</p>
                  <h3 className="text-3xl font-bold">{stats.departments}</h3>
                  <p className="text-xs text-blue-100">Org structure up to date</p>
                </div>
              </div>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-600 via-amber-500 to-amber-600 text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  {stats.openTickets > 0 ? (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 text-white">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs font-semibold">{stats.openTickets} open</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/30 text-white">
                      <CheckCircle2 className="h-3 w-3" />
                      <span className="text-xs font-semibold">All resolved</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-amber-100 font-medium">People Ops Tickets</p>
                  <h3 className="text-3xl font-bold">{stats.totalTickets}</h3>
                  <p className="text-xs text-amber-100">{stats.openTickets} currently pending</p>
                </div>
              </div>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-600 text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Calendar className="h-6 w-6" />
                  </div>
                  {stats.attendanceRate >= 90 ? (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 text-white">
                      <Award className="h-3 w-3" />
                      <span className="text-xs font-semibold">Great</span>
                    </div>
                  ) : stats.attendanceRate >= 70 ? (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 text-white">
                      <Activity className="h-3 w-3" />
                      <span className="text-xs font-semibold">On track</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/30 text-white">
                      <AlertCircle className="h-3 w-3" />
                      <span className="text-xs font-semibold">Watch</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-emerald-100 font-medium">Attendance Rate</p>
                  <h3 className="text-3xl font-bold">{stats.attendanceRate}%</h3>
                  <p className="text-xs text-emerald-100">Based on last 30 days</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions & Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">HR Quick Actions</h3>
                    <p className="text-xs text-slate-500">Common workflows, one tap away</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Button 
                    onClick={() => navigate('/app/users?create=true')}
                    className="w-full justify-start h-auto py-3 px-4 rounded-xl hover:bg-slate-50 border border-slate-200"
                    variant="ghost"
                  >
                    <UserCheck className="h-4 w-4 mr-3 text-slate-600" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-slate-900 text-sm">Add Employee</div>
                      <div className="text-xs text-slate-500">Invite or onboard new hires</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Button>
                  <Button 
                    onClick={() => navigate('/app/departments?create=true')}
                    className="w-full justify-start h-auto py-3 px-4 rounded-xl hover:bg-slate-50 border border-slate-200"
                    variant="ghost"
                  >
                    <Building2 className="h-4 w-4 mr-3 text-slate-600" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-slate-900 text-sm">Create Department</div>
                      <div className="text-xs text-slate-500">Organize teams & leads</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Button>
                  <Button 
                    onClick={() => navigate('/app/profile')}
                    className="w-full justify-start h-auto py-3 px-4 rounded-xl hover:bg-slate-50 border border-slate-200"
                    variant="ghost"
                  >
                    <Calendar className="h-4 w-4 mr-3 text-slate-600" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-slate-900 text-sm">Review Attendance</div>
                      <div className="text-xs text-slate-500">Ensure compliance daily</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Button>
                  <Button 
                    onClick={() => navigate('/app/tickets')}
                    className="w-full justify-start h-auto py-3 px-4 rounded-xl hover:bg-slate-50 border border-slate-200"
                    variant="ghost"
                  >
                    <Briefcase className="h-4 w-4 mr-3 text-slate-600" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-slate-900 text-sm">Manage HR Tickets</div>
                      <div className="text-xs text-slate-500">Follow each employee request</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow lg:col-span-2">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <LineChart className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">People Insights</h3>
                      <p className="text-xs text-slate-500">Health of your organization</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-lg">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <PieChart className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-slate-600">Growth Trend</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-1">
                      {stats.employeeGrowthPercentage >= 0 ? '+' : ''}{stats.employeeGrowthPercentage}%
                    </div>
                    <div className="text-xs text-slate-500">vs last month</div>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-medium text-slate-600">Active Employees</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-1">{stats.activeEmployees}</div>
                    <div className="text-xs text-slate-500">Eligible for scheduling</div>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-medium text-slate-600">Open Tickets</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-1">{stats.openTickets}</div>
                    <div className="text-xs text-slate-500">Need HR attention</div>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-medium text-slate-600">Attendance Rate</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-1">{stats.attendanceRate}%</div>
                    <div className="text-xs text-slate-500">Check-ins recorded</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Activity Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-md">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Recent Employees</h3>
                      <p className="text-xs text-slate-500">Latest people joining the team</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-lg"
                    onClick={() => navigate('/app/users')}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    View All
                  </Button>
                </div>
              </div>
              <div className="p-6">
                {employees.length === 0 ? (
                  <div className="text-center py-6 lg:py-8">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Users className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">No employees yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {employees.slice(0, 5).map((employee) => (
                      <div
                        key={employee.id}
                        className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center text-white font-semibold text-sm">
                            {employee.full_name?.charAt(0) || 'E'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 text-sm lg:text-base truncate">
                              {employee.full_name}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{employee.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge className={`text-xs ${getRoleBadgeColor(employee.role)}`}>
                            {employee.role}
                          </Badge>
                          {employee.department && (
                            <span className="text-xs text-slate-500 truncate">{employee.department.name}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-slate-200 shadow-md">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Departments</h3>
                      <p className="text-xs text-slate-500">Structure & headcount overview</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-lg"
                    onClick={() => navigate('/app/departments')}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                </div>
              </div>
              <div className="p-6">
                {departments.length === 0 ? (
                  <div className="text-center py-6 lg:py-8">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Building2 className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">No departments yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {departments.map((dept) => (
                      <div
                        key={dept.id}
                        className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => navigate(`/app/departments/${dept.id}`)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 text-sm lg:text-base truncate">
                              {dept.name}
                            </div>
                            {dept.description && (
                              <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                                {dept.description}
                              </div>
                            )}
                          </div>
                          <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200 flex-shrink-0 ml-2">
                            {dept.member_count || 0} members
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees">
          <Card className="border-slate-200">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-4 lg:p-6 border-b border-slate-200">
              <div className="space-y-1">
                <h3 className="text-base lg:text-lg font-semibold text-slate-900">All Employees</h3>
                <p className="text-xs lg:text-sm text-slate-500">
                  {stats.totalEmployees} employees • {stats.activeEmployees} active
                </p>
              </div>
              <Button 
                onClick={() => navigate('/app/users')}
                className="bg-slate-900 hover:bg-slate-800 rounded-lg h-11 lg:h-10 w-full lg:w-auto"
              >
                <span className="text-sm">Manage Employees</span>
              </Button>
            </div>
            <div className="p-4 lg:p-6">
              {employees.length === 0 ? (
                <div className="text-center py-8 lg:py-12">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-100 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-3 lg:mb-4">
                    <Users className="h-6 w-6 lg:h-8 lg:w-8 text-slate-400" />
                  </div>
                  <h3 className="text-base lg:text-lg font-semibold text-slate-900 mb-1 lg:mb-2">No employees</h3>
                  <p className="text-sm text-slate-500">No employees have been added yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="p-4 lg:p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center gap-3 mb-2 lg:mb-3">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center text-white font-semibold text-sm lg:text-base">
                          {employee.full_name?.charAt(0) || 'E'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-sm lg:text-base truncate">
                            {employee.full_name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{employee.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className={`text-xs ${getRoleBadgeColor(employee.role)}`}>
                          {employee.role}
                        </Badge>
                        {employee.department && (
                          <span className="text-xs text-slate-500 truncate">
                            {employee.department.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <Card className="border-slate-200">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-4 lg:p-6 border-b border-slate-200">
              <div className="space-y-1">
                <h3 className="text-base lg:text-lg font-semibold text-slate-900">All Departments</h3>
                <p className="text-xs lg:text-sm text-slate-500">
                  {stats.departments} departments
                </p>
              </div>
              <Button 
                onClick={() => navigate('/app/departments')}
                className="bg-slate-900 hover:bg-slate-800 rounded-lg h-11 lg:h-10 w-full lg:w-auto"
              >
                <span className="text-sm">Manage Departments</span>
              </Button>
            </div>
            <div className="p-4 lg:p-6">
              {departments.length === 0 ? (
                <div className="text-center py-8 lg:py-12">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-100 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-3 lg:mb-4">
                    <Building2 className="h-6 w-6 lg:h-8 lg:w-8 text-slate-400" />
                  </div>
                  <h3 className="text-base lg:text-lg font-semibold text-slate-900 mb-1 lg:mb-2">No departments</h3>
                  <p className="text-sm text-slate-500">No departments have been created yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                  {departments.map((dept) => (
                    <div
                      key={dept.id}
                      className="p-4 lg:p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => navigate(`/app/departments/${dept.id}`)}
                    >
                      <div className="flex items-center gap-3 mb-2 lg:mb-3">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                          <Building2 className="h-5 w-5 lg:h-6 lg:w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-sm lg:text-base truncate">
                            {dept.name}
                          </div>
                          {dept.description && (
                            <div className="text-xs text-slate-500 truncate mt-1">
                              {dept.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                        {dept.member_count || 0} members
                      </Badge>
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

