import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageSectionProps {
  children: ReactNode
  variant?: 'default' | 'light' | 'dark' | 'accent'
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  containerWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
  id?: string
}

/**
 * PageSection - Content section wrapper with consistent spacing and backgrounds
 * 
 * Handles:
 * - Vertical spacing (responsive)
 * - Background variants
 * - Inner container width
 * - Horizontal padding
 * - Proper margins for fixed sidebar and header
 * 
 * Usage:
 * <PageSection variant="light" spacing="lg">
 *   <YourContent />
 * </PageSection>
 */
export function PageSection({
  children,
  variant = 'default',
  spacing = 'md',
  containerWidth = 'lg',
  className,
  id
}: PageSectionProps) {
  const spacingClasses = {
    none: '',
    sm: 'py-6 md:py-8 lg:py-12',
    md: 'py-8 md:py-12 lg:py-16',
    lg: 'py-12 md:py-16 lg:py-24',
    xl: 'py-16 md:py-24 lg:py-32'
  }

  const variantClasses = {
    default: 'bg-white',
    light: 'bg-slate-50',
    dark: 'bg-slate-900 text-white',
    accent: 'bg-blue-50'
  }

  const containerWidthClasses = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-7xl',
    xl: 'max-w-[1400px]',
    full: 'max-w-none'
  }

  return (
    <section 
      id={id}
      className={cn(
        'lg:ml-16 pt-20 lg:pt-16',
        variantClasses[variant],
        spacingClasses[spacing],
        className
      )}
    >
      <div className={cn(
        'mx-auto px-4 sm:px-6 lg:px-8',
        containerWidthClasses[containerWidth]
      )}>
        {children}
      </div>
    </section>
  )
}