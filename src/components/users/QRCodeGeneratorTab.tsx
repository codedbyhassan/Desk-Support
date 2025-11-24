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
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import QRCodeLib from 'qrcode'

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
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  clock_out: {
    icon: ArrowUp,
    label: 'Clock Out Only',
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  toggle: {
    icon: RefreshCw,
    label: 'Smart Toggle',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
}

// QR Type Selector Component
function QRTypeSelector({
  value,
  onChange,
}: {
  value: QRCodeType
  onChange: (value: QRCodeType) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">QR Code Type</h3>
        <p className="text-sm text-muted-foreground">
          Choose the type of QR code you want to generate
        </p>
      </div>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as QRCodeType)}>
        <Card
          className={cn(
            'cursor-pointer transition-colors',
            value === 'location' ? 'border-primary' : 'hover:border-primary/50'
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <RadioGroupItem value="location" id="location" className="mt-1" />
              <Label htmlFor="location" className="cursor-pointer flex-1">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">Location-Based QR Code</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                        Recommended
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      One QR code per location/entrance
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Use case:</strong> All employees use the same code
                    </p>
                  </div>
                </div>
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'cursor-pointer transition-colors',
            value === 'individual' ? 'border-primary' : 'hover:border-primary/50'
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <RadioGroupItem value="individual" id="individual" className="mt-1" />
              <Label htmlFor="individual" className="cursor-pointer flex-1">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">Individual User QR Code</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Each employee gets unique QR code
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Use case:</strong> For printed badges or ID cards
                    </p>
                  </div>
                </div>
              </Label>
            </div>
          </CardContent>
        </Card>
      </RadioGroup>
    </div>
  )
}

// QR Code Form Component
function QRCodeForm({
  type,
  onGenerate,
}: {
  type: QRCodeType
  onGenerate: (data: QRCodeFormData) => void
}) {
  const [formData, setFormData] = useState<QRCodeFormData>({
    type,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.location_name.trim()) {
      return
    }

    onGenerate({
      ...formData,
      expires_at: !formData.never_expires && expiryDate ? expiryDate.toISOString() : undefined,
    })
  }

  const updateFormData = (updates: Partial<QRCodeFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">
            Generate {type === 'location' ? 'Location-Based' : 'Individual'} QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Location Name */}
          <div className="space-y-2">
            <Label htmlFor="location_name">
              Location Name <span className="text-red-600">*</span>
            </Label>
            <Input
              id="location_name"
              placeholder="Main Office Entrance"
              value={formData.location_name}
              onChange={(e) => updateFormData({ location_name: e.target.value })}
              required
            />
          </div>

          {/* QR Code Purpose */}
          <div className="space-y-3">
            <Label>QR Code Purpose</Label>
            <RadioGroup
              value={formData.action}
              onValueChange={(v: any) => updateFormData({ action: v })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="clock_in" id="clock_in" />
                <Label htmlFor="clock_in" className="cursor-pointer flex items-center gap-2">
                  <ArrowDown className="h-4 w-4 text-green-600" />
                  Clock In Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="clock_out" id="clock_out" />
                <Label htmlFor="clock_out" className="cursor-pointer flex items-center gap-2">
                  <ArrowUp className="h-4 w-4 text-red-600" />
                  Clock Out Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="toggle" id="toggle" />
                <Label htmlFor="toggle" className="cursor-pointer flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-blue-600" />
                  Smart Toggle (Clock In/Out)
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800 border-green-200 ml-1"
                  >
                    Recommended
                  </Badge>
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Smart Toggle automatically determines action based on user's current status
            </p>
          </div>

          {/* Active Hours */}
          <div className="space-y-3">
            <Label>Active Hours (Optional)</Label>
            <div className="flex items-center gap-2 mb-3">
              <Checkbox
                id="use_24_7"
                checked={!formData.use_active_hours}
                onCheckedChange={(checked) => updateFormData({ use_active_hours: !checked })}
              />
              <Label htmlFor="use_24_7" className="cursor-pointer text-sm">
                24/7 Access
              </Label>
            </div>

            {formData.use_active_hours && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">From</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.active_hours_start}
                    onChange={(e) => updateFormData({ active_hours_start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">To</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.active_hours_end}
                    onChange={(e) => updateFormData({ active_hours_end: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Expiry Settings */}
          <div className="space-y-3">
            <Label>Expiry Settings</Label>
            <RadioGroup
              value={formData.never_expires ? 'never' : 'date'}
              onValueChange={(v) => updateFormData({ never_expires: v === 'never' })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="never" id="never" />
                <Label htmlFor="never" className="cursor-pointer">
                  Never expires
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="date" id="expires_date" />
                <Label htmlFor="expires_date" className="cursor-pointer">
                  Expires on
                </Label>
              </div>
            </RadioGroup>

            {!formData.never_expires && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
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
                    onSelect={setExpiryDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Security Options */}
          <div className="space-y-3">
            <Label>Security Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires_auth"
                  checked={formData.requires_auth}
                  onCheckedChange={(checked) => updateFormData({ requires_auth: !!checked })}
                />
                <Label htmlFor="requires_auth" className="cursor-pointer text-sm">
                  Require employee to be logged in
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires_gps"
                  checked={formData.requires_gps}
                  onCheckedChange={(checked) => updateFormData({ requires_gps: !!checked })}
                />
                <Label htmlFor="requires_gps" className="cursor-pointer text-sm">
                  Verify GPS location (within 100m radius)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires_photo"
                  checked={formData.requires_photo}
                  onCheckedChange={(checked) => updateFormData({ requires_photo: !!checked })}
                />
                <Label htmlFor="requires_photo" className="cursor-pointer text-sm">
                  Require photo verification
                </Label>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!formData.location_name.trim()}
          >
            <QrCode className="h-5 w-5 mr-2" />
            Generate QR Code
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}

// QR Code Preview Component
function QRCodePreview({
  qrCode,
  qrCodeUrl,
  onDeactivate,
  onPrint,
  onDownload,
}: {
  qrCode: QRCodeRecord
  qrCodeUrl: string
  onDeactivate: () => void
  onPrint: () => void
  onDownload: () => void
}) {
  const { toast } = useToast()
  const ActionIcon = actionConfig[qrCode.action].icon
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/scan/${qrCode.qr_code_id}`
      )
      setCopied(true)
      toast({
        title: 'Success',
        description: 'Shareable link copied to clipboard',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      })
    }
  }

  const isExpired = qrCode.expires_at && new Date(qrCode.expires_at) < new Date()
  const status = isExpired ? 'expired' : qrCode.is_active ? 'active' : 'inactive'

  return (
    <Card className="border-slate-200" id="qr-preview">
      <CardHeader>
        <CardTitle className="text-lg">QR Code Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code Display */}
        <div className="flex flex-col items-center p-6 lg:p-8 bg-muted/30 rounded-lg">
          <div className="bg-white p-4 lg:p-6 rounded-lg shadow-md mb-4">
            <img src={qrCodeUrl} alt="QR Code" className="w-full max-w-[300px]" />
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm font-mono text-muted-foreground">
              QR Code ID: <span className="font-semibold text-foreground">#{qrCode.qr_code_id}</span>
            </p>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                <MapPin className="h-3 w-3 mr-1" />
                {qrCode.location_name}
              </Badge>

              <Badge variant="outline" className={actionConfig[qrCode.action].color}>
                <ActionIcon className="h-3 w-3 mr-1" />
                {actionConfig[qrCode.action].label}
              </Badge>

              {status === 'active' && (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  ✅ Active
                </Badge>
              )}
              {status === 'expired' && qrCode.expires_at && (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  ⚠️ Expires {format(new Date(qrCode.expires_at), 'MMM dd, yyyy')}
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Created: {format(new Date(qrCode.created_at), "PPP 'at' p")}
            </p>
            {qrCode.usage_count > 0 && (
              <p className="text-xs text-muted-foreground">
                Used {qrCode.usage_count} time{qrCode.usage_count !== 1 ? 's' : ''}
                {qrCode.last_used_at && ` - Last used ${formatDistanceToNow(new Date(qrCode.last_used_at), { addSuffix: true })}`}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>

          <Button variant="outline" className="w-full" onClick={handleCopyLink}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4 mr-2" />
                Copy Shareable Link
              </>
            )}
          </Button>

          <Button variant="destructive" className="w-full" onClick={onDeactivate}>
            <XCircle className="h-4 w-4 mr-2" />
            Deactivate QR Code
          </Button>
        </div>
      </CardContent>
    </Card>
  )
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

  const handleGenerate = async (formData: QRCodeFormData) => {
    if (!user?.company_id) return

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

  const getStatus = (qr: QRCodeRecord) => {
    if (qr.expires_at && new Date(qr.expires_at) < new Date()) {
      return { label: 'Expired', color: 'bg-gray-100 text-gray-800' }
    }
    if (!qr.is_active) {
      return { label: 'Inactive', color: 'bg-gray-100 text-gray-800' }
    }
    return { label: 'Active', color: 'bg-green-100 text-green-800 border-green-200' }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* QR Type Selector */}
      <QRTypeSelector value={qrType} onChange={setQrType} />

      {/* Form and Preview */}
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
        <div>
          <QRCodeForm type={qrType} onGenerate={handleGenerate} />
        </div>

        {generatedQR && qrCodeUrl && (
          <div>
            <QRCodePreview
              qrCode={generatedQR}
              qrCodeUrl={qrCodeUrl}
              onDeactivate={() => handleDeactivate()}
              onPrint={handlePrint}
              onDownload={handleDownload}
            />
          </div>
        )}
      </div>

      {/* Active QR Codes List */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Active QR Codes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <QrCode className="h-8 w-8 mx-auto mb-2 animate-spin" />
              Loading...
            </div>
          ) : qrCodes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <QrCode className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <h3 className="text-base font-medium text-gray-900 mb-1">No QR codes yet</h3>
              <p className="text-sm">Generate your first QR code to get started</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Location</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Action</TableHead>
                      <TableHead className="text-xs text-center">Usage</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Created</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {qrCodes.map((qr) => {
                      const status = getStatus(qr)
                      return (
                        <TableRow key={qr.id} className="hover:bg-muted/50">
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
                              {actionConfig[qr.action].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm">{qr.usage_count}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${status.color}`}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
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
                {qrCodes.map((qr) => {
                  const status = getStatus(qr)
                  return (
                    <Card key={qr.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{qr.location_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(qr.created_at), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <Badge variant="outline" className={`text-xs ${status.color}`}>
                            {status.label}
                          </Badge>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {qr.type === 'location' ? 'Location' : 'Individual'}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${actionConfig[qr.action].color}`}>
                            {actionConfig[qr.action].label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {qr.usage_count} uses
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleView(qr)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeactivate(qr)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Deactivate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
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
              Are you sure you want to delete the QR code for "{deleteTarget?.location_name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}