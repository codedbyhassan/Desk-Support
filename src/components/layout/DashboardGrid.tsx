import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardGridProps {
  children: ReactNode
  cols?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  mobileStack?: boolean
  className?: string
}

/**
 * DashboardGrid - Responsive grid layout for dashboard content
 * 
 * Handles:
 * - Mobile-first grid (1 col on mobile by default)
 * - Responsive column counts
 * - Consistent gap spacing
 * - Auto-stacking behavior
 * 
 * Usage:
 * <DashboardGrid cols={3} gap="md">
 *   <Card />
 *   <Card />
 *   <Card />
 * </DashboardGrid>
 */
export function DashboardGrid({
  children,
  cols = 3,
  gap = 'md',
  mobileStack = true,
  className
}: DashboardGridProps) {
  const gapClasses = {
    sm: 'gap-3 md:gap-4',
    md: 'gap-4 md:gap-6',
    lg: 'gap-6 md:gap-8'
  }

  const colClasses = {
    1: 'grid-cols-1',
    2: mobileStack 
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-2',
    3: mobileStack 
      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-3',
    4: mobileStack 
      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-4'
  }

  return (
    <div className={cn(
      'grid',
      colClasses[cols],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  )
}