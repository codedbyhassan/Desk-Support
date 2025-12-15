import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Loader from '@/components/Loader'
import { PageHeader } from '@/components/ui/PageHeader'
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
  Building2,
  Plus,
  Search,
  Users,
  Ticket,
  AlertCircle,
  Clock,
  CheckCircle2,
  Filter,
  ArrowRight
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'

interface Department {
  id: string
  name: string
  description: string
  manager_id?: string
  created_at: string
  updated_at: string
  manager?: {
    full_name: string
    email: string
  }
  _count?: {
    members: number
    tickets: number
    pending_tickets: number
  }
}

export default function DepartmentsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    if (!user) return
    fetchDepartments()
  }, [user?.id, user?.role])

  const fetchDepartments = async () => {
    setLoading(true)
    try {
      // Admins can see all departments; managers should only see the department they belong to
      let query = supabase.from('departments').select(`*`).eq('company_id', user?.company_id || '')

      if (user?.role === 'manager') {
        // Limit to the manager's own department
        if (user.department_id) {
          query = query.eq('id', user.department_id)
        } else {
          // Manager has no department assigned; return empty list
          setDepartments([])
          setLoading(false)
          return
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      // For each department, get counts and derive manager from users table
      const departmentsWithCounts = await Promise.all(
        (data || []).map(async (dept) => {
          // Count members
          const { count: memberCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', user?.company_id || '')
            .eq('department_id', dept.id)

          // Count total tickets
          const { count: ticketCount } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', user?.company_id || '')
            .eq('department_id', dept.id)

          // Count pending tickets (not assigned yet)
          const { count: pendingCount } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', user?.company_id || '')
            .eq('department_id', dept.id)
            .is('assigned_to', null)

          // Find manager user in this department (role = 'manager')
          let derivedManager: { full_name: string; email: string } | undefined
          const { data: managerUser, error: managerError } = await supabase
            .from('users')
            .select('full_name, email, role')
            .eq('company_id', user?.company_id || '')
            .eq('department_id', dept.id)
            .eq('role', 'manager')
            .maybeSingle()

          if (!managerError && managerUser) {
            derivedManager = {
              full_name: managerUser.full_name,
              email: managerUser.email,
            }
          }

          return {
            ...dept,
            manager: derivedManager,
            _count: {
              members: memberCount || 0,
              tickets: ticketCount || 0,
              pending_tickets: pendingCount || 0,
            }
          }
        })
      )

      setDepartments(departmentsWithCounts)
    } catch (error) {
      console.error('Error fetching departments:', error)
      toast({
        title: 'Error',
        description: 'Failed to load departments',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('departments')
        .insert({
          company_id: user?.company_id,
          name: formData.name,
          description: formData.description,
          manager_id: user?.id,
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Department created successfully',
      })

      setFormData({ name: '', description: '' })
      setCreateDialogOpen(false)
      fetchDepartments()
    } catch (error) {
      console.error('Error creating department:', error)
      toast({
        title: 'Error',
        description: 'Failed to create department',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDepartmentClick = (departmentId: string) => {
    navigate(`/app/departments/${departmentId}`)
  }

  const filteredDepartments = departments.filter(dept =>
    dept.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Check role
  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'
  const hasManagementView = isAdmin || isManager

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <PageHeader
        title="Departments"
        description={
          <span className="flex items-center gap-1">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span>
              {isAdmin
                ? 'Manage departments and ticket routing'
                : isManager
                  ? 'Manage your department and its tickets'
                  : 'Your department dashboard'}
            </span>
          </span>
        }
        actions={
          isAdmin ? (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-10 sm:h-11 lg:h-10 rounded-lg lg:rounded-xl text-xs sm:text-sm w-full sm:w-auto">
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Create Department</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] sm:max-w-[500px] lg:max-w-lg rounded-2xl lg:rounded-3xl mx-4">
                <DialogHeader>
                  <DialogTitle className="text-lg lg:text-xl">Create New Department</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm lg:text-base">
                    Add a new department to organize ticket routing
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateDepartment} className="space-y-3 lg:space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs sm:text-sm">Department Name *</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Transport, IT Support, HR"
                      className="rounded-lg text-xs sm:text-sm h-10 sm:h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-xs sm:text-sm">Description *</Label>
                    <Textarea
                      id="description"
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="What does this department handle?"
                      rows={3}
                      className="rounded-lg text-xs sm:text-sm"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-10 sm:h-11 lg:h-10 rounded-lg lg:rounded-xl text-xs sm:text-sm"
                  >
                    {submitting ? 'Creating...' : 'Create Department'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      {/* Search (useful for admins; harmless but optional for managers) */}
      {hasManagementView && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
            <Input
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-lg text-xs sm:text-sm h-10 sm:h-11"
            />
          </div>
        </div>
      )}

      {/* Admin/Manager View: Department Cards */}
      {hasManagementView ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 px-4 sm:px-0">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-12 lg:py-16">
              <Loader fullPage />
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="col-span-full text-center py-8 lg:py-12">
              <Building2 className="h-10 w-10 lg:h-12 lg:w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-3 lg:mb-4" />
              <h3 className="text-sm sm:text-base lg:text-lg font-medium text-[hsl(var(--foreground))] mb-1 lg:mb-2">
                No departments found
              </h3>
              <p className="text-[hsl(var(--muted-foreground))] text-xs sm:text-sm mb-3 lg:mb-4 px-4">
                {searchTerm ? 'Try adjusting your search' : 'Get started by creating your first department'}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  className="rounded-lg lg:rounded-xl h-10 sm:h-11 lg:h-10 text-xs sm:text-sm"
                >
                  <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Create Department</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              )}
            </div>
          ) : (
            filteredDepartments.map((dept) => (
              <Card
                key={dept.id}
                className="p-3 sm:p-4 lg:p-6 cursor-pointer hover:shadow-lg transition-all duration-200 relative overflow-hidden group border-[hsl(var(--border))]"
                onClick={() => handleDepartmentClick(dept.id)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  {/* Mobile: Horizontal Layout */}
                  <div className="flex items-start gap-3 lg:block">
                    {/* Icon */}
                    <div className="h-10 w-10 sm:h-12 sm:w-12 lg:h-12 lg:w-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30 flex-shrink-0">
                      <Building2 className="h-5 w-5 sm:h-6 sm:w-6 lg:h-6 lg:w-6 text-[hsl(var(--primary-foreground))]" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 lg:mt-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-1.5 lg:mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-xs sm:text-sm lg:text-lg truncate mb-0.5">{dept.name}</h3>
                          <p className="text-[10px] sm:text-xs lg:text-sm text-[hsl(var(--muted-foreground))] truncate">
                            {dept.manager?.full_name || 'No manager'}
                          </p>
                        </div>
                        {dept._count && dept._count.pending_tickets > 0 && (
                          <Badge variant="destructive" className="text-[8px] sm:text-[9px] lg:text-xs animate-pulse flex-shrink-0 px-1.5 py-0.5 sm:px-2 sm:py-1">
                            {dept._count.pending_tickets}
                          </Badge>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-[10px] sm:text-xs lg:text-sm text-[hsl(var(--muted-foreground))] line-clamp-2 leading-relaxed mb-2 lg:mb-3">
                        {dept.description}
                      </p>

                      {/* Stats - Horizontal on Mobile */}
                      <div className="flex items-center gap-2 sm:gap-3 lg:grid lg:grid-cols-3 lg:gap-4 pt-2 lg:pt-4 border-t border-[hsl(var(--border))]">
                        <div className="flex-1 flex items-center gap-1.5 lg:flex-col lg:text-center">
                          <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
                          <div className="lg:mt-1 min-w-0">
                            <p className="text-xs sm:text-sm lg:text-2xl font-bold text-[hsl(var(--foreground))] truncate lg:truncate-none">
                              {dept._count?.members || 0}
                            </p>
                            <p className="text-[8px] sm:text-[9px] lg:text-xs text-[hsl(var(--muted-foreground))] hidden lg:block">Members</p>
                          </div>
                        </div>
                        <div className="flex-1 flex items-center gap-1.5 lg:flex-col lg:text-center">
                          <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 text-orange-600 flex-shrink-0" />
                          <div className="lg:mt-1 min-w-0">
                            <p className="text-xs sm:text-sm lg:text-2xl font-bold text-orange-600 truncate lg:truncate-none">
                              {dept._count?.pending_tickets || 0}
                            </p>
                            <p className="text-[8px] sm:text-[9px] lg:text-xs text-[hsl(var(--muted-foreground))] hidden lg:block">Pending</p>
                          </div>
                        </div>
                        <div className="flex-1 flex items-center gap-1.5 lg:flex-col lg:text-center">
                          <Ticket className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 text-blue-600 flex-shrink-0" />
                          <div className="lg:mt-1 min-w-0">
                            <p className="text-xs sm:text-sm lg:text-2xl font-bold text-blue-600 truncate lg:truncate-none">
                              {dept._count?.tickets || 0}
                            </p>
                            <p className="text-[8px] sm:text-[9px] lg:text-xs text-[hsl(var(--muted-foreground))] hidden lg:block">Total</p>
                          </div>
                        </div>
                      </div>

                      {/* View Button - Desktop only */}
                      <div className="hidden lg:flex justify-end pt-2">
                        <Button 
                          size="sm" 
                          className="h-8 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] rounded-lg text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDepartmentClick(dept.id)
                          }}
                        >
                          View Details
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* User View: Show their department's incoming tickets */
        <Card className="border-[hsl(var(--border))] rounded-2xl lg:rounded-3xl mx-4 sm:mx-0">
          <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold">Incoming Tickets</h2>
              <Badge variant="secondary" className="text-xs sm:text-sm w-fit">
                Your Department: {user?.department?.name || 'Not Assigned'}
              </Badge>
            </div>
            
            {/* Quick Stats for User */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4">
              <Card className="p-2 sm:p-3 lg:p-4 relative overflow-hidden border-[hsl(var(--border))]">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent" />
                <div className="relative flex items-center gap-2 lg:gap-3">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs lg:text-sm text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Pending Tickets</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-semibold">0</p>
                  </div>
                </div>
              </Card>

              <Card className="p-2 sm:p-3 lg:p-4 relative overflow-hidden border-[hsl(var(--border))]">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent" />
                <div className="relative flex items-center gap-2 lg:gap-3">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 rounded bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-yellow-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs lg:text-sm text-[hsl(var(--muted-foreground))] uppercase tracking-wide">My Active</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-semibold">0</p>
                  </div>
                </div>
              </Card>

              <Card className="p-2 sm:p-3 lg:p-4 relative overflow-hidden border-[hsl(var(--border))] col-span-2 lg:col-span-1">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-transparent" />
                <div className="relative flex items-center gap-2 lg:gap-3">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 rounded bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs lg:text-sm text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Completed</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-semibold">0</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Incoming Tickets List */}
            <div className="text-center py-8 lg:py-12 text-[hsl(var(--muted-foreground))]">
              <Ticket className="h-10 w-10 lg:h-12 lg:w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-3 lg:mb-4" />
              <p className="font-medium text-xs sm:text-sm lg:text-base">No pending tickets</p>
              <p className="text-[10px] sm:text-xs lg:text-sm mt-1">Tickets assigned to your department will appear here</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}