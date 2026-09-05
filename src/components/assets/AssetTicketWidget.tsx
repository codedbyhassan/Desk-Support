import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Ticket } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface AssetTicketWidgetProps { assetId: string; onCreateTicket?: () => void }
type TicketSummary = Pick<Ticket, 'id' | 'ticket_number' | 'subject' | 'status' | 'priority' | 'created_at'>
const statusClass: Record<string, string> = { open: 'border-red-200 bg-red-50 text-red-700', in_progress: 'border-amber-200 bg-amber-50 text-amber-700', pending: 'border-slate-200 bg-slate-100 text-slate-700', resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700', closed: 'border-slate-200 bg-slate-100 text-slate-600' }

export function AssetTicketWidget({ assetId, onCreateTicket }: AssetTicketWidgetProps) {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true); else setLoading(true)
    try {
      const links = await supabase.from('asset_tickets').select('ticket_id').eq('asset_id', assetId)
      if (links.error) throw links.error
      const ids = (links.data ?? []).map((row) => row.ticket_id)
      if (!ids.length) { setTickets([]); return }
      const result = await supabase.from('tickets').select('id,ticket_number,subject,status,priority,created_at').in('id', ids).order('created_at', { ascending: false }).limit(8)
      if (result.error) throw result.error
      setTickets((result.data ?? []) as TicketSummary[])
    } catch (error) {
      console.error('Error loading asset tickets:', error)
      setTickets([])
    } finally { setLoading(false); setRefreshing(false) }
  }, [assetId])

  useEffect(() => { void load() }, [load])

  return <Card className="overflow-hidden border-border bg-card shadow-none"><div className="flex items-center justify-between gap-3 border-b border-border bg-card p-4 lg:p-5"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-muted/30"><ClipboardList className="h-4 w-4 text-muted-foreground" /></span><div><h2 className="text-sm font-semibold">Related tickets</h2><p className="mt-0.5 text-xs text-muted-foreground">Support requests connected to this asset</p></div></div><div className="flex items-center gap-2">{refreshing && <span className="text-xs text-muted-foreground">Updating…</span>}{onCreateTicket && <Button size="sm" onClick={onCreateTicket}><Plus className="mr-2 h-4 w-4" /> New ticket</Button>}</div></div><div className="bg-card p-4 lg:p-5">{loading ? <div className="space-y-2">{[1,2,3].map((row) => <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div> : tickets.length === 0 ? <div className="rounded-xl border border-dashed border-border bg-muted/10 px-5 py-9 text-center"><ClipboardList className="mx-auto h-7 w-7 text-muted-foreground/60" /><p className="mt-3 text-sm font-medium">No related tickets</p><p className="mt-1 text-xs text-muted-foreground">Tickets linked to this asset will appear here.</p></div> : <div className="space-y-2">{tickets.map((ticket) => <button key={ticket.id} type="button" className="w-full rounded-xl border border-border bg-background p-3 text-left transition-colors hover:bg-muted/30" onClick={() => navigate(`/app/tickets/${ticket.id}`)}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{ticket.subject}</p><p className="mt-1 font-mono text-xs text-muted-foreground">TKT-{ticket.ticket_number}</p></div><Badge variant="outline" className={`shrink-0 capitalize ${statusClass[ticket.status] ?? ''}`}>{ticket.status.replace('_', ' ')}</Badge></div><div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span className="capitalize">{ticket.priority}</span><span>{new Date(ticket.created_at).toLocaleDateString()}</span></div></button>)}</div>}</div></Card>
}
