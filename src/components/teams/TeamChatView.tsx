import { useEffect, useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users, Send, Paperclip, Image as ImageIcon, Mic, MoreVertical,
  Search, X, Download, Play, File,
  MessageSquare, CheckCheck, Phone, Video, Loader2,
  UserPlus, Smile, Edit, Trash2, Pin, ChevronDown, ChevronRight
} from 'lucide-react'

interface Message {
  id: string
  content: string
  sender_id: string
  sender: { 
    id: string
    full_name: string
    email: string
    avatar_url?: string
  } | null
  created_at: string
  type: 'text' | 'image' | 'file' | 'audio' | 'call'
  file_url?: string
  file_name?: string
  file_size?: number
  reactions?: Reaction[]
  isNew?: boolean
}

interface Reaction {
  id: string
  emoji: string
  user_id: string
  user_name: string
}

interface TeamMember {
  id: string
  user: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  role: string
  is_online?: boolean
}

interface Team {
  id: string
  name: string
  description: string
  company_id: string
}

interface CompanyUser {
  id: string
  full_name: string
  email: string
  avatar_url?: string
}

interface TypingUser {
  user_id: string
  user_name: string
  timestamp: number
}

interface TeamChatViewProps {
  teamId: string | null
  onClose?: () => void
}

const REACTIONS = ['👍', '❤️', '😂', '🎉', '😮', '😢']

