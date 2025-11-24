import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Clock,
  CheckCircle,
  XCircle,
  Calendar as CalendarIcon,
  Download,
  Filter,
  Users as UsersIcon,
  Timer,
  MapPin,
  Eye,
  MoreHorizontal,
  FileText,
  UserCheck,
  UserX,
  Coffee,
  ArrowUpDown,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// Types
type AttendanceStatus = 'clocked_in' | 'clocked_out' | 'not_started' | 'on_break'

interface AttendanceRecord {
  id: string
  user_id: string
  check_in: string | null
  check_out: string | null
  status: AttendanceStatus
  location: string | null
  notes: string | null
  date: string
  users: {
    full_name: string
    email: string
    avatar_url: string | null
  }
}

interface DailyHistory {
  date: string
  check_in: string
  check_out: string
  total_hours: number
  status: AttendanceStatus
}

// StatusBadge Component
const statusConfig = {
  clocked_in: {
    label: 'Clocked In',
    icon: '🟢',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  clocked_out: {
    label: 'Clocked Out',
    icon: '🔴',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  not_started: {
    label: 'Not Started',
    icon: '⚪',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  on_break: {
    label: 'On Break',
    icon: '🟡',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
}

function StatusBadge({ status, className }: { status: AttendanceStatus; className?: string }) {
  const config = statusConfig[status]
  return (
    <Badge variant="outline" className={cn(config.className, 'font-medium', className)}>
      {config.icon} {config.label}
    </Badge>
  )
}

// LiveTimer Component
function LiveTimer({ startTime, className }: { startTime: string; className?: string }) {
  const [elapsed, setElapsed] = useState('00:00:00')

  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(startTime)
      const now = new Date()
      const diff = now.getTime() - start.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }

    setElapsed(calculateElapsed())
    const interval = setInterval(() => {
      setElapsed(calculateElapsed())
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  return (
    <div className={cn('flex items-center gap-1.5 font-mono font-semibold text-primary', className)}>
      <Timer className="h-4 w-4 animate-pulse" />
      {elapsed}
    </div>
  )
}

// StatCard Component
function StatCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
}: {
  title: string
  value: string | number
  icon: any
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'muted'
}) {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-yellow-100 text-yellow-600',
    destructive: 'bg-red-100 text-red-600',
    muted: 'bg-gray-100 text-gray-600',
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-md border-slate-200">
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl lg:text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div className={cn('p-3 rounded-lg', variantStyles[variant])}>
            <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// DetailModal Component
function DetailModal({
  record,
  open,
  onClose,
  history,
}: {
  record: AttendanceRecord | null
  open: boolean
  onClose: () => void
  history: DailyHistory[]
}) {
  if (!record) return null

  const formatTime = (time?: string | null) => {
    if (!time) return '---'
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const weeklyTotal = history.reduce((sum, day) => sum + day.total_hours, 0)

  const calculateHours = () => {
    if (!record.check_in) return 0
    if (!record.check_out) return 0
    const diff = new Date(record.check_out).getTime() - new Date(record.check_in).getTime()
    return diff / (1000 * 60 * 60)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl lg:text-2xl">Attendance Details</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Header */}
          <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
            <Avatar className="h-16 w-16">
              <AvatarImage src={record.users.avatar_url || ''} alt={record.users.full_name} />
              <AvatarFallback className="text-xl">
                {record.users.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">{record.users.full_name}</h3>
              <p className="text-sm text-muted-foreground mb-2">{record.users.email}</p>
              <StatusBadge status={record.status} />
            </div>
          </div>

          {/* Today's Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Clock In Time</p>
              <p className="text-xl font-semibold">{formatTime(record.check_in)}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Clock Out Time</p>
              <p className="text-xl font-semibold">{formatTime(record.check_out)}</p>
            </div>
            {record.location && (
              <div className="p-4 border rounded-lg sm:col-span-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <MapPin className="h-4 w-4" />
                  <span>Location</span>
                </div>
                <p className="text-lg font-medium">{record.location}</p>
              </div>
            )}
            <div className="p-4 border rounded-lg sm:col-span-2 bg-primary/5">
              <p className="text-sm text-muted-foreground mb-2">Hours Today</p>
              {record.status === 'clocked_in' || record.status === 'on_break' ? (
                <LiveTimer startTime={record.check_in!} className="text-2xl" />
              ) : (
                <p className="text-2xl font-bold">{calculateHours().toFixed(1)}h</p>
              )}
            </div>
          </div>

          {/* 7-Day History */}
          {history.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold">Last 7 Days</h4>
                <p className="text-sm text-muted-foreground">
                  Weekly Total: <span className="font-bold text-foreground">{weeklyTotal.toFixed(1)}h</span>
                </p>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Clock In</TableHead>
                      <TableHead className="text-xs">Clock Out</TableHead>
                      <TableHead className="text-xs">Hours</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((day, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-xs">{formatDate(day.date)}</TableCell>
                        <TableCell className="text-xs">{day.check_in}</TableCell>
                        <TableCell className="text-xs">{day.check_out}</TableCell>
                        <TableCell className="font-semibold text-xs">
                          {day.total_hours > 0 ? `${day.total_hours.toFixed(1)}h` : '---'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={day.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Main Component
export default function UserAttendanceTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('today')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [userHistory, setUserHistory] = useState<DailyHistory[]>([])
  const [sortField, setSortField] = useState<'full_name' | 'status' | 'check_in'>('check_in')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (user?.company_id) {
      fetchAttendance()
    }
  }, [user?.company_id, selectedDate, dateRange])

  const fetchAttendance = async () => {
    if (!user?.company_id) return

    try {
      setLoading(true)
      let startDate: Date
      let endDate: Date

      if (dateRange === 'today') {
        startDate = new Date(selectedDate)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(selectedDate)
        endDate.setHours(23, 59, 59, 999)
      } else if (dateRange === 'week') {
        const today = new Date()
        startDate = new Date(today.setDate(today.getDate() - today.getDay()))
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date()
        endDate.setHours(23, 59, 59, 999)
      } else {
        // month
        const today = new Date()
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
      }

      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          users:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('company_id', user.company_id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('check_in', { ascending: false })

      if (error) throw error
      setAttendanceRecords(data || [])
    } catch (error) {
      console.error('Error fetching attendance:', error)
      toast({
        title: 'Error',
        description: 'Failed to load attendance records',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUserHistory = async (userId: string) => {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', user?.company_id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (error) throw error

      const history: DailyHistory[] = (data || []).map(record => {
        const checkIn = record.check_in ? new Date(record.check_in) : null
        const checkOut = record.check_out ? new Date(record.check_out) : null
        const totalHours = checkIn && checkOut 
          ? (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
          : 0

        return {
          date: record.date,
          check_in: checkIn ? checkIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '---',
          check_out: checkOut ? checkOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '---',
          total_hours: totalHours,
          status: record.status,
        }
      })

      setUserHistory(history)
    } catch (error) {
      console.error('Error fetching user history:', error)
    }
  }

  const handleRowClick = async (record: AttendanceRecord) => {
    setSelectedRecord(record)
    await fetchUserHistory(record.user_id)
    setDetailModalOpen(true)
  }

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Status', 'Date', 'Check In', 'Check Out', 'Hours']
    const rows = filteredRecords.map(record => {
      const checkIn = record.check_in ? new Date(record.check_in) : null
      const checkOut = record.check_out ? new Date(record.check_out) : null
      const hours = checkIn && checkOut 
        ? ((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)).toFixed(1)
        : '0'

      return [
        record.users.full_name,
        record.users.email,
        record.status,
        record.date,
        checkIn ? checkIn.toLocaleString() : 'N/A',
        checkOut ? checkOut.toLocaleString() : 'N/A',
        hours,
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${selectedDate.toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: 'Success',
      description: 'Attendance report exported',
    })
  }

  const formatTime = (time?: string | null) => {
    if (!time) return '---'
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const calculateHours = (checkIn?: string | null, checkOut?: string | null) => {
    if (!checkIn) return '---'
    if (!checkOut) return null
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
    const hours = diff / (1000 * 60 * 60)
    return `${hours.toFixed(1)}h`
  }

  // Filter and sort
  const filteredRecords = attendanceRecords.filter(record =>
    statusFilter === 'all' || record.status === statusFilter
  )

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const dir = sortDirection === 'asc' ? 1 : -1

    if (sortField === 'full_name') {
      return dir * a.users.full_name.localeCompare(b.users.full_name)
    } else if (sortField === 'status') {
      return dir * a.status.localeCompare(b.status)
    } else {
      const aTime = a.check_in ? new Date(a.check_in).getTime() : 0
      const bTime = b.check_in ? new Date(b.check_in).getTime() : 0
      return dir * (aTime - bTime)
    }
  })

  // Stats
  const presentCount = attendanceRecords.filter(r => r.status === 'clocked_in').length
  const clockedOutCount = attendanceRecords.filter(r => r.status === 'clocked_out').length
  const onBreakCount = attendanceRecords.filter(r => r.status === 'on_break').length
  const notStartedCount = attendanceRecords.filter(r => r.status === 'not_started').length

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title="Present"
          value={presentCount}
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          title="On Break"
          value={onBreakCount}
          icon={Coffee}
          variant="warning"
        />
        <StatCard
          title="Clocked Out"
          value={clockedOutCount}
          icon={UserX}
          variant="destructive"
        />
        <StatCard
          title="Not Started"
          value={notStartedCount}
          icon={UsersIcon}
          variant="muted"
        />
      </div>

      {/* Filters */}
      <Card className="p-4 border-slate-200">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="clocked_in">Clocked In</SelectItem>
                <SelectItem value="clocked_out">Clocked Out</SelectItem>
                <SelectItem value="on_break">On Break</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={filteredRecords.length === 0}
              className="flex-1 sm:flex-none"
            >
              <FileText className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </Card>

      {/* Date Picker & Records */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Calendar - Only show for "today" filter */}
        {dateRange === 'today' && (
          <Card className="p-4 lg:p-6 border-slate-200">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-base">
              <CalendarIcon className="h-5 w-5" />
              Select Date
            </h3>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </Card>
        )}

        {/* Records Table/Cards */}
        <Card className={cn(
          'p-4 lg:p-6 border-slate-200',
          dateRange === 'today' ? 'lg:col-span-3' : 'lg:col-span-4'
        )}>
          <h3 className="font-semibold mb-4 text-base lg:text-lg">
            Attendance Records
            {dateRange === 'today' && ` - ${selectedDate.toLocaleDateString()}`}
          </h3>

          {loading ? (
            <div className="text-center py-8 lg:py-12 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
              Loading...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 lg:py-12 text-gray-500">
              <CalendarIcon className="h-10 w-10 lg:h-12 lg:w-12 mx-auto mb-3 text-gray-400" />
              <h3 className="text-base font-medium text-gray-900 mb-1">No records found</h3>
              <p className="text-sm">
                {statusFilter !== 'all'
                  ? `No ${statusFilter.replace('_', ' ')} records`
                  : 'No attendance records for this period'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 font-semibold text-xs"
                          onClick={() => handleSort('full_name')}
                        >
                          Employee
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 font-semibold text-xs"
                          onClick={() => handleSort('status')}
                        >
                          Status
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 font-semibold text-xs"
                          onClick={() => handleSort('check_in')}
                        >
                          Clock In
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-xs">Clock Out</TableHead>
                      <TableHead className="text-xs">Total Hours</TableHead>
                      <TableHead className="text-right text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRecords.map((record) => {
                      const hours = calculateHours(record.check_in, record.check_out)

                      return (
                        <TableRow
                          key={record.id}
                          className="cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => handleRowClick(record)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={record.users.avatar_url || ''} alt={record.users.full_name} />
                                <AvatarFallback>
                                  {record.users.full_name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{record.users.full_name}</p>
                                <p className="text-xs text-muted-foreground">{record.users.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={record.status} />
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {formatTime(record.check_in)}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {formatTime(record.check_out)}
                          </TableCell>
                          <TableCell>
                            {record.status === 'clocked_in' || record.status === 'on_break' ? (
                              <LiveTimer startTime={record.check_in!} />
                            ) : hours === '---' ? (
                              <span className="text-muted-foreground text-sm">---</span>
                            ) : (
                              <span className="font-semibold text-sm">{hours}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRowClick(record)
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3">
                {sortedRecords.map((record) => {
                  const hours = calculateHours(record.check_in, record.check_out)

                  return (
                    <Card
                      key={record.id}
                      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50"
                      onClick={() => handleRowClick(record)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={record.users.avatar_url || ''} alt={record.users.full_name} />
                            <AvatarFallback>
                              {record.users.full_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-base">{record.users.full_name}</p>
                                <p className="text-xs text-muted-foreground">{record.users.email}</p>
                                <StatusBadge status={record.status} className="mt-1.5" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-muted-foreground text-xs mb-1">Clock In</p>
                                <p className="font-medium">{formatTime(record.check_in)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs mb-1">Clock Out</p>
                                <p className="font-medium">{formatTime(record.check_out)}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Total Hours:</span>
                              {record.status === 'clocked_in' || record.status === 'on_break' ? (
                                <LiveTimer startTime={record.check_in!} className="text-sm" />
                              ) : hours === '---' ? (
                                <span className="text-sm text-muted-foreground">---</span>
                              ) : (
                                <span className="text-sm font-semibold">{hours}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Detail Modal */}
      <DetailModal
        record={selectedRecord}
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedRecord(null)
        }}
        history={userHistory}
      />
    </div>
  )
}