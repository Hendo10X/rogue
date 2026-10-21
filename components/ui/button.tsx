import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full text-[0.8125rem] font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform,opacity] duration-200 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // The brand gradient, with a top highlight and a warm glow on hover.
        default:
          "bg-[linear-gradient(100deg,#ff4d1a_0%,#ff7a1a_60%,#ffa51a_100%)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_1px_2px_rgb(0_0_0/0.4)] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.32),0_6px_24px_-6px_rgb(255_110_30/0.65)]",
        destructive:
          "bg-destructive/15 text-destructive hover:bg-destructive/25",
        outline:
          "bg-white/[0.04] text-foreground shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] hover:bg-white/[0.08]",
        secondary:
          "bg-white/[0.06] text-foreground hover:bg-white/[0.1]",
        ghost:
          "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground aria-expanded:bg-white/[0.06] aria-expanded:text-foreground",
        link: "text-link underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 px-4 has-[>svg]:px-3.5",
        xs: "h-6 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 px-3.5 has-[>svg]:px-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 px-6 text-sm has-[>svg]:px-5",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-11 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
