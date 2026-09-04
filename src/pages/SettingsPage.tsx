import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDashboardTab } from '@/context/DashboardTabContext'
import { NotificationSettingsTab } from '@/components/NotificationSettingsTab'
import { Switch } from '@/components/ui/switch'
import { User, Building2, Palette, Shield, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import Loader from '@/components/Loader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AppearanceSettings } from '@/components/AppearanceSettings'
import { useToast } from '@/hooks/use-toast'

export default function SettingsPage() {
  const { toast } = useToast()
  const { user, company, loading, updateProfile, updateCompany } = useAuth()
  const { activeTab, setActiveTab } = useDashboardTab()
  const settingsTabs = ['profile', 'company', 'appearance', 'notifications', 'security'] as const
  const normalizedTab = (settingsTabs as readonly string[]).includes(activeTab) ? activeTab : settingsTabs[0]
  const isAdmin = user?.role === 'admin'

  const [companyName, setCompanyName] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingPassword, setEditingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (company) setCompanyName(company.name || '')
    if (user) {
      setFullName(user.full_name || '')
      setPhone(user.phone || '')
    }
  }, [company, user])

  useEffect(() => {
    if (activeTab !== normalizedTab) setActiveTab(normalizedTab)
  }, [activeTab, normalizedTab, setActiveTab])

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      toast({ title: 'Full name required', description: 'Enter your full name before saving.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await updateProfile({ full_name: fullName.trim(), phone: phone.trim() || null })
      toast({ title: 'Profile updated', description: 'Your profile information has been saved.' })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({ title: 'Update failed', description: 'Failed to update your profile.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCompany = async () => {
    if (!isAdmin) return
    if (!companyName.trim()) {
      toast({ title: 'Company name required', description: 'Enter a company name before saving.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await updateCompany({ name: companyName.trim() })
      toast({ title: 'Company updated', description: 'Company information has been saved.' })
    } catch (error) {
      console.error('Error updating company:', error)
      toast({ title: 'Update failed', description: 'Failed to update company information.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordUpdate = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Invalid password', description: 'Password must be at least 6 characters.', variant: 'destructive' })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Confirm the new password and try again.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast({ title: 'Password updated', description: 'Your password has been changed successfully.' })
      setNewPassword('')
      setConfirmPassword('')
      setEditingPassword(false)
    } catch (error) {
      console.error('Error updating password:', error)
      toast({ title: 'Update failed', description: 'Failed to update your password.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loader fullPage />

  return (
    <div className="space-y-6">
      <Tabs value={normalizedTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="hidden">
          {settingsTabs.map((tab) => <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-muted/20 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><User className="h-5 w-5" /></div>
                <div><h2 className="text-base font-semibold sm:text-lg">Profile Information</h2><p className="text-sm text-muted-foreground">Update the information associated with your account.</p></div>
              </div>
            </div>
            <CardContent className="space-y-6 p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2"><Label htmlFor="settings-email">Email</Label><Input id="settings-email" value={user?.email || ''} disabled /><p className="text-sm text-muted-foreground">Email cannot be changed here.</p></div>
                <div className="space-y-2"><Label htmlFor="settings-name">Full Name</Label><Input id="settings-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" /></div>
                <div className="space-y-2"><Label htmlFor="settings-phone">Phone</Label><Input id="settings-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" /></div>
                <div className="space-y-2"><Label htmlFor="settings-role">Role</Label><Input id="settings-role" value={user?.role || ''} disabled className="capitalize" /></div>
              </div>
              <div className="flex justify-end border-t border-border pt-5"><Button type="button" onClick={handleUpdateProfile} disabled={saving} className="w-full rounded-xl sm:w-auto">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}</Button></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="mt-0">
          <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-muted/20 px-5 py-5 sm:px-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div><div><h2 className="text-base font-semibold sm:text-lg">Company Information</h2><p className="text-sm text-muted-foreground">Manage the company information available to your workspace.</p></div></div></div>
            <CardContent className="space-y-6 p-5 sm:p-6">
              {!isAdmin && <Alert><AlertDescription>Only administrators can update company information.</AlertDescription></Alert>}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2"><Label htmlFor="company-name">Company Name</Label><Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={!isAdmin} /></div>
                <div className="space-y-2"><Label htmlFor="company-id">Company ID</Label><Input id="company-id" value={company?.id || ''} disabled className="font-mono text-xs" /></div>
                <div className="space-y-2"><Label htmlFor="company-plan">Subscription Plan</Label><Input id="company-plan" value={company?.subscription_plan || 'Free'} disabled /></div>
                <div className="space-y-2"><Label htmlFor="company-created">Created</Label><Input id="company-created" value={company ? new Date(company.created_at).toLocaleDateString() : ''} disabled /></div>
              </div>
              {isAdmin && <div className="flex justify-end border-t border-border pt-5"><Button type="button" onClick={handleUpdateCompany} disabled={saving} className="w-full rounded-xl sm:w-auto">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}</Button></div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-0"><AppearanceSettings /></TabsContent>
        <TabsContent value="notifications" className="mt-0"><NotificationSettingsTab /></TabsContent>

        <TabsContent value="security" className="mt-0">
          <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-muted/20 px-5 py-5 sm:px-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Shield className="h-5 w-5" /></div><div><h2 className="text-base font-semibold sm:text-lg">Security</h2><p className="text-sm text-muted-foreground">Manage your authentication and account security.</p></div></div></div>
            <CardContent className="space-y-6 p-5 sm:p-6">
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Password</p><p className="mt-1 text-sm text-muted-foreground">Change the password for your current Supabase Auth account.</p></div><Button type="button" variant="outline" onClick={() => setEditingPassword((value) => !value)} className="rounded-xl">{editingPassword ? 'Cancel' : 'Change Password'}</Button></div>
              {editingPassword && <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-5"><div className="space-y-2"><Label htmlFor="new-password">New Password</Label><Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirm Password</Label><Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat the new password" /></div><div className="flex justify-end"><Button type="button" onClick={handlePasswordUpdate} disabled={saving} className="w-full rounded-xl sm:w-auto">{saving ? 'Updating…' : 'Update Password'}</Button></div></div>}
              <div className="flex items-center justify-between gap-4 border-t border-border pt-5"><div><p className="text-sm font-semibold">Two-factor authentication</p><p className="mt-1 text-sm text-muted-foreground">Enable an additional authentication factor when supported.</p></div><Switch disabled /></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
