import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { colors, components, sizing, typography, darkMode } from '@/lib/theme'

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
    <Card className={`${components.card.glass} ${components.card.hover}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className={`${typography.sm} font-medium ${colors.neutral.text} ${darkMode.textSecondary}`}>
          {title}
        </CardTitle>
        <Icon className={`${sizing.iconSm} ${colors.neutral.textLight} ${darkMode.textSecondary}`} />
      </CardHeader>
      <CardContent>
        <div className={`${typography['2xl']} font-bold ${colors.neutral.textDark} ${darkMode.text}`}>
          {value}
        </div>
        {trend && (
          <p className={`${typography.xs} mt-1 ${
            trend.isPositive 
              ? `${colors.success.text}` 
              : `${colors.danger.text}`
          }`}>
            {trend.isPositive ? '+' : ''}{trend.value}% from last month
          </p>
        )}
        {description && (
          <p className={`${typography.xs} ${colors.neutral.textLight} ${darkMode.textSecondary} mt-1`}>
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}