import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Clock,
  Hash,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Activity,
  Filter
} from 'lucide-react'

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
  last_message?: {
    content: string
    created_at: string
    sender_name: string
  }
}

const AVATAR_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-red-500 to-rose-500',
  'from-indigo-500 to-purple-500',
  'from-slate-700 to-slate-900',
  'from-teal-500 to-green-500',
]

export default function TeamsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    if (user?.company_id) {
      fetchTeams()
      
      // Set up real-time subscription for team updates
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
            console.log('Teams changed, refetching...')
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

      // Fetch member counts for each team
      const teamsWithCounts = await Promise.all(
        (teamsData || []).map(async (team) => {
          // Get member count
          const { count: memberCount } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id)

          // Get message count
          const { count: messageCount } = await supabase
            .from('team_messages')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id)

          // Get last message
          const { data: lastMessage } = await supabase
            .from('team_messages')
            .select(`
              content,
              created_at,
              sender:users(full_name)
            `)
            .eq('team_id', team.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            ...team,
            member_count: memberCount || 0,
            message_count: messageCount || 0,
            last_message: lastMessage ? {
              content: lastMessage.content,
              created_at: lastMessage.created_at,
              sender_name: (lastMessage.sender as any)?.full_name || 'Unknown'
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

      // Add creator as team member with admin role
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: newTeam.id,
          user_id: user.id,
          role: 'admin'
        })

      if (memberError) throw memberError

      setFormData({ name: '', description: '' })
      setCreateDialogOpen(false)
      await fetchTeams()
      
      toast({
        title: 'Success',
        description: 'Team created successfully'
      })

      // Navigate to new team chat
      navigate(`/app/teams/${newTeam.id}`)
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
    navigate(`/app/teams/${teamId}`)
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
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const totalMessages = teams.reduce((acc, team) => acc + (team.message_count || 0), 0)
  const activeChats = teams.filter(t => t.last_message).length

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1 lg:space-y-2">
            <div className="flex items-center gap-2 text-xs lg:text-sm text-slate-500">
              <span>Collaboration</span>
              <span>/</span>
              <span className="text-slate-900 font-medium">Teams</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Team Collaboration</h1>
            <p className="text-sm lg:text-base text-slate-500 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Real-time chat and collaboration with your teams
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800 rounded-lg lg:rounded-xl shadow-lg shadow-slate-900/20 h-11 lg:h-10">
                <Plus className="h-4 w-4 lg:mr-2" />
                <span className="hidden sm:inline">Create Team</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] lg:max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg lg:text-xl">Create New Team</DialogTitle>
                <DialogDescription className="text-sm lg:text-base">
                  Create a team chat group for collaboration
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 lg:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                    Team Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Engineering Team, Marketing Squad"
                    className="rounded-lg border-slate-200 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                    Description *
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What is this team for?"
                    rows={3}
                    className="rounded-lg border-slate-200 text-sm"
                  />
                </div>
                <Button
                  onClick={handleCreateTeam}
                  disabled={submitting || !formData.name.trim() || !formData.description.trim()}
                  className="w-full bg-slate-900 hover:bg-slate-800 rounded-lg lg:rounded-xl h-11 lg:h-10"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
          <Card className="border-slate-200 hover:shadow-lg transition-shadow">
            <div className="p-3 lg:p-5">
              <div className="flex items-center justify-between mb-2 lg:mb-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-900 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                  <Users className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                </div>
                <Badge className="bg-slate-100 text-slate-700 border-0 text-[10px] lg:text-xs">
                  Active
                </Badge>
              </div>
              <p className="text-xs lg:text-sm font-medium text-slate-500 mb-1">Total Teams</p>
              <div className="flex items-baseline gap-1 lg:gap-2">
                <p className="text-xl lg:text-3xl font-bold text-slate-900">{teams.length}</p>
                {teams.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] lg:text-xs text-emerald-600 font-medium">
                    <TrendingUp className="h-3 w-3" />
                    <span>Growing</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="border-slate-200 hover:shadow-lg transition-shadow">
            <div className="p-3 lg:p-5">
              <div className="flex items-center justify-between mb-2 lg:mb-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-500 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <MessageSquare className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                </div>
                <Badge className="bg-blue-50 text-blue-700 border-0 text-[10px] lg:text-xs">
                  Messages
                </Badge>
              </div>
              <p className="text-xs lg:text-sm font-medium text-slate-500 mb-1">Total Messages</p>
              <div className="flex items-baseline gap-1 lg:gap-2">
                <p className="text-xl lg:text-3xl font-bold text-slate-900">{totalMessages}</p>
                <div className="flex items-center gap-1 text-[10px] lg:text-xs text-blue-600 font-medium">
                  <Activity className="h-3 w-3" />
                  <span>Active</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-slate-200 hover:shadow-lg transition-shadow">
            <div className="p-3 lg:p-5">
              <div className="flex items-center justify-between mb-2 lg:mb-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-emerald-500 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Hash className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px] lg:text-xs">
                  Live
                </Badge>
              </div>
              <p className="text-xs lg:text-sm font-medium text-slate-500 mb-1">Active Chats</p>
              <div className="flex items-baseline gap-1 lg:gap-2">
                <p className="text-xl lg:text-3xl font-bold text-slate-900">{activeChats}</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] lg:text-xs text-emerald-600 font-medium">Online</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-lg border-slate-200 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 lg:py-16">
          <div className="h-10 w-10 lg:h-12 lg:w-12 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mb-3 lg:mb-4" />
          <p className="text-sm text-slate-500">Loading teams...</p>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 lg:py-16">
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-100 rounded-xl lg:rounded-2xl flex items-center justify-center mb-3 lg:mb-4">
            <Users className="h-6 w-6 lg:h-8 lg:w-8 text-slate-400" />
          </div>
          <h3 className="text-base lg:text-lg font-semibold text-slate-900 mb-1 lg:mb-2 text-center">
            {searchTerm ? 'No teams found' : 'No teams yet'}
          </h3>
          <p className="text-sm text-slate-500 mb-4 lg:mb-6 text-center max-w-sm px-4">
            {searchTerm ? 'Try adjusting your search' : 'Get started by creating your first team'}
          </p>
          {!searchTerm && (
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 rounded-lg lg:rounded-xl h-11 lg:h-10"
            >
              <Plus className="h-4 w-4 lg:mr-2" />
              <span className="hidden sm:inline">Create Team</span>
              <span className="sm:hidden">Create</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {filteredTeams.map((team) => {
            const avatarColor = getAvatarColor(team.id)
            
            return (
              <Card
                key={team.id}
                className="cursor-pointer hover:shadow-xl border-slate-200 hover:border-slate-300 transition-all duration-300 group relative overflow-hidden"
                onClick={() => handleTeamClick(team.id)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-4 lg:p-5 relative">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3 lg:mb-4">
                    {/* Avatar */}
                    <div className={`h-12 w-12 lg:h-14 lg:w-14 rounded-xl lg:rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center shadow-lg flex-shrink-0`}>
                      <span className="text-white font-bold text-sm lg:text-lg">
                        {getInitials(team.name)}
                      </span>
                    </div>
                    
                    {/* Team Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm lg:text-base text-slate-900 truncate mb-1 group-hover:text-slate-700 transition-colors">
                        {team.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Users className="h-3 w-3" />
                        <span>{team.member_count || 0} members</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs lg:text-sm text-slate-600 line-clamp-2 mb-3 lg:mb-4 leading-relaxed">
                    {team.description}
                  </p>

                  {/* Last Message */}
                  {team.last_message ? (
                    <div className="mb-3 lg:mb-4 p-2 lg:p-3 bg-slate-50 rounded-lg lg:rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-600 line-clamp-2 mb-1 lg:mb-2">
                        <span className="font-medium text-slate-900">{team.last_message.sender_name}:</span>{' '}
                        {team.last_message.content}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] lg:text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {getTimeAgo(team.last_message.created_at)}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3 lg:mb-4 p-2 lg:p-3 bg-slate-50 rounded-lg lg:rounded-xl border border-slate-100">
                      <p className="text-[10px] lg:text-xs text-slate-400 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        No messages yet - start the conversation
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 lg:pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 text-[10px] lg:text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                        <span>{team.message_count || 0}</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="h-8 bg-slate-900 hover:bg-slate-800 rounded-lg text-xs shadow-lg shadow-slate-900/20 group-hover:shadow-slate-900/30 transition-all"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTeamClick(team.id)
                      }}
                    >
                      <span className="hidden sm:inline">Open Chat</span>
                      <span className="sm:hidden">Open</span>
                      <ArrowRight className="h-3 w-3 ml-1 lg:ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </div>
                </div>

                {/* Hover border effect */}
                <div className="absolute inset-0 border-2 border-slate-900 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}