import { ReactNode, ElementType } from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  icon?: ElementType
  iconColor?: 'emerald' | 'blue' | 'amber' | 'slate' | 'red'
  label: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  subtext?: string
  className?: string
}

/**
 * StatCard - Optimized card for displaying statistics/metrics
 * 
 * Features:
 * - Icon with color variants
 * - Large value display
 * - Optional trend indicator
 * - Mobile-optimized sizing
 * 
 * Usage:
 * <StatCard 
 *   icon={Package} 
 *   iconColor="blue"
 *   label="Total Assets" 
 *   value="342" 
 *   change="+8%"
 *   changeType="positive"
 * />
 */
export function StatCard({
  icon: Icon,
  iconColor = 'blue',
  label,
  value,
  change,
  changeType = 'neutral',
  subtext,
  className
}: StatCardProps) {
  const iconColorClasses = {
    emerald: 'bg-[hsla(0,0%,100%,0.2)] backdrop-blur-sm border border-[hsla(0,0%,100%,0.3)]',
    blue: 'bg-[hsla(0,0%,100%,0.2)] backdrop-blur-sm border border-[hsla(0,0%,100%,0.3)]',
    amber: 'bg-[hsla(0,0%,100%,0.2)] backdrop-blur-sm border border-[hsla(0,0%,100%,0.3)]',
    slate: 'bg-[hsla(0,0%,100%,0.2)] backdrop-blur-sm border border-[hsla(0,0%,100%,0.3)]',
    red: 'bg-[hsla(0,0%,100%,0.2)] backdrop-blur-sm border border-[hsla(0,0%,100%,0.3)]'
  }

  const changeColorClasses = {
    positive: 'text-emerald-600',
    negative: 'text-red-600',
    neutral: 'text-slate-600'
  }

  return (
    <div className={cn(
      'glass-card rounded-lg p-4 md:p-6 lg:p-8',
      className
    )}>
      <div className="flex items-center justify-between mb-3 md:mb-4">
        {Icon && (
          <div className={cn(
            'w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl',
            'flex items-center justify-center',
            'shadow-lg',
            iconColorClasses[iconColor]
          )}>
            <Icon className="h-5 w-5 lg:h-6 lg:w-6 text-[hsl(var(--foreground))]" />
          </div>
        )}
      </div>

      <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-1 md:mb-2">
        {value}
      </div>

      <div className="text-sm md:text-base text-muted-foreground mb-2">
        {label}
      </div>

      {(change || subtext) && (
        <div className="flex items-center gap-2 text-xs md:text-sm">
          {change && (
            <div className={cn(
              'flex items-center gap-1',
              changeColorClasses[changeType]
            )}>
              {changeType === 'positive' && <TrendingUp className="h-3 w-3" />}
              {changeType === 'negative' && <TrendingDown className="h-3 w-3" />}
              <span className="font-medium">{change}</span>
            </div>
          )}
          {subtext && (
            <span className="text-muted-foreground">{subtext}</span>
          )}
        </div>
      )}
    </div>
  )
}