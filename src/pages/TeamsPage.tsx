import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Users,
  Plus,
  Search,
  MessageSquare,
  Loader2,
  AlertCircle,
  Trash2,
  ArrowLeft,
  Menu,
  Edit2,
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
  last_message?: {
    content: string
    created_at: string
    sender_name: string
    sender_id: string
    type: string
  }
  is_member?: boolean
  user_role?: string
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
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedTeamRole, setSelectedTeamRole] = useState<string | undefined>(undefined)
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [teamToLeave, setTeamToLeave] = useState<string | null>(null)
  const [leavingTeamId, setLeavingTeamId] = useState<string | null>(null)
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

  const fetchTeams = useCallback(async () => {
    if (!user?.company_id || !user?.id) return

    try {
      setLoading(true)
      setError(null)

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
          creator:users!teams_created_by_fkey(full_name, email),
          team_members(count),
          team_messages(count)
        `)
        .eq('company_id', user.company_id)
        .order('updated_at', { ascending: false })

      if (teamsError) throw teamsError

      const teamsWithMembership = await Promise.all(
        (teamsData || []).map(async (team: any) => {
          const { data: memberData, error: memberError } = await supabase
            .from('team_members')
            .select('role')
            .eq('team_id', team.id)
            .eq('user_id', user.id)
            .single()

          if (memberError && memberError.code !== 'PGRST116') {
            console.error('Error checking membership:', memberError)
          }

          return {
            ...team,
            is_member: !!memberData,
            user_role: memberData?.role || null,
            member_count: team.team_members?.[0]?.count || 0,
            message_count: team.team_messages?.[0]?.count || 0
          }
        })
      )

      const { data: lastMessages, error: messagesError } = await supabase
        .from('team_messages')
        .select(`
          team_id,
          content,
          created_at,
          type,
          sender_id,
          sender:users(full_name)
        `)
        .in('team_id', teamsWithMembership.map(t => t.id))
        .order('created_at', { ascending: false })

      if (messagesError) console.error('Error fetching messages:', messagesError)

      const lastMessagesByTeam: Record<string, any> = {}
      lastMessages?.forEach(msg => {
        if (!lastMessagesByTeam[msg.team_id]) {
          lastMessagesByTeam[msg.team_id] = msg
        }
      })

      const finalTeams = teamsWithMembership.map(team => ({
        ...team,
        last_message: lastMessagesByTeam[team.id] ? {
          content: lastMessagesByTeam[team.id].content,
          created_at: lastMessagesByTeam[team.id].created_at,
          sender_name: lastMessagesByTeam[team.id].sender?.full_name || 'Unknown',
          sender_id: lastMessagesByTeam[team.id].sender_id,
          type: lastMessagesByTeam[team.id].type
        } : undefined
      }))

      setTeams(finalTeams)
    } catch (error) {
      console.error('Error fetching teams:', error)
      setError('Failed to load teams')
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [user?.company_id, user?.id, toast])

  const handleTeamClick = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    
    if (!team?.is_member) {
      toast({
        title: 'Access Denied',
        description: 'You are not a member of this team',
        variant: 'destructive'
      })
      return
    }

    if (!team?.user_role) {
      toast({
        title: 'Error',
        description: 'Unable to determine your role',
        variant: 'destructive'
      })
      return
    }

    setSelectedTeamId(teamId)
    setSelectedTeamRole(team.user_role)
    setShowSidebar(false) // Hide sidebar on mobile
  }

  const handleCreateTeam = async () => {
    if (!user?.id || !user?.company_id) {
      setError('Authentication required')
      return
    }

    if (!formData.name.trim() || !formData.description.trim()) {
      setError('Team name and description are required')
      return
    }

    if (formData.name.length > 100) {
      setError('Team name must be less than 100 characters')
      return
    }

    if (formData.description.length > 500) {
      setError('Description must be less than 500 characters')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim(),
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

      // Check for duplicate team names
      const nameExists = teams.some(t => t.name.toLowerCase() === formData.name.toLowerCase())
      if (nameExists) {
        setError('A team with this name already exists')
        return
      }

      setFormData({ name: '', description: '' })
      setCreateDialogOpen(false)
      await fetchTeams()
      
      toast({
        title: 'Success',
        description: 'Team created successfully'
      })

      setSelectedTeamId(newTeam.id)
      setSelectedTeamRole('admin')
      setShowSidebar(false)
    } catch (error) {
      console.error('Error creating team:', error)
      setError('Failed to create team')
      toast({
        title: 'Error',
        description: 'Failed to create team',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    
    if (team?.user_role !== 'admin') {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can delete teams',
        variant: 'destructive'
      })
      return
    }

    setTeamToDelete(teamId)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteTeam = async (teamId: string) => {
    setDeleteDialogOpen(false)
    setDeletingTeamId(teamId)

    try {
      const { error: messagesError } = await supabase
        .from('team_messages')
        .delete()
        .eq('team_id', teamId)
        .eq('company_id', user?.company_id)

      if (messagesError) throw messagesError

      const { error: membersError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)

      if (membersError) throw membersError

      const { error: teamError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)
        .eq('company_id', user?.company_id)

      if (teamError) throw teamError

      if (selectedTeamId === teamId) {
        setSelectedTeamId(null)
        setSelectedTeamRole(undefined)
        setShowSidebar(true)
      }

      await fetchTeams()

      toast({
        title: 'Success',
        description: 'Team deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting team:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete team',
        variant: 'destructive'
      })
    } finally {
      setDeletingTeamId(null)
      setTeamToDelete(null)
    }
  }

  const handleLeaveTeam = async (teamId: string) => {
    setTeamToLeave(teamId)
    setLeaveDialogOpen(true)
  }

  const confirmLeaveTeam = async (teamId: string) => {
    setLeaveDialogOpen(false)
    setLeavingTeamId(teamId)

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', user?.id)

      if (error) throw error

      if (selectedTeamId === teamId) {
        setSelectedTeamId(null)
        setSelectedTeamRole(undefined)
        setShowSidebar(true)
      }

      await fetchTeams()

      toast({
        title: 'Success',
        description: 'You have left the team'
      })
    } catch (error) {
      console.error('Error leaving team:', error)
      toast({
        title: 'Error',
        description: 'Failed to leave team',
        variant: 'destructive'
      })
    } finally {
      setLeavingTeamId(null)
      setTeamToLeave(null)
    }
  }

  const handleEditTeam = async () => {
    if (!teamToEdit) return
    if (!teamToEdit.name.trim() || !teamToEdit.description.trim()) {
      setError('Team name and description are required')
      return
    }

    // Check for duplicate names
    const nameExists = teams.some(t => t.name.toLowerCase() === teamToEdit.name.toLowerCase() && t.id !== teamToEdit.id)
    if (nameExists) {
      setError('A team with this name already exists')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('teams')
        .update({
          name: teamToEdit.name.trim(),
          description: teamToEdit.description.trim(),
        })
        .eq('id', teamToEdit.id)
        .eq('company_id', user?.company_id)

      if (updateError) throw updateError

      setEditDialogOpen(false)
      setTeamToEdit(null)
      await fetchTeams()

      toast({
        title: 'Success',
        description: 'Team updated successfully'
      })
    } catch (error) {
      console.error('Error updating team:', error)
      setError('Failed to update team')
      toast({
        title: 'Error',
        description: 'Failed to update team',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredTeams = teams.filter(team =>
    (team.is_member || selectedTeamId === team.id) &&
    (team.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     team.description?.toLowerCase().includes(searchTerm.toLowerCase()))
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

  const memberTeams = teams.filter(t => t.is_member)
  const totalMessages = memberTeams.reduce((acc, team) => acc + (team.message_count || 0), 0)
  const activeTeams = memberTeams.filter(t => t.last_message && 
    new Date(t.last_message.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length

  return (
    <div className="fixed inset-0 top-20 lg:top-16 left-0 lg:left-16 right-0 bottom-0 flex bg-background z-10">
      {/* Mobile Menu Button */}
      {selectedTeamId && !showSidebar && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSidebar(true)}
          className="fixed top-20 left-4 z-50 md:hidden bg-card shadow-lg rounded-full h-10 w-10 p-0 border border-border"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Left Sidebar - Teams List */}
      <div className={`${
        showSidebar ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 transition-transform duration-300 ease-in-out fixed md:static inset-y-0 left-0 z-40 w-full md:w-80 bg-card border-r border-border flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {selectedTeamId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(false)}
                  className="md:hidden h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <h2 className="text-xl font-bold text-foreground">Teams</h2>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/90 h-8 w-8 p-0 rounded-lg">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] sm:max-w-[500px] lg:max-w-lg rounded-2xl lg:rounded-3xl mx-4">
                <DialogHeader>
                  <DialogTitle className="text-lg lg:text-xl">Create New Team</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm lg:text-base">
                    Create a team chat group for collaboration
                  </DialogDescription>
                </DialogHeader>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-red-700">{error}</p>
                  </div>
                )}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs sm:text-sm">Team Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value.slice(0, 100) })
                        setError(null)
                      }}
                      placeholder="e.g., Engineering Team"
                      className="rounded-lg text-xs sm:text-sm h-10 sm:h-11"
                      maxLength={100}
                    />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{formData.name.length}/100</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-xs sm:text-sm">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => {
                        setFormData({ ...formData, description: e.target.value.slice(0, 500) })
                        setError(null)
                      }}
                      placeholder="What is this team for?"
                      rows={3}
                      className="rounded-lg text-xs sm:text-sm"
                      maxLength={500}
                    />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{formData.description.length}/500</p>
                  </div>
                  <Button
                    onClick={handleCreateTeam}
                    disabled={submitting || !formData.name.trim() || !formData.description.trim()}
                    className="w-full bg-primary hover:bg-primary/90 rounded-lg h-10 sm:h-11 text-xs sm:text-sm"
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-lg border-border h-9 text-sm"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-muted rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-foreground">{memberTeams.length}</div>
              <div className="text-[10px] text-muted-foreground">Teams</div>
            </div>
            <div className="bg-muted rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-foreground">{totalMessages}</div>
              <div className="text-[10px] text-muted-foreground">Messages</div>
            </div>
            <div className="bg-muted rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{activeTeams}</div>
              <div className="text-[10px] text-muted-foreground">Active</div>
            </div>
          </div>
        </div>

        {/* Teams List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Loading teams...</p>
            </div>
          ) : error && filteredTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-300 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Error loading teams</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No teams found</p>
              <p className="text-xs text-muted-foreground">
                {searchTerm ? 'Try a different search' : 'Create your first team'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredTeams.map((team) => {
                const isSelected = selectedTeamId === team.id
                const isAdmin = team.user_role === 'admin'
                
                return (
                  <div key={team.id} className="group relative">
                    <button
                      onClick={() => handleTeamClick(team.id)}
                      className={`w-full p-3 rounded-lg transition-colors text-left ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-11 w-11">
                            <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(team.id)} text-white font-semibold text-sm`}>
                              {getInitials(team.name)}
                            </AvatarFallback>
                          </Avatar>
                          {team.member_count && team.member_count > 0 && (
                            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border-2 border-white rounded-full" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0 pr-8">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className={`font-semibold text-sm truncate ${
                              isSelected ? 'text-primary-foreground' : 'text-foreground'
                            }`}>
                              {team.name}
                            </h3>
                            <span className={`text-[11px] flex-shrink-0 ml-2 ${
                              isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {team.last_message && getTimeAgo(team.last_message.created_at)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs truncate ${
                              isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                            }`}>
                              {formatLastMessage(team)}
                            </p>
                            {isAdmin && !isSelected && (
                              <Badge className="bg-primary text-primary-foreground rounded-full h-5 min-w-5 flex items-center justify-center text-[10px] flex-shrink-0">
                                Admin
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Action buttons on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-1/2 -translate-y-1/2 flex gap-1 z-10">
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setTeamToEdit(team)
                            setEditDialogOpen(true)
                          }}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                          title="Edit team"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isAdmin) {
                            handleDeleteTeam(team.id)
                          } else {
                            handleLeaveTeam(team.id)
                          }
                        }}
                        disabled={deletingTeamId === team.id || leavingTeamId === team.id}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                        title={isAdmin ? 'Delete team' : 'Leave team'}
                      >
                        {deletingTeamId === team.id || leavingTeamId === team.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Team Chat or Empty State */}
      <div className="flex-1 flex flex-col md:static">
        {selectedTeamId ? (
          <TeamChatView 
            teamId={selectedTeamId}
            userRole={selectedTeamRole}
            onClose={() => {
              setSelectedTeamId(null)
              setSelectedTeamRole(undefined)
              setShowSidebar(true)
            }}
            onStartCall={(mode) => {
              navigate(`/app/teams/call/${selectedTeamId}?mode=${mode}&initiator=1`)
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background p-6">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 bg-card rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-border">
                <MessageSquare className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Select a team to start chatting</h3>
              <p className="text-muted-foreground">
                Choose a team from the list to view messages and collaborate with your team members
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-[500px] lg:max-w-sm rounded-2xl lg:rounded-3xl mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg lg:text-xl">Delete Team</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm lg:text-base">
              Are you sure you want to delete "{teamToDelete && teams.find(t => t.id === teamToDelete)?.name}"? This will also delete all messages and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-lg lg:rounded-xl h-10 sm:h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => teamToDelete && confirmDeleteTeam(teamToDelete)}
              className="bg-red-600 hover:bg-red-700 rounded-lg lg:rounded-xl h-10 sm:h-11"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Team Confirmation Dialog */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-[500px] lg:max-w-sm rounded-2xl lg:rounded-3xl mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg lg:text-xl">Leave Team</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm lg:text-base">
              Are you sure you want to leave "{teamToLeave && teams.find(t => t.id === teamToLeave)?.name}"? You can rejoin if invited again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-lg lg:rounded-xl h-10 sm:h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => teamToLeave && confirmLeaveTeam(teamToLeave)}
              className="bg-amber-600 hover:bg-amber-700 rounded-lg lg:rounded-xl h-10 sm:h-11"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Team Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[500px] lg:max-w-lg rounded-2xl lg:rounded-3xl mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg lg:text-xl">Edit Team</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm lg:text-base">
              Update team details
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-red-700">{error}</p>
            </div>
          )}
          {teamToEdit && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-xs sm:text-sm">Team Name *</Label>
                <Input
                  id="edit-name"
                  value={teamToEdit.name}
                  onChange={(e) => {
                    setTeamToEdit({ ...teamToEdit, name: e.target.value.slice(0, 100) })
                    setError(null)
                  }}
                  placeholder="e.g., Engineering Team"
                  className="rounded-lg text-xs sm:text-sm h-10 sm:h-11"
                  maxLength={100}
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">{teamToEdit.name.length}/100</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-xs sm:text-sm">Description *</Label>
                <Textarea
                  id="edit-description"
                  value={teamToEdit.description}
                  onChange={(e) => {
                    setTeamToEdit({ ...teamToEdit, description: e.target.value.slice(0, 500) })
                    setError(null)
                  }}
                  placeholder="What is this team for?"
                  rows={3}
                  className="rounded-lg text-xs sm:text-sm"
                  maxLength={500}
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">{teamToEdit.description.length}/500</p>
              </div>
              <Button
                onClick={handleEditTeam}
                disabled={submitting}
                className="w-full bg-primary hover:bg-primary/90 rounded-lg h-10 sm:h-11 text-xs sm:text-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Team'
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Overlay for mobile when sidebar is open */}
      {showSidebar && selectedTeamId && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </div>
  )
}