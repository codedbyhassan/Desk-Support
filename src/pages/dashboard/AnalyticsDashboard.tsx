import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsCards } from '@/components/dashboard/AnalyticsCards'
import { TicketTrendChart } from '@/components/dashboard/TicketTrendChart'
import { AssetUtilizationChart } from '@/components/dashboard/AssetUtilizationChart'
import { EmployeePerformance } from '@/components/dashboard/EmployeePerformance'
import { AuditLog } from '@/components/dashboard/AuditLog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AnalyticsDashboard() {
  const { user } = useAuth()
  const { metrics, employeeStats, loading, error, fetchAnalytics } = useAnalytics()

  useEffect(() => {
    console.log('AnalyticsDashboard mounted, fetching analytics...')
    fetchAnalytics()
  }, [fetchAnalytics])

  // Only allow admins
  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center py-12 px-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">Admin access required to view analytics dashboard.</p>
          <p className="text-sm text-red-500 mt-4">Your role: {user?.role || 'unknown'}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center py-12 px-6 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => fetchAnalytics()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">System metrics and performance overview</p>
      </div>

      {/* Metrics Cards */}
      <AnalyticsCards metrics={metrics} />

      {/* Tabs */}
      <Tabs defaultValue="trends" className="space-y-4 w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <TicketTrendChart 
            data={[
              { date: '1', created: 5, resolved: 3 },
              { date: '2', created: 8, resolved: 5 },
              { date: '3', created: 6, resolved: 7 },
              { date: '4', created: 9, resolved: 8 },
              { date: '5', created: 7, resolved: 6 },
              { date: '6', created: 10, resolved: 9 },
              { date: '7', created: 8, resolved: 7 },
            ]}
          />
        </TabsContent>

        {/* Utilization Tab */}
        <TabsContent value="utilization" className="space-y-4">
          <AssetUtilizationChart
            data={{
              available: metrics.availableAssets,
              assigned: metrics.totalAssets - metrics.availableAssets,
              maintenance: 0,
              retired: 0
            }}
          />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <EmployeePerformance employees={employeeStats} />
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <AuditLog />
        </TabsContent>
      </Tabs>
    </div>
  )
}