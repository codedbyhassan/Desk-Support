import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Ticket } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface TicketWithHistory extends Omit<Ticket, 'asset'> {
  company_id: string
  status_history?: Array<{
    id: string
    status: TicketStatus
    changed_by: string
    created_at: string
    user?: { name: string }
  }>
  asset?: {
    id: string
    name: string
    serial_number?: string
    status: string
  }
  creator?: {
    id: string
    full_name: string
    email?: string
  }
  assignee?: {
    id: string
    full_name: string
    email?: string
  }
  department?: {
    id: string
    name: string
  }
}

export function useTickets() {
  const [tickets, setTickets] = useState<TicketWithHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchTickets = useCallback(async (filters?: {
    assetId?: string
    status?: string
    assignedTo?: string
  }) => {
    if (!user?.company_id) {
      setError('No company associated with user')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      let query = supabase
        .from('tickets')
        .select(`
          *,
          asset:assets(id, name, serial_number),
          creator:users!tickets_created_by_fkey(id, full_name, email),
          assignee:users!tickets_assigned_to_fkey(id, full_name, email),
          department:departments(id, name),
          status_history:ticket_status_history(
            id,
            status,
            changed_by,
            created_at,
            user:users(full_name)
          )
        `)
        .eq('company_id', user.company_id) // CRITICAL: Company filter

      if (filters?.assetId) {
        query = query.eq('asset_id', filters.assetId)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo)
      }

      const { data, error: err } = await query.order('created_at', { ascending: false })

      if (err) throw err
      setTickets(data || [])
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tickets'
      setError(message)
      console.error('Error loading tickets:', err)
      toast({
        title: 'Error loading tickets',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [user?.company_id, toast])

  const createTicket = useCallback(async (ticketData: {
    title: string
    description: string
    photo_url: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    category?: string
    asset_id?: string
    assigned_to?: string
    department_id?: string
  }) => {
    if (!user?.id || !user?.company_id) {
      throw new Error('User not authenticated or no company associated')
    }

    // Create optimistic ticket
    const optimisticTicket: TicketWithHistory = {
      id: 'temp-' + Date.now(),
      ...ticketData,
      created_by: user.id,
      company_id: user.company_id,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      creator: {
        id: user.id,
        full_name: ((user as any).user_metadata?.full_name as string) || 'Current User',
        email: user.email || ''
      }
    }

    try {
      // Add optimistic ticket
      setTickets(prev => [optimisticTicket, ...prev])

      const { data, error: err } = await supabase
        .from('tickets')
        .insert({
          ...ticketData,
          created_by: user.id,
          company_id: user.company_id, // CRITICAL: Company filter
          status: 'open'
        })
        .select()
        .single()

      if (err) throw err

      // Log initial status with company_id
      if (data?.id) {
        await supabase.from('ticket_status_history').insert({
          ticket_id: data.id,
          status: 'open',
          changed_by: user.id,
          company_id: user.company_id // CRITICAL: Company filter
        })
      }

      // Refresh tickets to get actual data
      await fetchTickets()
      toast({
        title: 'Success',
        description: 'Ticket created successfully',
      })

      return data
    } catch (err) {
      // Remove optimistic ticket on error
      setTickets(prev => prev.filter(t => t.id !== optimisticTicket.id))
      const message = err instanceof Error ? err.message : 'Failed to create ticket'
      toast({
        title: 'Error creating ticket',
        description: message,
        variant: 'destructive'
      })
      throw err
    }
  }, [user?.id, user?.company_id, fetchTickets, toast])

  const updateTicketStatus = useCallback(async (ticketId: string, newStatus: TicketStatus) => {
    if (!user?.id || !user?.company_id) {
      throw new Error('User not authenticated or no company associated')
    }

    // Update optimistically
    setTickets(prev => prev.map(ticket => {
      if (ticket.id === ticketId) {
        return {
          ...ticket,
          status: newStatus,
          updated_at: new Date().toISOString()
        }
      }
      return ticket
    }))

    try {
      // Update ticket status with company filter
      const { error: updateErr } = await supabase
        .from('tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ticketId)
        .eq('company_id', user.company_id) // CRITICAL: Company filter

      if (updateErr) throw updateErr

      // Log status change with company_id
      const { error: historyErr } = await supabase
        .from('ticket_status_history')
        .insert({
          ticket_id: ticketId,
          status: newStatus,
          changed_by: user.id,
          company_id: user.company_id // CRITICAL: Company filter
        })

      if (historyErr) throw historyErr

      // Refresh to ensure consistency
      await fetchTickets()
      toast({
        title: 'Status updated',
        description: `Ticket status changed to ${newStatus.replace('_', ' ')}`
      })
    } catch (err) {
      // Revert optimistic update on error
      await fetchTickets()
      const message = err instanceof Error ? err.message : 'Failed to update status'
      toast({
        title: 'Error updating status',
        description: message,
        variant: 'destructive'
      })
      throw err
    }
  }, [user?.id, user?.company_id, fetchTickets, toast])

  const assignTicket = useCallback(async (ticketId: string, userId: string) => {
    if (!user?.company_id) {
      throw new Error('No company associated with user')
    }

    try {
      // Update optimistically
      setTickets(prev => prev.map(ticket => {
        if (ticket.id === ticketId) {
          return {
            ...ticket,
            assigned_to: userId,
            status: 'in_progress',
            updated_at: new Date().toISOString()
          }
        }
        return ticket
      }))

      const { error: err } = await supabase
        .from('tickets')
        .update({ 
          assigned_to: userId, 
          status: 'in_progress',
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
          updated_at: new Date().toISOString() 
        })
        .eq('id', ticketId)
        .eq('company_id', user.company_id) // CRITICAL: Company filter

      if (err) throw err

      // Log status change to in_progress
      await supabase.from('ticket_status_history').insert({
        ticket_id: ticketId,
        status: 'in_progress',
        changed_by: user.id,
        company_id: user.company_id // CRITICAL: Company filter
      })

      await fetchTickets()
      toast({
        title: 'Ticket assigned',
        description: 'Assignment updated successfully'
      })
    } catch (err) {
      // Revert optimistic update
      await fetchTickets()
      const message = err instanceof Error ? err.message : 'Failed to assign ticket'
      toast({
        title: 'Error assigning ticket',
        description: message,
        variant: 'destructive'
      })
      throw err
    }
  }, [user?.id, user?.company_id, fetchTickets, toast])

  const deleteTicket = useCallback(async (ticketId: string) => {
    if (!user?.company_id) {
      throw new Error('No company associated with user')
    }

    try {
      // Delete comments first (foreign key constraint)
      const { error: commentsError } = await supabase
        .from('ticket_comments')
        .delete()
        .eq('ticket_id', ticketId)
        .eq('company_id', user.company_id) // CRITICAL: Company filter

      if (commentsError) throw commentsError

      // Delete status history
      const { error: historyError } = await supabase
        .from('ticket_status_history')
        .delete()
        .eq('ticket_id', ticketId)
        .eq('company_id', user.company_id) // CRITICAL: Company filter

      if (historyError) throw historyError

      // Delete the ticket
      const { error: ticketError } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId)
        .eq('company_id', user.company_id) // CRITICAL: Company filter

      if (ticketError) throw ticketError

      // Update local state
      setTickets(prev => prev.filter(t => t.id !== ticketId))

      toast({
        title: 'Success',
        description: 'Ticket deleted successfully'
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete ticket'
      toast({
        title: 'Error deleting ticket',
        description: message,
        variant: 'destructive'
      })
      throw err
    }
  }, [user?.company_id, toast])

  // Set up real-time subscriptions with company filtering
  useEffect(() => {
    if (!user?.company_id) return

    // Create subscription channels with company filter
    const ticketChanges = supabase
      .channel('ticket-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tickets',
        filter: `company_id=eq.${user.company_id}` // CRITICAL: Company filter
      }, () => {
        fetchTickets()
      })
      .subscribe()

    const historyChanges = supabase
      .channel('history-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ticket_status_history',
        filter: `company_id=eq.${user.company_id}` // CRITICAL: Company filter
      }, () => {
        fetchTickets()
      })
      .subscribe()

    // Initial fetch
    fetchTickets()

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(ticketChanges)
      supabase.removeChannel(historyChanges)
    }
  }, [user?.company_id, fetchTickets])

  return {
    tickets,
    loading,
    error,
    fetchTickets,
    createTicket,
    updateTicketStatus,
    assignTicket,
    deleteTicket
  }
}