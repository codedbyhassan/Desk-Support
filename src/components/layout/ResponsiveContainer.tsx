import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveContainerProps {
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: boolean
  center?: boolean
  className?: string
}

/**
 * ResponsiveContainer - Generic container with max-width constraints
 * 
 * Handles:
 * - Max-width constraints
 * - Centering
 * - Optional horizontal padding
 * - Proper spacing for sidebar and header
 * - Flexible for any use case
 * 
 * Usage:
 * <ResponsiveContainer maxWidth="lg" center padding>
 *   <Content />
 * </ResponsiveContainer>
 */
export function ResponsiveContainer({
  children,
  maxWidth = 'lg',
  padding = false,
  center = true,
  className
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-7xl',
    xl: 'max-w-[1400px]',
    '2xl': 'max-w-[1600px]',
    full: 'max-w-none'
  }

  return (
    <div className={cn(
      'w-full lg:ml-16 pt-20 lg:pt-16',
      maxWidthClasses[maxWidth],
      center && 'mx-auto',
      padding && 'px-4 sm:px-6 lg:px-8',
      className
    )}>
      {children}
    </div>
  )
}