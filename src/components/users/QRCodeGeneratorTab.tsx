import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  QrCode,
  MapPin,
  User,
  Download,
  Printer,
  Link as LinkIcon,
  XCircle,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Calendar as CalendarIcon,
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
  FileText,
  Copy,
  Check,
  Clock,
  Shield,
  Camera,
  Search,
  Filter,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import QRCodeLib from 'qrcode'
import { colors, statusStyles, components } from '@/lib/theme'

// Types
type QRCodeType = 'location' | 'individual'
type QRCodeAction = 'clock_in' | 'clock_out' | 'toggle'

interface QRCodeRecord {
  id: string
  company_id: string
  qr_code_id: string
  type: QRCodeType
  location_name: string
  user_id?: string
  action: QRCodeAction
  active_hours_start?: string
  active_hours_end?: string
  use_active_hours: boolean
  is_active: boolean
  expires_at?: string
  requires_auth: boolean
  requires_gps: boolean
  requires_photo: boolean
  latitude?: number
  longitude?: number
  gps_radius?: number
  created_at: string
  updated_at: string
  usage_count: number
  last_used_at?: string
}

interface QRCodeFormData {
  type: QRCodeType
  location_name: string
  action: QRCodeAction
  use_active_hours: boolean
  active_hours_start: string
  active_hours_end: string
  never_expires: boolean
  expires_at?: string
  requires_auth: boolean
  requires_gps: boolean
  requires_photo: boolean
  latitude?: number
  longitude?: number
}

// Action Config
const actionConfig = {
  clock_in: {
    icon: ArrowDown,
    label: 'Clock In Only',
    color: `bg-[${colors.success.light}] text-[${colors.success.text}] border-[${colors.success.border}]`,
  },
  clock_out: {
    icon: ArrowUp,
    label: 'Clock Out Only',
    color: `bg-[${colors.danger.light}] text-[${colors.danger.text}] border-[${colors.danger.border}]`,
  },
  toggle: {
    icon: RefreshCw,
    label: 'Smart Toggle',
    color: `bg-[${colors.primary.light}] text-[${colors.primary.text}] border-[${colors.primary.border}]`,
  },
}

