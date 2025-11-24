import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MobilePageWrapperProps {
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
  noPadding?: boolean
}

/**
 * MobilePageWrapper - Main page wrapper for consistent mobile experience
 * 
 * Handles:
 * - Safe area insets for mobile devices
 * - Consistent horizontal padding
 * - Max-width constraints
 * - Smooth scrolling
 * - Background color
 * 
 * Usage:
 * <MobilePageWrapper>
 *   <YourPageContent />
 * </MobilePageWrapper>
 */
export function MobilePageWrapper({
  children,
  maxWidth = 'full',
  className,
  noPadding = false
}: MobilePageWrapperProps) {
  const maxWidthClasses = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-7xl',
    xl: 'max-w-[1400px]',
    full: 'max-w-none'
  }

  return (
    <div className={cn(
      'min-h-screen bg-slate-50',
      'safe-area-inset', // For mobile notches
      className
    )}>
      <div className={cn(
        'w-full mx-auto',
        maxWidthClasses[maxWidth],
        !noPadding && 'px-4 sm:px-6 lg:px-8'
      )}>
        {children}
      </div>
    </div>
  )
}