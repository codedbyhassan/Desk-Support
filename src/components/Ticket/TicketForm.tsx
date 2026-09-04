import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { AlertCircle, FilePlus2, ImagePlus, Send, Tag, Trash2 } from 'lucide-react'
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

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ATTACHMENT_BUCKET = 'ticket-attachments'

export function TicketForm({ onSubmit }: TicketFormProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [channel, setChannel] = useState<(typeof channels)[number]['value']>('portal')
  const [categoryId, setCategoryId] = useState('none')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState('')
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
        toast({ title: 'Could not load categories', description: 'You can still create a ticket without a category.', variant: 'destructive' })
      } finally {
        setLoadingCategories(false)
      }
    }
    void loadCategories()
  }, [user?.company_id, toast])

  useEffect(() => {
    if (!attachment) {
      setAttachmentPreview('')
      return
    }
    const url = URL.createObjectURL(attachment)
    setAttachmentPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [attachment])

  const handleFileChange = (file: File | undefined) => {
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: 'Unsupported image', description: 'Use JPG, PNG, WEBP, or GIF.', variant: 'destructive' })
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast({ title: 'Image is too large', description: 'Attachments must be 5 MB or smaller.', variant: 'destructive' })
      return
    }
    setAttachment(file)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.id || !user.company_id) {
      toast({ title: 'Not authenticated', description: 'Please sign in again.', variant: 'destructive' })
      return
    }

    const cleanSubject = subject.trim()
    const cleanDescription = description.trim()
    if (!cleanSubject) {
      toast({ title: 'Subject is required', description: 'Enter a short subject for the ticket.', variant: 'destructive' })
      return
    }

    setLoading(true)
    let uploadedPath: string | null = null
    try {
      let photoUrl: string | null = null

      if (attachment) {
        const extension = attachment.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${user.id}/${crypto.randomUUID()}.${extension}`
        const { data: uploaded, error: uploadError } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .upload(path, attachment, { contentType: attachment.type, cacheControl: '3600', upsert: false })
        if (uploadError) throw uploadError
        uploadedPath = uploaded.path

        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .createSignedUrl(uploaded.path, 60 * 60 * 24 * 7)
        if (signedUrlError) throw signedUrlError
        photoUrl = signedUrlData.signedUrl
      }

      const ticketPayload = {
        company_id: user.company_id,
        subject: cleanSubject,
        description: cleanDescription || null,
        priority,
        channel,
        category_id: categoryId === 'none' ? null : categoryId,
        requester_id: user.id,
        created_by: user.id,
        photo_url: photoUrl,
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
        toast({ title: 'Ticket created with a warning', description: 'The ticket was created, but its initial history entry could not be saved.', variant: 'destructive' })
      } else {
        toast({ title: 'Ticket created', description: `Ticket #${data.ticket_number} was created successfully.` })
      }

      onSubmit?.(data.id)
      setSubject('')
      setDescription('')
      setPriority('medium')
      setChannel('portal')
      setCategoryId('none')
      setAttachment(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage.from(ATTACHMENT_BUCKET).remove([uploadedPath]).catch(() => undefined)
      }
      console.error('Error creating ticket:', error)
      toast({ title: 'Could not create ticket', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden bg-card">
      <div className="shrink-0 border-b border-border bg-card px-5 py-5 pr-14 sm:px-6 sm:py-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FilePlus2 className="h-5 w-5" /></div>
          <div className="min-w-0"><h2 className="text-lg font-semibold tracking-tight text-foreground">Create a ticket</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">Describe the issue and attach an image when visual context helps.</p></div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-card p-5 sm:p-6">
        <div className="space-y-7">
          <section className="space-y-4">
            <div><h3 className="text-sm font-semibold text-foreground">Request details</h3><p className="mt-1 text-sm text-muted-foreground">Give the support team enough information to act.</p></div>
            <div className="space-y-2"><Label htmlFor="ticket-subject">Subject <span className="text-destructive">*</span></Label><Input id="ticket-subject" value={subject} onChange={event => setSubject(event.target.value)} placeholder="e.g. Laptop cannot connect to Wi-Fi" maxLength={200} required disabled={loading} /></div>
            <div className="space-y-2"><Label htmlFor="ticket-description">Description</Label><Textarea id="ticket-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="Explain what happened, what you expected, and any useful details." rows={6} disabled={loading} /></div>
          </section>

          <section className="space-y-4 border-t border-border pt-6">
            <div><h3 className="text-sm font-semibold text-foreground">Classification</h3><p className="mt-1 text-sm text-muted-foreground">Choose the values that best describe the request.</p></div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label>Priority</Label><Select value={priority} onValueChange={value => setPriority(value as TicketPriority)} disabled={loading}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{priorities.map(item => <SelectItem key={item.value} value={item.value}><div className="flex flex-col text-left"><span>{item.label}</span><span className="text-xs text-muted-foreground">{item.description}</span></div></SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Channel</Label><Select value={channel} onValueChange={value => setChannel(value as typeof channel)} disabled={loading}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{channels.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Category</Label><Select value={categoryId} onValueChange={setCategoryId} disabled={loading || loadingCategories}><SelectTrigger><Tag className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" /><SelectValue placeholder={loadingCategories ? 'Loading categories…' : 'No category'} /></SelectTrigger><SelectContent><SelectItem value="none">No category</SelectItem>{categories.map(category => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-6">
            <div><h3 className="text-sm font-semibold text-foreground">Image attachment</h3><p className="mt-1 text-sm text-muted-foreground">Upload one image directly to secure ticket storage. Maximum 5 MB.</p></div>
            {attachment ? (
              <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
                {attachmentPreview && <img src={attachmentPreview} alt="Attachment preview" className="max-h-56 w-full object-contain bg-muted" />}
                <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{attachment.name}</p><p className="text-xs text-muted-foreground">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p></div><Button type="button" variant="outline" size="sm" onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = '' }} disabled={loading}><Trash2 className="mr-2 h-4 w-4" />Remove</Button></div>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading} className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-sm"><ImagePlus className="h-5 w-5" /></span>
                <span className="text-sm font-semibold text-foreground">Choose an image</span><span className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP or GIF · up to 5 MB</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} className="sr-only" onChange={event => handleFileChange(event.target.files?.[0])} disabled={loading} />
          </section>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>The ticket will be created as <strong className="font-semibold text-foreground">Open</strong> and requested by your current account.</p></div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
        <Button type="submit" disabled={loading || !subject.trim()} className="h-11 rounded-xl px-5 text-sm font-semibold shadow-sm">{loading ? <><Spinner size="sm" className="mr-2" />Creating ticket…</> : <><Send className="mr-2 h-4 w-4" />Create ticket</>}</Button>
      </div>
    </form>
  )
}
