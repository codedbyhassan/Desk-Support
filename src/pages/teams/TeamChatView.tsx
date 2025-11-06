import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { useTeamCall } from '@/hooks/useTeamCall'
import { CallModal } from '@/components/calls/CallModal'
import { FloatingCallWindow } from '@/components/calls/FloatingCallWindow'
import { CallBanner } from '@/components/calls/CallBanner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Users,
  Send,
  Paperclip,
  Image as ImageIcon,
  Mic,
  MoreVertical,
  ArrowLeft,
  UserPlus,
  Search,
  X,
  Download,
  Play,
  FileText,
  File,
  MessageSquare,
  CheckCheck,
  Phone,
  Video,
  Loader2,
} from 'lucide-react'

interface Message {
  id: string
  content: string
  sender_id: string
  sender: { 
    id: string
    full_name: string
    email: string
  } | null
  created_at: string
  type: 'text' | 'image' | 'file' | 'audio' | 'call'
  file_url?: string
  file_name?: string
  file_size?: number
  isNew?: boolean
}

interface TeamMember {
  id: string
  user: {
    id: string
    full_name: string
    email: string
  }
  role: string
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
}

export default function TeamChatView() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showMembers, setShowMembers] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [userScrolled, setUserScrolled] = useState(false)
  const previousMessageCountRef = useRef(0)
  const [visibleDate, setVisibleDate] = useState<string | null>(null)
  const dateObserverRef = useRef<IntersectionObserver | null>(null)
  
  // Add member state
  const [showAddMember, setShowAddMember] = useState(false)
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  
  // Call state
  const [showCallModal, setShowCallModal] = useState(false)
  const [showFloatingCall, setShowFloatingCall] = useState(false)
  const [dismissedBanner, setDismissedBanner] = useState(false)

  const {
    activeCall,
    participants,
    isCreating,
    isEnding,
    isInCall,
    startCall,
    joinCall,
    leaveCall,
    endCall,
    participantCount,
    isCallActive,
  } = useTeamCall(teamId || '', team?.name || '')

  useEffect(() => {
    if (user?.company_id && teamId) {
      fetchTeamData()
      fetchMessages()
      
      const channel = supabase
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

      return () => {
        supabase.removeChannel(channel)
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

      // Update visible date based on scroll position
      const dateElements = container.querySelectorAll('[data-date-key]')
      let currentVisibleDate: string | null = null

      dateElements.forEach((el) => {
        const rect = el.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        
        // Check if date separator is visible in the top portion of the container
        if (rect.top >= containerRect.top && rect.top <= containerRect.top + 100) {
          currentVisibleDate = el.getAttribute('data-date-key')
        }
      })

      if (currentVisibleDate) {
        setVisibleDate(currentVisibleDate)
      }
    }

    container.addEventListener('scroll', handleScroll)
    handleScroll() // Initial check
    return () => container.removeEventListener('scroll', handleScroll)
  }, [messages])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      setRecordingTime(0)
    }
    return () => clearInterval(interval)
  }, [isRecording])

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
          user:users(id, full_name, email)
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

  const fetchCompanyUsers = async () => {
    if (!user?.company_id || !teamId) return

    setLoadingUsers(true)
    try {
      // Get current member IDs
      const memberIds = members.map(m => m.user.id)

      // Fetch all company users excluding current members
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
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

      // Refresh team data
      await fetchTeamData()
      
      // Remove user from available users list
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

  const fetchMessages = async () => {
    if (!user?.company_id || !teamId) return

    try {
      const { data, error } = await supabase
        .from('team_messages')
        .select(`
          id,
          content,
          sender_id,
          sender:users(id, full_name, email),
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
      setMessages((data as any) || [])
      
      // Scroll to bottom after messages load
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
          sender:users(id, full_name, email),
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
        isNew: msg.id === newMessageId
      }))
      
      setMessages(messagesWithAnimation)
      
      // Scroll to bottom for new message
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

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end'
    })
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
        messageData.file_name = selectedFile.name
        messageData.file_size = selectedFile.size
        messageData.file_url = 'placeholder-url'
      }

      const { error } = await supabase
        .from('team_messages')
        .insert(messageData)
        .select()

      if (error) throw error

      setNewMessage('')
      setSelectedFile(null)
      setUserScrolled(false)
      
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

  const handleStartCall = async () => {
    try {
      await startCall()
      setShowCallModal(true)
      setDismissedBanner(false)
    } catch (error) {
      console.error('Failed to start call')
    }
  }

  const handleJoinCall = async () => {
    await joinCall()
    setShowCallModal(true)
    setDismissedBanner(false)
  }

  const handleLeaveCall = async () => {
    await leaveCall()
    setShowCallModal(false)
    setShowFloatingCall(false)
  }

  const handleMinimize = () => {
    setShowCallModal(false)
    setShowFloatingCall(true)
  }

  const handleMaximize = () => {
    setShowFloatingCall(false)
    setShowCallModal(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleRecordToggle = async () => {
    if (isRecording) {
      setIsRecording(false)
      
      if (!user?.id || !user?.company_id || !teamId) return

      try {
        await supabase
          .from('team_messages')
          .insert({
            team_id: teamId,
            sender_id: user.id,
            company_id: user.company_id,
            content: 'Voice message',
            type: 'audio',
            file_name: `voice-${Date.now()}.mp3`
          })
      } catch (error) {
        console.error('Error sending voice message:', error)
      }
    } else {
      setIsRecording(true)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
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

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
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

  const filteredUsers = companyUsers.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
          <p className="text-sm text-slate-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Team not found</h2>
          <p className="text-slate-500 mb-6">This team doesn't exist or you don't have access.</p>
          <Button 
            onClick={() => navigate('/app/teams')}
            className="bg-slate-900 hover:bg-slate-800 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] sm:h-[calc(100vh-8rem)] max-w-7xl mx-auto px-0 sm:px-4">
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .message-enter {
          animation: slideInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(15, 23, 42, 0.3);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(15, 23, 42, 0);
          }
        }
        
        .new-message-glow {
          animation: pulse-glow 1s ease-out;
        }
      `}</style>

      {isCallActive && !isInCall && !dismissedBanner && (
        <CallBanner
          call={activeCall!}
          participants={participants}
          isInCall={isInCall}
          onJoin={handleJoinCall}
          onDismiss={() => setDismissedBanner(true)}
        />
      )}

      {/* Header - Improved Spacing */}
      <Card className="border-slate-200 shadow-sm mb-2 sm:mb-4 bg-white">
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/app/teams')}
                className="rounded-xl flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20 flex-shrink-0">
                <span className="text-white font-bold text-base sm:text-lg">
                  {getInitials(team.name)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg sm:text-xl text-slate-900 truncate mb-1">{team.name}</h2>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex -space-x-2">
                    {members.slice(0, 3).map((member) => (
                      <Avatar key={member.id} className="h-6 w-6 sm:h-7 sm:w-7 border-2 border-white shadow-sm">
                        <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(member.user.id)} text-white text-[10px] sm:text-xs font-semibold`}>
                          {getInitials(member.user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm text-slate-600 font-medium">{members.length} members</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {isCallActive ? (
                isInCall ? (
                  <Button
                    onClick={handleMaximize}
                    className="bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/30 h-9 sm:h-10 px-3 sm:px-4"
                  >
                    <Video className="h-4 w-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Return to Call</span>
                    <span className="sm:hidden">Call</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleJoinCall}
                    disabled={isCreating}
                    className="bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/30 h-9 sm:h-10 px-3 sm:px-4"
                  >
                    <Phone className="h-4 w-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Join Call</span>
                    <span className="sm:hidden">Join</span>
                  </Button>
                )
              ) : (
                <Button
                  onClick={handleStartCall}
                  disabled={isCreating}
                  className="bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/20 h-9 sm:h-10 px-3 sm:px-4"
                >
                  {isCreating ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5 sm:mr-2" />
                      <span className="hidden sm:inline">Starting...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 mr-1.5 sm:mr-2" />
                      <span className="hidden sm:inline">Start Call</span>
                      <span className="sm:hidden">Call</span>
                    </>
                  )}
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowMembers(true)}
                className="rounded-xl border-slate-200 h-9 sm:h-10 px-3 sm:px-4 hidden sm:flex"
              >
                <Users className="h-4 w-4 mr-1.5 sm:mr-2" />
                Members
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowMembers(true)}
                className="rounded-xl h-9 w-9 sm:hidden"
              >
                <Users className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="rounded-xl h-9 w-9 hidden sm:flex">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="rounded-xl h-9 w-9 hidden sm:flex">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Messages Area - Instagram/WhatsApp Style */}
      <Card className="flex-1 overflow-hidden flex flex-col border-slate-200 shadow-sm bg-white">
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <style>{`
            .messages-container::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="messages-container min-h-full flex flex-col justify-end px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-2">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <MessageSquare className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No messages yet</h3>
                <p className="text-slate-500 text-center max-w-sm px-4">
                  Start the conversation by sending the first message to your team
                </p>
              </div>
            ) : (
              (() => {
                const groupedMessages = groupMessagesByDate(messages)
                const dateKeys = Object.keys(groupedMessages).sort((a, b) => 
                  new Date(a).getTime() - new Date(b).getTime()
                )

                return dateKeys.map((dateKey, dateIndex) => {
                  const dateMessages = groupedMessages[dateKey]
                  const firstMessageDate = dateMessages[0]?.created_at

                  return (
                    <div key={dateKey}>
                      {/* Date Separator */}
                      <div 
                        className="flex justify-center my-4 sm:my-6 sticky top-2 z-10"
                        data-date-key={dateKey}
                      >
                        <div className="bg-white/95 backdrop-blur-sm rounded-full px-4 sm:px-5 py-2 shadow-sm border border-slate-200">
                          <span className="text-xs sm:text-sm font-medium text-slate-600">
                            {formatDate(firstMessageDate)}
                          </span>
                        </div>
                      </div>

                      {/* Messages for this date */}
                      {dateMessages.map((message, msgIndex) => {
                        const isOwn = message.sender_id === user?.id
                        const avatarColor = getAvatarColor(message.sender_id)
                        const prevMessage = msgIndex > 0 ? dateMessages[msgIndex - 1] : null
                        const nextMessage = msgIndex < dateMessages.length - 1 ? dateMessages[msgIndex + 1] : null
                        const showAvatar = !isOwn && (
                          !nextMessage || 
                          nextMessage.sender_id !== message.sender_id ||
                          new Date(nextMessage.created_at).getTime() - new Date(message.created_at).getTime() > 300000 // 5 minutes
                        )
                        const showName = !isOwn && (
                          !prevMessage || 
                          prevMessage.sender_id !== message.sender_id ||
                          new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000
                        )

                        if (message.type === 'call') {
                          return (
                            <div key={message.id} className="flex justify-center my-3 sm:my-4">
                              <div className="bg-slate-100/90 backdrop-blur-sm rounded-full px-4 sm:px-5 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-2.5 shadow-sm border border-slate-200">
                                <Phone className="h-4 w-4 text-slate-600" />
                                <span className="text-xs sm:text-sm text-slate-700">
                                  <span className="font-semibold">{message.sender?.full_name}</span> {message.content}
                                </span>
                                <span className="text-[10px] sm:text-xs text-slate-500">{formatTime(message.created_at)}</span>
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 ${
                              message.isNew ? 'message-enter' : ''
                            }`}
                          >
                            <div className={`flex gap-2 max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                              {/* Avatar - only show for others and when needed */}
                              {showAvatar && !isOwn && (
                                <Avatar className="h-8 w-8 flex-shrink-0 mt-auto">
                                  <AvatarFallback className={`bg-gradient-to-br ${avatarColor} text-white text-xs font-semibold`}>
                                    {getInitials(message.sender?.full_name || 'U')}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              {!showAvatar && !isOwn && (
                                <div className="w-8 flex-shrink-0" />
                              )}

                              <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} flex-1`}>
                                {/* Sender name - only show for others and when needed */}
                                {showName && !isOwn && (
                                  <span className="text-[11px] font-medium text-slate-500 mb-0.5 px-2">
                                    {message.sender?.full_name || 'Unknown'}
                                  </span>
                                )}
                                
                                {/* Message bubble */}
                                {message.type === 'text' && (
                                  <div
                                    className={`rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 max-w-full ${
                                      isOwn
                                        ? 'bg-slate-900 text-white rounded-br-sm shadow-lg shadow-slate-900/20'
                                        : 'bg-white text-slate-900 rounded-bl-sm shadow-sm border border-slate-100'
                                    } ${message.isNew && !isOwn ? 'new-message-glow' : ''}`}
                                  >
                                    <p className="text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap">
                                      {message.content}
                                    </p>
                                  </div>
                                )}

                                {message.type === 'image' && (
                                  <div className={`rounded-2xl overflow-hidden shadow-lg max-w-[280px] sm:max-w-sm ${
                                    message.isNew && !isOwn ? 'new-message-glow' : ''
                                  }`}>
                                    <img
                                      src={message.file_url}
                                      alt="Shared image"
                                      className="max-w-full h-auto max-h-[300px] sm:max-h-[400px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => {
                                        // Open image in full screen preview
                                        const newWindow = window.open('', '_blank')
                                        if (newWindow) {
                                          newWindow.document.write(`
                                            <html>
                                              <head><title>${message.file_name || 'Image'}</title></head>
                                              <body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#000;">
                                                <img src="${message.file_url}" style="max-width:100%;max-height:100%;object-fit:contain;" />
                                              </body>
                                            </html>
                                          `)
                                        }
                                      }}
                                    />
                                    {message.content && (
                                      <div className={`px-3 sm:px-4 py-2 ${
                                        isOwn
                                          ? 'bg-slate-900 text-white'
                                          : 'bg-white text-slate-900'
                                      }`}>
                                        <p className="text-sm break-words">{message.content}</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {message.type === 'file' && (
                                  <div
                                    className={`rounded-2xl overflow-hidden ${
                                      isOwn
                                        ? 'bg-slate-900 text-white rounded-br-sm'
                                        : 'bg-white text-slate-900 rounded-bl-sm shadow-sm'
                                    } ${message.isNew && !isOwn ? 'new-message-glow' : ''}`}
                                  >
                                    {/* File Preview */}
                                    {message.file_url && (() => {
                                      const fileExt = message.file_name?.split('.').pop()?.toLowerCase() || ''
                                      const isPdf = fileExt === 'pdf'
                                      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)
                                      const isVideo = ['mp4', 'webm', 'mov'].includes(fileExt)
                                      
                                      if (isImage) {
                                        return (
                                          <div className="max-w-[280px] sm:max-w-sm">
                                            <img
                                              src={message.file_url}
                                              alt={message.file_name}
                                              className="max-w-full h-auto max-h-[300px] sm:max-h-[400px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                              onClick={() => window.open(message.file_url, '_blank')}
                                            />
                                          </div>
                                        )
                                      }
                                      
                                      if (isPdf) {
                                        return (
                                          <div className="p-3 sm:p-4">
                                            <div className="flex items-start gap-3 mb-3">
                                              <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                isOwn ? 'bg-white/10' : 'bg-red-50'
                                              }`}>
                                                <FileText className={`h-6 w-6 ${isOwn ? 'text-white' : 'text-red-600'}`} />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate mb-1">{message.file_name}</p>
                                                <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-slate-500'}`}>
                                                  {formatFileSize(message.file_size)}
                                                </p>
                                              </div>
                                            </div>
                                            <iframe
                                              src={message.file_url}
                                              className="w-full h-[300px] sm:h-[400px] rounded-lg border border-slate-200"
                                              title={message.file_name}
                                            />
                                            <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              onClick={() => window.open(message.file_url, '_blank')}
                                              className={`w-full mt-2 rounded-lg ${
                                                isOwn ? 'hover:bg-white/10' : 'hover:bg-slate-50'
                                              }`}
                                            >
                                              <Download className="h-4 w-4 mr-2" />
                                              Open in new tab
                                            </Button>
                                          </div>
                                        )
                                      }
                                      
                                      if (isVideo) {
                                        return (
                                          <div className="p-2">
                                            <video
                                              src={message.file_url}
                                              controls
                                              className="max-w-full h-auto max-h-[400px] rounded-lg"
                                            >
                                              Your browser does not support the video tag.
                                            </video>
                                            {message.file_name && (
                                              <div className="px-2 py-1.5">
                                                <p className="text-xs font-medium truncate">{message.file_name}</p>
                                                <p className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-slate-500'}`}>
                                                  {formatFileSize(message.file_size)}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      }
                                      
                                      // Default file view
                                      return (
                                        <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-3 min-w-[200px]">
                                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                            isOwn ? 'bg-white/10' : 'bg-slate-100'
                                          }`}>
                                            <FileText className={`h-6 w-6 ${isOwn ? 'text-white' : 'text-slate-600'}`} />
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
                                      )
                                    })()}
                                    
                                    {/* Caption if exists */}
                                    {message.content && message.content !== message.file_name && (
                                      <div className={`px-3 sm:px-4 py-2 border-t ${
                                        isOwn
                                          ? 'bg-slate-900 text-white border-white/10'
                                          : 'bg-white text-slate-900 border-slate-200'
                                      }`}>
                                        <p className="text-sm break-words">{message.content}</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {message.type === 'audio' && (
                                  <div
                                    className={`rounded-2xl px-3 py-2.5 flex items-center gap-2.5 min-w-[200px] ${
                                      isOwn
                                        ? 'bg-slate-900 text-white rounded-br-sm'
                                        : 'bg-white text-slate-900 rounded-bl-sm shadow-sm'
                                    } ${message.isNew && !isOwn ? 'new-message-glow' : ''}`}
                                  >
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className={`h-8 w-8 p-0 rounded-full ${
                                        isOwn ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                                      }`}
                                    >
                                      <Play className="h-4 w-4" />
                                    </Button>
                                    <div className="flex-1">
                                      <div className={`h-1 rounded-full ${isOwn ? 'bg-white/20' : 'bg-slate-200'}`}>
                                        <div className={`h-full w-0 rounded-full ${isOwn ? 'bg-white' : 'bg-slate-900'}`} />
                                      </div>
                                    </div>
                                    <span className="text-xs">0:00</span>
                                  </div>
                                )}

                                {/* Time and read receipt */}
                                <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
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
              })()
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {userScrolled && (
          <div className="absolute bottom-20 sm:bottom-24 left-1/2 transform -translate-x-1/2 z-10">
            <Button
              onClick={() => {
                scrollToBottom(true)
                setUserScrolled(false)
              }}
              className="bg-slate-900 hover:bg-slate-800 rounded-full shadow-lg shadow-slate-900/30 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 rotate-[-90deg]" />
              <span className="hidden sm:inline">New messages</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        )}

        {selectedFile && (
          <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
              {selectedFile.type.startsWith('image/') ? (
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden flex-shrink-0">
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20 flex-shrink-0">
                  {selectedFile.type.startsWith('video/') ? (
                    <Play className="h-6 w-6 text-white" />
                  ) : selectedFile.type.startsWith('audio/') ? (
                    <Mic className="h-6 w-6 text-white" />
                  ) : (
                    <File className="h-6 w-6 text-white" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate mb-0.5">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
                className="rounded-lg h-9 w-9"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {isRecording && (
          <div className="px-6 py-3 border-t border-slate-200 bg-red-50">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-red-600">
                Recording... {formatRecordingTime(recordingTime)}
              </span>
            </div>
          </div>
        )}

        {/* Input Area - Mobile Optimized */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
          <div className="flex items-end gap-2">
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
              disabled={isRecording}
              className="rounded-xl flex-shrink-0 h-10 w-10 hover:bg-slate-50"
            >
              <Paperclip className="h-5 w-5 text-slate-600" />
            </Button>
            <Textarea
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              className="flex-1 min-h-[44px] sm:min-h-[48px] max-h-32 resize-none rounded-2xl sm:rounded-xl border-slate-200 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 text-sm sm:text-base bg-white"
              rows={1}
              disabled={isRecording || sending}
            />
            {newMessage.trim() || selectedFile ? (
              <Button
                onClick={handleSendMessage}
                disabled={sending}
                className="bg-slate-900 hover:bg-slate-800 rounded-full sm:rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30 transition-all flex-shrink-0 h-10 w-10 sm:h-auto sm:w-auto sm:px-4"
              >
                {sending ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            ) : (
              <Button
                onClick={handleRecordToggle}
                className={`rounded-full sm:rounded-xl shadow-lg flex-shrink-0 h-10 w-10 sm:h-auto sm:w-auto sm:px-4 ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                    : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'
                }`}
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Call Modal */}
      {activeCall && (
        <CallModal
          call={activeCall}
          isOpen={showCallModal}
          onClose={() => setShowCallModal(false)}
          onMinimize={handleMinimize}
          onLeave={handleLeaveCall}
        />
      )}

      {/* Floating Call Window */}
      {activeCall && isInCall && showFloatingCall && (
        <FloatingCallWindow
          call={activeCall}
          participantCount={participantCount}
          onMaximize={handleMaximize}
          onLeave={handleLeaveCall}
        />
      )}

      {/* Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Team Members</DialogTitle>
            <DialogDescription>
              {members.length} {members.length === 1 ? 'member' : 'members'} in this team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button 
              className="w-full bg-slate-900 hover:bg-slate-800 rounded-xl"
              onClick={() => {
                setShowAddMember(true)
                fetchCompanyUsers()
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <Avatar className="h-10 w-10 shadow-sm">
                    <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(member.user.id)} text-white font-semibold`}>
                      {getInitials(member.user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">{member.user.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{member.user.email}</p>
                  </div>
                  <Badge 
                    variant={member.role === 'admin' ? 'default' : 'secondary'}
                    className="rounded-full"
                  >
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Add Team Member</DialogTitle>
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
                className="pl-9 rounded-xl"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    {searchQuery ? 'No users found' : 'No available users to add'}
                  </p>
                </div>
              ) : (
                filteredUsers.map((companyUser) => (
                  <div
                    key={companyUser.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <Avatar className="h-10 w-10 shadow-sm">
                      <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(companyUser.id)} text-white font-semibold`}>
                        {getInitials(companyUser.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">
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
                      className="bg-slate-900 hover:bg-slate-800 rounded-xl"
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