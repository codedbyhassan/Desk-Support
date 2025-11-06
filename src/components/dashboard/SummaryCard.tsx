import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface SummaryCardProps {
  title: string
  value: number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  description?: string
}

export default function SummaryCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  description 
}: SummaryCardProps) {
  return (
    <Card className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border-white/20 dark:border-gray-700/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </div>
        {trend && (
          <p className={`text-xs mt-1 ${
            trend.isPositive 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {trend.isPositive ? '+' : ''}{trend.value}% from last month
          </p>
        )}
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}