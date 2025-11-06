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

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserType[]>([])
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortBy, setSortBy] = useState<'full_name' | 'email' | 'role' | 'created_at'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [activeTab, setActiveTab] = useState<'all' | 'admins' | 'employees'>('all')
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
    // reset to first page on filters/search/tab change
    setPage(1)
  }, [debouncedSearchTerm, activeTab])

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'admins' && user.role === 'admin') ||
      (activeTab === 'employees' && user.role === 'employee')

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

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1 lg:space-y-2">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-gray-500 flex items-center gap-1 text-sm lg:text-base">
              <Users className="h-4 w-4" />
              Manage team members and permissions
              {companyInfo && (
                <span className="ml-2 text-xs lg:text-sm">
                  • {companyInfo.current_user_count}/{companyInfo.max_users} users
                </span>
              )}
            </p>
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
              <DialogContent className="max-w-[90vw] lg:max-w-lg rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-lg lg:text-xl">Add New User</DialogTitle>
                  <DialogDescription className="text-sm lg:text-base">
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
                    <p className="text-xs text-gray-500 mt-1">
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'admins' | 'employees')} className="space-y-4 lg:space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:max-w-md bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="h-4 w-4 mr-2" />
            All ({users.length})
          </TabsTrigger>
          <TabsTrigger value="admins" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Crown className="h-4 w-4 mr-2" />
            Admins ({adminUsers.length})
          </TabsTrigger>
          <TabsTrigger value="employees" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <UserCheck className="h-4 w-4 mr-2" />
            Employees ({employeeUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* All Users Tab */}
        <TabsContent value="all" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Card className="p-3 lg:p-4 relative overflow-hidden border-slate-200">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent" />
              <div className="relative flex items-center gap-3 lg:gap-4">
                <div className="h-8 w-8 lg:h-10 lg:w-10 rounded bg-purple-100 flex items-center justify-center">
                  <Crown className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-gray-500">Admins</p>
                  <p className="text-xl lg:text-2xl font-semibold">{adminUsers.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 lg:p-4 relative overflow-hidden border-slate-200">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent" />
              <div className="relative flex items-center gap-3 lg:gap-4">
                <div className="h-8 w-8 lg:h-10 lg:w-10 rounded bg-blue-100 flex items-center justify-center">
                  <UserCheck className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-gray-500">Employees</p>
                  <p className="text-xl lg:text-2xl font-semibold">{employeeUsers.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 lg:p-4 relative overflow-hidden border-slate-200">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-transparent" />
              <div className="relative flex items-center gap-3 lg:gap-4">
                <div className="h-8 w-8 lg:h-10 lg:w-10 rounded bg-green-100 flex items-center justify-center">
                  <Users className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-gray-500">Total Users</p>
                  <p className="text-xl lg:text-2xl font-semibold">{users.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 lg:p-4 relative overflow-hidden border-slate-200">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent" />
              <div className="relative flex items-center gap-3 lg:gap-4">
                <div className="h-8 w-8 lg:h-10 lg:w-10 rounded bg-orange-100 flex items-center justify-center">
                  <User className="h-4 w-4 lg:h-5 lg:w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-gray-500">Available Slots</p>
                  <p className="text-xl lg:text-2xl font-semibold">{remainingSlots}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Users Table - Desktop */}
          <div className="hidden lg:block">
            <Card className="border-slate-200">
              <div className="p-4 lg:p-6">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 lg:py-12">
                <Users className="h-10 w-10 lg:h-12 lg:w-12 mx-auto text-gray-400 mb-3 lg:mb-4" />
                <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-1 lg:mb-2">No users found</h3>
                <p className="text-sm text-gray-500 mb-3 lg:mb-4">
                  {searchTerm ? 'Try adjusting your search or filters' : 'Get started by adding your first user'}
                </p>
              </div>
            ) : (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-sm">
                      <button className="flex items-center gap-1" onClick={() => { setSortBy('full_name'); setSortDir(prev => (sortBy === 'full_name' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc')); }}>
                        Name {sortBy === 'full_name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </button>
                    </TableHead>
                    <TableHead className="text-sm">
                      <button className="flex items-center gap-1" onClick={() => { setSortBy('email'); setSortDir(prev => (sortBy === 'email' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc')); }}>
                        Email {sortBy === 'email' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </button>
                    </TableHead>
                    <TableHead className="text-sm">
                      <button className="flex items-center gap-1" onClick={() => { setSortBy('role'); setSortDir(prev => (sortBy === 'role' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc')); }}>
                        Role {sortBy === 'role' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </button>
                    </TableHead>
                    <TableHead className="text-sm">
                      <button className="flex items-center gap-1" onClick={() => { setSortBy('created_at'); setSortDir(prev => (sortBy === 'created_at' ? (prev === 'asc' ? 'desc' : 'asc') : 'desc')); }}>
                        Joined {sortBy === 'created_at' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </button>
                    </TableHead>
                    <TableHead className="w-[50px] text-sm"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                            {user.full_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          {user.full_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.role === 'admin' ? 'default' : 'secondary'}
                          className={`text-xs ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : ''}`}
                        >
                          {user.role === 'admin' ? (
                            <Crown className="h-3 w-3 mr-1" />
                          ) : (
                            <User className="h-3 w-3 mr-1" />
                          )}
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {currentUser?.role === 'admin' && currentUser?.id !== user.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-sm">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleChangeRole(user.id, user.role === 'admin' ? 'employee' : 'admin')}
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                {user.role === 'admin' ? 'Make Employee' : 'Make Admin'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => confirmDeleteUser(user.id)}
                              >
                                Deactivate User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="w-28 rounded-lg text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="20">20 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                    <div className="text-sm">Page {currentPage} / {totalPages}</div>
                    <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
                  </div>
                </div>
              </div>
              </>
            )}
              </div>
            </Card>
          </div>

          {/* Mobile Users List */}
          <div className="lg:hidden">
            <Card className="border-slate-200">
              <div className="p-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                <h3 className="text-base font-medium text-gray-900 mb-1">No users found</h3>
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search or filters' : 'Get started by adding your first user'}
                </p>
              </div>
            ) : (
              <>
              <div className="divide-y divide-slate-200">
                {paginatedUsers.map((user) => (
                  <div 
                    key={user.id}
                    className="p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  >
                    <div className="flex gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-semibold text-base flex-shrink-0">
                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-slate-900 truncate text-sm">
                              {user.full_name}
                            </h3>
                            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                <Phone className="h-3 w-3" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                          </div>
                          {currentUser?.role === 'admin' && currentUser?.id !== user.id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-sm">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleChangeRole(user.id, user.role === 'admin' ? 'employee' : 'admin')}
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  {user.role === 'admin' ? 'Make Employee' : 'Make Admin'}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => confirmDeleteUser(user.id)}
                                >
                                  Deactivate User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Badge 
                            variant={user.role === 'admin' ? 'default' : 'secondary'}
                            className={`text-xs ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : ''}`}
                          >
                            {user.role === 'admin' ? (
                              <Crown className="h-3 w-3 mr-1" />
                            ) : (
                              <User className="h-3 w-3 mr-1" />
                            )}
                            {user.role}
                          </Badge>
                          
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(user.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <div className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="w-28 rounded-lg text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 / page</SelectItem>
                        <SelectItem value="20">20 / page</SelectItem>
                        <SelectItem value="50">50 / page</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                      <div className="text-sm">Page {currentPage} / {totalPages}</div>
                      <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
                    </div>
                  </div>
                </div>
              </div>
              </>
            )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Admins Tab */}
        <TabsContent value="admins" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            <Card className="p-3 lg:p-4 relative overflow-hidden border-slate-200">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent" />
              <div className="relative flex items-center gap-3 lg:gap-4">
                <div className="h-8 w-8 lg:h-10 lg:w-10 rounded bg-purple-100 flex items-center justify-center">
                  <Crown className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-gray-500">Total Admins</p>
                  <p className="text-xl lg:text-2xl font-semibold">{adminUsers.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 lg:p-4 relative overflow-hidden border-slate-200">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent" />
              <div className="relative flex items-center gap-3 lg:gap-4">
                <div className="h-8 w-8 lg:h-10 lg:w-10 rounded bg-orange-100 flex items-center justify-center">
                  <User className="h-4 w-4 lg:h-5 lg:w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-gray-500">Available Slots</p>
                  <p className="text-xl lg:text-2xl font-semibold">{remainingSlots}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Users Table - Desktop */}
          <div className="hidden lg:block">
            <Card className="border-slate-200">
              <div className="p-4 lg:p-6">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 lg:py-12">
                    <Crown className="h-10 w-10 lg:h-12 lg:w-12 mx-auto text-gray-400 mb-3 lg:mb-4" />
                    <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-1 lg:mb-2">No admins found</h3>
                    <p className="text-sm text-gray-500 mb-3 lg:mb-4">
                      {searchTerm ? 'Try adjusting your search' : 'No admin users in your organization'}
                    </p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-sm">
                            <button className="flex items-center gap-1" onClick={() => { setSortBy('full_name'); setSortDir(prev => (sortBy === 'full_name' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc')); }}>
                              Name {sortBy === 'full_name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                            </button>
                          </TableHead>
                          <TableHead className="text-sm">
                            <button className="flex items-center gap-1" onClick={() => { setSortBy('email'); setSortDir(prev => (sortBy === 'email' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc')); }}>
                              Email {sortBy === 'email' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                            </button>
                          </TableHead>
                          <TableHead className="text-sm">
                            <button className="flex items-center gap-1" onClick={() => { setSortBy('created_at'); setSortDir(prev => (sortBy === 'created_at' ? (prev === 'asc' ? 'desc' : 'asc') : 'desc')); }}>
                              Joined {sortBy === 'created_at' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                            </button>
                          </TableHead>
                          <TableHead className="w-[50px] text-sm"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                                  {user.full_name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                {user.full_name}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600 text-sm">
                              {user.email}
                            </TableCell>
                            <TableCell className="text-gray-600 text-sm">
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {currentUser?.role === 'admin' && currentUser?.id !== user.id && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="text-sm">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleChangeRole(user.id, 'employee')}
                                    >
                                      <Shield className="mr-2 h-4 w-4" />
                                      Make Employee
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => confirmDeleteUser(user.id)}
                                    >
                                      Deactivate User
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div className="text-sm text-gray-600">
                        Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                          <SelectTrigger className="w-28 rounded-lg text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10 / page</SelectItem>
                            <SelectItem value="20">20 / page</SelectItem>
                            <SelectItem value="50">50 / page</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                          <div className="text-sm">Page {currentPage} / {totalPages}</div>
                          <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Mobile Users List */}
          <div className="lg:hidden">
            <Card className="border-slate-200">
              <div className="p-4">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Crown className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-base font-medium text-gray-900 mb-1">No admins found</h3>
                    <p className="text-sm text-gray-500">
                      {searchTerm ? 'Try adjusting your search' : 'No admin users in your organization'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-slate-200">
                      {paginatedUsers.map((user) => (
                        <div 
                          key={user.id}
                          className="p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                        >
                          <div className="flex gap-3">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-semibold text-base flex-shrink-0">
                              {user.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-slate-900 truncate text-sm">
                                    {user.full_name}
                                  </h3>
                                  <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">{user.email}</span>
                                  </div>
                                </div>
                                {currentUser?.role === 'admin' && currentUser?.id !== user.id && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="text-sm">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleChangeRole(user.id, 'employee')}
                                      >
                                        <Shield className="mr-2 h-4 w-4" />
                                        Make Employee
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="text-red-600"
                                        onClick={() => confirmDeleteUser(user.id)}
                                      >
                                        Deactivate User
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                              
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <Badge className="text-xs bg-purple-100 text-purple-800">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Admin
                                </Badge>
                                
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <Calendar className="h-3 w-3" />
                                  <span>{new Date(user.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="px-4 py-3 flex items-center justify-between gap-2">
                        <div className="text-sm text-gray-600">
                          Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                            <SelectTrigger className="w-28 rounded-lg text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10 / page</SelectItem>
                              <SelectItem value="20">20 / page</SelectItem>
                              <SelectItem value="50">50 / page</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                            <div className="text-sm">Page {currentPage} / {totalPages}</div>
                            <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            <Card className="p-3 lg:p-4 relative overflow-hidden border-slate-200">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent" />
              <div className="relative flex items-center gap-3 lg:gap-4">
                <div className="h-8 w-8 lg:h-10 lg:w-10 rounded bg-blue-100 flex items-center justify-center">
                  <UserCheck className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-gray-500">Total Employees</p>
                  <p className="text-xl lg:text-2xl font-semibold">{employeeUsers.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 lg:p-4 relative overflow-hidden border-slate-200">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent" />
              <div className="relative flex items-center gap-3 lg:gap-4">
                <div className="h-8 w-8 lg:h-10 lg:w-10 rounded bg-orange-100 flex items-center justify-center">
                  <User className="h-4 w-4 lg:h-5 lg:w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-gray-500">Available Slots</p>
                  <p className="text-xl lg:text-2xl font-semibold">{remainingSlots}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Users Table - Desktop */}
          <div className="hidden lg:block">
            <Card className="border-slate-200">
              <div className="p-4 lg:p-6">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 lg:py-12">
                    <UserCheck className="h-10 w-10 lg:h-12 lg:w-12 mx-auto text-gray-400 mb-3 lg:mb-4" />
                    <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-1 lg:mb-2">No employees found</h3>
                    <p className="text-sm text-gray-500 mb-3 lg:mb-4">
                      {searchTerm ? 'Try adjusting your search' : 'No employee users in your organization'}
                    </p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-sm">
                            <button className="flex items-center gap-1" onClick={() => { setSortBy('full_name'); setSortDir(prev => (sortBy === 'full_name' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc')); }}>
                              Name {sortBy === 'full_name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                            </button>
                          </TableHead>
                          <TableHead className="text-sm">
                            <button className="flex items-center gap-1" onClick={() => { setSortBy('email'); setSortDir(prev => (sortBy === 'email' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc')); }}>
                              Email {sortBy === 'email' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                            </button>
                          </TableHead>
                          <TableHead className="text-sm">
                            <button className="flex items-center gap-1" onClick={() => { setSortBy('created_at'); setSortDir(prev => (sortBy === 'created_at' ? (prev === 'asc' ? 'desc' : 'asc') : 'desc')); }}>
                              Joined {sortBy === 'created_at' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                            </button>
                          </TableHead>
                          <TableHead className="w-[50px] text-sm"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                                  {user.full_name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                {user.full_name}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600 text-sm">
                              {user.email}
                            </TableCell>
                            <TableCell className="text-gray-600 text-sm">
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {currentUser?.role === 'admin' && currentUser?.id !== user.id && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="text-sm">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleChangeRole(user.id, 'admin')}
                                    >
                                      <Shield className="mr-2 h-4 w-4" />
                                      Make Admin
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => confirmDeleteUser(user.id)}
                                    >
                                      Deactivate User
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div className="text-sm text-gray-600">
                        Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                          <SelectTrigger className="w-28 rounded-lg text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10 / page</SelectItem>
                            <SelectItem value="20">20 / page</SelectItem>
                            <SelectItem value="50">50 / page</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                          <div className="text-sm">Page {currentPage} / {totalPages}</div>
                          <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Mobile Users List */}
          <div className="lg:hidden">
            <Card className="border-slate-200">
              <div className="p-4">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-base font-medium text-gray-900 mb-1">No employees found</h3>
                    <p className="text-sm text-gray-500">
                      {searchTerm ? 'Try adjusting your search' : 'No employee users in your organization'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-slate-200">
                      {paginatedUsers.map((user) => (
                        <div 
                          key={user.id}
                          className="p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                        >
                          <div className="flex gap-3">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-semibold text-base flex-shrink-0">
                              {user.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-slate-900 truncate text-sm">
                                    {user.full_name}
                                  </h3>
                                  <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">{user.email}</span>
                                  </div>
                                  {user.phone && (
                                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                      <Phone className="h-3 w-3" />
                                      <span>{user.phone}</span>
                                    </div>
                                  )}
                                </div>
                                {currentUser?.role === 'admin' && currentUser?.id !== user.id && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="text-sm">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleChangeRole(user.id, 'admin')}
                                      >
                                        <Shield className="mr-2 h-4 w-4" />
                                        Make Admin
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="text-red-600"
                                        onClick={() => confirmDeleteUser(user.id)}
                                      >
                                        Deactivate User
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                              
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <Badge variant="secondary" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  Employee
                                </Badge>
                                
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <Calendar className="h-3 w-3" />
                                  <span>{new Date(user.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="px-4 py-3 flex items-center justify-between gap-2">
                        <div className="text-sm text-gray-600">
                          Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                            <SelectTrigger className="w-28 rounded-lg text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10 / page</SelectItem>
                              <SelectItem value="20">20 / page</SelectItem>
                              <SelectItem value="50">50 / page</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                            <div className="text-sm">Page {currentPage} / {totalPages}</div>
                            <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate user?</AlertDialogTitle>
            <AlertDialogDescription>
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