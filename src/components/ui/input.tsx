import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
