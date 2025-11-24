import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MobileActionBarProps {
  children: ReactNode
  sticky?: boolean
  position?: 'top' | 'bottom'
  className?: string
}

/**
 * MobileActionBar - Mobile-optimized action button container
 * 
 * Features:
 * - Horizontal scroll on overflow
 * - Proper touch target sizing (44px min)
 * - Can be sticky at top or bottom
 * - Responsive spacing
 * 
 * Usage:
 * <MobileActionBar sticky position="top">
 *   <Button>Action 1</Button>
 *   <Button>Action 2</Button>
 * </MobileActionBar>
 */
export function MobileActionBar({
  children,
  sticky = false,
  position = 'top',
  className
}: MobileActionBarProps) {
  return (
    <div
      className={cn(
        'w-full bg-white border-slate-200',
        sticky && position === 'top' && 'sticky top-0 z-10 border-b',
        sticky && position === 'bottom' && 'sticky bottom-0 z-10 border-t',
        !sticky && 'border-b',
        className
      )}
    >
      <div className="flex items-center gap-2 md:gap-3 overflow-x-auto p-3 md:p-4">
        {/* Ensure all children have minimum touch targets */}
        <div className="flex items-center gap-2 md:gap-3 min-h-[44px]">
          {children}
        </div>
      </div>
    </div>
  )
}