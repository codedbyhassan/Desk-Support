import { ElementType } from 'react'
import { Card } from './card'

interface StatCardProps {
  label: string
  value: string | number
  description?: string
  icon?: ElementType
  className?: string
}

/**
 * Standardized stat card component matching AdminDashboard pattern
 * 
 * Usage:
 * <StatCard 
 *   label="Total Users"
 *   value={42}
 *   description="Active team members"
 *   icon={Users}
 * />
 */
export function StatCard({ 
  label, 
  value, 
  description,
  icon: Icon,
  className = ''
}: StatCardProps) {
  return (
    <Card variant="glass" className={`relative overflow-hidden ${className}`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-[hsla(0,0%,100%,0.1)] rounded-full -mr-12 -mt-12 blur-2xl" />
      <div className="relative p-3 sm:p-4">
        <div className="space-y-2">
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] font-medium">
            {label}
          </p>
          <h3 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">
            {value}
          </h3>
          {description && (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {description}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

