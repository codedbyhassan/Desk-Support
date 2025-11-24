import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { User, Shield, MoreVertical, Search, UserPlus, Users, UserCheck, Crown, AlertCircle, Mail, Phone, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTheme } from '@/context/ThemeContext'
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'

interface UserType {
  id: string
  email: string
  full_name: string
  role: string
  avatar_url?: string | null
  created_at: string
  last_sign_in?: string | null
  phone?: string | null
  company_id: string
}

interface CompanyInfo {
  id: string
  name: string
  max_users: number
  current_user_count: number
}

const AVATAR_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-red-500 to-rose-500',
  'from-indigo-500 to-purple-500',
]

export default function ManagementTab() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const { theme } = useTheme()
  const [users, setUsers] = useState<UserType[]>([])
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [sortBy, setSortBy] = useState<'full_name' | 'email' | 'role' | 'created_at'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filterTab, setFilterTab] = useState<'all' | 'admins' | 'employees'>('all')
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'employee',
    phone: '',
    password: '',
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userIdPendingDelete, setUserIdPendingDelete] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser?.company_id) {
      fetchCompanyInfo()
      fetchUsers()
    }
  }, [currentUser?.company_id])

  const fetchCompanyInfo = async () => {
    if (!currentUser?.company_id) {
      toast({
        title: 'Error',
        description: 'No company associated with user',
        variant: 'destructive',
      })
      return
    }

    try {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, max_users')
        .eq('id', currentUser.company_id)
        .single()

      if (companyError) throw companyError

      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentUser.company_id)

      if (countError) throw countError

      setCompanyInfo({
        id: companyData.id,
        name: companyData.name,
        max_users: companyData.max_users || 0,
        current_user_count: count || 0,
      })
    } catch (error) {
      console.error('Error fetching company info:', error)
      toast({
        title: 'Error',
        description: 'Failed to load company information',
        variant: 'destructive',
      })
    }
  }

  const fetchUsers = async () => {
    if (!currentUser?.company_id) {
      toast({
        title: 'Error',
        description: 'No company associated with user',
        variant: 'destructive',
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', currentUser.company_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      })
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!companyInfo || !currentUser?.company_id) {
      toast({
        title: 'Error',
        description: 'Company information not loaded',
        variant: 'destructive',
      })
      return
    }

    if (companyInfo.current_user_count >= companyInfo.max_users) {
      toast({
        title: 'User Limit Reached',
        description: `Your company has reached the maximum of ${companyInfo.max_users} users. Please upgrade your plan.`,
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            company_id: currentUser.company_id,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      const { error: rpcError } = await supabase.rpc('add_user_to_company', {
        p_user_id: authData.user.id,
        p_email: formData.email,
        p_full_name: formData.full_name,
        p_role: formData.role,
        p_phone: (formData.phone || '') as string,
        p_company_id: currentUser.company_id,
      })

      if (rpcError) {
        console.error('Failed to add user to company:', rpcError)
        throw new Error(rpcError.message || 'Failed to create user profile.')
      }

      toast({
        title: 'Success',
        description: `${formData.full_name} has been added successfully. They will receive an email to confirm their account.`,
      })

      setAddUserDialogOpen(false)
      setFormData({
        email: '',
        full_name: '',
        role: 'employee',
        phone: '',
        password: '',
      })
      
      fetchUsers()
      fetchCompanyInfo()

    } catch (error: any) {
      console.error('Error adding user:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to add user',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!currentUser?.company_id) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)
        .eq('company_id', currentUser.company_id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'User role updated successfully',
      })
      fetchUsers()
    } catch (error) {
      console.error('Error updating role:', error)
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!currentUser?.company_id) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
        .eq('company_id', currentUser.company_id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'User has been deactivated',
      })
      
      fetchUsers()
      fetchCompanyInfo()
    } catch (error) {
      console.error('Error deactivating user:', error)
      toast({
        title: 'Error',
        description: 'Failed to deactivate user',
        variant: 'destructive',
      })
    }
  }

  const confirmDeleteUser = (userId: string) => {
    setUserIdPendingDelete(userId)
    setDeleteDialogOpen(true)
  }

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearchTerm(searchTerm), 250)
    return () => clearTimeout(id)
  }, [searchTerm])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearchTerm, filterTab])

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    
    const matchesTab = 
      filterTab === 'all' || 
      (filterTab === 'admins' && user.role === 'admin') ||
      (filterTab === 'employees' && user.role === 'employee')

    return matchesSearch && matchesTab
  })

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    const aVal = (a[sortBy] || '').toString().toLowerCase()
    const bVal = (b[sortBy] || '').toString().toLowerCase()
    if (aVal < bVal) return -1 * dir
    if (aVal > bVal) return 1 * dir
    return 0
  })

  const adminUsers = users.filter(u => u.role === 'admin')
  const employeeUsers = users.filter(u => u.role === 'employee')
  const remainingSlots = companyInfo ? companyInfo.max_users - companyInfo.current_user_count : 0
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (userId: string) => {
    const index = parseInt(userId.slice(0, 8), 16) % AVATAR_COLORS.length
    return AVATAR_COLORS[index]
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header with Add User Button */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-lg text-sm bg-background text-foreground border-border"
          />
        </div>
        {currentUser?.role === 'admin' && (
          <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-11 lg:h-10" disabled={remainingSlots <= 0}>
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Add User</span>
                <span className="sm:hidden">Add</span>
                {remainingSlots > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {remainingSlots}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] lg:max-w-lg rounded-2xl bg-card border-border text-foreground">
              <DialogHeader>
                <DialogTitle className="text-lg lg:text-xl text-foreground">Add New User</DialogTitle>
                <DialogDescription className="text-sm lg:text-base text-muted-foreground">
                  Invite a new team member to {companyInfo?.name}
                </DialogDescription>
              </DialogHeader>

              {remainingSlots <= 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    You've reached the maximum number of users ({companyInfo?.max_users}). 
                    Please upgrade your plan to add more users.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleAddUser} className="space-y-3 lg:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm">Full Name *</Label>
                  <Input
                    id="full_name"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="John Doe"
                    className="rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm">Temporary Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    minLength={6}
                    className="rounded-lg text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    User will be prompted to change this on first login
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+233 XX XXX XXXX"
                    className="rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger id="role" className="rounded-lg text-sm">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  disabled={submitting || remainingSlots <= 0}
                  className="w-full h-11 lg:h-10"
                >
                  {submitting ? 'Adding...' : 'Add User'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filter Tabs */}
      <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as 'all' | 'admins' | 'employees')} className="space-y-4 lg:space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:max-w-md bg-muted p-1 rounded-lg">
          <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm text-foreground">
            <Users className="h-4 w-4 mr-2" />
            All ({users.length})
          </TabsTrigger>
          <TabsTrigger value="admins" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm text-foreground">
            <Crown className="h-4 w-4 mr-2" />
            Admins ({adminUsers.length})
          </TabsTrigger>
          <TabsTrigger value="employees" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm text-foreground">
            <UserCheck className="h-4 w-4 mr-2" />
            Employees ({employeeUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filterTab} className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Card className="p-3 lg:p-4 relative overflow-hidden border-border bg-card">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent" />
              <div className="relative flex items-center gap-3 lg:gap-4">
                <div className="h-8 w-8 lg:h-10 lg:w-10 rounded bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                  <Crown className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Admins</p>
                  <p className="text-xl lg:text-2xl font-semibold text-foreground">{adminUsers.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 lg:p-4 relative overflow-hidden border-border bg-card">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent" />
              <div className="relative flex items-center gap-3 lg:gap-4">
                <div className="h-8 w-8 lg:h-10 lg:w-10 rounded bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <UserCheck className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Employees</p>
                  <p className="text-xl lg:text-2xl font-semibold text-foreground">{employeeUsers.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 lg:p-4 relative overflow-hidden border-border bg-card">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-transparent" />
              <div className="relative flex items-center gap-3 lg:gap-4">
                <div className="h-8 w-8 lg:h-10 lg:w-10 rounded bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                  <Users className="h-4 w-4 lg:h-5 lg:w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Total Users</p>
                  <p className="text-xl lg:text-2xl font-semibold text-foreground">{users.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 lg:p-4 relative overflow-hidden border-border bg-card">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent" />
              <div className="relative flex items-center gap-3 lg:gap-4">
                <div className="h-8 w-8 lg:h-10 lg:w-10 rounded bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                  <User className="h-4 w-4 lg:h-5 lg:w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Available Slots</p>
                  <p className="text-xl lg:text-2xl font-semibold text-foreground">{remainingSlots}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Users Grid - Large Avatar Cards */}
          <div>
            {filteredUsers.length === 0 ? (
              <Card className="border-border bg-card">
                <div className="text-center py-12 lg:py-16">
                  <Users className="h-12 w-12 lg:h-16 lg:w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg lg:text-xl font-semibold text-foreground mb-2">No users found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm ? 'Try adjusting your search or filters' : 'Get started by adding your first user'}
                  </p>
                </div>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  {paginatedUsers.map((user) => (
                    <Card 
                      key={user.id}
                      className="border-border bg-card hover:shadow-lg transition-all duration-300 group relative overflow-hidden"
                    >
                      <div className="p-6 flex flex-col items-center text-center">
                        {/* Large Avatar */}
                        <div className="relative mb-4">
                          <Avatar className="h-24 w-24 lg:h-28 lg:w-28 ring-4 ring-border group-hover:ring-primary/50 transition-all duration-300">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(user.id)} text-white font-bold text-2xl lg:text-3xl`}>
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          {user.role === 'admin' && (
                            <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1.5 shadow-lg">
                              <Crown className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>

                        {/* User Name */}
                        <h3 className="text-lg lg:text-xl font-bold text-foreground mb-1 truncate w-full">
                          {user.full_name}
                        </h3>

                        {/* Email */}
                        <div className="flex items-center gap-1.5 mb-3 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>

                        {/* Phone (if available) */}
                        {user.phone && (
                          <div className="flex items-center gap-1.5 mb-3 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{user.phone}</span>
                          </div>
                        )}

                        {/* Role Badge */}
                        <Badge 
                          variant={user.role === 'admin' ? 'default' : 'secondary'}
                          className={`mb-3 text-xs font-medium ${
                            user.role === 'admin' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {user.role === 'admin' ? (
                            <>
                              <Crown className="h-3 w-3 mr-1" />
                              Admin
                            </>
                          ) : (
                            <>
                              <User className="h-3 w-3 mr-1" />
                              Employee
                            </>
                          )}
                        </Badge>

                        {/* Joined Date */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                          <Calendar className="h-3 w-3" />
                          <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                        </div>

                        {/* Actions Menu */}
                        {currentUser?.role === 'admin' && currentUser?.id !== user.id && (
                          <div className="mt-auto pt-4 border-t border-border w-full">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="w-full hover:bg-muted text-foreground"
                                >
                                  <MoreVertical className="h-4 w-4 mr-2" />
                                  Actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleChangeRole(user.id, user.role === 'admin' ? 'employee' : 'admin')}
                                  className="cursor-pointer"
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  {user.role === 'admin' ? 'Make Employee' : 'Make Admin'}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive cursor-pointer"
                                  onClick={() => confirmDeleteUser(user.id)}
                                >
                                  Deactivate User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="w-32 rounded-lg text-sm bg-background text-foreground border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="8">8 / page</SelectItem>
                        <SelectItem value="12">12 / page</SelectItem>
                        <SelectItem value="16">16 / page</SelectItem>
                        <SelectItem value="20">20 / page</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={currentPage <= 1} 
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="bg-background text-foreground border-border hover:bg-muted"
                      >
                        Prev
                      </Button>
                      <div className="text-sm text-foreground px-3">Page {currentPage} / {totalPages}</div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={currentPage >= totalPages} 
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="bg-background text-foreground border-border hover:bg-muted"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Deactivate user?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. The selected user will be removed from your company.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!userIdPendingDelete) return
                const id = userIdPendingDelete
                setDeleteDialogOpen(false)
                setUserIdPendingDelete(null)
                await handleDeleteUser(id)
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}