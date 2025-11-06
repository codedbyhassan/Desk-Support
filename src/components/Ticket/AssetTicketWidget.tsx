// FILE: src/components/Ticket/AssetTicketWidget.tsx

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import type { TicketWithHistory } from '@/hooks/useTickets'

interface AssetTicketWidgetProps {
  assetId: string
  onCreateTicket?: () => void
}

export function AssetTicketWidget({ assetId, onCreateTicket }: AssetTicketWidgetProps) {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<TicketWithHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAssetTickets()
  }, [assetId])

  const fetchAssetTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          creator:users!tickets_created_by_fkey(full_name),
          assignee:users!tickets_assigned_to_fkey(full_name)
        `)
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTickets(data || [])
    } catch (error) {
      console.error('Error loading asset tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const statusColors: Record<string, string> = {
    open: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300'
  }

  const priorityColors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-4 lg:p-6">
        <CardTitle className="text-lg lg:text-xl">Related Tickets</CardTitle>
        <Button
          size="sm"
          onClick={onCreateTicket}
          className="gap-1 h-9 lg:h-8 px-3 lg:px-2"
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline">New Ticket</span>
          <span className="sm:hidden">New</span>
        </Button>
      </CardHeader>
      <CardContent className="p-4 lg:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-4 lg:py-6">
            <div className="h-6 w-6 lg:h-8 lg:w-8 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-4 lg:py-6 text-gray-500 text-sm lg:text-base">
            No tickets for this asset
          </div>
        ) : (
          <div className="space-y-2 lg:space-y-3">
            {tickets.slice(0, 5).map((ticket) => (
              <div
                key={ticket.id}
                className="p-3 lg:p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
                onClick={() => navigate(`/tickets/${ticket.id}`)}
              >
                {/* Header with title and status */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2 lg:mb-3">
                  <p className="font-medium text-sm lg:text-base text-gray-900 dark:text-white line-clamp-2 sm:line-clamp-1 flex-1 min-w-0">
                    {ticket.title}
                  </p>
                  <Badge className={`text-xs ${statusColors[ticket.status]} flex-shrink-0 w-fit`}>
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                {/* Description */}
                <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 lg:mb-3 leading-relaxed">
                  {ticket.description}
                </p>
                
                {/* Footer with metadata */}
                <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-2 text-xs text-gray-500">
                  <div className="flex flex-wrap items-center gap-1 lg:gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {ticket.creator?.full_name || 'Unknown'}
                    </span>
                    {ticket.priority && (
                      <Badge 
                        className={`${priorityColors[ticket.priority]} text-xs`} 
                        variant="outline"
                      >
                        {ticket.priority}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {new Date(ticket.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Show more indicator */}
            {tickets.length > 5 && (
              <p className="text-xs text-gray-500 text-center pt-2 lg:pt-3">
                +{tickets.length - 5} more ticket{tickets.length - 5 !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}