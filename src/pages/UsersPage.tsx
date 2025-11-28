import { useEffect } from 'react'
import { Users, Clock, QrCode } from 'lucide-react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { useDashboardTab } from '@/context/DashboardTabContext'
import ManagementTab from '@/components/users/ManagementTab'
import UserAttendanceTab from '@/components/users/UserAttendanceTab'
import QRCodeGeneratorTab from '@/components/users/QRCodeGeneratorTab'

export default function UsersPage() {
  const { activeTab, setActiveTab } = useDashboardTab()
  const userTabs = ['management', 'attendance', 'qrcode'] as const
  const normalizedTab = (userTabs as readonly string[]).includes(activeTab) ? activeTab : userTabs[0]

  useEffect(() => {
    if (activeTab !== normalizedTab) {
      setActiveTab(normalizedTab)
    }
  }, [activeTab, normalizedTab, setActiveTab])

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-0">
      {/* Header */}
      <div className="space-y-1 lg:space-y-2 px-4 sm:px-0">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground break-words">User Management</h1>
        <p className="text-muted-foreground flex items-center gap-1 text-xs sm:text-sm lg:text-base">
          <Users className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Manage team members, attendance, and access</span>
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs 
        value={normalizedTab} 
        onValueChange={setActiveTab} 
        className="space-y-3 sm:space-y-4 lg:space-y-6 px-0"
      >
        <TabsList className="grid w-full grid-cols-3 lg:max-w-2xl bg-muted p-1 rounded-lg gap-1 h-auto mx-4 sm:mx-0">
          <TabsTrigger 
            value="management" 
            className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-[11px] sm:text-xs lg:text-sm text-foreground py-2 sm:py-2.5"
          >
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="hidden sm:inline">Management</span>
            <span className="sm:hidden">Users</span>
          </TabsTrigger>
          <TabsTrigger 
            value="attendance" 
            className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-[11px] sm:text-xs lg:text-sm text-foreground py-2 sm:py-2.5"
          >
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="hidden sm:inline">Attendance</span>
            <span className="sm:hidden">Track</span>
          </TabsTrigger>
          <TabsTrigger 
            value="qrcode" 
            className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm text-[11px] sm:text-xs lg:text-sm text-foreground py-2 sm:py-2.5"
          >
            <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="hidden sm:inline">QR Codes</span>
            <span className="sm:hidden">QR</span>
          </TabsTrigger>
        </TabsList>

        {/* Management Tab */}
        <TabsContent value="management">
          <ManagementTab />
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <UserAttendanceTab />
        </TabsContent>

        {/* QR Code Generator Tab */}
        <TabsContent value="qrcode">
          <QRCodeGeneratorTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}