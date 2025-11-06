import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth'
import { 
  Clock, 
  User, 
  FileText, 
  Send, 
  Building2, 
  Package, 
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  History,
  ArrowLeft,
  Calendar,
  Tag,
  Activity,
  Zap,
  ExternalLink,
  Edit
} from 'lucide-react'
import { TicketStatusHistory } from './TicketStatusHistory'

interface Comment {
  id: string
  content: string
  created_by: string
  author: { full_name: string; email: string } | null
  created_at: string
}

interface StatusHistoryEntry {
  id: string
  status: string
  changed_by: string
  changed_by_user: { full_name: string; email: string } | null
  created_at: string
}

interface TicketDetailProps {
  ticketId: string
  onStatusChange?: () => void
}

export function TicketDetail({ ticketId, onStatusChange }: TicketDetailProps) {
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<any | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [commenting, setCommenting] = useState(false)
  const [newComment, setNewComment] = useState('')
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (user?.company_id) {
      fetchTicketData()
      
      // ✅ FIX: Set up real-time subscriptions for ALL ticket changes
      const commentsChannel = supabase
        .channel(`ticket-comments-${ticketId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'ticket_comments',
            filter: `ticket_id=eq.${ticketId}` // ✅ Filter by ticket, NOT user
          },
          (payload) => {
            console.log('Comment change detected:', payload)
            
            if (payload.eventType === 'INSERT') {
              // Fetch the new comment with author details
              fetchComments()
            } else if (payload.eventType === 'UPDATE') {
              fetchComments()
            } else if (payload.eventType === 'DELETE') {
              fetchComments()
            }
          }
        )
        .subscribe()

      const statusChannel = supabase
        .channel(`ticket-status-${ticketId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tickets',
            filter: `id=eq.${ticketId}`
          },
          (payload) => {
            console.log('Ticket status changed:', payload)
            fetchTicketData()
          }
        )
        .subscribe()

      const historyChannel = supabase
        .channel(`ticket-history-${ticketId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ticket_status_history',
            filter: `ticket_id=eq.${ticketId}`
          },
          (payload) => {
            console.log('Status history updated:', payload)
            fetchStatusHistory()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(commentsChannel)
        supabase.removeChannel(statusChannel)
        supabase.removeChannel(historyChannel)
      }
    }
  }, [ticketId, user?.company_id])

  const fetchTicketData = async () => {
    if (!user?.company_id) {
      toast({ title: 'Error', description: 'No company associated with user' })
      return
    }

    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          asset:assets(id, name, serial_number, status),
          creator:users!tickets_created_by_fkey(id, full_name, email),
          assignee:users!tickets_assigned_to_fkey(id, full_name, email),
          department:departments(id, name, description)
        `)
        .eq('id', ticketId)
        .eq('company_id', user.company_id)
        .single()

      if (ticketError) throw ticketError
      setTicket(ticketData)

      await Promise.all([
        fetchComments(),
        fetchStatusHistory()
      ])
    } catch (error) {
      console.error('Error loading ticket data:', error)
      toast({ title: 'Error', description: 'Failed to load ticket details' })
    } finally {
      setLoading(false)
    }
  }

  // ✅ Separate function for comments
  const fetchComments = async () => {
    if (!user?.company_id) return

    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('ticket_comments')
        .select(`
          id,
          content,
          created_by,
          created_at,
          author:users!ticket_comments_created_by_fkey(full_name, email)
        `)
        .eq('ticket_id', ticketId)
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: true })

      if (commentsError) throw commentsError
      setComments((commentsData as any) || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  // ✅ Separate function for status history
  const fetchStatusHistory = async () => {
    if (!user?.company_id) return

    try {
      const { data: historyData, error: historyError } = await supabase
        .from('ticket_status_history')
        .select(`
          id,
          status,
          changed_by,
          created_at,
          changed_by_user:users!ticket_status_history_changed_by_fkey(full_name, email)
        `)
        .eq('ticket_id', ticketId)
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false })

      if (historyError) throw historyError
      setStatusHistory((historyData as any) || [])
    } catch (error) {
      console.error('Error fetching status history:', error)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!user?.id || !user?.company_id) return

    setUpdatingStatus(true)
    try {
      const { error: updateErr } = await supabase
        .from('tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ticketId)
        .eq('company_id', user.company_id)

      if (updateErr) throw updateErr

      const { error: historyErr } = await supabase
        .from('ticket_status_history')
        .insert({
          ticket_id: ticketId,
          status: newStatus,
          changed_by: user.id,
          company_id: user.company_id
        })

      if (historyErr) throw historyErr

      toast({ title: 'Success', description: 'Ticket status updated' })
      onStatusChange?.()
      
      // ✅ Real-time will handle the refresh for all users
    } catch (error) {
      console.error('Error updating status:', error)
      toast({ title: 'Error', description: 'Failed to update status' })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !user?.id || !user?.company_id) return

    setCommenting(true)
    try {
      const { error } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: ticketId,
          content: newComment,
          created_by: user.id,
          company_id: user.company_id
        })

      if (error) throw error

      setNewComment('')
      toast({ title: 'Success', description: 'Comment added' })
      
      // ✅ Real-time will handle the refresh for all users
      // No need to call fetchTicketData() here
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({ title: 'Error', description: 'Failed to add comment' })
    } finally {
      setCommenting(false)
    }
  }

  // ... rest of the component remains the same ...
  
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
          <p className="text-sm text-slate-600">Loading ticket details...</p>
        </div>
      </div>
    )

  if (!ticket) 
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Ticket not found</h2>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            This ticket doesn't exist or you don't have access to it.
          </p>
          <Button 
            onClick={() => navigate('/app/tickets')}
            className="bg-slate-900 hover:bg-slate-800 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
        </div>
      </div>
    )

  const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
    open: { bg: 'bg-red-50', text: 'text-red-700', icon: AlertCircle },
    in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Activity },
    resolved: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
    closed: { bg: 'bg-slate-50', text: 'text-slate-600', icon: CheckCircle2 }
  }

  const priorityConfig: Record<string, { bg: string; text: string }> = {
    low: { bg: 'bg-blue-50', text: 'text-blue-700' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-700' },
    high: { bg: 'bg-red-50', text: 'text-red-700' },
    urgent: { bg: 'bg-red-100', text: 'text-red-800' }
  }

  const currentStatus = statusConfig[ticket.status] || statusConfig.closed
  const currentPriority = priorityConfig[ticket.priority] || priorityConfig.medium
  const StatusIcon = currentStatus.icon

  return (
    <div className="space-y-6 max-w-7xl">
      {/* All the existing JSX remains exactly the same */}
      {/* Just showing the comments section as example */}
      
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-slate-600" />
            Comments
            <Badge variant="secondary" className="ml-2">
              {comments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {comments.length > 0 ? (
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-lg shadow-slate-900/20">
                      <span className="text-white text-sm font-semibold">
                        {comment.author?.full_name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-slate-900">
                          {comment.author?.full_name || 'Unknown User'}
                        </p>
                        <span className="text-xs text-slate-400">•</span>
                        <p className="text-xs text-slate-500">
                          {new Date(comment.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 rounded-xl">
              <MessageSquare className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No comments yet. Start the conversation!</p>
            </div>
          )}

          <Separator className="my-4" />

          <div className="space-y-3">
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-24 resize-none rounded-xl border-slate-200"
              disabled={commenting}
            />
            <Button
              onClick={handleAddComment}
              disabled={commenting || !newComment.trim()}
              className="w-full bg-slate-900 hover:bg-slate-800 rounded-xl"
            >
              {commenting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Post Comment
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}