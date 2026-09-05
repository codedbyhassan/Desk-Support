import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MobileActionBarProps {
  children: ReactNode
  sticky?: boolean
  position?: 'top' | 'bottom'
  className?: string
}

export function MobileActionBar({ children, sticky = false, position = 'top', className }: MobileActionBarProps) {
  return <div className={cn(
    'w-full border-border bg-background',
    sticky && position === 'top' && 'sticky top-0 z-10 border-b',
    sticky && position === 'bottom' && 'sticky bottom-0 z-10 border-t',
    !sticky && 'border-b',
    className
  )}>
    <div className="overflow-x-auto p-3 md:p-4">
      <div className="flex min-h-11 items-center gap-2 md:gap-3">{children}</div>
    </div>
  </div>
}
