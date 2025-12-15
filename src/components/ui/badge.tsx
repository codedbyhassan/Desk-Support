import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "glass-chip inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-transparent shadow",
        secondary:
          "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] border-transparent",
        destructive:
          "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] border-transparent shadow",
        success:
          "bg-[hsl(var(--success-50))] text-[hsl(var(--success-900))] border border-[hsl(var(--success-500))]/20 dark:bg-[hsl(var(--success-500))]/10 dark:text-[hsl(var(--success-500))] dark:border-[hsl(var(--success-500))]/30",
        warning:
          "bg-[hsl(var(--warning-50))] text-[hsl(var(--warning-900))] border border-[hsl(var(--warning))]/20 dark:bg-[hsl(var(--warning))]/10 dark:text-[hsl(var(--warning))] dark:border-[hsl(var(--warning))]/30",
        error:
          "bg-[hsl(var(--error-50))] text-[hsl(var(--error-900))] border border-[hsl(var(--destructive))]/20 dark:bg-[hsl(var(--destructive))]/10 dark:text-[hsl(var(--destructive))] dark:border-[hsl(var(--destructive))]/30",
        info:
          "bg-[hsl(var(--info-50))] text-[hsl(var(--info-900))] border border-[hsl(var(--info))]/20 dark:bg-[hsl(var(--info))]/10 dark:text-[hsl(var(--info))] dark:border-[hsl(var(--info))]/30",
        outline: 
          "text-[hsl(var(--foreground))] border-[hsl(var(--border))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
