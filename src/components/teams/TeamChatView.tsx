import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import DOMPurify from 'dompurify'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users, Send, Paperclip, Image as ImageIcon, Mic,
  Search, X, Download, Play, File, Reply, Trash2,
  MessageSquare, CheckCheck, Phone, Video, Loader2,
  UserPlus, Smile, Edit, ChevronDown, ChevronRight,
  AlertCircle, Eye, ArrowLeft, Menu
} from 'lucide-react'

interface Message {
  id: string
  content: string
  sender_id: string
  sender: {
    id: string
    full_name: string
    email: string
    avatar_url?: string | null
  } | null
  created_at: string
  updated_at: string
  type: 'text' | 'image' | 'file' | 'audio' | 'video'
  file_url?: string | null
  file_name?: string | null
  file_size?: number | null
  file_type?: string | null
  reactions?: Reaction[]
  reply_to_id?: string | null
  reply_to_message?: Message | null
  read_by?: ReadReceipt[]
  isNew?: boolean
}

interface Reaction {
  id: string
  emoji: string
  user_id: string
  user_name: string
}

interface ReadReceipt {
  user_id: string
  read_at: string
}

interface TeamMember {
  id: string
  user: {
    id: string
    full_name: string
    email: string
    avatar_url?: string | null
  }
  role: string
  is_online?: boolean
  last_seen?: string | null
}

interface Team {
  id: string
  name: string
  description: string | null
  company_id: string
  created_at: string
}

interface CompanyUser {
  id: string
  full_name: string
  email: string
  avatar_url?: string | null
}

interface TypingUser {
  user_id: string
  user_name: string
  timestamp: number
}

interface TeamChatViewProps {
  teamId: string | null
  userRole?: string
  onClose?: () => void
  onStartCall?: (mode: 'lecture' | 'video') => void
}

const REACTIONS = ['👍', '❤️', '😂', '🎉', '😮', '😢', '🔥', '🎊']
const MESSAGE_LOAD_COUNT = 50
const AUTO_SCROLL_THRESHOLD = 80

