import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-ink-subtle border-hairline-strong h-9 pointer-coarse:h-11 w-full min-w-0 rounded-sm border bg-surface-1 px-3 py-1 text-sm text-foreground transition-colors file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive",
        "user-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
