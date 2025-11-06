import { useParams, useNavigate } from 'react-router-dom'
import { TicketDetail } from '@/components/Ticket/TicketDetail'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function TicketDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  if (!id) return <div>Ticket not found</div>

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={() => navigate('/tickets')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Tickets
      </Button>
      <TicketDetail ticketId={id} />
    </div>
  )
}