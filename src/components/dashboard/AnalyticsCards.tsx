import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Users, Zap, Package } from 'lucide-react'
import type { AnalyticsMetrics } from '@/hooks/useAnalytics'

interface AnalyticsCardsProps {
  metrics: AnalyticsMetrics
}

export function AnalyticsCards({ metrics }: AnalyticsCardsProps) {
  const cards = [
    {
      title: 'Total Tickets',
      value: metrics.totalTickets,
      icon: Zap,
      color: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600'
    },
    {
      title: 'Resolved',
      value: metrics.resolvedTickets,
      icon: TrendingUp,
      color: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600'
    },
    {
      title: 'Asset Utilization',
      value: `${metrics.utilizationRate}%`,
      icon: Package,
      color: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600'
    },
    {
      title: 'Avg Resolution',
      value: `${metrics.avgResolutionTime}h`,
      icon: Users,
      color: 'bg-orange-50 dark:bg-orange-900/20',
      textColor: 'text-orange-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className={card.color}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>{card.title}</span>
              <card.icon className={`h-5 w-5 ${card.textColor}`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${card.textColor}`}>
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}