export default function TeamChatView({ teamId, userRole, onClose, onStartCall }: TeamChatViewProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const markedAsReadRef = useRef<Set<string>>(new Set())

  // State management
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [userScrolled, setUserScrolled] = useState(false)
  const [callTypeDialogOpen, setCallTypeDialogOpen] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([])
  const [addingMember, setAddingMember] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    files: false,
    images: false,
    videos: false,
    audio: false,
    members: false
  })
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const [teamFiles, setTeamFiles] = useState<Message[]>([])
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null)
  const [messagesLoaded, setMessagesLoaded] = useState(MESSAGE_LOAD_COUNT)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReadReceipts, setShowReadReceipts] = useState<string | null>(null)

  // Fetch team data
  const fetchTeamData = useCallback(async () => {
    if (!user?.company_id || !teamId) return

    try {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .eq('company_id', user.company_id)
        .single()

      if (teamError) throw teamError
      setTeam(teamData as Team)

      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          id, role, last_seen,
          user:users(id, full_name, email, avatar_url)
        `)
        .eq('team_id', teamId)

      if (membersError) throw membersError
      
      const enrichedMembers = (membersData as any[]).map(m => ({
        ...m,
        is_online: m.last_seen ? 
          (Date.now() - new Date(m.last_seen).getTime()) < 60000 : false
      }))
      
      setMembers(enrichedMembers)
      setError(null)
    } catch (error) {
      console.error('Error fetching team data:', error)
      setError('Failed to load team details')
    }
  }, [user?.company_id, teamId])

  const fetchMessages = useCallback(async (limit: number = MESSAGE_LOAD_COUNT) => {
    if (!user?.company_id || !teamId) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('team_messages')
        .select(`
          id, content, sender_id, created_at, updated_at, type,
          file_url, file_name, file_size, file_type,
          reply_to_id,
          sender:users(id, full_name, email, avatar_url),
          reply_to_message:team_messages!reply_to_id(id, content, sender_id, sender:users(id, full_name, email, avatar_url)),
          reactions:message_reactions(id, emoji, user_id, user:users(full_name)),
          read_by:message_reads(user_id, read_at)
        `)
        .eq('team_id', teamId)
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: true })
        .range(0, limit - 1)

      if (error) throw error

      // Enrich messages with sender data if missing
      const enrichedMessages = await Promise.all(
        (data as any[] || []).map(async (msg) => {
          let sender = msg.sender
          
          // If sender is missing, fetch it
          if (!sender && msg.sender_id) {
            try {
              const { data: senderData } = await supabase
                .from('users')
                .select('id, full_name, email, avatar_url')
                .eq('id', msg.sender_id)
                .single()
              
              if (senderData) {
                sender = senderData
              }
            } catch (error) {
              console.error('Error fetching sender:', error)
            }
          }

          // Enrich reply_to_message sender if needed
          let replyToMessage = msg.reply_to_message
          if (replyToMessage && !replyToMessage.sender && replyToMessage.sender_id) {
            try {
              const { data: replySenderData } = await supabase
                .from('users')
                .select('id, full_name, email, avatar_url')
                .eq('id', replyToMessage.sender_id)
                .single()
              
              if (replySenderData) {
                replyToMessage = {
                  ...replyToMessage,
                  sender: replySenderData
                }
              }
            } catch (error) {
              console.error('Error fetching reply sender:', error)
            }
          }

          return {
            ...msg,
            sender,
            reply_to_message: replyToMessage,
            content: DOMPurify.sanitize(msg.content || ''),
            reactions: (msg.reactions || []).map((r: any) => ({
              id: r.id,
              emoji: r.emoji,
              user_id: r.user_id,
              user_name: r.user?.full_name || 'Unknown'
            }))
          }
        })
      )

      setMessages(enrichedMessages)
      setHasMoreMessages(data && data.length === limit)
      setError(null)

      setTimeout(() => scrollToBottom(false), 100)
    } catch (error) {
      console.error('Error fetching messages:', error)
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [user?.company_id, teamId])

  const loadMoreMessages = useCallback(async () => {
    if (!user?.company_id || !teamId || !hasMoreMessages) return

    try {
      const { data, error } = await supabase
        .from('team_messages')
        .select(`
          id, content, sender_id, created_at, updated_at, type,
          file_url, file_name, file_size, file_type,
          reply_to_id,
          sender:users(id, full_name, email, avatar_url),
          reply_to_message:team_messages!reply_to_id(id, content, sender_id, sender:users(id, full_name, email, avatar_url)),
          reactions:message_reactions(id, emoji, user_id, user:users(full_name)),
          read_by:message_reads(user_id, read_at)
        `)
        .eq('team_id', teamId)
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: true })
        .range(messagesLoaded, messagesLoaded + MESSAGE_LOAD_COUNT - 1)

      if (error) throw error

      // Enrich messages with sender data if missing
      const enrichedMessages = await Promise.all(
        (data as any[] || []).map(async (msg) => {
          let sender = msg.sender
          
          // If sender is missing, fetch it
          if (!sender && msg.sender_id) {
            try {
              const { data: senderData } = await supabase
                .from('users')
                .select('id, full_name, email, avatar_url')
                .eq('id', msg.sender_id)
                .single()
              
              if (senderData) {
                sender = senderData
              }
            } catch (error) {
              console.error('Error fetching sender:', error)
            }
          }

          // Enrich reply_to_message sender if needed
          let replyToMessage = msg.reply_to_message
          if (replyToMessage && !replyToMessage.sender && replyToMessage.sender_id) {
            try {
              const { data: replySenderData } = await supabase
                .from('users')
                .select('id, full_name, email, avatar_url')
                .eq('id', replyToMessage.sender_id)
                .single()
              
              if (replySenderData) {
                replyToMessage = {
                  ...replyToMessage,
                  sender: replySenderData
                }
              }
            } catch (error) {
              console.error('Error fetching reply sender:', error)
            }
          }

          return {
            ...msg,
            sender,
            reply_to_message: replyToMessage,
            content: DOMPurify.sanitize(msg.content || ''),
            reactions: (msg.reactions || []).map((r: any) => ({
              id: r.id,
              emoji: r.emoji,
              user_id: r.user_id,
              user_name: r.user?.full_name || 'Unknown'
            }))
          }
        })
      )

      setMessages(prev => [...prev, ...enrichedMessages])
      setMessagesLoaded(prev => prev + MESSAGE_LOAD_COUNT)
      setHasMoreMessages(data && data.length === MESSAGE_LOAD_COUNT)
    } catch (error) {
      console.error('Error loading more messages:', error)
    }
  }, [user?.company_id, teamId, messagesLoaded, hasMoreMessages])

  const fetchTeamFiles = useCallback(async () => {
    if (!user?.company_id || !teamId) return

    try {
      const { data, error } = await supabase
        .from('team_messages')
        .select('id, content, sender_id, created_at, updated_at, type, file_url, file_name, file_size, file_type, company_id, team_id')
        .eq('team_id', teamId)
        .eq('company_id', user.company_id)
        .in('type', ['image', 'file', 'audio', 'video'])
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      
      // Transform to Message format with required fields
      const transformedFiles: Message[] = (data || []).map(file => ({
        id: file.id,
        content: file.content || '',
        sender_id: file.sender_id,
        sender: null,
        created_at: file.created_at || new Date().toISOString(),
        updated_at: file.updated_at || file.created_at || new Date().toISOString(),
        type: (file.type as 'text' | 'image' | 'file' | 'audio' | 'video') || 'file',
        file_url: file.file_url,
        file_name: file.file_name,
        file_size: file.file_size,
        file_type: file.file_type
      }))
      
      setTeamFiles(transformedFiles)
    } catch (error) {
      console.error('Error fetching team files:', error)
    }
  }, [user?.company_id, teamId])

  useEffect(() => {
    if (!user?.company_id || !teamId) return

    fetchTeamData()
    fetchMessages()
    fetchTeamFiles()

    const messagesChannel = supabase
      .channel(`team-chat-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_messages',
          filter: `team_id=eq.${teamId}`
        },
        () => {
          fetchMessages(messagesLoaded)
        }
      )
      .subscribe()

    const typingChannel = supabase
      .channel(`typing-${teamId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState()
        const typing = Object.values(state)
          .flat()
          .filter(
            (u: any) => u.user_id !== user?.id && u.timestamp && Date.now() - u.timestamp < 3000
          )
          .map((u: any) => ({
            user_id: u.user_id || '',
            user_name: u.user_name || 'Unknown',
            timestamp: u.timestamp || Date.now()
          })) as TypingUser[]
        setTypingUsers(typing)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(typingChannel)
    }
  }, [teamId, user?.company_id, user?.id, messagesLoaded, fetchMessages, fetchTeamData, fetchTeamFiles])

  useEffect(() => {
    if (messages.length > 0 && !userScrolled) {
      scrollToBottom(true)
    }
  }, [messages.length, userScrolled])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isAtBottom = scrollHeight - scrollTop - clientHeight < AUTO_SCROLL_THRESHOLD
      setUserScrolled(!isAtBottom)

      if (scrollTop < 100 && hasMoreMessages) {
        loadMoreMessages()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMoreMessages, loadMoreMessages])

  const fetchCompanyUsers = useCallback(async () => {
    if (!user?.company_id || !teamId) return

    setLoadingUsers(true)
    try {
      const memberIds = members.map(m => m.user.id)

      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url')
        .eq('company_id', user.company_id)
        .not('id', 'in', `(${memberIds.join(',')})`)
        .order('full_name')

      if (error) throw error
      setCompanyUsers((data || []) as CompanyUser[])
    } catch (error) {
      console.error('Error fetching company users:', error)
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      })
    } finally {
      setLoadingUsers(false)
    }
  }, [user?.company_id, teamId, members, toast])

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() && !selectedFile) return
    if (!user?.id || !user?.company_id || !teamId) return
    if (sending) return

    setSending(true)
    try {
      const messageData: any = {
        team_id: teamId,
        sender_id: user.id,
        company_id: user.company_id,
        reply_to_id: replyToMessage?.id || null,
        type: selectedFile ? (
          selectedFile.type.startsWith('image/') ? 'image' :
          selectedFile.type.startsWith('video/') ? 'video' :
          selectedFile.type.startsWith('audio/') ? 'audio' : 'file'
        ) : 'text'
      }

      if (newMessage.trim()) {
        messageData.content = DOMPurify.sanitize(newMessage.trim())
      }

      if (selectedFile) {
        const MAX_FILE_SIZE = 100 * 1024 * 1024
        if (selectedFile.size > MAX_FILE_SIZE) {
          throw new Error('File size exceeds 100MB limit')
        }

        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${teamId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('team-files')
          .upload(fileName, selectedFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('team-files')
          .getPublicUrl(fileName)

        messageData.file_url = publicUrl
        messageData.file_name = selectedFile.name
        messageData.file_size = selectedFile.size
        messageData.file_type = selectedFile.type
      }

      const { error } = await supabase
        .from('team_messages')
        .insert(messageData)

      if (error) throw error

      setNewMessage('')
      setSelectedFile(null)
      setReplyToMessage(null)
      setUserScrolled(false)
      setIsTyping(false)

      toast({
        title: 'Success',
        description: 'Message sent'
      })
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to send message',
        variant: 'destructive'
      })
    } finally {
      setSending(false)
    }
  }, [newMessage, selectedFile, user?.id, user?.company_id, teamId, sending, replyToMessage, toast])

  const handleEditMessage = useCallback(async (messageId: string) => {
    if (!editingContent.trim() || !user?.company_id) return

    try {
      const { error } = await supabase
        .from('team_messages')
        .update({ 
          content: DOMPurify.sanitize(editingContent.trim()), 
          updated_at: new Date().toISOString() 
        })
        .eq('id', messageId)
        .eq('company_id', user.company_id)

      if (error) throw error

      setEditingMessageId(null)
      setEditingContent('')
      await fetchMessages(messagesLoaded)

      toast({
        title: 'Success',
        description: 'Message updated'
      })
    } catch (error: any) {
      console.error('Error editing message:', error)
      toast({
        title: 'Error',
        description: 'Failed to edit message',
        variant: 'destructive'
      })
    }
  }, [editingContent, user?.company_id, toast, fetchMessages, messagesLoaded])

  const [deleteMessageDialogOpen, setDeleteMessageDialogOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)

  const handleDeleteMessage = useCallback((messageId: string) => {
    setMessageToDelete(messageId)
    setDeleteMessageDialogOpen(true)
  }, [])

  const handleDeleteMessageConfirm = useCallback(async () => {
    if (!user?.company_id || !messageToDelete) return

    try {
      // Permanently delete the message
      const { error } = await supabase
        .from('team_messages')
        .delete()
        .eq('id', messageToDelete)
        .eq('company_id', user.company_id)

      if (error) throw error

      // Remove the message from the local state immediately
      setMessages(prev => prev.filter(msg => msg.id !== messageToDelete))

      toast({
        title: 'Success',
        description: 'Message deleted'
      })
    } catch (error: any) {
      console.error('Error deleting message:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive'
      })
    } finally {
      setDeleteMessageDialogOpen(false)
      setMessageToDelete(null)
    }
  }, [user?.company_id, messageToDelete, toast])

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user?.id) return

    try {
      const message = messages.find(m => m.id === messageId)
      const existingReaction = message?.reactions?.find(
        r => r.user_id === user.id && r.emoji === emoji
      )

      if (existingReaction) {
        const { error } = await supabase
          .from('message_reactions' as any)
          .delete()
          .eq('id', existingReaction.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('message_reactions' as any)
          .insert({
            message_id: messageId,
            user_id: user.id,
            team_id: teamId,
            emoji: emoji
          })
        if (error) throw error
      }

      await fetchMessages(messagesLoaded)
    } catch (error) {
      console.error('Error handling reaction:', error)
    }
  }, [messages, user?.id, teamId, fetchMessages, messagesLoaded])

  const handleAddMember = useCallback(async (userId: string) => {
    if (!user?.company_id || !teamId) return

    setAddingMember(true)
    try {
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userId,
          role: 'member',
          company_id: user.company_id
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Member added successfully'
      })

      await fetchTeamData()
      setCompanyUsers(prev => prev.filter(u => u.id !== userId))
    } catch (error: any) {
      console.error('Error adding member:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to add member',
        variant: 'destructive'
      })
    } finally {
      setAddingMember(false)
    }
  }, [user?.company_id, teamId, toast, fetchTeamData])

  const handleTyping = useCallback(() => {
    if (!isTyping && newMessage.length > 0) {
      setIsTyping(true)
      const channel = supabase.channel(`typing-${teamId}`)
      channel.track({
        user_id: user?.id,
        user_name: user?.full_name,
        timestamp: Date.now()
      })
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 2000)
  }, [isTyping, newMessage.length, user?.id, user?.full_name, teamId])

  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!user?.id || !user?.company_id) return
    
    if (markedAsReadRef.current.has(messageId)) return
    markedAsReadRef.current.add(messageId)

    try {
      const { error } = await supabase
        .from('message_reads' as any)
        .upsert({
          message_id: messageId,
          user_id: user.id,
          team_id: teamId,
          company_id: user.company_id,
          read_at: new Date().toISOString()
        }, {
          onConflict: 'message_id,user_id'
        })

      if (error) throw error
    } catch (error: any) {
      if (error?.code !== '23505') {
        console.error('Error marking message as read:', error)
      }
    }
  }, [user?.id, user?.company_id, teamId])

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages

    const query = searchQuery.toLowerCase()
    return messages.filter(msg =>
      msg.content?.toLowerCase().includes(query) ||
      msg.sender?.full_name?.toLowerCase().includes(query)
    )
  }, [messages, searchQuery])

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end'
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const MAX_FILE_SIZE = 100 * 1024 * 1024
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 100MB',
          variant: 'destructive'
        })
        return
      }
      setSelectedFile(file)
    }
    // Reset input so same file can be selected again
    if (e.target) {
      e.target.value = ''
    }
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      
      // Try to use the best available mime type
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType as any
      })

      audioChunksRef.current = []
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        const fileExtension = mimeType.includes('mp4') ? 'm4a' : 'webm'
        const audioFile = new File([audioBlob], `audio-${Date.now()}.${fileExtension}`, { type: mimeType })
        setSelectedFile(audioFile)
        
        // Stop all tracks
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop())
          mediaStreamRef.current = null
        }
        
        setIsRecording(false)
        setRecordingTime(0)
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current)
          recordingIntervalRef.current = null
        }
      }

      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      toast({
        title: 'Recording started',
        description: 'Click the stop button to finish recording'
      })
    } catch (error: any) {
      console.error('Error starting recording:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to access microphone. Please allow microphone access.',
        variant: 'destructive'
      })
    }
  }, [toast])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [isRecording])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      audioChunksRef.current = []
      setIsRecording(false)
      setRecordingTime(0)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
      // Stop all tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }
      setSelectedFile(null)
    }
  }, [isRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  const getDateKey = (dateString: string) => new Date(dateString).toDateString()

  const groupMessagesByDate = (msgs: Message[]) => {
    const grouped: { [key: string]: Message[] } = {}
    msgs.forEach(msg => {
      const dateKey = getDateKey(msg.created_at)
      if (!grouped[dateKey]) grouped[dateKey] = []
      grouped[dateKey].push(msg)
    })
    return grouped
  }

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getAvatarColor = (userId: string) => {
    const colors = [
      'from-primary to-primary/80',
      'from-accent to-accent/80',
      'from-success-500 to-green-600',
      'from-warning to-amber-500',
      'from-destructive to-destructive/80',
      'from-purple-500 to-purple-600',
    ]
    const index = parseInt(userId.slice(0, 8), 16) % colors.length
    return colors[index]
  }

  const groupReactions = (reactions?: Reaction[]) => {
    if (!reactions || reactions.length === 0) return []

    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) acc[reaction.emoji] = []
      acc[reaction.emoji].push(reaction)
      return acc
    }, {} as Record<string, Reaction[]>)

    return Object.entries(grouped).map(([emoji, reactions]) => ({
      emoji,
      count: reactions.length,
      users: reactions.map(r => r.user_name),
      hasUserReacted: reactions.some(r => r.user_id === user?.id)
    }))
  }

  if (!teamId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-border">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Select a team</h3>
          <p className="text-muted-foreground">Choose a team from the list to start chatting</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center p-6">
          <AlertCircle className="h-12 w-12 text-destructive/70 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have access to this team</p>
        </div>
      </div>
    )
  }

  const groupedMessages = groupMessagesByDate(filteredMessages)
  const dateKeys = Object.keys(groupedMessages).sort((a, b) =>
    new Date(a).getTime() - new Date(b).getTime()
  )

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-background relative h-full overflow-hidden">
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .message-enter { animation: slideInUp 0.3s ease-out; }
        .chat-pattern {
          background-image: 
            radial-gradient(circle at 20% 50%, rgba(226, 232, 240, 0.3) 1px, transparent 1px),
            radial-gradient(circle at 80% 80%, rgba(226, 232, 240, 0.3) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        .dark .chat-pattern {
          background-image: 
            radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.1) 1px, transparent 1px),
            radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 1px, transparent 1px);
        }
      `}</style>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background chat-pattern h-full overflow-hidden">
        {/* Chat Header */}
        <div className="bg-card border-b border-border px-4 md:px-6 py-2 md:py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="md:hidden h-9 w-9 p-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <Avatar className="h-10 w-10 md:h-11 md:w-11">
                <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(team.id)} text-white font-semibold`}>
                  {getInitials(team.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-base md:text-lg text-foreground truncate">{team.name}</h2>
                <div className="flex items-center gap-2">
                  <p className="text-xs md:text-sm text-muted-foreground">{members.length} members</p>
                  <span className="text-xs text-muted-foreground">•</span>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {members.filter(m => m.is_online).length} online
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              <div className="relative hidden lg:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48 xl:w-64 h-9 rounded-lg border-border"
                />
              </div>
              <Button variant="ghost" size="sm" className="hidden md:flex h-9 w-9 p-0 rounded-lg hover:bg-muted transition-colors">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCallTypeDialogOpen(true)} className="hidden md:flex h-9 w-9 p-0 rounded-lg hover:bg-muted transition-colors">
                <Video className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setShowGroupInfo(!showGroupInfo)}
              >
                {showGroupInfo ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-2">
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mb-4 shadow-sm border border-border">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No messages yet</h3>
              <p className="text-muted-foreground text-center max-w-sm text-sm">
                {searchQuery ? 'No messages match your search' : 'Start the conversation by sending the first message'}
              </p>
            </div>
          ) : (
            <>
              {hasMoreMessages && (
                <div className="flex justify-center my-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMoreMessages}
                    className="rounded-lg text-sm"
                  >
                    Load older messages
                  </Button>
                </div>
              )}

              {dateKeys.map((dateKey) => {
                const dateMessages = groupedMessages[dateKey]
                const firstMessageDate = dateMessages[0]?.created_at

                return (
                  <div key={dateKey}>
                    <div className="flex justify-center my-4 md:my-6">
                      <div className="bg-muted/80 backdrop-blur-sm rounded-full px-3 md:px-4 py-1.5 shadow-sm">
                        <span className="text-xs font-medium text-foreground">
                          {formatDate(firstMessageDate)}
                        </span>
                      </div>
                    </div>

                    {dateMessages.map((message, msgIndex) => {
                      const isOwn = message.sender_id === user?.id
                      const prevMessage = msgIndex > 0 ? dateMessages[msgIndex - 1] : null
                      const isGroupStart = !prevMessage || prevMessage.sender_id !== message.sender_id

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                            isGroupStart ? 'mt-3 md:mt-4' : 'mt-1'
                          } group`}
                          onMouseEnter={() => setHoveredMessage(message.id)}
                          onMouseLeave={() => setHoveredMessage(null)}
                        >
                          <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                              {message.type === 'text' && (
                                <div
                                  className={`rounded-2xl px-3 md:px-4 py-2 md:py-2.5 ${
                                    isOwn
                                      ? 'bg-primary text-primary-foreground rounded-br-lg'
                                      : 'bg-card text-card-foreground rounded-bl-lg shadow-sm border border-border'
                                  }`}
                                >
                                  <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                                    {message.content}
                                  </p>
                                </div>
                              )}

                              {message.type === 'image' && message.file_url && (
                                <div className={`rounded-2xl overflow-hidden shadow-lg max-w-xs md:max-w-sm ${
                                  isOwn ? 'rounded-br-lg' : 'rounded-bl-lg'
                                }`}>
                                  <img
                                    src={message.file_url}
                                    alt="Shared image"
                                    className="max-w-full h-auto max-h-[300px] md:max-h-[400px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(message.file_url || '', '_blank')}
                                    onLoad={() => markMessageAsRead(message.id)}
                                  />
                                </div>
                              )}

                              {message.type === 'file' && (
                                <div
                                  className={`rounded-2xl overflow-hidden ${
                                    isOwn
                                      ? 'bg-primary text-primary-foreground rounded-br-lg'
                                      : 'bg-card text-card-foreground rounded-bl-lg shadow-sm border border-border'
                                  }`}
                                >
                                  <div className="px-3 md:px-4 py-3 flex items-center gap-3 min-w-[200px] md:min-w-[240px]">
                                    <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                      isOwn ? 'bg-primary-foreground/10' : 'bg-muted'
                                    }`}>
                                      <File className={`h-5 w-5 md:h-6 md:w-6 ${isOwn ? 'text-primary-foreground' : 'text-foreground'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs md:text-sm font-medium truncate mb-1">{message.file_name}</p>
                                      <p className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                        {formatFileSize(message.file_size)}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => window.open(message.file_url || '', '_blank')}
                                      className={`h-8 w-8 md:h-9 md:w-9 p-0 rounded-lg ${
                                        isOwn ? 'hover:bg-primary-foreground/10' : 'hover:bg-muted'
                                      }`}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {message.type === 'video' && message.file_url && (
                                <div className={`rounded-2xl overflow-hidden shadow-lg max-w-xs md:max-w-sm ${
                                  isOwn ? 'rounded-br-lg' : 'rounded-bl-lg'
                                }`}>
                                  <video
                                    src={message.file_url}
                                    controls
                                    className="max-w-full h-auto max-h-[300px] md:max-h-[400px] object-cover"
                                    onLoadedMetadata={() => markMessageAsRead(message.id)}
                                  />
                                </div>
                              )}

                              {message.type === 'audio' && message.file_url && (
                                <div className={`rounded-2xl px-3 md:px-4 py-3 ${
                                  isOwn
                                    ? 'bg-primary rounded-br-lg'
                                    : 'bg-card rounded-bl-lg shadow-sm border border-border'
                                }`}>
                                  <audio
                                    src={message.file_url}
                                    controls
                                    className="h-8 w-full max-w-xs"
                                    onLoadedMetadata={() => markMessageAsRead(message.id)}
                                  />
                                </div>
                              )}

                              <div className={`flex items-center gap-1.5 mt-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatTime(message.created_at)}
                                  {message.updated_at !== message.created_at && ' (edited)'}
                                </span>
                                {isOwn && (
                                  <CheckCheck className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>

                              {message.reactions && message.reactions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {groupReactions(message.reactions).map(reaction => (
                                    <div
                                      key={reaction.emoji}
                                      className="flex items-center gap-1 bg-muted rounded-full px-2 py-1 text-xs cursor-pointer hover:bg-muted/80 transition-colors"
                                      title={reaction.users.join(', ')}
                                      onClick={() => handleReaction(message.id, reaction.emoji)}
                                    >
                                      <span>{reaction.emoji}</span>
                                      <span className="text-foreground font-medium">{reaction.count}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {hoveredMessage === message.id && (
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setReplyToMessage(message)}
                                    className="h-8 md:h-7 px-2.5 md:px-2 text-foreground hover:bg-muted rounded-lg text-xs transition-colors"
                                  >
                                    <Reply className="h-4 md:h-3 w-4 md:w-3" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 md:h-7 px-2.5 md:px-2 text-foreground hover:bg-muted rounded-lg transition-colors"
                                      >
                                        <Smile className="h-4 md:h-3 w-4 md:w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="p-2">
                                      <div className="grid grid-cols-4 gap-2">
                                        {REACTIONS.map(emoji => (
                                          <button
                                            key={emoji}
                                            onClick={() => handleReaction(message.id, emoji)}
                                            className="text-xl hover:scale-125 transition-transform"
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  {isOwn && message.type === 'text' && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingMessageId(message.id)
                                          setEditingContent(message.content)
                                        }}
                                          className="h-8 md:h-7 px-2.5 md:px-2 text-foreground hover:bg-muted rounded-lg transition-colors"
                                      >
                                        <Edit className="h-4 md:h-3 w-4 md:w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteMessage(message.id)}
                                        className="h-8 md:h-7 px-2.5 md:px-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                      >
                                        <Trash2 className="h-4 md:h-3 w-4 md:w-3" />
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowReadReceipts(showReadReceipts === message.id ? null : message.id)}
                                    className="h-8 md:h-7 px-2.5 md:px-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                                  >
                                    <Eye className="h-4 md:h-3 w-4 md:w-3" />
                                  </Button>
                                </div>
                              )}

                              {showReadReceipts === message.id && isOwn && message.read_by && (
                                <div className="mt-2 p-2 bg-muted rounded-lg text-xs max-w-xs">
                                  <p className="font-medium mb-1 text-foreground">Read by:</p>
                                  {message.read_by.length > 0 ? (
                                    message.read_by.map((receipt, idx) => (
                                      <p key={idx} className="text-foreground">
                                        {members.find(m => m.user.id === receipt.user_id)?.user.full_name || 'User'} - {formatTime(receipt.read_at)}
                                      </p>
                                    ))
                                  ) : (
                                    <p className="text-muted-foreground">Not read yet</p>
                                  )}
                                </div>
                              )}

                              {editingMessageId === message.id && isOwn && (
                                <div className="mt-2 space-y-2 w-full max-w-xs">
                                  <Textarea
                                    value={editingContent}
                                    onChange={(e) => setEditingContent(e.target.value)}
                                    className="text-sm rounded-lg border-border"
                                    rows={2}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleEditMessage(message.id)}
                                      className="bg-primary hover:bg-primary/90 rounded-lg text-xs"
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingMessageId(null)
                                        setEditingContent('')
                                      }}
                                      className="rounded-lg text-xs"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 mt-4 mb-2 px-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {typingUsers.map(u => u.user_name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {replyToMessage && (
          <div className="px-4 md:px-6 py-3 bg-muted border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Reply className="h-4 w-4 text-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  Replying to {replyToMessage.sender?.full_name || 
                               members.find(m => m.user.id === replyToMessage.sender_id)?.user.full_name || 
                               'User'}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {replyToMessage.content}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyToMessage(null)}
              className="h-7 w-7 p-0 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {selectedFile && (
          <div className="px-4 md:px-6 py-3 bg-card border-t border-border">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-xl border border-border">
              {selectedFile.type.startsWith('image/') ? (
                <div className="h-14 w-14 md:h-16 md:w-16 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : selectedFile.type.startsWith('audio/') ? (
                <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center shadow-sm flex-shrink-0">
                  <Mic className="h-6 w-6 text-white" />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center shadow-sm flex-shrink-0">
                  <File className="h-6 w-6 text-primary-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {selectedFile.name}
                  {isRecording && <span className="ml-2 text-destructive">Recording...</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedFile.type.startsWith('audio/') && isRecording 
                    ? `Recording: ${recordingTime}s` 
                    : formatFileSize(selectedFile.size)}
                </p>
              </div>
              {isRecording ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelRecording}
                  className="rounded-lg h-8 px-3 flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  className="rounded-lg h-8 w-8 p-0 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 bg-card border-t border-border shadow-lg flex-shrink-0 relative z-10 w-full">
          {error && (
            <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex items-end gap-2 md:gap-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt,.mp4,.webm,.mov,.mp3,.wav,.m4a,.ogg,.webm"
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl flex-shrink-0 h-10 w-10 hover:bg-muted"
              disabled={sending}
            >
              <Paperclip className="h-5 w-5 text-foreground" />
            </Button>

            <div className="flex-1 relative min-h-[44px]">
              {editingMessageId ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Editing message</p>
                  <Textarea
                    ref={textareaRef}
                    placeholder="Edit message..."
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="min-h-[44px] max-h-32 resize-none rounded-xl border-border bg-muted text-sm"
                    rows={1}
                    disabled={sending}
                  />
                </div>
              ) : (
                <Textarea
                  ref={textareaRef}
                  placeholder="Your message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    handleTyping()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      editingMessageId ? handleEditMessage(editingMessageId) : handleSendMessage()
                    }
                  }}
                  autoFocus
                  className="min-h-[44px] max-h-32 resize-none rounded-xl border border-border bg-muted placeholder:text-muted-foreground text-sm focus:bg-card focus:ring-1 focus:ring-primary transition-all duration-200 w-full"
                  rows={1}
                  disabled={sending}
                />
              )}
            </div>

            {editingMessageId ? (
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  onClick={() => handleEditMessage(editingMessageId)}
                  disabled={!editingContent.trim() || sending}
                  className="bg-primary hover:bg-primary/90 rounded-xl shadow-lg h-10 px-4"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingMessageId(null)
                    setEditingContent('')
                  }}
                  className="rounded-xl h-10 px-4"
                >
                  Cancel
                </Button>
              </div>
            ) : newMessage.trim() || selectedFile ? (
              <Button
                onClick={handleSendMessage}
                disabled={sending || (!newMessage.trim() && !selectedFile)}
                className="bg-primary hover:bg-primary/90 rounded-xl shadow-lg h-10 w-10 md:w-auto md:px-4 p-0"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            ) : (
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                className={`rounded-xl shadow-lg h-10 ${isRecording ? 'w-auto px-3' : 'w-10'} p-0 ${
                  isRecording 
                    ? 'bg-destructive hover:bg-destructive/90 animate-pulse' 
                    : 'bg-primary hover:bg-primary/90'
                }`}
                disabled={sending}
              >
                {isRecording ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-xs text-white font-medium">{recordingTime}s</span>
                  </div>
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {showGroupInfo && (
        <div className="fixed md:static inset-0 md:inset-auto z-50 md:z-auto w-full md:w-80 bg-card md:border-l border-border flex flex-col overflow-y-auto shadow-2xl md:shadow-lg">
          <div className="p-4 border-b border-border sticky top-0 bg-card z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Group Info</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGroupInfo(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col items-center text-center mb-4">
              <Avatar className="h-20 w-20 mb-3">
                <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(team.id)} text-white font-bold text-2xl`}>
                  {getInitials(team.name)}
                </AvatarFallback>
              </Avatar>
              <h4 className="font-semibold text-lg text-foreground mb-1">{team.name}</h4>
              <p className="text-sm text-muted-foreground">{team.description}</p>
            </div>
          </div>

          <div className="border-b border-border">
            <button
              onClick={() => setExpandedSections({ ...expandedSections, images: !expandedSections.images })}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted"
            >
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-foreground" />
                <span className="text-sm font-medium">Images</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {teamFiles.filter(f => f.type === 'image').length}
                </Badge>
                {expandedSections.images ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </button>
            {expandedSections.images && (
              <div className="px-4 pb-4">
                {teamFiles.filter(f => f.type === 'image').length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {teamFiles.filter(f => f.type === 'image').slice(0, 9).map((file) => (
                      file.file_url && (
                        <img
                          key={file.id}
                          src={file.file_url}
                          alt={file.file_name || 'Image'}
                          className="aspect-square rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(file.file_url || '', '_blank')}
                        />
                      )
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No images shared yet</p>
                )}
              </div>
            )}
          </div>

          <div className="border-b border-border">
            <button
              onClick={() => setExpandedSections({ ...expandedSections, videos: !expandedSections.videos })}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted"
            >
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-foreground" />
                <span className="text-sm font-medium">Videos</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {teamFiles.filter(f => f.type === 'video').length}
                </Badge>
                {expandedSections.videos ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </button>
            {expandedSections.videos && (
              <div className="px-4 pb-4 space-y-2">
                {teamFiles.filter(f => f.type === 'video').length > 0 ? (
                  teamFiles.filter(f => f.type === 'video').slice(0, 5).map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => window.open(file.file_url || '', '_blank')}
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                        <Play className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No videos shared yet</p>
                )}
              </div>
            )}
          </div>

          <div className="border-b border-border">
            <button
              onClick={() => setExpandedSections({ ...expandedSections, audio: !expandedSections.audio })}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted"
            >
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-foreground" />
                <span className="text-sm font-medium">Audio</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {teamFiles.filter(f => f.type === 'audio').length}
                </Badge>
                {expandedSections.audio ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </button>
            {expandedSections.audio && (
              <div className="px-4 pb-4 space-y-2">
                {teamFiles.filter(f => f.type === 'audio').length > 0 ? (
                  teamFiles.filter(f => f.type === 'audio').slice(0, 5).map((file) => (
                    file.file_url && (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted"
                      >
                        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                          <Mic className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                          <audio
                            src={file.file_url}
                            controls
                            className="w-full h-8 mt-1"
                          />
                        </div>
                      </div>
                    )
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No audio files shared yet</p>
                )}
              </div>
            )}
          </div>

          <div className="border-b border-border">
            <button
              onClick={() => setExpandedSections({ ...expandedSections, files: !expandedSections.files })}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted"
            >
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 text-foreground" />
                <span className="text-sm font-medium">Files</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {teamFiles.filter(f => f.type === 'file').length}
                </Badge>
                {expandedSections.files ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </button>
            {expandedSections.files && (
              <div className="px-4 pb-4 space-y-2">
                {teamFiles.filter(f => f.type === 'file').length > 0 ? (
                  teamFiles.filter(f => f.type === 'file').slice(0, 5).map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => window.open(file.file_url || '', '_blank')}
                    >
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <File className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No files shared yet</p>
                )}
              </div>
            )}
          </div>

          <div className="flex-1">
            <button
              onClick={() => setExpandedSections({ ...expandedSections, members: !expandedSections.members })}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted border-b border-border"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-foreground" />
                <span className="text-sm font-medium">{members.length} members</span>
              </div>
              {expandedSections.members ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {expandedSections.members && (
              <div className="p-4 space-y-2">
                {(userRole === 'admin' || userRole === 'owner') && (
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 rounded-lg justify-start"
                    onClick={() => {
                      setShowAddMember(true)
                      fetchCompanyUsers()
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                )}

                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted"
                  >
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.user.avatar_url || undefined} />
                        <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(member.user.id)} text-white text-xs font-semibold`}>
                          {getInitials(member.user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      {member.is_online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success border-2 border-card rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.user.full_name}
                        {member.user.id === user?.id && <span className="text-muted-foreground ml-1">(You)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate capitalize">{member.role}</p>
                    </div>
                    {member.is_online ? (
                      <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                        Online
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {member.last_seen ? formatTime(member.last_seen) : 'Offline'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Select a user from your company to add to this team
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-lg"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : companyUsers.filter(u =>
                  u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  u.email.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No users found</p>
                </div>
              ) : (
                companyUsers
                  .filter(u =>
                    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((companyUser) => (
                    <div
                      key={companyUser.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={companyUser.avatar_url || undefined} />
                        <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(companyUser.id)} text-white font-semibold`}>
                          {getInitials(companyUser.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {companyUser.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {companyUser.email}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddMember(companyUser.id)}
                        disabled={addingMember}
                        className="bg-primary hover:bg-primary/90 rounded-lg"
                      >
                        {addingMember ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Call Type Selector Modal */}
      {onStartCall && (
        <Dialog open={callTypeDialogOpen} onOpenChange={setCallTypeDialogOpen}>
          <DialogContent className="max-w-sm rounded-2xl p-4">
            <DialogHeader>
              <DialogTitle className="text-lg">Start a Video Call</DialogTitle>
            </DialogHeader>

            <div className="mt-3 grid gap-3">
              <div className="p-3 rounded-lg border border-border bg-card">
                <h4 className="font-semibold">Lecture (Listeners)</h4>
                <p className="text-sm text-muted-foreground">Participants join as listeners. Only hosts/speakers publish video/audio.</p>
                <div className="mt-3">
                  <Button onClick={() => {
                    setCallTypeDialogOpen(false)
                    onStartCall('lecture')
                  }} className="w-full">Start Lecture</Button>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-card">
                <h4 className="font-semibold">Video Chat</h4>
                <p className="text-sm text-muted-foreground">All participants can share their video and audio live.</p>
                <div className="mt-3">
                  <Button onClick={() => {
                    setCallTypeDialogOpen(false)
                    onStartCall('video')
                  }} className="w-full">Start Video Chat</Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}