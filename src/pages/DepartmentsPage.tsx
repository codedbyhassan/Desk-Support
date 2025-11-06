import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          manager:manager_id(full_name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // For each department, get counts
      const departmentsWithCounts = await Promise.all(
        (data || []).map(async (dept) => {
          // Count members
          const { count: memberCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', dept.id)

          // Count total tickets
          const { count: ticketCount } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', dept.id)

          // Count pending tickets (not assigned yet)
          const { count: pendingCount } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', dept.id)
            .is('assigned_to', null)

          return {
            ...dept,
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

  // Check if user is admin
  const isAdmin = user?.role === 'admin'

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1 lg:space-y-2">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Departments</h1>
            <p className="text-gray-500 flex items-center gap-1 text-sm lg:text-base">
              <Building2 className="h-4 w-4" />
              {isAdmin ? 'Manage departments and ticket routing' : 'Your department dashboard'}
            </p>
          </div>
          {isAdmin && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-11 lg:h-10 rounded-lg lg:rounded-xl">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create Department</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] lg:max-w-lg rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-lg lg:text-xl">Create New Department</DialogTitle>
                  <DialogDescription className="text-sm lg:text-base">
                    Add a new department to organize ticket routing
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateDepartment} className="space-y-3 lg:space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm">Department Name *</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Transport, IT Support, HR"
                      className="rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm">Description *</Label>
                    <Textarea
                      id="description"
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="What does this department handle?"
                      rows={3}
                      className="rounded-lg text-sm"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 lg:h-10 rounded-lg lg:rounded-xl"
                  >
                    {submitting ? 'Creating...' : 'Create Department'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Admin View: Department Cards */}
      {isAdmin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8 lg:py-12 text-gray-500 text-sm">
              Loading departments...
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="col-span-full text-center py-8 lg:py-12">
              <Building2 className="h-10 w-10 lg:h-12 lg:w-12 mx-auto text-gray-400 mb-3 lg:mb-4" />
              <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-1 lg:mb-2">
                No departments found
              </h3>
              <p className="text-gray-500 text-sm mb-3 lg:mb-4 px-4">
                {searchTerm ? 'Try adjusting your search' : 'Get started by creating your first department'}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  className="rounded-lg lg:rounded-xl h-11 lg:h-10"
                >
                  <Plus className="h-4 w-4 lg:mr-2" />
                  <span className="hidden sm:inline">Create Department</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              )}
            </div>
          ) : (
            filteredDepartments.map((dept) => (
              <Card
                key={dept.id}
                className="p-4 lg:p-6 cursor-pointer hover:shadow-lg transition-all duration-200 relative overflow-hidden group border-slate-200"
                onClick={() => handleDepartmentClick(dept.id)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative space-y-3 lg:space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30 flex-shrink-0">
                        <Building2 className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base lg:text-lg truncate">{dept.name}</h3>
                        <p className="text-xs lg:text-sm text-gray-500 truncate">
                          {dept.manager?.full_name || 'No manager'}
                        </p>
                      </div>
                    </div>
                    {dept._count && dept._count.pending_tickets > 0 && (
                      <Badge variant="destructive" className="text-[10px] lg:text-xs animate-pulse flex-shrink-0">
                        {dept._count.pending_tickets} New
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs lg:text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {dept.description}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 lg:gap-4 pt-3 lg:pt-4 border-t border-slate-100">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                        <Users className="h-3 w-3 lg:h-4 lg:w-4" />
                      </div>
                      <p className="text-lg lg:text-2xl font-bold text-gray-900">
                        {dept._count?.members || 0}
                      </p>
                      <p className="text-[10px] lg:text-xs text-gray-500">Members</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
                        <Clock className="h-3 w-3 lg:h-4 lg:w-4" />
                      </div>
                      <p className="text-lg lg:text-2xl font-bold text-orange-600">
                        {dept._count?.pending_tickets || 0}
                      </p>
                      <p className="text-[10px] lg:text-xs text-gray-500">Pending</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                        <Ticket className="h-3 w-3 lg:h-4 lg:w-4" />
                      </div>
                      <p className="text-lg lg:text-2xl font-bold text-blue-600">
                        {dept._count?.tickets || 0}
                      </p>
                      <p className="text-[10px] lg:text-xs text-gray-500">Total</p>
                    </div>
                  </div>

                  {/* View Button */}
                  <div className="flex justify-end pt-2">
                    <Button 
                      size="sm" 
                      className="h-8 bg-slate-900 hover:bg-slate-800 rounded-lg text-xs"
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
              </Card>
            ))
          )}
        </div>
      ) : (
        /* User View: Show their department's incoming tickets */
        <Card className="border-slate-200">
          <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-lg lg:text-xl font-semibold">Incoming Tickets</h2>
              <Badge variant="secondary" className="text-xs lg:text-sm w-fit">
                Your Department: {user?.department?.name || 'Not Assigned'}
              </Badge>
            </div>
            
            {/* Quick Stats for User */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              <Card className="p-3 lg:p-4 relative overflow-hidden border-slate-200">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent" />
                <div className="relative flex items-center gap-3 lg:gap-4">
                  <div className="h-8 w-8 lg:h-10 lg:w-10 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-4 w-4 lg:h-5 lg:w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs lg:text-sm text-gray-500">Pending Tickets</p>
                    <p className="text-xl lg:text-2xl font-semibold">0</p>
                  </div>
                </div>
              </Card>

              <Card className="p-3 lg:p-4 relative overflow-hidden border-slate-200">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent" />
                <div className="relative flex items-center gap-3 lg:gap-4">
                  <div className="h-8 w-8 lg:h-10 lg:w-10 rounded bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs lg:text-sm text-gray-500">My Active</p>
                    <p className="text-xl lg:text-2xl font-semibold">0</p>
                  </div>
                </div>
              </Card>

              <Card className="p-3 lg:p-4 relative overflow-hidden border-slate-200 lg:col-span-1">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-transparent" />
                <div className="relative flex items-center gap-3 lg:gap-4">
                  <div className="h-8 w-8 lg:h-10 lg:w-10 rounded bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs lg:text-sm text-gray-500">Completed</p>
                    <p className="text-xl lg:text-2xl font-semibold">0</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Incoming Tickets List */}
            <div className="text-center py-8 lg:py-12 text-gray-500">
              <Ticket className="h-10 w-10 lg:h-12 lg:w-12 mx-auto text-gray-400 mb-3 lg:mb-4" />
              <p className="font-medium text-sm lg:text-base">No pending tickets</p>
              <p className="text-xs lg:text-sm mt-1">Tickets assigned to your department will appear here</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}