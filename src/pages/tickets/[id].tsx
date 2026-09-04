import { useParams, useNavigate } from 'react-router-dom'
import { TicketDetail } from '@/components/Ticket/TicketDetail'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function TicketDetailPage(){
 const {id}=useParams();const navigate=useNavigate()
 if(!id)return <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">Ticket not found</div>
 return <div className="space-y-3"><Button variant="ghost" onClick={()=>navigate('/app/tickets')} className="gap-2"><ArrowLeft className="h-4 w-4"/>Back to tickets</Button><TicketDetail ticketId={id}/></div>
}
