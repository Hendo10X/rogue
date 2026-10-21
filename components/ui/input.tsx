import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/70 h-10 w-full min-w-0 rounded-xl bg-white/[0.04] px-3.5 py-1 text-base shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)] transition-[box-shadow,background-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium hover:bg-white/[0.06] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:bg-white/[0.06] focus-visible:shadow-[inset_0_0_0_1px_rgb(255_140_60/0.6),0_0_0_4px_rgb(255_110_30/0.12)]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
