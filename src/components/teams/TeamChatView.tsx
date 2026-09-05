import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Loader2, MessageCircle, MoreVertical, Send, Users, Video } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useCommunications } from '@/hooks/useCommunications'
import { useToast } from '@/hooks/use-toast'

interface Props {
  teamId: string | null
  userRole?: string
  onClose?: () => void
}

const initials = (name: string) => name.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase()
const time = (date: string) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(date))
const day = (date: string) => new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(date))

export default function TeamChatView({ teamId, onClose }: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [teamName, setTeamName] = useState('Team')
  const [draft, setDraft] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [resolvingConversation, setResolvingConversation] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    if (!teamId || !user?.id) {
      setConversationId(null)
      return
    }

    setResolvingConversation(true)
    void (async () => {
      try {
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .select('id,name')
          .eq('id', teamId)
          .single()
        if (teamError) throw teamError
        if (!cancelled) setTeamName(team.name)

        const { data, error } = await supabase.rpc('get_or_create_team_conversation', { p_team_id: teamId })
        if (error) throw error
        if (!cancelled) setConversationId(data as string)
      } catch (error) {
        if (!cancelled) {
          toast({ title: 'Could not open team conversation', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
          setConversationId(null)
        }
      } finally {
        if (!cancelled) setResolvingConversation(false)
      }
    })()

    return () => { cancelled = true }
  }, [teamId, user?.id, toast])

  const communications = useCommunications(conversationId)
  const { messages, activeConversation, loading, sending, sendMessage, startCall } = communications

  const members = activeConversation?.members ?? []
  const visible = useMemo(() => messages.filter(message => !message.deleted_at), [messages])
  const grouped = visible.reduce<Array<{ date: string; items: typeof visible }>>((groups, message) => {
    const key = day(message.created_at)
    const last = groups[groups.length - 1]
    if (last?.date === key) last.items.push(message)
    else groups.push({ date: key, items: [message] })
    return groups
  }, [])

  useEffect(() => {
    if (!loading && visible.length) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [loading, visible.length, conversationId])

  const send = async () => {
    const body = draft.trim()
    if (!body || !conversationId || sending) return
    try {
      await sendMessage(body)
      setDraft('')
      window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 30)
    } catch (error) {
      toast({ title: 'Message not sent', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const beginCall = async () => {
    try {
      const callId = await startCall('video')
      navigate(`/app/calls/${callId}`)
    } catch (error) {
      toast({ title: 'Could not start call', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const displayName = activeConversation?.title ?? teamName

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#efeae2] dark:bg-[#111b21]">
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b bg-background/95 px-4 shadow-sm backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          {onClose && <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose} aria-label="Back to teams"><ArrowLeft /></Button>}
          <Avatar className="size-11"><AvatarFallback className="bg-primary/15 font-semibold text-primary">{initials(displayName)}</AvatarFallback></Avatar>
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{displayName}</h2>
            <p className="truncate text-xs text-muted-foreground">{members.length} members</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowMembers(v => !v)} aria-label="Show team members"><Users /></Button>
          <Button variant="ghost" size="icon" onClick={beginCall} disabled={!conversationId || resolvingConversation} aria-label="Start video call"><Video /></Button>
          <Button variant="ghost" size="icon" aria-label="More options"><MoreVertical /></Button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[.035]" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
        <section className="relative flex h-full flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8">
            {(loading || resolvingConversation) && visible.length === 0 ? (
              <div className="grid h-full place-items-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : visible.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div className="rounded-2xl bg-background/70 p-8 shadow-sm">
                  <MessageCircle className="mx-auto mb-3 text-primary" />
                  <p className="font-semibold">No messages yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Start the conversation with your team.</p>
                </div>
              </div>
            ) : grouped.map(group => (
              <div key={group.date} className="mb-5">
                <div className="mb-4 text-center"><Badge variant="secondary" className="rounded-full bg-background/80 px-3 font-normal shadow-sm">{group.date}</Badge></div>
                <div className="flex flex-col gap-1.5">
                  {group.items.map((message, index) => {
                    const mine = message.sender_id === user?.id
                    const previous = group.items[index - 1]
                    const same = previous?.sender_id === message.sender_id
                    return (
                      <div key={message.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : ''}`}>
                        {!mine && !same && <Avatar className="size-7 shrink-0"><AvatarFallback className="text-[10px]">{initials(message.sender?.full_name ?? 'User')}</AvatarFallback></Avatar>}
                        {!mine && same && <div className="w-7" />}
                        <div className={`max-w-[82%] rounded-2xl px-3.5 py-2 shadow-sm sm:max-w-[68%] ${mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-background'}`}>
                          <div className="flex items-end gap-2">
                            <p className="whitespace-pre-wrap break-words text-[.9375rem] leading-relaxed">{message.body}</p>
                            <span className={`shrink-0 text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{time(message.created_at)}{mine && <Check className="ml-1 inline" size={12} />}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="border-t bg-background/90 p-3 backdrop-blur sm:px-6">
            <div className="mx-auto flex max-w-5xl items-end gap-2">
              <Textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void send() } }} placeholder="Type a message" rows={1} className="max-h-32 min-h-11 resize-none rounded-2xl border-0 bg-muted px-4 py-3 shadow-none focus-visible:ring-1" aria-label="Message" />
              <Button size="icon" className="size-11 shrink-0 rounded-full" onClick={() => void send()} disabled={!draft.trim() || sending || !conversationId} aria-label="Send message">{sending ? <Loader2 className="animate-spin" /> : <Send />}</Button>
            </div>
            <p className="mt-1 text-center text-[10px] text-muted-foreground">Enter to send · Shift + Enter for a new line</p>
          </div>
        </section>

        {showMembers && (
          <aside className="absolute right-0 top-0 h-full w-full max-w-xs border-l bg-background p-5 shadow-xl">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Team members</h3><Button variant="ghost" size="icon" onClick={() => setShowMembers(false)} aria-label="Close members"><ArrowLeft /></Button></div>
            <div className="mt-5 flex flex-col gap-4">
              {members.map(member => <div key={member.user_id} className="flex items-center gap-3"><Avatar className="size-9"><AvatarFallback>{initials(member.profile?.full_name ?? member.profile?.username ?? 'User')}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{member.profile?.full_name ?? 'Team member'}</p><p className="text-xs text-muted-foreground">@{member.profile?.username ?? 'user'}</p></div><span className={`size-2 rounded-full ${member.profile?.is_online ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} /></div>)}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
