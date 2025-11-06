import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Search,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Ticket as TicketIcon,
  UserCheck,
} from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'

interface Department {
  id: string
  name: string
  description?: string
  manager_id?: string
  manager?: {
    full_name: string
    email: string
  }
}

interface DepartmentTicket {
  id: string
  title: string
  description: string
  priority: string
  status: string
  created_at: string
  assigned_to?: string
  accepted_at?: string
  accepted_by?: string
  created_by?: string
  assignee?: {
    full_name: string
    email: string
  }
  creator?: {
    full_name: string
    email: string
  }
}

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [department, setDepartment] = useState<Department | null>(null)
  const [tickets, setTickets] = useState<DepartmentTicket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<DepartmentTicket[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [acceptingTicketId, setAcceptingTicketId] = useState<string | null>(null)

  // Fetch department details
  const fetchDepartment = async () => {
    if (!id) return

    try {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          manager:manager_id(full_name, email)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setDepartment(data)
    } catch (error) {
      console.error('Error fetching department:', error)
      toast({
        title: 'Error',
        description: 'Failed to load department',
        variant: 'destructive',
      })
    }
  }

  // Fetch department tickets
  const fetchTickets = async () => {
    if (!id) return

    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          assignee:assigned_to(full_name, email),
          creator:created_by(full_name, email)
        `)
        .eq('department_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTickets(data || [])
    } catch (error) {
      console.error('Error fetching tickets:', error)
    }
  }

  // Fetch department members
  const fetchMembers = async () => {
    if (!id) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('department_id', id)

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchDepartment(), fetchTickets(), fetchMembers()])
      setLoading(false)
    }
    loadData()
  }, [id])

  // Filter tickets
  useEffect(() => {
    let filtered = tickets

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filtered = filtered.filter(t => !t.assigned_to)
      } else if (statusFilter === 'assigned') {
        filtered = filtered.filter(t => t.assigned_to && t.status !== 'closed')
      } else {
        filtered = filtered.filter(t => t.status === statusFilter)
      }
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        t =>
          t.title?.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term) ||
          t.assignee?.full_name?.toLowerCase().includes(term)
      )
    }

    setFilteredTickets(filtered)
  }, [tickets, searchTerm, statusFilter])

  // Accept ticket (employee action)
  const handleAcceptTicket = async (ticketId: string) => {
    if (!user) return

    setAcceptingTicketId(ticketId)

    try {
      // First, check if ticket is still unassigned
      const { data: currentTicket, error: checkError } = await supabase
        .from('tickets')
        .select('assigned_to')
        .eq('id', ticketId)
        .single()

      if (checkError) throw checkError

      if (currentTicket.assigned_to) {
        toast({
          title: 'Ticket Already Taken',
          description: 'Someone else just accepted this ticket.',
          variant: 'destructive',
        })
        await fetchTickets()
        return
      }

      // Update ticket with assignment
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          assigned_to: user.id,
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
          status: 'in_progress',
        })
        .eq('id', ticketId)

      if (updateError) throw updateError

      toast({
        title: 'Ticket Accepted',
        description: 'The ticket has been assigned to you.',
      })

      await fetchTickets()
    } catch (error) {
      console.error('Error accepting ticket:', error)
      toast({
        title: 'Error',
        description: 'Failed to accept ticket. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setAcceptingTicketId(null)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300'
    }
  }

  const getStatusColor = (status: string, assignedTo?: string) => {
    if (!assignedTo) {
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    }
    switch (status) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'closed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300'
    }
  }

  const getStatusLabel = (ticket: DepartmentTicket) => {
    if (!ticket.assigned_to) return 'Pending'
    if (ticket.status === 'closed') return 'Completed'
    if (ticket.status === 'in_progress') return 'Active'
    return ticket.status
  }

  // Calculate stats
  const pendingTickets = tickets.filter(t => !t.assigned_to).length
  const activeTickets = tickets.filter(t => t.assigned_to && t.status !== 'closed').length
  const completedTickets = tickets.filter(t => t.status === 'closed').length
  const myActiveTickets = tickets.filter(
    t => t.assigned_to === user?.id && t.status !== 'closed'
  ).length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Loading department...</p>
        </div>
      </div>
    )
  }

  if (!department) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Department not found</h2>
          <Button onClick={() => navigate('/app/departments')}>
            Back to Departments
          </Button>
        </div>
      </div>
    )
  }

  const isAdmin = user?.role === 'admin'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/app/departments')}
          className="gap-2 w-fit"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Departments
        </Button>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{department.name}</h1>
              <p className="text-gray-500 flex items-center gap-2">
                <Users className="h-4 w-4" />
                {department.manager?.full_name || 'No manager assigned'}
              </p>
            </div>
          </div>
          {department.description && (
            <p className="text-gray-600 dark:text-gray-400 ml-[60px]">
              {department.description}
            </p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent" />
            <div className="relative flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-semibold">{pendingTickets}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent" />
            <div className="relative flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <TicketIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  {isAdmin ? 'Active' : 'My Active'}
                </p>
                <p className="text-2xl font-semibold">
                  {isAdmin ? activeTickets : myActiveTickets}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-transparent" />
            <div className="relative flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-semibold">{completedTickets}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent" />
            <div className="relative flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Members</p>
                <p className="text-2xl font-semibold">{members.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search tickets..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tickets</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="closed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tickets Table */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Department Tickets</h2>
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <TicketIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No tickets found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm
                  ? 'Try adjusting your search or filters'
                  : 'No tickets have been assigned to this department yet'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[120px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => {
                  const isPending = !ticket.assigned_to
                  const isMyTicket = ticket.assigned_to === user?.id

                  return (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      onClick={() => navigate(`/app/tickets/${ticket.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <TicketIcon className="h-4 w-4 text-gray-400" />
                          {ticket.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority || 'medium'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(ticket.status, ticket.assigned_to)}>
                          {getStatusLabel(ticket)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">
                        {ticket.assignee?.full_name || (
                          <span className="text-orange-600 font-medium">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">
                        {ticket.creator?.full_name || '-'}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400 text-sm">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {isPending && !isAdmin && (
                          <Button
                            size="sm"
                            onClick={() => handleAcceptTicket(ticket.id)}
                            disabled={acceptingTicketId === ticket.id}
                            className="gap-2"
                          >
                            {acceptingTicketId === ticket.id ? (
                              <>
                                <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Accepting...
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4" />
                                Accept
                              </>
                            )}
                          </Button>
                        )}
                        {isMyTicket && (
                          <Badge variant="outline" className="border-blue-200 text-blue-700">
                            Yours
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  )
}