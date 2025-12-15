import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Users, Zap, Package } from 'lucide-react'
import type { AnalyticsMetrics } from '@/hooks/useAnalytics'
import { colors, sizing, typography } from '@/lib/theme'

interface AnalyticsCardsProps {
  metrics: AnalyticsMetrics
}

export function AnalyticsCards({ metrics }: AnalyticsCardsProps) {
  const cards = [
    {
      title: 'Total Tickets',
      value: metrics.totalTickets,
      icon: Zap,
      colorLight: colors.primary.light,
      colorText: colors.primary.text,
    },
    {
      title: 'Resolved',
      value: metrics.resolvedTickets,
      icon: TrendingUp,
      colorLight: colors.success.light,
      colorText: colors.success.text,
    },
    {
      title: 'Asset Utilization',
      value: `${metrics.utilizationRate}%`,
      icon: Package,
      colorLight: colors.purple.light,
      colorText: colors.purple.text,
    },
    {
      title: 'Avg Resolution',
      value: `${metrics.avgResolutionTime}h`,
      icon: Users,
      colorLight: colors.orange.light,
      colorText: colors.orange.text,
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className={`${typography.sm} font-medium flex items-center justify-between text-[hsl(var(--foreground))]`}>
              <span>{card.title}</span>
              <div className="bg-[hsla(0,0%,100%,0.2)] backdrop-blur-sm border border-[hsla(0,0%,100%,0.3)] rounded-lg p-2">
                <card.icon className={`${sizing.iconMd} text-[hsl(var(--foreground))]`} />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`${typography['3xl']} font-bold text-[hsl(var(--foreground))]`}>
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}