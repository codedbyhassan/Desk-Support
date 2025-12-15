import { ReactNode } from 'react'
import { Badge } from './badge'

interface PageHeaderProps {
  title: string
  description?: string | ReactNode
  badge?: ReactNode
  actions?: ReactNode
  className?: string
}

/**
 * Standardized page header component matching AdminDashboard pattern
 * 
 * Usage:
 * <PageHeader 
 *   title="Page Title"
 *   description="Page description"
 *   badge={<Badge>Role</Badge>}
 *   actions={<Button>Action</Button>}
 * />
 */
export function PageHeader({ 
  title, 
  description, 
  badge, 
  actions,
  className = ''
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between ${className}`}>
      <div className="space-y-1 lg:space-y-2">
        <div className="flex items-center gap-2 lg:gap-3 mb-1 lg:mb-2">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[hsl(var(--foreground))]">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs sm:text-sm lg:text-base text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="text-right">
          {actions}
        </div>
      )}
    </div>
  )
}

