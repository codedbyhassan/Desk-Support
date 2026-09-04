import { useEffect, useState } from 'react'
import { Users, Clock, QrCode, ChevronDown } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useDashboardTab } from '@/context/DashboardTabContext'
import ManagementTab from '@/components/users/ManagementTab'
import UserAttendanceTab from '@/components/users/UserAttendanceTab'
import QRCodeGeneratorTab from '@/components/users/QRCodeGeneratorTab'

export default function UsersPage() {
  const { activeTab, setActiveTab } = useDashboardTab()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const userTabs = ['management', 'attendance', 'qrcode'] as const
  const normalizedTab = (userTabs as readonly string[]).includes(activeTab) ? activeTab : userTabs[0]

  useEffect(() => {
    if (activeTab !== normalizedTab) setActiveTab(normalizedTab)
  }, [activeTab, normalizedTab, setActiveTab])

  const getTabLabel = (tab: string) => {
    switch(tab) {
      case 'management': return 'User Management'
      case 'attendance': return 'Attendance'
      case 'qrcode': return 'QR Codes'
      default: return 'Management'
    }
  }

  const getTabIcon = (tab: string) => {
    switch(tab) {
      case 'management': return <Users className="h-4 w-4" />
      case 'attendance': return <Clock className="h-4 w-4" />
      case 'qrcode': return <QrCode className="h-4 w-4" />
      default: return null
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="sm:hidden px-4">
        <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between bg-card border-border text-foreground hover:bg-muted">
              <div className="flex items-center gap-2">{getTabIcon(normalizedTab)}<span className="font-semibold">{getTabLabel(normalizedTab)}</span></div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-card border-border">
            <DropdownMenuItem onClick={() => { setActiveTab('management'); setMobileMenuOpen(false) }} className={`cursor-pointer ${normalizedTab === 'management' ? 'bg-muted' : ''}`}><Users className="h-4 w-4 mr-2" /><span>User Management</span></DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setActiveTab('attendance'); setMobileMenuOpen(false) }} className={`cursor-pointer ${normalizedTab === 'attendance' ? 'bg-muted' : ''}`}><Clock className="h-4 w-4 mr-2" /><span>Attendance Tracking</span></DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setActiveTab('qrcode'); setMobileMenuOpen(false) }} className={`cursor-pointer ${normalizedTab === 'qrcode' ? 'bg-muted' : ''}`}><QrCode className="h-4 w-4 mr-2" /><span>QR Code Generator</span></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Tabs value={normalizedTab} onValueChange={setActiveTab} className="space-y-4 lg:space-y-6">
        <TabsList className="hidden sm:flex">
          <TabsTrigger value="management" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-[11px] sm:text-xs lg:text-sm text-foreground py-2 sm:py-2.5"><Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" /><span className="hidden sm:inline">Management</span><span className="sm:hidden">Users</span></TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-[11px] sm:text-xs lg:text-sm text-foreground py-2 sm:py-2.5"><Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" /><span className="hidden sm:inline">Attendance</span><span className="sm:hidden">Track</span></TabsTrigger>
          <TabsTrigger value="qrcode" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-[11px] sm:text-xs lg:text-sm text-foreground py-2 sm:py-2.5"><QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" /><span className="hidden sm:inline">QR Codes</span><span className="sm:hidden">QR</span></TabsTrigger>
        </TabsList>
        <TabsContent value="management"><ManagementTab /></TabsContent>
        <TabsContent value="attendance"><UserAttendanceTab /></TabsContent>
        <TabsContent value="qrcode"><QRCodeGeneratorTab /></TabsContent>
      </Tabs>
    </div>
  )
}
