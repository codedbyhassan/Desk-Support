import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { FilePlus2, Package, Send, Building2, Users } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface Asset {
  id: string
  name: string
  serial_number?: string
  category?: string
}

interface Department {
  id: string
  name: string
  description?: string
}

interface User {
  id: string
  full_name: string
  email: string
  department_id?: string
}

interface TicketFormProps {
  assetId?: string
  onSubmit?: (ticketId: string) => void
}

export function TicketForm({ assetId, onSubmit }: TicketFormProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [category, setCategory] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<string>(assetId || 'none')
  const [assignmentType, setAssignmentType] = useState<'department' | 'user'>('department')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('none')
  const [selectedUser, setSelectedUser] = useState<string>('none')
  const [photoUrl, setPhotoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingAssets, setLoadingAssets] = useState(true)
  const [loadingDepartments, setLoadingDepartments] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userAssets, setUserAssets] = useState<Asset[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const { toast } = useToast()

  useEffect(() => {
    if (user?.id && user?.company_id) {
      fetchUserAssets()
      fetchDepartments()
      if (user?.role === 'admin') {
        fetchUsers()
      }
    }
  }, [user?.id, user?.company_id, user?.role])

  const fetchUserAssets = async () => {
    try {
      setLoadingAssets(true)
      const { data, error } = await supabase
        .from('assets')
        .select('id, name, serial_number, category')
        .eq('assigned_to', user?.id)
        .eq('company_id', user?.company_id)
        .order('name', { ascending: true })

      if (error) throw error
      setUserAssets(data || [])
    } catch (error) {
      console.error('Error loading user assets:', error)
      toast({ title: 'Error', description: 'Failed to load your assets' })
    } finally {
      setLoadingAssets(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true)
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, description')
        .eq('company_id', user?.company_id)
        .order('name', { ascending: true })

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error loading departments:', error)
      toast({ title: 'Error', description: 'Failed to load departments' })
    } finally {
      setLoadingDepartments(false)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, department_id')
        .eq('company_id', user?.company_id)
        .order('full_name', { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
      toast({ title: 'Error', description: 'Failed to load users' })
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      toast({ title: 'Error', description: 'Please fill all required fields' })
      return
    }

    if (assignmentType === 'department' && selectedDepartment === 'none') {
      toast({ title: 'Error', description: 'Please select a department for ticket routing' })
      return
    }

    if (assignmentType === 'user' && selectedUser === 'none') {
      toast({ title: 'Error', description: 'Please select a user to assign the ticket' })
      return
    }

    setLoading(true)
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session?.user.id) throw new Error('Not authenticated')
      if (!user?.company_id) throw new Error('No company associated with user')

      const ticketData: any = {
        title,
        description,
        priority,
        category,
        asset_id: selectedAsset === 'none' ? null : selectedAsset,
        photo_url: photoUrl || 'https://via.placeholder.com/150',
        created_by: session.data.session.user.id,
        company_id: user.company_id,
        status: assignmentType === 'user' ? 'in_progress' : 'open'
      }

      if (assignmentType === 'department') {
        ticketData.department_id = selectedDepartment
      }

      if (assignmentType === 'user') {
        ticketData.assigned_to = selectedUser
        ticketData.accepted_at = new Date().toISOString()
        ticketData.accepted_by = session.data.session.user.id
        
        const selectedUserData = users.find(u => u.id === selectedUser)
        if (selectedUserData?.department_id) {
          ticketData.department_id = selectedUserData.department_id
        }
      }

      const { data, error } = await supabase
        .from('tickets')
        .insert(ticketData)
        .select()
        .single()

      if (error) throw error

      if (data?.id) {
        await supabase.from('ticket_status_history').insert({
          ticket_id: data.id,
          status: ticketData.status,
          changed_by: session.data.session.user.id,
          company_id: user.company_id
        })
      }

      const successMessage = assignmentType === 'department' 
        ? 'Ticket created and routed to department successfully'
        : `Ticket created and assigned to ${users.find(u => u.id === selectedUser)?.full_name} successfully`

      toast({ 
        title: 'Success', 
        description: successMessage
      })
      if (onSubmit) onSubmit(data.id)

      setTitle('')
      setDescription('')
      setPriority('medium')
      setCategory('')
      setSelectedAsset(assetId || 'none')
      setAssignmentType('department')
      setSelectedDepartment('none')
      setSelectedUser('none')
      setPhotoUrl('')
    } catch (error) {
      console.error('Error creating ticket:', error)
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to create ticket' 
      })
    } finally {
      setLoading(false)
    }
  }

  const priorityColors = {
    low: 'text-blue-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    urgent: 'text-red-600'
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent" />
      <CardHeader className="relative p-4 lg:p-6">
        <CardTitle className="flex items-center gap-2 text-lg lg:text-xl">
          <FilePlus2 className="h-5 w-5 text-orange-500" />
          Create New Ticket
        </CardTitle>
      </CardHeader>
      <CardContent className="relative p-4 lg:p-6">
        <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
          <div className="space-y-3 lg:space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-sm lg:text-base">Title *</Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue"
                required
                className="rounded-lg text-sm lg:text-base"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm lg:text-base">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Provide detailed information about the issue"
                required
                className="rounded-lg text-sm lg:text-base resize-vertical min-h-[100px]"
              />
            </div>

            {/* Priority & Category - Stack on mobile, side-by-side on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
              <div>
                <Label htmlFor="priority" className="text-sm lg:text-base">Priority *</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger id="priority" className={`rounded-lg text-sm lg:text-base ${priorityColors[priority]}`}>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="low" className="text-blue-600">Low</SelectItem>
                      <SelectItem value="medium" className="text-yellow-600">Medium</SelectItem>
                      <SelectItem value="high" className="text-orange-600">High</SelectItem>
                      <SelectItem value="urgent" className="text-red-600">Urgent</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category" className="text-sm lg:text-base">Category</Label>
                <Input
                  id="category"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Hardware, Software, Network"
                  className="rounded-lg text-sm lg:text-base"
                />
              </div>
            </div>

            {/* Assignment Section - Admin Only */}
            {user?.role === 'admin' && (
              <div>
                <Label className="text-sm lg:text-base">Assign To *</Label>
                
                {/* Assignment Type Toggle - Stack on mobile, side-by-side on larger screens */}
                <div className="flex flex-col sm:flex-row gap-2 mb-3 lg:mb-4">
                  <Button
                    type="button"
                    variant={assignmentType === 'department' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setAssignmentType('department')
                      setSelectedUser('none')
                    }}
                    className="flex-1 h-11 lg:h-10"
                  >
                    <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-xs lg:text-sm">Department</span>
                  </Button>
                  <Button
                    type="button"
                    variant={assignmentType === 'user' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setAssignmentType('user')
                      setSelectedDepartment('none')
                    }}
                    className="flex-1 h-11 lg:h-10"
                  >
                    <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-xs lg:text-sm">Specific User</span>
                  </Button>
                </div>

                {assignmentType === 'department' ? (
                  <div>
                    <div className="relative">
                      <Select
                        value={selectedDepartment}
                        onValueChange={setSelectedDepartment}
                        disabled={loadingDepartments}
                      >
                        <SelectTrigger className="w-full rounded-lg text-sm lg:text-base h-11 lg:h-10">
                          <SelectValue placeholder="Select department to route ticket" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none" disabled>-- Select Department --</SelectItem>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id} className="text-sm">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                  <span className="truncate">{dept.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {loadingDepartments && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Spinner size="sm" />
                        </div>
                      )}
                    </div>
                    {!loadingDepartments && departments.length === 0 && (
                      <p className="text-xs lg:text-sm text-red-500 mt-2 flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        No departments available.
                      </p>
                    )}
                    {selectedDepartment !== 'none' && (
                      <p className="text-xs lg:text-sm text-green-600 mt-2">
                        ✓ Ticket will be routed to {departments.find(d => d.id === selectedDepartment)?.name}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Select
                        value={selectedUser}
                        onValueChange={setSelectedUser}
                        disabled={loadingUsers}
                      >
                        <SelectTrigger className="w-full rounded-lg text-sm lg:text-base h-11 lg:h-10">
                          <SelectValue placeholder="Select user to assign ticket" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none" disabled>-- Select User --</SelectItem>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id} className="text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Users className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="truncate font-medium">{u.full_name}</div>
                                    <div className="text-xs text-gray-500 truncate">{u.email}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {loadingUsers && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Spinner size="sm" />
                        </div>
                      )}
                    </div>
                    {!loadingUsers && users.length === 0 && (
                      <p className="text-xs lg:text-sm text-red-500 mt-2 flex items-center gap-1.5">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        No users available.
                      </p>
                    )}
                    {selectedUser !== 'none' && (
                      <p className="text-xs lg:text-sm text-blue-600 mt-2">
                        ✓ Ticket will be assigned directly to {users.find(u => u.id === selectedUser)?.full_name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Department Selection - Regular Users */}
            {user?.role !== 'admin' && (
              <div>
                <Label htmlFor="department" className="text-sm lg:text-base">Department * (Ticket Routing)</Label>
                <div className="relative">
                  <Select
                    value={selectedDepartment}
                    onValueChange={setSelectedDepartment}
                    disabled={loadingDepartments}
                  >
                    <SelectTrigger id="department" className="w-full rounded-lg text-sm lg:text-base h-11 lg:h-10">
                      <SelectValue placeholder="Select department to route ticket" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none" disabled>-- Select Department --</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id} className="text-sm">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-orange-500 flex-shrink-0" />
                              <span className="truncate">{dept.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {loadingDepartments && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Spinner size="sm" />
                    </div>
                  )}
                </div>
                {!loadingDepartments && departments.length === 0 && (
                  <p className="text-xs lg:text-sm text-red-500 mt-2 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    No departments available. Contact admin.
                  </p>
                )}
                {selectedDepartment !== 'none' && (
                  <p className="text-xs lg:text-sm text-green-600 mt-2">
                    ✓ Ticket will be routed to {departments.find(d => d.id === selectedDepartment)?.name}
                  </p>
                )}
              </div>
            )}

            {/* Asset Selection */}
            <div>
              <Label htmlFor="asset" className="text-sm lg:text-base">Related Asset (Optional)</Label>
              <div className="relative">
                <Select
                  value={selectedAsset}
                  onValueChange={setSelectedAsset}
                  disabled={loadingAssets || assetId !== undefined}
                >
                  <SelectTrigger id="asset" className="w-full rounded-lg text-sm lg:text-base h-11 lg:h-10">
                    <SelectValue placeholder="Select an asset (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none" className="text-sm">-- None --</SelectItem>
                      {userAssets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id} className="text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-slate-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="truncate">{asset.name}</div>
                              {asset.serial_number && (
                                <div className="text-xs text-gray-500 truncate">{asset.serial_number}</div>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {loadingAssets && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Spinner size="sm" />
                  </div>
                )}
              </div>
              {!loadingAssets && userAssets.length === 0 && (
                <p className="text-xs lg:text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Package className="h-4 w-4 flex-shrink-0" />
                  No assets assigned to you
                </p>
              )}
            </div>

            {/* Photo URL */}
            <div>
              <Label htmlFor="photo" className="text-sm lg:text-base">Photo URL (Optional)</Label>
              <Input
                id="photo"
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="rounded-lg text-sm lg:text-base"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || (assignmentType === 'department' && selectedDepartment === 'none') || (assignmentType === 'user' && selectedUser === 'none')}
            className="w-full h-12 lg:h-11 text-sm lg:text-base font-medium"
            size="lg"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Spinner size="sm" className="mr-2" />
                <span>Creating...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Send className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>
                  {user?.role === 'admin' && assignmentType === 'user' ? 'Create & Assign Ticket' : 'Create Ticket'}
                </span>
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}