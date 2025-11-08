import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Users,
  Plus,
  Search,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import TeamChatView from '@/components/teams/TeamChatView'

interface Team {
  id: string
  name: string
  description: string
  created_by: string
  company_id: string
  created_at: string
  updated_at: string
  creator?: {
    full_name: string
    email: string
  }
  member_count?: number
  message_count?: number
  online_count?: number
  last_message?: {
    content: string
    created_at: string
    sender_name: string
    sender_id: string
    type: string
  }
}

const AVATAR_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-red-500 to-rose-500',
  'from-indigo-500 to-purple-500',
]

export default function TeamsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    if (user?.company_id) {
      fetchTeams()
      
      const channel = supabase
        .channel('teams-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'teams',
            filter: `company_id=eq.${user.company_id}`
          },
          () => {
            fetchTeams()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user?.company_id])

  const fetchTeams = async () => {
    if (!user?.company_id) return

    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          description,
          created_by,
          company_id,
          created_at,
          updated_at,
          creator:users!teams_created_by_fkey(full_name, email)
        `)
        .eq('company_id', user.company_id)
        .order('updated_at', { ascending: false })

      if (teamsError) throw teamsError

      const teamsWithCounts = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { count: memberCount } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id)

          const { count: messageCount } = await supabase
            .from('team_messages')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id)

          const { data: lastMessage } = await supabase
            .from('team_messages')
            .select(`
              content,
              created_at,
              type,
              sender_id,
              sender:users(full_name)
            `)
            .eq('team_id', team.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          // Count online members (placeholder - would need online status tracking)
          const onlineCount = Math.floor(Math.random() * (memberCount || 1))

          return {
            ...team,
            member_count: memberCount || 0,
            message_count: messageCount || 0,
            online_count: onlineCount,
            last_message: lastMessage ? {
              content: lastMessage.content,
              created_at: lastMessage.created_at,
              sender_name: (lastMessage.sender as any)?.full_name || 'Unknown',
              sender_id: lastMessage.sender_id,
              type: lastMessage.type
            } : undefined
          }
        })
      )

      setTeams(teamsWithCounts)
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async () => {
    if (!user?.id || !user?.company_id) return
    if (!formData.name.trim() || !formData.description.trim()) return

    setSubmitting(true)
    try {
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: formData.name,
          description: formData.description,
          created_by: user.id,
          company_id: user.company_id
        })
        .select()
        .single()

      if (teamError) throw teamError

      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: newTeam.id,
          user_id: user.id,
          role: 'admin',
          company_id: user.company_id
        })

      if (memberError) throw memberError

      setFormData({ name: '', description: '' })
      setCreateDialogOpen(false)
      await fetchTeams()
      
      toast({
        title: 'Success',
        description: 'Team created successfully'
      })

      // Auto-select the newly created team
      setSelectedTeamId(newTeam.id)
    } catch (error) {
      console.error('Error creating team:', error)
      toast({
        title: 'Error',
        description: 'Failed to create team',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleTeamClick = (teamId: string) => {
    setSelectedTeamId(teamId)
  }

  const filteredTeams = teams.filter(team =>
    team.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (teamId: string) => {
    const index = parseInt(teamId.slice(0, 8), 16) % AVATAR_COLORS.length
    return AVATAR_COLORS[index]
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
    return date.toLocaleDateString()
  }

  const formatLastMessage = (team: Team) => {
    if (!team.last_message) return 'No messages yet'
    
    const isCurrentUser = team.last_message.sender_id === user?.id
    const prefix = isCurrentUser ? 'You: ' : ''
    
    if (team.last_message.type === 'image') {
      return `${prefix}📷 Photo`
    }
    if (team.last_message.type === 'audio') {
      return `${prefix}🎤 Voice message`
    }
    if (team.last_message.type === 'file') {
      return `${prefix}📎 File`
    }
    
    const content = team.last_message.content || ''
    return `${prefix}${content.length > 30 ? content.substring(0, 30) + '...' : content}`
  }

  const totalMessages = teams.reduce((acc, team) => acc + (team.message_count || 0), 0)
  const activeTeams = teams.filter(t => t.last_message && 
    new Date(t.last_message.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50">
      {/* Left Sidebar - Teams List */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Teams</h2>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-slate-900 hover:bg-slate-800 h-8 w-8 p-0 rounded-lg">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                  <DialogDescription>
                    Create a team chat group for collaboration
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Team Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Engineering Team"
                      className="rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="What is this team for?"
                      rows={3}
                      className="rounded-lg"
                    />
                  </div>
                  <Button
                    onClick={handleCreateTeam}
                    disabled={submitting || !formData.name.trim() || !formData.description.trim()}
                    className="w-full bg-slate-900 hover:bg-slate-800 rounded-lg"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Team
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-lg border-slate-200 h-9 text-sm"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-slate-900">{teams.length}</div>
              <div className="text-[10px] text-slate-500">Teams</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-slate-900">{totalMessages}</div>
              <div className="text-[10px] text-slate-500">Messages</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-emerald-600">{activeTeams}</div>
              <div className="text-[10px] text-slate-500">Active</div>
            </div>
          </div>
        </div>

        {/* Teams List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-2" />
              <p className="text-sm text-slate-500">Loading teams...</p>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <Users className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-900 mb-1">No teams found</p>
              <p className="text-xs text-slate-500">
                {searchTerm ? 'Try a different search' : 'Create your first team'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredTeams.map((team) => {
                const unreadCount = Math.floor(Math.random() * 5) // Placeholder
                const isSelected = selectedTeamId === team.id
                
                return (
                  <button
                    key={team.id}
                    onClick={() => handleTeamClick(team.id)}
                    className={`w-full p-3 rounded-lg transition-colors text-left group ${
                      isSelected 
                        ? 'bg-slate-900 text-white' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-11 w-11">
                          <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(team.id)} text-white font-semibold text-sm`}>
                            {getInitials(team.name)}
                          </AvatarFallback>
                        </Avatar>
                        {team.online_count && team.online_count > 0 && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border-2 border-white rounded-full" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-semibold text-sm truncate ${
                            isSelected ? 'text-white' : 'text-slate-900'
                          }`}>
                            {team.name}
                          </h3>
                          <span className={`text-[11px] flex-shrink-0 ${
                            isSelected ? 'text-slate-300' : 'text-slate-400'
                          }`}>
                            {team.last_message && getTimeAgo(team.last_message.created_at)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className={`text-xs truncate ${
                            isSelected ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            {formatLastMessage(team)}
                          </p>
                          {unreadCount > 0 && !isSelected && (
                            <Badge className="bg-slate-900 hover:bg-slate-900 text-white rounded-full h-5 min-w-5 flex items-center justify-center text-[10px] ml-2">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Team Chat or Empty State */}
      {selectedTeamId ? (
        <TeamChatView 
          teamId={selectedTeamId} 
          onClose={() => setSelectedTeamId(null)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="text-center">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <MessageSquare className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Select a team to start chatting</h3>
            <p className="text-slate-500 max-w-sm">
              Choose a team from the list to view messages and collaborate with your team members
            </p>
          </div>
        </div>
      )}
    </div>
  )
}