"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Dialog as SheetPrimitive } from "radix-ui"
import { m } from "framer-motion"

import { cn } from "@/lib/utils"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  motionOpen,
  closeButtonClassName,
  closeButtonSize = "default",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
  motionOpen?: boolean
  closeButtonClassName?: string
  closeButtonSize?: "default" | "lg"
}) {
  const closeButton = showCloseButton && (
    <SheetPrimitive.Close
      className={cn(
        "absolute right-4 top-4 rounded-lg opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-0 disabled:pointer-events-none",
        closeButtonSize === "lg" && "flex size-12 items-center justify-center",
        closeButtonSize === "default" && "size-4",
        closeButtonClassName
      )}
    >
      <HugeiconsIcon
        icon={Cancel01Icon}
        size={closeButtonSize === "lg" ? 24 : 16}
        className={closeButtonSize === "lg" ? "size-6" : "size-4"}
      />
      <span className="sr-only">Close</span>
    </SheetPrimitive.Close>
  )

  const contentClassName = cn(
    "bg-background fixed z-50 flex flex-col gap-4 shadow-none",
    side === "right" &&
      "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
    side === "left" &&
      "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
    side === "bottom" &&
      "inset-x-0 bottom-0 h-auto border-t data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
    side === "top" &&
      motionOpen !== undefined &&
      "inset-x-0 top-0 h-auto max-h-[85vh] overflow-y-auto border-b",
    side === "top" &&
      motionOpen === undefined &&
      "inset-x-0 top-0 h-auto border-b data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
    className
  )

  if (side === "top" && motionOpen !== undefined) {
    return (
      <SheetPortal>
        <SheetPrimitive.Overlay forceMount asChild>
          <m.div
            data-slot="sheet-overlay"
            className={cn(
              "fixed inset-0 z-50 bg-black/50",
              !motionOpen && "pointer-events-none",
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: motionOpen ? 1 : 0 }}
            transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.35 }}
          />
        </SheetPrimitive.Overlay>
        <SheetPrimitive.Content forceMount asChild>
          <m.div
            data-slot="sheet-content"
            className={contentClassName}
            initial={{ y: "-100%" }}
            animate={{ y: motionOpen ? 0 : "-100%" }}
            transition={{
              type: "tween",
              ease: [0.32, 0.72, 0, 1],
              duration: 0.4,
            }}
          >
            {children}
            {closeButton}
          </m.div>
        </SheetPrimitive.Content>
      </SheetPortal>
    )
  }

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={contentClassName}
        {...props}
      >
        {children}
        {closeButton}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
