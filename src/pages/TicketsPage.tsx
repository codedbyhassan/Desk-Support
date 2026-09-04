import { useEffect, useState } from 'react'
import { useTickets } from '@/hooks/useTickets'
import { useDashboardTab } from '@/context/DashboardTabContext'
import { TicketList } from '@/components/Ticket/TicketList'
import { TicketForm } from '@/components/Ticket/TicketForm'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, CheckCircle2, Clock3, Download, Filter, Plus, Search, Trash2, X } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface TicketsPageProps { newTicket?: boolean }

export default function TicketsPage({ newTicket = false }: TicketsPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { toast } = useToast()
  const { tickets, loading, fetchTickets } = useTickets()
  const { activeTab, setActiveTab } = useDashboardTab()
  const [showForm, setShowForm] = useState(newTicket || location.search.includes('new=true'))
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { if (activeTab !== 'incoming' && activeTab !== 'outgoing') setActiveTab('incoming') }, [activeTab, setActiveTab])
  useEffect(() => { if (user?.company_id) fetchTickets() }, [user?.company_id, fetchTickets])

  const toggleForm = () => {
    if (showForm) {
      setShowForm(false)
      if (location.pathname === '/app/tickets/new') navigate('/app/tickets')
    } else {
      setShowForm(true)
      navigate('/app/tickets/new')
    }
  }

  const handleTicketCreated = (ticketId: string) => { setShowForm(false); fetchTickets(); navigate(`/app/tickets/${ticketId}`) }

  const handleDeleteClick = (ticketId: string, e: React.MouseEvent) => { e.stopPropagation(); setTicketToDelete(ticketId); setDeleteDialogOpen(true) }

  const handleDeleteConfirm = async () => {
    if (!ticketToDelete || !user?.company_id) return
    setDeleting(true)
    try {
      const { error: commentsError } = await supabase.from('ticket_comments').delete().eq('ticket_id', ticketToDelete).eq('company_id', user.company_id)
      if (commentsError) throw commentsError
      const { error: historyError } = await supabase.from('ticket_status_history').delete().eq('ticket_id', ticketToDelete).eq('company_id', user.company_id)
      if (historyError) throw historyError
      const { error: ticketError } = await supabase.from('tickets').delete().eq('id', ticketToDelete).eq('company_id', user.company_id)
      if (ticketError) throw ticketError
      toast({ title: 'Ticket deleted', description: 'The ticket and its history were removed.' })
      fetchTickets()
    } catch (error) {
      console.error('Error deleting ticket:', error)
      toast({ title: 'Could not delete ticket', description: 'Please try again.', variant: 'destructive' })
    } finally { setDeleting(false); setDeleteDialogOpen(false); setTicketToDelete(null) }
  }

  const matchesFilters = (ticket: typeof tickets[number]) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch = !q || ticket.title?.toLowerCase().includes(q) || ticket.description?.toLowerCase().includes(q) || ticket.id?.toLowerCase().includes(q)
    return matchesSearch && (statusFilter === 'all' || ticket.status === statusFilter) && (priorityFilter === 'all' || ticket.priority === priorityFilter)
  }

  const personalTickets = tickets.filter(ticket => ticket.created_by === user?.id && matchesFilters(ticket))
  const departmentTickets = tickets.filter(ticket => ticket.assigned_to === user?.id && matchesFilters(ticket))
  const displayedTickets = activeTab === 'incoming' ? departmentTickets : personalTickets
  const openTickets = tickets.filter(t => t.status === 'open').length
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
  const highPriorityTickets = tickets.filter(t => t.priority === 'high' && !['resolved','closed'].includes(t.status)).length

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Workspace / Tickets</p>
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage requests, assignments and resolution.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="h-9 rounded-lg"><Download className="mr-2 h-4 w-4"/>Export</Button>
        <Button onClick={toggleForm} className="h-9 rounded-lg"><Plus className="mr-2 h-4 w-4"/>New ticket</Button>
      </div>
    </section>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[['Open',openTickets,AlertCircle,'text-blue-600'],['In progress',inProgressTickets,Clock3,'text-amber-600'],['Resolved',resolvedTickets,CheckCircle2,'text-emerald-600'],['High priority',highPriorityTickets,AlertCircle,'text-red-600']].map(([label,value,Icon,color]) => <Card key={String(label)} className="border-border bg-card shadow-none"><div className="flex items-center justify-between p-4"><div><p className="text-xs font-medium text-muted-foreground">{label as string}</p><p className="mt-1 text-xl font-semibold tracking-tight">{value as number}</p></div><Icon className={`h-5 w-5 ${color as string}`} /></div></Card>)}
    </section>

    {showForm && <Card className="border-border shadow-none"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold">New ticket</h2><p className="text-xs text-muted-foreground">Create a support request.</p></div><Button variant="ghost" size="icon" onClick={toggleForm}><X className="h-4 w-4"/></Button></div><div className="p-5"><TicketForm onSubmit={handleTicketCreated}/></div></Card>}

    <Card className="overflow-hidden border-border bg-card shadow-none">
      <div className="border-b border-border p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold">{activeTab === 'incoming' ? 'Incoming tickets' : 'My tickets'}</h2><p className="text-xs text-muted-foreground">{displayedTickets.length} matching {displayedTickets.length === 1 ? 'ticket' : 'tickets'}</p></div>
          <div className="inline-flex w-fit rounded-lg border border-border bg-muted/50 p-1">
            <button onClick={() => setActiveTab('incoming')} className={`rounded-md px-3 py-1.5 text-xs font-medium ${activeTab === 'incoming' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>Assigned to me <span className="ml-1 opacity-60">{departmentTickets.length}</span></button>
            <button onClick={() => setActiveTab('outgoing')} className={`rounded-md px-3 py-1.5 text-xs font-medium ${activeTab === 'outgoing' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>Created by me <span className="ml-1 opacity-60">{personalTickets.length}</span></button>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search tickets" className="h-10 rounded-lg pl-9"/></div>
          <div className="flex gap-2"><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-10 w-[145px] rounded-lg"><Filter className="mr-2 h-4 w-4"/><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select><Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="h-10 w-[145px] rounded-lg"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All priority</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
        </div>
      </div>
      <div className="min-h-[280px] overflow-x-auto"><TicketList tickets={displayedTickets} loading={loading} onRowClick={id=>navigate(`/app/tickets/${id}`)} actions={user && (user.role === 'admin' || user.role === 'manager') ? (ticket)=><Button variant="ghost" size="icon" onClick={e=>handleDeleteClick(ticket.id,e)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4"/></Button> : undefined}/></div>
    </Card>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete ticket?</AlertDialogTitle><AlertDialogDescription>This removes the ticket, comments and status history. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting ? 'Deleting…' : 'Delete ticket'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}
