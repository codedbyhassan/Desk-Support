import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MobileCardProps {
  children: ReactNode
  variant?: 'default' | 'bordered' | 'elevated' | 'flat'
  padding?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  className?: string
  onClick?: () => void
}

/**
 * MobileCard - Consistent card component with mobile-optimized touch targets
 * 
 * Handles:
 * - Responsive padding
 * - Border radius (larger on desktop)
 * - Shadow variants
 * - Touch feedback for interactive cards
 * - Minimum touch target sizes
 * 
 * Usage:
 * <MobileCard variant="elevated" interactive>
 *   <CardContent />
 * </MobileCard>
 */
export function MobileCard({
  children,
  variant = 'default',
  padding = 'md',
  interactive = false,
  className,
  onClick
}: MobileCardProps) {
  const paddingClasses = {
    sm: 'p-3 md:p-4 lg:p-6',
    md: 'p-4 md:p-6 lg:p-8',
    lg: 'p-6 md:p-8 lg:p-10'
  }

  const variantClasses = {
    default: 'bg-card border border-border',
    bordered: 'bg-card border-2 border-border',
    elevated: 'bg-card shadow-sm border border-border',
    flat: 'bg-muted'
  }

  const interactiveClasses = interactive
    ? 'cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-slate-300 active:scale-[0.98] min-h-[44px]'
    : ''

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg',
        variantClasses[variant],
        paddingClasses[padding],
        interactiveClasses,
        className
      )}
    >
      {children}
    </div>
  )
}