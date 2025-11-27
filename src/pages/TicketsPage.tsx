import { useEffect, useState } from 'react'
import { useTickets } from '@/hooks/useTickets'
import { TicketList } from '@/components/Ticket/TicketList'
import { TicketForm } from '@/components/Ticket/TicketForm'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  Ticket,
  Trash2,
  Download,
  Filter,
  TrendingUp,
  Activity,
  Users,
  Target,
  Zap,
  Calendar,
  ArrowUpRight,
  X
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface TicketsPageProps {
  newTicket?: boolean
}

export default function TicketsPage({ newTicket = false }: TicketsPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { toast } = useToast()
  const { tickets, loading, fetchTickets } = useTickets()
  const [showForm, setShowForm] = useState(newTicket || location.search.includes('new=true'))
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [ticketViewTab, setTicketViewTab] = useState<'incoming' | 'outgoing'>('incoming')

  useEffect(() => {
    if (user?.company_id) {
      fetchTickets()
    }
  }, [user?.company_id])

  const handleTicketCreated = (ticketId: string) => {
    setShowForm(false)
    fetchTickets()
    navigate(`/app/tickets/${ticketId}`)
  }

  const toggleForm = () => {
    if (showForm) {
      setShowForm(false)
      if (location.pathname === '/app/tickets/new') {
        navigate('/app/tickets')
      }
    } else {
      setShowForm(true)
      navigate('/app/tickets/new')
    }
  }

  const handleDeleteClick = (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setTicketToDelete(ticketId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!ticketToDelete || !user?.company_id) return

    setDeleting(true)
    try {
      const { error: commentsError } = await supabase
        .from('ticket_comments')
        .delete()
        .eq('ticket_id', ticketToDelete)
        .eq('company_id', user.company_id)

      if (commentsError) throw commentsError

      const { error: historyError } = await supabase
        .from('ticket_status_history')
        .delete()
        .eq('ticket_id', ticketToDelete)
        .eq('company_id', user.company_id)

      if (historyError) throw historyError

      const { error: ticketError } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketToDelete)
        .eq('company_id', user.company_id)

      if (ticketError) throw ticketError

      toast({
        title: 'Success',
        description: 'Ticket deleted successfully'
      })

      fetchTickets()
    } catch (error) {
      console.error('Error deleting ticket:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete ticket',
        variant: 'destructive'
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setTicketToDelete(null)
    }
  }

  // Filter tickets for personal view (tickets created by user)
  const personalTickets = tickets.filter(ticket => {
    const matchesSearch = searchQuery.trim() === '' || 
      ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter
    const isCreatedByUser = ticket.created_by === user?.id

    return matchesSearch && matchesStatus && matchesPriority && isCreatedByUser
  })

  // Filter tickets for department view (tickets assigned to user)
  const departmentTickets = tickets.filter(ticket => {
    const matchesSearch = searchQuery.trim() === '' || 
      ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter
    const isAssignedToUser = ticket.assigned_to === user?.id

    return matchesSearch && matchesStatus && matchesPriority && isAssignedToUser
  })

  // Get the currently displayed tickets based on active tab
  // Incoming = tickets assigned to me, Outgoing = tickets created by me
  const displayedTickets = ticketViewTab === 'incoming' ? departmentTickets : personalTickets

  // Old filtered tickets (for backwards compatibility if needed)
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchQuery.trim() === '' || 
      ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const openTickets = tickets.filter(t => t.status === 'open')
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress')
  const resolvedTickets = tickets.filter(t => t.status === 'resolved')
  const highPriorityTickets = tickets.filter(t => t.priority === 'high' && t.status !== 'resolved')
  
  // Calculate resolution rate
  const totalActiveTickets = tickets.filter(t => t.status !== 'closed').length
  const resolutionRate = totalActiveTickets > 0 
    ? Math.round((resolvedTickets.length / totalActiveTickets) * 100) 
    : 0

  // Calculate average response time (mock data for demonstration)
  const avgResponseTime = '2.4h'

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header with Breadcrumb */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 lg:space-y-2">
          <div className="flex items-center gap-2 text-xs lg:text-sm text-slate-500">
            <span>Support</span>
            <span>/</span>
            <span className="text-slate-900 font-medium">Tickets</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Support Tickets</h1>
          <p className="text-sm lg:text-base text-slate-500">Track, manage, and resolve customer support requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-lg lg:rounded-xl border-slate-200 h-11 lg:h-10">
            <Download className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">Export</span>
          </Button>
          <Button
            onClick={toggleForm}
            className="bg-slate-900 hover:bg-slate-800 rounded-lg lg:rounded-xl shadow-lg shadow-slate-900/20 h-11 lg:h-10"
          >
            <Plus className="h-4 w-4 lg:mr-2" />
            <span className="hidden sm:inline">New Ticket</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Ticket View Tabs - Incoming vs Outgoing */}
      <Tabs
        value={ticketViewTab}
        onValueChange={(val) => setTicketViewTab(val as 'incoming' | 'outgoing')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-lg lg:rounded-xl h-auto">
          <TabsTrigger 
            value="incoming" 
            className="py-2.5 lg:py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all text-sm lg:text-base font-medium"
          >
            Incoming
            <Badge variant="secondary" className="ml-2 text-xs">{departmentTickets.length}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="outgoing" 
            className="py-2.5 lg:py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all text-sm lg:text-base font-medium"
          >
            Outgoing
            <Badge variant="secondary" className="ml-2 text-xs">{personalTickets.length}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Premium Insights Banner */}
      <Card className="border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="p-4 lg:p-6 relative">
          <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
            <div className="flex items-start gap-3 lg:gap-4">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/10 backdrop-blur-sm rounded-lg lg:rounded-xl flex items-center justify-center border border-white/20 flex-shrink-0">
                <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base lg:text-lg font-semibold mb-1">Performance Insights</h3>
                <p className="text-slate-300 text-xs lg:text-sm mb-3 lg:mb-4">
                  Your team resolved {resolvedTickets.length} tickets with {avgResponseTime} avg response
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3 lg:h-4 lg:w-4 text-slate-400" />
                    <span className="text-xs lg:text-sm text-slate-300">{tickets.length} total tickets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-3 w-3 lg:h-4 lg:w-4 text-emerald-400" />
                    <span className="text-xs lg:text-sm text-emerald-300">Above target</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Create Ticket Form */}
      {showForm && (
        <Card className="border-slate-200 shadow-xl">
          <div className="p-4 lg:p-6 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-900 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20 flex-shrink-0">
                <Plus className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg lg:text-xl font-semibold text-slate-900">Create New Ticket</h2>
                <p className="text-sm text-slate-500 truncate">Submit a new support request</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleForm}
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-4 lg:p-6">
            <TicketForm onSubmit={handleTicketCreated} />
          </div>
        </Card>
      )}

      {/* Tickets Table */}
      <Card className="border-slate-200 shadow-sm">
        <div className="p-4 lg:p-6 border-b border-slate-200">
          <div className="flex flex-col gap-3 lg:gap-4 mb-3 lg:mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">
                  {ticketViewTab === 'incoming'
                    ? 'Incoming Tickets (Assigned to Me)'
                    : 'Outgoing Tickets (My Tickets)'}
                </h2>
                <p className="text-sm text-slate-500">
                  {displayedTickets.length} {displayedTickets.length === 1 ? 'ticket' : 'tickets'} found
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search tickets..."
                  className="pl-9 rounded-lg border-slate-200 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="flex-1 rounded-lg border-slate-200 text-sm min-w-0">
                    <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="flex-1 rounded-lg border-slate-200 text-sm min-w-0">
                    <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          {(statusFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="rounded-full text-xs">
                  Search: {searchQuery}
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="ml-1 hover:text-slate-900"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="rounded-full text-xs">
                  Status: {statusFilter}
                  <button 
                    onClick={() => setStatusFilter('all')}
                    className="ml-1 hover:text-slate-900"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {priorityFilter !== 'all' && (
                <Badge variant="secondary" className="rounded-full text-xs">
                  Priority: {priorityFilter}
                  <button 
                    onClick={() => setPriorityFilter('all')}
                    className="ml-1 hover:text-slate-900"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <button 
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                  setPriorityFilter('all')
                }}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <TicketList
            tickets={displayedTickets}
            loading={loading}
            onRowClick={(id) => navigate(`/app/tickets/${id}`)}
            actions={user && (user.role === 'admin' || user.role === 'manager')
              ? (ticket) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteClick(ticket.id, e)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )
              : undefined}
          />
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] lg:max-w-lg rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg lg:text-xl">Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription className="text-sm lg:text-base">
              Are you sure you want to delete this ticket? This action cannot be undone.
              All comments and history associated with this ticket will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-lg lg:rounded-xl h-11 lg:h-10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 rounded-lg lg:rounded-xl h-11 lg:h-10"
            >
              {deleting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Ticket
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}