export default function TeamChatView({ teamId, onClose }: TeamChatViewProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [userScrolled, setUserScrolled] = useState(false)
  const previousMessageCountRef = useRef(0)
  const [showGroupInfo, setShowGroupInfo] = useState(true)
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([])
  const [addingMember, setAddingMember] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const [expandedSections, setExpandedSections] = useState({
    files: true,
    videos: true,
    audio: true,
    members: true
  })
  const [teamFiles, setTeamFiles] = useState<any[]>([])

  useEffect(() => {
    if (user?.company_id && teamId) {
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
          (payload) => {
            if (payload.eventType === 'INSERT') {
              fetchMessagesWithNewIndicator(payload.new.id)
            } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
              fetchMessages()
            }
          }
        )
        .subscribe()

      const typingChannel = supabase
        .channel(`typing-${teamId}`)
        .on('presence', { event: 'sync' }, () => {
          const state = typingChannel.presenceState()
          const typing = Object.values(state).flat().filter(
            (u: any) => u.user_id !== user?.id && Date.now() - u.timestamp < 3000
          ) as TypingUser[]
          setTypingUsers(typing)
        })
        .subscribe()

      return () => {
        supabase.removeChannel(messagesChannel)
        supabase.removeChannel(typingChannel)
      }
    }
  }, [teamId, user?.company_id])

  useEffect(() => {
    if (messages.length > previousMessageCountRef.current) {
      if (!userScrolled) {
        scrollToBottom(true)
      }
      previousMessageCountRef.current = messages.length
    }
  }, [messages, userScrolled])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      setUserScrolled(!isAtBottom)
    }

    container.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => container.removeEventListener('scroll', handleScroll)
  }, [messages])

  const fetchTeamData = async () => {
    if (!user?.company_id || !teamId) return

    try {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .eq('company_id', user.company_id)
        .single()

      if (teamError) throw teamError
      setTeam(teamData)

      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          id,
          role,
          user:users(id, full_name, email, avatar_url)
        `)
        .eq('team_id', teamId)

      if (membersError) throw membersError
      setMembers((membersData as any) || [])

    } catch (error) {
      console.error('Error fetching team data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load team details',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    if (!user?.company_id || !teamId) return

    try {
      const { data, error } = await supabase
        .from('team_messages')
        .select(`
          id,
          content,
          sender_id,
          sender:users(id, full_name, email, avatar_url),
          created_at,
          type,
          file_url,
          file_name,
          file_size
        `)
        .eq('team_id', teamId)
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      const messagesWithReactions = await Promise.all(
        (data || []).map(async (msg: any) => {
          const { data: reactions } = await supabase
            .from('message_reactions')
            .select(`
              id,
              emoji,
              user_id,
              user:users(full_name)
            `)
            .eq('message_id', msg.id)
          
          return {
            ...msg,
            reactions: reactions?.map(r => ({
              id: r.id,
              emoji: r.emoji,
              user_id: r.user_id,
              user_name: (r.user as any)?.full_name || 'Unknown'
            })) || []
          }
        })
      )
      
      setMessages(messagesWithReactions)
      
      setTimeout(() => {
        scrollToBottom(false)
      }, 100)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const fetchMessagesWithNewIndicator = async (newMessageId: string) => {
    if (!user?.company_id || !teamId) return

    try {
      const { data, error } = await supabase
        .from('team_messages')
        .select(`
          id,
          content,
          sender_id,
          sender:users(id, full_name, email, avatar_url),
          created_at,
          type,
          file_url,
          file_name,
          file_size
        `)
        .eq('team_id', teamId)
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      const messagesWithAnimation = (data as any[] || []).map((msg: any) => ({
        ...msg,
        isNew: msg.id === newMessageId,
        reactions: []
      }))
      
      setMessages(messagesWithAnimation)
      
      setTimeout(() => {
        scrollToBottom(true)
      }, 100)
      
      setTimeout(() => {
        setMessages(prev => prev.map(msg => ({ ...msg, isNew: false })))
      }, 600)
      
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const fetchTeamFiles = async () => {
    if (!user?.company_id || !teamId) return

    try {
      const { data, error } = await supabase
        .from('team_messages')
        .select('id, file_url, file_name, type, created_at')
        .eq('team_id', teamId)
        .eq('company_id', user.company_id)
        .in('type', ['image', 'file', 'audio'])
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setTeamFiles(data || [])
    } catch (error) {
      console.error('Error fetching team files:', error)
    }
  }

  const fetchCompanyUsers = async () => {
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
      setCompanyUsers(data || [])
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
  }

  const handleAddMember = async (userId: string) => {
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
        description: 'Member added successfully',
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
  }

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end'
    })
  }

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true)
      const channel = supabase.channel(`typing-${teamId}`)
      channel.track({
        user_id: user?.id,
        user_name: user?.full_name,
        timestamp: Date.now()
      })
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 2000)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return
    if (!user?.id || !user?.company_id || !teamId) return

    setSending(true)
    try {
      const messageData: any = {
        team_id: teamId,
        sender_id: user.id,
        company_id: user.company_id,
        type: selectedFile ? (
          selectedFile.type.startsWith('image/') ? 'image' : 
          selectedFile.type.startsWith('video/') ? 'file' :
          selectedFile.type.startsWith('audio/') ? 'audio' : 'file'
        ) : 'text'
      }

      if (newMessage.trim()) {
        messageData.content = newMessage.trim()
      } else if (!selectedFile) {
        return
      } else {
        messageData.content = selectedFile.name
      }

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${teamId}/${Date.now()}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('team-files')
          .upload(fileName, selectedFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('team-files')
          .getPublicUrl(fileName)

        messageData.file_url = publicUrl
        messageData.file_name = selectedFile.name
        messageData.file_size = selectedFile.size
      }

      const { error } = await supabase
        .from('team_messages')
        .insert(messageData)
        .select()

      if (error) throw error

      setNewMessage('')
      setSelectedFile(null)
      setUserScrolled(false)
      setIsTyping(false)
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to send message',
        variant: 'destructive'
      })
    } finally {
      setSending(false)
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user?.id) return

    try {
      const message = messages.find(m => m.id === messageId)
      const existingReaction = message?.reactions?.find(
        r => r.user_id === user.id && r.emoji === emoji
      )

      if (existingReaction) {
        await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id)
      } else {
        await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji: emoji
          })
      }

      await fetchMessages()
    } catch (error) {
      console.error('Error handling reaction:', error)
    }
    
    setShowReactionPicker(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const MAX_FILE_SIZE = 10 * 1024 * 1024
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 10MB',
          variant: 'destructive'
        })
        return
      }
      setSelectedFile(file)
    }
  }

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
    
    const dateStr = date.toDateString()
    const todayStr = today.toDateString()
    const yesterdayStr = yesterday.toDateString()
    
    if (dateStr === todayStr) {
      return 'Today'
    } else if (dateStr === yesterdayStr) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    }
  }

  const getDateKey = (dateString: string) => {
    const date = new Date(dateString)
    return date.toDateString()
  }

  const groupMessagesByDate = (messages: Message[]) => {
    const grouped: { [key: string]: Message[] } = {}
    messages.forEach(msg => {
      const dateKey = getDateKey(msg.created_at)
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(msg)
    })
    return grouped
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getAvatarColor = (userId: string) => {
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-emerald-500 to-teal-500',
      'from-amber-500 to-orange-500',
      'from-red-500 to-rose-500',
      'from-indigo-500 to-purple-500',
    ]
    const index = parseInt(userId.slice(0, 8), 16) % colors.length
    return colors[index]
  }

  const groupReactions = (reactions?: Reaction[]) => {
    if (!reactions || reactions.length === 0) return []
    
    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = []
      }
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

  // If no team selected, show empty state
  if (!teamId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <MessageSquare className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a team</h3>
          <p className="text-slate-500">Choose a team from the list to start chatting</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-slate-400 animate-spin" />
          <p className="text-sm text-slate-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Team not found</h2>
          <p className="text-slate-500">This team doesn't exist or you don't have access.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex bg-slate-50">
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .message-enter {
          animation: slideInUp 0.3s ease-out;
        }

        .chat-pattern {
          background-image: 
            radial-gradient(circle at 20% 50%, rgba(226, 232, 240, 0.3) 1px, transparent 1px),
            radial-gradient(circle at 80% 80%, rgba(226, 232, 240, 0.3) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 chat-pattern">
        {/* Chat Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-11 w-11">
                <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(team.id)} text-white font-semibold`}>
                  {getInitials(team.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-lg text-slate-900">{team.name}</h2>
                <p className="text-sm text-slate-500">{members.length} members</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64 h-9 rounded-lg border-slate-200"
                />
              </div>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
                <Video className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 w-9 p-0 rounded-lg"
                onClick={() => setShowGroupInfo(!showGroupInfo)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-6 py-4"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                <MessageSquare className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No messages yet</h3>
              <p className="text-slate-500 text-center max-w-sm">
                Start the conversation by sending the first message
              </p>
            </div>
          ) : (
            <>
              {(() => {
                const groupedMessages = groupMessagesByDate(messages)
                const dateKeys = Object.keys(groupedMessages).sort((a, b) => 
                  new Date(a).getTime() - new Date(b).getTime()
                )

                return dateKeys.map((dateKey) => {
                  const dateMessages = groupedMessages[dateKey]
                  const firstMessageDate = dateMessages[0]?.created_at

                  return (
                    <div key={dateKey}>
                      {/* Date Separator */}
                      <div className="flex justify-center my-6">
                        <div className="bg-slate-200/80 backdrop-blur-sm rounded-full px-4 py-1.5 shadow-sm">
                          <span className="text-xs font-medium text-slate-700">
                            {formatDate(firstMessageDate)}
                          </span>
                        </div>
                      </div>

                      {/* Messages - Simplified version for brevity */}
                      {dateMessages.map((message, msgIndex) => {
                        const isOwn = message.sender_id === user?.id
                        const prevMessage = msgIndex > 0 ? dateMessages[msgIndex - 1] : null
                        const nextMessage = msgIndex < dateMessages.length - 1 ? dateMessages[msgIndex + 1] : null
                        const showAvatar = !isOwn && (
                          !nextMessage || 
                          nextMessage.sender_id !== message.sender_id ||
                          new Date(nextMessage.created_at).getTime() - new Date(message.created_at).getTime() > 300000
                        )
                        const showName = !isOwn && (
                          !prevMessage || 
                          prevMessage.sender_id !== message.sender_id ||
                          new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000
                        )
                        const isGroupStart = !prevMessage || prevMessage.sender_id !== message.sender_id

                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                              isGroupStart ? 'mt-4' : 'mt-1'
                            } ${message.isNew ? 'message-enter' : ''}`}
                          >
                            <div className={`flex gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                              {showAvatar && !isOwn && (
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarImage src={message.sender?.avatar_url} />
                                  <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(message.sender_id)} text-white text-xs font-semibold`}>
                                    {getInitials(message.sender?.full_name || 'U')}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              {!showAvatar && !isOwn && (
                                <div className="w-8 flex-shrink-0" />
                              )}

                              <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} flex-1`}>
                                {showName && !isOwn && (
                                  <span className="text-xs font-medium text-slate-600 mb-1 px-1">
                                    {message.sender?.full_name || 'Unknown'}
                                  </span>
                                )}
                                
                                {message.type === 'text' && (
                                  <div
                                    className={`rounded-2xl px-4 py-2.5 ${
                                      isOwn
                                        ? 'bg-slate-900 text-white rounded-br-lg'
                                        : 'bg-white text-slate-900 rounded-bl-lg shadow-sm border border-slate-100'
                                    }`}
                                  >
                                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                                      {message.content}
                                    </p>
                                  </div>
                                )}

                                {message.type === 'image' && (
                                  <div className={`rounded-2xl overflow-hidden shadow-lg max-w-sm ${
                                    isOwn ? 'rounded-br-lg' : 'rounded-bl-lg'
                                  }`}>
                                    <img
                                      src={message.file_url}
                                      alt="Shared image"
                                      className="max-w-full h-auto max-h-[400px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => window.open(message.file_url, '_blank')}
                                    />
                                  </div>
                                )}

                                {message.type === 'file' && (
                                  <div
                                    className={`rounded-2xl overflow-hidden ${
                                      isOwn
                                        ? 'bg-slate-900 text-white rounded-br-lg'
                                        : 'bg-white text-slate-900 rounded-bl-lg shadow-sm border border-slate-100'
                                    }`}
                                  >
                                    <div className="px-4 py-3 flex items-center gap-3 min-w-[240px]">
                                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                        isOwn ? 'bg-white/10' : 'bg-slate-100'
                                      }`}>
                                        <File className={`h-6 w-6 ${isOwn ? 'text-white' : 'text-slate-600'}`} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate mb-1">{message.file_name}</p>
                                        <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-slate-500'}`}>
                                          {formatFileSize(message.file_size)}
                                        </p>
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => window.open(message.file_url, '_blank')}
                                        className={`h-9 w-9 p-0 rounded-lg ${
                                          isOwn ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                                        }`}
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                <div className={`flex items-center gap-1.5 mt-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-[10px] text-slate-400">
                                    {formatTime(message.created_at)}
                                  </span>
                                  {isOwn && (
                                    <CheckCheck className="h-3 w-3 text-slate-400" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              })()}
              
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 mt-4 mb-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-slate-500">
                    {typingUsers.map(u => u.user_name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {selectedFile && (
          <div className="px-6 py-3 bg-white border-t border-slate-200">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              {selectedFile.type.startsWith('image/') ? (
                <div className="h-16 w-16 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-lg bg-slate-900 flex items-center justify-center shadow-sm flex-shrink-0">
                  <File className="h-6 w-6 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
                className="rounded-lg h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex items-end gap-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt,.mp4,.webm,.mov,.mp3,.wav"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl flex-shrink-0 h-10 w-10 hover:bg-slate-100"
            >
              <Paperclip className="h-5 w-5 text-slate-600" />
            </Button>
            
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="Your message"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  handleTyping()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                className="min-h-[44px] max-h-32 resize-none rounded-xl border-slate-200 pr-10 bg-slate-50 placeholder:text-slate-400 text-sm focus:bg-white"
                rows={1}
                disabled={sending}
              />
              <button
                onClick={() => setShowReactionPicker('input')}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-slate-200 rounded p-1"
              >
                <Smile className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            {newMessage.trim() || selectedFile ? (
              <Button
                onClick={handleSendMessage}
                disabled={sending}
                className="bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/20 h-10 px-4"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            ) : (
              <Button
                className="bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg h-10 w-10 p-0"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Group Info */}
      {showGroupInfo && (
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-slate-200">
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
              <h4 className="font-semibold text-lg text-slate-900 mb-1">{team.name}</h4>
              <p className="text-sm text-slate-500">{team.description}</p>
            </div>
          </div>

          <div className="border-b border-slate-200">
            <button
              onClick={() => setExpandedSections({ ...expandedSections, files: !expandedSections.files })}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium">Files</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {teamFiles.filter(f => f.type === 'image').length}
                </Badge>
                {expandedSections.files ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </button>
            {expandedSections.files && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  {teamFiles.filter(f => f.type === 'image').slice(0, 6).map((file) => (
                    <img
                      key={file.id}
                      src={file.file_url}
                      alt={file.file_name}
                      className="aspect-square rounded-lg object-cover cursor-pointer hover:opacity-80"
                      onClick={() => window.open(file.file_url, '_blank')}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1">
            <button
              onClick={() => setExpandedSections({ ...expandedSections, members: !expandedSections.members })}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 border-b border-slate-200"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium">{members.length} members</span>
              </div>
              {expandedSections.members ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {expandedSections.members && (
              <div className="p-4 space-y-2">
                <Button 
                  className="w-full bg-slate-900 hover:bg-slate-800 rounded-lg justify-start"
                  onClick={() => {
                    setShowAddMember(true)
                    fetchCompanyUsers()
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
                
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"
                  >
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.user.avatar_url} />
                        <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(member.user.id)} text-white text-xs font-semibold`}>
                          {getInitials(member.user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      {member.is_online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{member.user.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Member Dialog */}
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : companyUsers.filter(u =>
                  u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  u.email.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No users found</p>
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
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={companyUser.avatar_url} />
                        <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(companyUser.id)} text-white font-semibold`}>
                          {getInitials(companyUser.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {companyUser.full_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {companyUser.email}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddMember(companyUser.id)}
                        disabled={addingMember}
                        className="bg-slate-900 hover:bg-slate-800 rounded-lg"
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
    </div>
  )
}