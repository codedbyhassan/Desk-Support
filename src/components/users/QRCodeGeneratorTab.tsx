import { useEffect, useMemo, useState } from 'react'
import QRCodeLib from 'qrcode'
import { CalendarClock, Check, Copy, Download, Loader2, MoreHorizontal, Plus, QrCode, Search, ShieldCheck, Trash2, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface QRCodeRecord {
  id: string
  company_id: string
  name: string
  code: string
  status: 'active' | 'disabled' | 'expired'
  expires_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

interface GeneratedQR {
  record: QRCodeRecord
  image: string
}

const getStatus = (qr: QRCodeRecord) => {
  if (qr.expires_at && new Date(qr.expires_at) <= new Date() && qr.status === 'active') {
    return 'expired' as const
  }
  return qr.status
}

const statusLabel: Record<ReturnType<typeof getStatus>, string> = {
  active: 'Active',
  disabled: 'Disabled',
  expired: 'Expired',
}

export default function QRCodeGeneratorTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [codes, setCodes] = useState<QRCodeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [generated, setGenerated] = useState<GeneratedQR | null>(null)

  const load = async () => {
    if (!user?.company_id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('id,company_id,name,code,status,expires_at,created_by,created_at,updated_at')
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCodes((data ?? []) as QRCodeRecord[])
    } catch (error) {
      toast({
        title: 'Unable to load QR codes',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [user?.company_id])

  const filteredCodes = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return codes
    return codes.filter((qr) => `${qr.name} ${qr.code}`.toLowerCase().includes(query))
  }, [codes, search])

  const generate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.company_id) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      toast({ title: 'Name required', description: 'Give the QR code a clear name.', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        company_id: user.company_id,
        name: trimmedName,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      }

      const { data, error } = await supabase.functions.invoke('generate-qr', { body: payload })
      if (error) throw error
      if (!data?.ok || !data?.qr) throw new Error(data?.error ?? 'QR code generation failed.')

      const record = data.qr as QRCodeRecord
      const image = await QRCodeLib.toDataURL(`attendance://${record.code}`, {
        width: 480,
        margin: 2,
        errorCorrectionLevel: 'M',
      })

      setGenerated({ record, image })
      setCodes((current) => [record, ...current.filter((item) => item.id !== record.id)])
      setName('')
      setExpiresAt('')
      toast({ title: 'QR code created', description: `${record.name} is ready to use.` })
    } catch (error) {
      toast({
        title: 'Could not create QR code',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const showCode = async (record: QRCodeRecord) => {
    try {
      const image = await QRCodeLib.toDataURL(`attendance://${record.code}`, {
        width: 480,
        margin: 2,
        errorCorrectionLevel: 'M',
      })
      setGenerated({ record, image })
    } catch (error) {
      toast({ title: 'Could not render QR code', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const deactivate = async (record: QRCodeRecord) => {
    const { error } = await supabase
      .from('qr_codes')
      .update({ status: 'disabled' })
      .eq('id', record.id)
      .eq('company_id', user?.company_id ?? '')

    if (error) {
      toast({ title: 'Could not disable QR code', description: error.message, variant: 'destructive' })
      return
    }

    setCodes((current) => current.map((item) => item.id === record.id ? { ...item, status: 'disabled' } : item))
    setGenerated((current) => current?.record.id === record.id ? { ...current, record: { ...current.record, status: 'disabled' } } : current)
    toast({ title: 'QR code disabled' })
  }

  const remove = async (record: QRCodeRecord) => {
    const { error } = await supabase
      .from('qr_codes')
      .delete()
      .eq('id', record.id)
      .eq('company_id', user?.company_id ?? '')

    if (error) {
      toast({ title: 'Could not delete QR code', description: error.message, variant: 'destructive' })
      return
    }

    setCodes((current) => current.filter((item) => item.id !== record.id))
    setGenerated((current) => current?.record.id === record.id ? null : current)
    toast({ title: 'QR code deleted' })
  }

  const download = () => {
    if (!generated) return
    const anchor = document.createElement('a')
    anchor.href = generated.image
    anchor.download = `${generated.record.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.png`
    anchor.click()
  }

  const copyCode = async () => {
    if (!generated) return
    await navigator.clipboard.writeText(generated.record.code)
    toast({ title: 'Code copied' })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Card className="overflow-hidden border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/30 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Create QR code</h2>
                <p className="text-sm text-muted-foreground">Generate an attendance code for your workspace.</p>
              </div>
            </div>
          </div>

          <form onSubmit={generate} className="bg-card">
            <div className="space-y-6 px-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="qr-name">QR code name</Label>
                <Input id="qr-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Main Office Entrance" required autoFocus />
                <p className="text-xs leading-5 text-muted-foreground">This name identifies the QR code in the management list.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qr-expiry">Expiration <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input id="qr-expiry" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
                <p className="text-xs leading-5 text-muted-foreground">Leave empty to keep the QR code active until it is disabled.</p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Attendance QR</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">The generated code is tied to this company and validated by Supabase before attendance is recorded.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-border bg-muted/20 px-6 py-4">
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {saving ? 'Creating…' : 'Create QR code'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="overflow-hidden border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/30 px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">QR codes</h2>
                <p className="text-sm text-muted-foreground">Manage the attendance codes for this company.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search codes…" className="pl-9" />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filteredCodes.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <QrCode className="mb-3 h-9 w-9 text-muted-foreground" />
              <p className="font-medium">No QR codes found</p>
              <p className="mt-1 text-sm text-muted-foreground">Create your first attendance QR code using the form.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredCodes.map((record) => {
                const status = getStatus(record)
                return (
                  <div key={record.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-muted/40">
                        <QrCode className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{record.name}</p>
                          <Badge variant="outline">{statusLabel[status]}</Badge>
                        </div>
                        <button type="button" onClick={() => void navigator.clipboard.writeText(record.code)} className="mt-1 truncate font-mono text-xs text-muted-foreground hover:text-foreground">{record.code}</button>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" />{record.expires_at ? `Expires ${new Date(record.expires_at).toLocaleString()}` : 'No expiration'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => void showCode(record)}><QrCode className="h-4 w-4" />View</Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${record.name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => void showCode(record)}><QrCode className="mr-2 h-4 w-4" />View QR</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { void navigator.clipboard.writeText(record.code); toast({ title: 'Code copied' }) }}><Copy className="mr-2 h-4 w-4" />Copy code</DropdownMenuItem>
                          {status === 'active' && <DropdownMenuItem onClick={() => void deactivate(record)}><XCircle className="mr-2 h-4 w-4" />Disable</DropdownMenuItem>}
                          <DropdownMenuItem className="text-destructive" onClick={() => void remove(record)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {generated && (
        <Card className="overflow-hidden border-2 border-primary/20 bg-card shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border bg-muted/30 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><Check className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-semibold">QR code ready</h2></div>
              <p className="mt-1 text-sm text-muted-foreground">{generated.record.name}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copyCode}><Copy className="h-4 w-4" />Copy code</Button>
              <Button variant="outline" onClick={download}><Download className="h-4 w-4" />Download</Button>
              <Button onClick={() => window.print()}><QrCode className="h-4 w-4" />Print</Button>
            </div>
          </div>
          <div className="grid gap-6 p-6 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="mx-auto rounded-2xl border border-border bg-white p-5 shadow-sm print:shadow-none">
              <img src={generated.image} alt={`Attendance QR code for ${generated.record.name}`} className="block h-64 w-64" />
            </div>
            <div className="space-y-4 text-sm">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Code</p><p className="mt-1 break-all font-mono text-base font-semibold">{generated.record.code}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p><Badge variant="outline" className="mt-1">{statusLabel[getStatus(generated.record)]}</Badge></div>
              <div className="rounded-xl border border-border bg-muted/30 p-4"><p className="font-medium">How it works</p><p className="mt-1 leading-6 text-muted-foreground">Employees scan this code with the attendance scanner. The scanner sends the code to the secure Supabase validation function before creating or updating the attendance record.</p></div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
