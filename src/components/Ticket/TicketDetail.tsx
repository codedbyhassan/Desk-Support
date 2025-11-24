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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
      
      // ✅ Set up real-time subscriptions for ALL ticket changes
      const commentsChannel = supabase
        .channel(`ticket-comments-${ticketId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ticket_comments',
            filter: `ticket_id=eq.${ticketId}`
          },
          () => {
            fetchComments()
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
          () => {
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
          () => {
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
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({ title: 'Error', description: 'Failed to add comment' })
    } finally {
      setCommenting(false)
    }
  }

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
          <p className="text-slate-500 max-w-sm mx-auto">
            This ticket doesn't exist or you don't have access to it.
          </p>
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
      {/* Header with Back Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => navigate('/app/tickets')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tickets
        </Button>
      </div>

      {/* Main Ticket Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-slate-900">{ticket.title}</h1>
              </div>
              <p className="text-slate-600">Ticket #{ticket.id?.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${currentStatus.bg} ${currentStatus.text} border-0 text-sm`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {ticket.status.replace('_', ' ')}
              </Badge>
              <Badge className={`${currentPriority.bg} ${currentPriority.text} border-0 text-sm`}>
                {ticket.priority}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Description */}
          <div className="mb-8">
            <h3 className="font-semibold text-sm text-slate-600 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description
            </h3>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Grid of Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Status Section */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Status
              </label>
              <Select value={ticket.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
                <SelectTrigger className="rounded-lg h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Section */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Priority
              </label>
              <p className="text-lg font-semibold text-slate-900 capitalize">{ticket.priority}</p>
            </div>

            {/* Category Section */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Category
              </label>
              <p className="text-lg font-semibold text-slate-900">{ticket.category || 'N/A'}</p>
            </div>

            {/* Department Section */}
            {ticket.department && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Department
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{ticket.department.name}</p>
                    {ticket.department.description && (
                      <p className="text-xs text-slate-500">{ticket.department.description}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Asset Section */}
            {ticket.asset && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Related Asset
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{ticket.asset.name}</p>
                    {ticket.asset.serial_number && (
                      <p className="text-xs text-slate-500">{ticket.asset.serial_number}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Created By */}
            {ticket.creator && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Created By
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">{ticket.creator.full_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{ticket.creator.full_name}</p>
                    <p className="text-xs text-slate-500">{ticket.creator.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Assigned To */}
            {ticket.assignee && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assigned To
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-700 text-xs font-semibold">{ticket.assignee.full_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{ticket.assignee.full_name}</p>
                    <p className="text-xs text-slate-500">{ticket.assignee.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Created Date */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created
              </label>
              <p className="text-lg font-semibold text-slate-900">
                {new Date(ticket.created_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>

            {/* Updated Date */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Updated
              </label>
              <p className="text-lg font-semibold text-slate-900">
                {new Date(ticket.updated_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status History */}
      {statusHistory.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-slate-600" />
              Status History
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <TicketStatusHistory entries={statusHistory} />
          </CardContent>
        </Card>
      )}

      {/* Comments Section */}
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