// Main Component
export default function QRCodeGeneratorTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [qrType, setQrType] = useState<QRCodeType>('location')
  const [qrCodes, setQrCodes] = useState<QRCodeRecord[]>([])
  const [generatedQR, setGeneratedQR] = useState<QRCodeRecord | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<QRCodeRecord | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all')

  // Form state
  const [formData, setFormData] = useState<QRCodeFormData>({
    type: 'location',
    location_name: '',
    action: 'toggle',
    use_active_hours: false,
    active_hours_start: '08:00',
    active_hours_end: '18:00',
    never_expires: true,
    requires_auth: true,
    requires_gps: false,
    requires_photo: false,
  })
  const [expiryDate, setExpiryDate] = useState<Date>()

  useEffect(() => {
    if (user?.company_id) {
      fetchQRCodes()
    }
  }, [user?.company_id])

  const fetchQRCodes = async () => {
    if (!user?.company_id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setQrCodes(data || [])
    } catch (error) {
      console.error('Error fetching QR codes:', error)
      toast({
        title: 'Error',
        description: 'Failed to load QR codes',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const generateQRCodeImage = async (qrCodeId: string) => {
    try {
      const url = await QRCodeLib.toDataURL(`attendance://${qrCodeId}`, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
      return url
    } catch (error) {
      console.error('Error generating QR code image:', error)
      return ''
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.company_id || !formData.location_name.trim()) return

    try {
      const qrCodeId = `CLK_${formData.location_name
        .toUpperCase()
        .replace(/\s+/g, '_')}_${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`

      const { data, error } = await supabase
        .from('qr_codes')
        .insert({
          company_id: user.company_id,
          qr_code_id: qrCodeId,
          type: formData.type,
          location_name: formData.location_name,
          action: formData.action,
          use_active_hours: formData.use_active_hours,
          active_hours_start: formData.use_active_hours ? formData.active_hours_start : null,
          active_hours_end: formData.use_active_hours ? formData.active_hours_end : null,
          expires_at: formData.expires_at,
          requires_auth: formData.requires_auth,
          requires_gps: formData.requires_gps,
          requires_photo: formData.requires_photo,
          latitude: formData.latitude,
          longitude: formData.longitude,
          is_active: true,
          usage_count: 0,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      const url = await generateQRCodeImage(qrCodeId)
      setQrCodeUrl(url)
      setGeneratedQR(data)
      setQrCodes((prev) => [data, ...prev])

      toast({
        title: 'Success',
        description: `QR Code generated: ${data.location_name}`,
      })

      setTimeout(() => {
        document.getElementById('qr-preview')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (error: any) {
      console.error('Error generating QR code:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate QR code',
        variant: 'destructive',
      })
    }
  }

  const handleView = async (qr: QRCodeRecord) => {
    const url = await generateQRCodeImage(qr.qr_code_id)
    setQrCodeUrl(url)
    setGeneratedQR(qr)
    setTimeout(() => {
      document.getElementById('qr-preview')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleDeactivate = async (qr?: QRCodeRecord) => {
    const target = qr || generatedQR
    if (!target) return

    try {
      const { error } = await supabase
        .from('qr_codes')
        .update({ is_active: false })
        .eq('id', target.id)

      if (error) throw error

      setQrCodes((prev) => prev.map((q) => (q.id === target.id ? { ...q, is_active: false } : q)))

      if (generatedQR?.id === target.id) {
        setGeneratedQR((prev) => (prev ? { ...prev, is_active: false } : null))
      }

      toast({
        title: 'Success',
        description: 'QR Code deactivated',
      })
    } catch (error) {
      console.error('Error deactivating QR code:', error)
      toast({
        title: 'Error',
        description: 'Failed to deactivate QR code',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = (qr: QRCodeRecord) => {
    setDeleteTarget(qr)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    try {
      const { error } = await supabase.from('qr_codes').delete().eq('id', deleteTarget.id)

      if (error) throw error

      setQrCodes((prev) => prev.filter((q) => q.id !== deleteTarget.id))

      if (generatedQR?.id === deleteTarget.id) {
        setGeneratedQR(null)
        setQrCodeUrl('')
      }

      toast({
        title: 'Success',
        description: 'QR Code deleted',
      })
    } catch (error) {
      console.error('Error deleting QR code:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete QR code',
        variant: 'destructive',
      })
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleDownload = () => {
    if (!qrCodeUrl || !generatedQR) return

    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `${generatedQR.qr_code_id}.png`
    link.click()

    toast({
      title: 'Success',
      description: 'QR Code downloaded',
    })
  }

  const handlePrint = () => {
    window.print()
    toast({
      title: 'Info',
      description: 'Opening print dialog...',
    })
  }

  const handleCopyLink = async () => {
    if (!generatedQR) return
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/scan/${generatedQR.qr_code_id}`
      )
      toast({
        title: 'Success',
        description: 'Shareable link copied to clipboard',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      })
    }
  }

  const getStatus = (qr: QRCodeRecord) => {
    if (qr.expires_at && new Date(qr.expires_at) < new Date()) {
      return { label: 'Expired', color: `bg-[${colors.warning.light}] text-[${colors.warning.text}] border-[${colors.warning.border}]` }
    }
    if (!qr.is_active) {
      return { label: 'Inactive', color: `bg-[${colors.neutral.light}] text-[${colors.neutral.text}] border-[${colors.neutral.border}]` }
    }
    return { label: 'Active', color: `bg-[${colors.success.light}] text-[${colors.success.text}] border-[${colors.success.border}]` }
  }

  const filteredQRCodes = qrCodes.filter((qr) => {
    const matchesSearch = qr.location_name.toLowerCase().includes(searchTerm.toLowerCase())
    const status = getStatus(qr)
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && status.label === 'Active') ||
      (statusFilter === 'inactive' && status.label === 'Inactive') ||
      (statusFilter === 'expired' && status.label === 'Expired')
    return matchesSearch && matchesStatus
  })

  const ActionIcon = generatedQR ? actionConfig[generatedQR.action].icon : null

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <QrCode className="h-6 w-6 text-white" />
          </div>
        <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">QR Code Generator</h2>
            <p className="text-sm text-slate-500 dark:text-white">Create and manage attendance QR codes</p>
          </div>
        </div>
        </div>

      {/* Generated QR Preview - Show at top if exists */}
        {generatedQR && qrCodeUrl && (
        <Card id="qr-preview" className={`border-2 border-[${colors.primary.border}] shadow-lg bg-gradient-to-br from-[${colors.primary.lighter}]/50 to-white`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-[${colors.success.main}] flex items-center justify-center`}>
                  <Check className="h-5 w-5 text-white" />
                </div>
          <div>
                  <CardTitle className="text-lg">Generated QR Code</CardTitle>
                  <p className="text-sm text-slate-500">{generatedQR.location_name}</p>
                </div>
              </div>
              <Badge className={getStatus(generatedQR).color}>
                {getStatus(generatedQR).label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-2 gap-6">
              {/* QR Code Display */}
              <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border-2 border-slate-200">
                <img src={qrCodeUrl} alt="QR Code" className="w-full max-w-[280px] mb-4" />
                <div className="text-center space-y-2">
                  <p className="text-xs font-mono text-slate-600">
                    ID: <span className="font-semibold text-slate-900">#{generatedQR.qr_code_id}</span>
                  </p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`bg-[${colors.primary.light}] text-[${colors.primary.text}] border-[${colors.primary.border}]`}>
                      <MapPin className="h-3 w-3 mr-1" />
                      {generatedQR.location_name}
                    </Badge>
                    {ActionIcon && (
                      <Badge variant="outline" className={actionConfig[generatedQR.action].color}>
                        <ActionIcon className="h-3 w-3 mr-1" />
                        {actionConfig[generatedQR.action].label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleDownload} variant="outline" className="h-auto py-3">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button onClick={handlePrint} variant="outline" className="h-auto py-3">
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
                <Button onClick={handleCopyLink} variant="outline" className="w-full h-auto py-3">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Copy Shareable Link
                </Button>
                <Button
                  onClick={() => handleDeactivate()}
                  variant="destructive"
                  className="w-full h-auto py-3"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Deactivate QR Code
                </Button>
                <div className="pt-4 border-t border-slate-200 space-y-2 text-xs text-slate-600">
                  <p>Created: {format(new Date(generatedQR.created_at), "PPP 'at' p")}</p>
                  {generatedQR.usage_count > 0 && (
                    <p>
                      Used {generatedQR.usage_count} time{generatedQR.usage_count !== 1 ? 's' : ''}
                      {generatedQR.last_used_at &&
                        ` - Last used ${formatDistanceToNow(new Date(generatedQR.last_used_at), { addSuffix: true })}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Generation Form - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* QR Type Selection */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                QR Code Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={qrType} onValueChange={(v) => setQrType(v as QRCodeType)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card
                    className={cn(
                      'cursor-pointer transition-all border-2',
                      qrType === 'location'
                        ? `border-[${colors.primary.main}] bg-[${colors.primary.lighter}]`
                        : `border-[${colors.neutral.border}] hover:border-[${colors.primary.lighter}]`
                    )}
                    onClick={() => setQrType('location')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="location" id="location" className="mt-1" />
                        <Label htmlFor="location" className="cursor-pointer flex-1">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 bg-[${colors.primary.light}] rounded-lg`}>
                              <MapPin className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">Location-Based</span>
                                <Badge variant="outline" className={`bg-[${colors.success.light}] text-[${colors.success.text}] border-[${colors.success.border}] text-xs`}>
                                  Recommended
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600">
                                One QR code for all employees at this location
                              </p>
                            </div>
                          </div>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={cn(
                      'cursor-pointer transition-all border-2',
                      qrType === 'individual'
                        ? `border-[${colors.purple.main}] bg-[${colors.purple.lighter}]`
                        : 'border-slate-200 hover:border-purple-300'
                    )}
                    onClick={() => setQrType('individual')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="individual" id="individual" className="mt-1" />
                        <Label htmlFor="individual" className="cursor-pointer flex-1">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 bg-[${colors.purple.light}] rounded-lg`}>
                              <User className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <span className="font-semibold text-sm">Individual</span>
                              <p className="text-xs text-slate-600 mt-1">
                                Unique QR code per employee
                              </p>
                            </div>
                          </div>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Generation Form */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-6">
                {/* Location Name */}
                <div className="space-y-2">
                  <Label htmlFor="location_name" className="text-sm font-medium">
                    Location Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="location_name"
                    placeholder="e.g., Main Office Entrance, Conference Room A"
                    value={formData.location_name}
                    onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                    required
                    className="h-11"
            />
          </div>

                {/* Action Type */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Action Type</Label>
                  <RadioGroup
                    value={formData.action}
                    onValueChange={(v: any) => setFormData({ ...formData, action: v })}
                    className="grid grid-cols-1 md:grid-cols-3 gap-3"
                  >
                    {Object.entries(actionConfig).map(([value, config]) => {
                      const Icon = config.icon
                      return (
                        <div key={value}>
                          <RadioGroupItem value={value} id={value} className="hidden" />
                          <Label
                            htmlFor={value}
                            className={cn(
                              'block cursor-pointer transition-all border-2 rounded-lg p-4',
                              formData.action === value
                                ? `border-[${colors.primary.main}] bg-[${colors.primary.lighter}]`
                                : `border-[${colors.neutral.border}] hover:border-[${colors.neutral.light}]`
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="h-4 w-4" />
                              <span className="text-sm">{config.label}</span>
                              {value === 'toggle' && (
                                <Badge variant="outline" className={`bg-[${colors.success.light}] text-[${colors.success.text}] border-[${colors.success.border}] text-xs ml-auto`}>
                                  Recommended
                                </Badge>
                              )}
                            </div>
                          </Label>
                        </div>
                      )
                    })}
                  </RadioGroup>
      </div>

                {/* Active Hours */}
                <div className={`space-y-3 p-4 bg-[${colors.neutral.light}] rounded-lg border border-[${colors.neutral.border}]`}>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Active Hours
                    </Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="use_24_7"
                        checked={!formData.use_active_hours}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, use_active_hours: !checked })
                        }
                      />
                      <Label htmlFor="use_24_7" className="cursor-pointer text-sm">
                        24/7 Access
                      </Label>
                    </div>
                  </div>
                  {formData.use_active_hours && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="start_time" className="text-xs">Start Time</Label>
                        <Input
                          id="start_time"
                          type="time"
                          value={formData.active_hours_start}
                          onChange={(e) =>
                            setFormData({ ...formData, active_hours_start: e.target.value })
                          }
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end_time" className="text-xs">End Time</Label>
                        <Input
                          id="end_time"
                          type="time"
                          value={formData.active_hours_end}
                          onChange={(e) =>
                            setFormData({ ...formData, active_hours_end: e.target.value })
                          }
                          className="h-10"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Expiry Settings */}
                <div className={`space-y-3 p-4 bg-[${colors.neutral.light}] rounded-lg border border-[${colors.neutral.border}]`}>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Expiry Settings
                  </Label>
                  <RadioGroup
                    value={formData.never_expires ? 'never' : 'date'}
                    onValueChange={(v) => setFormData({ ...formData, never_expires: v === 'never' })}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="never" id="never" />
                      <Label htmlFor="never" className="cursor-pointer text-sm">
                        Never expires
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="date" id="expires_date" />
                      <Label htmlFor="expires_date" className="cursor-pointer text-sm">
                        Expires on specific date
                      </Label>
                    </div>
                  </RadioGroup>
                  {!formData.never_expires && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal h-10',
                            !expiryDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {expiryDate ? format(expiryDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={expiryDate}
                          onSelect={(date) => {
                            setExpiryDate(date)
                            setFormData({
                              ...formData,
                              expires_at: date ? date.toISOString() : undefined,
                            })
                          }}
                          initialFocus
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {/* Security Options */}
                <div className={`space-y-3 p-4 bg-[${colors.neutral.light}] rounded-lg border border-[${colors.neutral.border}]`}>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Security Options
                  </Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="requires_auth"
                        checked={formData.requires_auth}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, requires_auth: !!checked })
                        }
                      />
                      <Label htmlFor="requires_auth" className="cursor-pointer text-sm flex items-center gap-2">
                        <User className="h-3 w-3" />
                        Require employee authentication
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="requires_gps"
                        checked={formData.requires_gps}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, requires_gps: !!checked })
                        }
                      />
                      <Label htmlFor="requires_gps" className="cursor-pointer text-sm flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        Verify GPS location (100m radius)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="requires_photo"
                        checked={formData.requires_photo}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, requires_photo: !!checked })
                        }
                      />
                      <Label htmlFor="requires_photo" className="cursor-pointer text-sm flex items-center gap-2">
                        <Camera className="h-3 w-3" />
                        Require photo verification
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg"
                  disabled={!formData.location_name.trim()}
                >
                  <QrCode className="h-5 w-5 mr-2" />
                  Generate QR Code
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats - Right Side */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
        <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`p-4 rounded-lg bg-[${colors.primary.light}] border border-[${colors.primary.border}]`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium text-[${colors.primary.text}]`}>Total QR Codes</span>
                  <QrCode className={`h-4 w-4 text-[${colors.primary.main}]`} />
                </div>
                <p className={`text-2xl font-bold text-[${colors.primary.text}]`}>{qrCodes.length}</p>
              </div>
              <div className={`p-4 rounded-lg bg-[${colors.success.light}] border border-[${colors.success.border}]`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium text-[${colors.success.text}]`}>Active</span>
                  <Check className={`h-4 w-4 text-[${colors.success.main}]`} />
                </div>
                <p className={`text-2xl font-bold text-[${colors.success.text}]`}>
                  {qrCodes.filter((q) => q.is_active && (!q.expires_at || new Date(q.expires_at) > new Date())).length}
                </p>
              </div>
              <div className={`p-4 rounded-lg bg-[${colors.warning.light}] border border-[${colors.warning.border}]`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium text-[${colors.warning.text}]`}>Total Uses</span>
                  <RefreshCw className={`h-4 w-4 text-[${colors.warning.main}]`} />
                </div>
                <p className={`text-2xl font-bold text-[${colors.warning.text}]`}>
                  {qrCodes.reduce((sum, q) => sum + q.usage_count, 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Codes List */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              All QR Codes ({filteredQRCodes.length})
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search QR codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className="h-10"
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('active')}
                  className="h-10"
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('inactive')}
                  className="h-10"
                >
                  Inactive
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <QrCode className="h-8 w-8 mx-auto mb-3 animate-spin text-slate-400" />
              <p className="text-sm text-slate-500">Loading QR codes...</p>
            </div>
          ) : filteredQRCodes.length === 0 ? (
            <div className="text-center py-12">
              <QrCode className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <h3 className="text-base font-medium text-slate-900 mb-1">No QR codes found</h3>
              <p className="text-sm text-slate-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Generate your first QR code to get started'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className={`bg-[${colors.neutral.light}]`}>
                      <TableHead className="text-xs font-semibold">Location</TableHead>
                      <TableHead className="text-xs font-semibold">Type</TableHead>
                      <TableHead className="text-xs font-semibold">Action</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Usage</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Created</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQRCodes.map((qr) => {
                      const status = getStatus(qr)
                      const ActionIcon = actionConfig[qr.action].icon
                      return (
                        <TableRow key={qr.id} className={`hover:bg-[${colors.neutral.lighter}]`}>
                          <TableCell className="font-medium text-sm">{qr.location_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {qr.type === 'location' ? (
                                <>
                                  <MapPin className="h-3 w-3 mr-1" />
                                  Location
                                </>
                              ) : (
                                <>
                                  <User className="h-3 w-3 mr-1" />
                                  Individual
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${actionConfig[qr.action].color}`}>
                              <ActionIcon className="h-3 w-3 mr-1" />
                              {actionConfig[qr.action].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm font-medium">{qr.usage_count}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${status.color}`}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-white">
                            {format(new Date(qr.created_at), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(qr)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeactivate(qr)}>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Deactivate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(qr)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredQRCodes.map((qr) => {
                  const status = getStatus(qr)
                  const ActionIcon = actionConfig[qr.action].icon
                  return (
                    <Card key={qr.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{qr.location_name}</p>
                            <p className="text-xs text-slate-500 dark:text-white mt-1">
                              {format(new Date(qr.created_at), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <Badge variant="outline" className={`text-xs ${status.color}`}>
                            {status.label}
                          </Badge>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {qr.type === 'location' ? (
                              <>
                                <MapPin className="h-3 w-3 mr-1" />
                                Location
                              </>
                            ) : (
                              <>
                                <User className="h-3 w-3 mr-1" />
                                Individual
                              </>
                            )}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${actionConfig[qr.action].color}`}>
                            <ActionIcon className="h-3 w-3 mr-1" />
                            {actionConfig[qr.action].label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {qr.usage_count} uses
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleView(qr)}
                            className="h-9"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeactivate(qr)}
                            className="h-9"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Deactivate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 h-9"
                            onClick={() => handleDelete(qr)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete QR Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the QR code for "{deleteTarget?.location_name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={`bg-[${colors.danger.main}] hover:bg-[${colors.danger.dark}]`}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
