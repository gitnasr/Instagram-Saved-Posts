import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-hairline-strong placeholder:text-ink-subtle aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-sm border bg-surface-1 px-3 py-2 text-sm text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
