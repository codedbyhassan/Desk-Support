import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AssetUtilizationData {
  available: number
  assigned: number
  maintenance: number
  retired: number
}

interface AssetUtilizationChartProps {
  data: AssetUtilizationData
}

export function AssetUtilizationChart({ data }: AssetUtilizationChartProps) {
  // Filter out zero values and create chart data
  const chartData = [
    { name: 'Available', value: data.available, color: '#10b981' },
    { name: 'Assigned', value: data.assigned, color: '#3b82f6' },
    { name: 'Maintenance', value: data.maintenance, color: '#f59e0b' },
    { name: 'Retired', value: data.retired, color: '#ef4444' }
  ].filter(item => item.value > 0)

  // If all values are 0, show a placeholder
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80 text-gray-500">
            <p>No asset data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{data.available}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">Assigned</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{data.assigned}</p>
          </div>
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">Maintenance</p>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{data.maintenance}</p>
          </div>
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">Retired</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{data.retired}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}