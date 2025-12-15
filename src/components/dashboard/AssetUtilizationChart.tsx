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
    { name: 'Available', value: data.available, color: 'hsl(var(--chart-green))' },
    { name: 'Assigned', value: data.assigned, color: 'hsl(var(--chart-blue))' },
    { name: 'Maintenance', value: data.maintenance, color: 'hsl(var(--chart-amber))' },
    { name: 'Retired', value: data.retired, color: 'hsl(var(--chart-red))' }
  ].filter(item => item.value > 0)

  // If all values are 0, show a placeholder
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80 text-muted-foreground">
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
              fill="hsl(var(--chart-purple))"
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
          <div className="p-3 rounded-lg bg-[hsl(var(--success-50))] dark:bg-[hsl(var(--success-900))]/20 border border-[hsl(var(--success-500))]/20 dark:border-[hsl(var(--success-500))]/30">
            <p className="text-sm text-muted-foreground">Available</p>
            <p className="text-2xl font-bold text-[hsl(var(--success-500))] dark:text-[hsl(var(--success-500))]">{data.available}</p>
          </div>
          <div className="p-3 rounded-lg bg-[hsl(var(--primary-50))] dark:bg-[hsl(var(--primary-900))]/20 border border-[hsl(var(--primary-500))]/20 dark:border-[hsl(var(--primary-500))]/30">
            <p className="text-sm text-muted-foreground">Assigned</p>
            <p className="text-2xl font-bold text-[hsl(var(--primary-500))] dark:text-[hsl(var(--primary-500))]">{data.assigned}</p>
          </div>
          <div className="p-3 rounded-lg bg-[hsl(var(--warning-50))] dark:bg-[hsl(var(--warning-900))]/20 border border-[hsl(var(--warning-500))]/20 dark:border-[hsl(var(--warning-500))]/30">
            <p className="text-sm text-muted-foreground">Maintenance</p>
            <p className="text-2xl font-bold text-[hsl(var(--warning-500))] dark:text-[hsl(var(--warning-500))]">{data.maintenance}</p>
          </div>
          <div className="p-3 rounded-lg bg-[hsl(var(--error-50))] dark:bg-[hsl(var(--error-900))]/20 border border-[hsl(var(--error-500))]/20 dark:border-[hsl(var(--error-500))]/30">
            <p className="text-sm text-muted-foreground">Retired</p>
            <p className="text-2xl font-bold text-[hsl(var(--error-500))] dark:text-[hsl(var(--error-500))]">{data.retired}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}