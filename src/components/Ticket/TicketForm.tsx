import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { AlertCircle, FilePlus2, Image, Send, Tag } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { TicketPriority } from '@/types/database'

interface Category {
  id: string
  name: string
  description: string | null
}

interface TicketFormProps {
  onSubmit?: (ticketId: string) => void
}

const priorities: Array<{ value: TicketPriority; label: string; description: string }> = [
  { value: 'low', label: 'Low', description: 'Can wait' },
  { value: 'medium', label: 'Medium', description: 'Normal request' },
  { value: 'high', label: 'High', description: 'Needs attention' },
  { value: 'urgent', label: 'Urgent', description: 'Critical issue' },
]

const channels = [
  { value: 'portal', label: 'Portal' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'chat', label: 'Chat' },
  { value: 'other', label: 'Other' },
] as const

export function TicketForm({ onSubmit }: TicketFormProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [channel, setChannel] = useState<(typeof channels)[number]['value']>('portal')
  const [categoryId, setCategoryId] = useState('none')
  const [photoUrl, setPhotoUrl] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user?.company_id) return

    const loadCategories = async () => {
      setLoadingCategories(true)
      try {
        const { data, error } = await supabase
          .from('ticket_categories')
          .select('id, name, description')
          .eq('company_id', user.company_id)
          .eq('is_active', true)
          .order('name', { ascending: true })

        if (error) throw error
        setCategories(data ?? [])
      } catch (error) {
        console.error('Error loading ticket categories:', error)
        toast({
          title: 'Could not load categories',
          description: 'You can still create a ticket without a category.',
          variant: 'destructive',
        })
      } finally {
        setLoadingCategories(false)
      }
    }

    void loadCategories()
  }, [user?.company_id, toast])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user?.id || !user.company_id) {
      toast({ title: 'Not authenticated', description: 'Please sign in again.', variant: 'destructive' })
      return
    }

    const cleanSubject = subject.trim()
    const cleanDescription = description.trim()
    const cleanPhotoUrl = photoUrl.trim()

    if (!cleanSubject) {
      toast({ title: 'Subject is required', description: 'Enter a short subject for the ticket.', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      // Keep this payload deliberately limited to columns defined by
      // public.tickets. The database generates id, ticket_number, status,
      // timestamps, and applies the remaining defaults.
      const ticketPayload = {
        company_id: user.company_id,
        subject: cleanSubject,
        description: cleanDescription || null,
        priority,
        channel,
        category_id: categoryId === 'none' ? null : categoryId,
        requester_id: user.id,
        created_by: user.id,
        photo_url: cleanPhotoUrl || null,
      }

      const { data, error } = await supabase
        .from('tickets')
        .insert(ticketPayload)
        .select('id, ticket_number, subject, status, priority, channel, category_id, requester_id, created_by')
        .single()

      if (error) throw error

      const { error: historyError } = await supabase.from('ticket_status_history').insert({
        ticket_id: data.id,
        from_status: null,
        to_status: data.status,
        changed_by: user.id,
        note: null,
      })

      if (historyError) {
        console.error('Ticket created but status history failed:', historyError)
        toast({
          title: 'Ticket created with a warning',
          description: 'The ticket was created, but its initial history entry could not be saved.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Ticket created',
          description: `Ticket #${data.ticket_number} was created successfully.`,
        })
      }

      onSubmit?.(data.id)

      setSubject('')
      setDescription('')
      setPriority('medium')
      setChannel('portal')
      setCategoryId('none')
      setPhotoUrl('')
    } catch (error) {
      console.error('Error creating ticket:', error)
      toast({
        title: 'Could not create ticket',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-card px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FilePlus2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">Create a ticket</h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">Describe the issue and we&apos;ll route it through the support workflow.</p>
          </div>
        </div>
      </div>

      <div className="space-y-7 bg-card p-5 sm:p-6">
        <section className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Request details</h4>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">Keep the subject concise and give enough detail for someone to act on it.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-subject">Subject <span className="text-destructive">*</span></Label>
            <Input id="ticket-subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Laptop cannot connect to Wi-Fi" maxLength={200} required disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-description">Description</Label>
            <Textarea id="ticket-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain what happened, what you expected, and any useful details." rows={6} disabled={loading} />
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Classification</h4>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">These values are saved directly to the ticket record.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as TicketPriority)} disabled={loading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {priorities.map((item) => <SelectItem key={item.value} value={item.value}><div className="flex flex-col text-left"><span>{item.label}</span><span className="text-xs text-muted-foreground">{item.description}</span></div></SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(value) => setChannel(value as typeof channel)} disabled={loading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{channels.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId} disabled={loading || loadingCategories}>
                <SelectTrigger><Tag className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" /><SelectValue placeholder={loadingCategories ? 'Loading categories…' : 'No category'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Attachment</h4>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">Add a direct image URL if the issue needs visual context.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-photo">Photo URL <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <div className="relative">
              <Image className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="ticket-photo" type="url" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} placeholder="https://example.com/issue.png" disabled={loading} className="pl-10" />
            </div>
          </div>
        </section>

        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>The ticket will be created as <strong className="font-semibold text-foreground">Open</strong> and requested by your current account.</p>
        </div>

        <Button type="submit" disabled={loading || !subject.trim()} className="h-12 w-full rounded-xl text-sm font-semibold shadow-sm">
          {loading ? <><Spinner size="sm" className="mr-2" /> Creating ticket…</> : <><Send className="mr-2 h-4 w-4" /> Create ticket</>}
        </Button>
      </div>
    </form>
  )
}
