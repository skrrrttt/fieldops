import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm [a&]:hover:bg-destructive/90",
        success:
          "border-transparent bg-success text-success-foreground shadow-sm [a&]:hover:bg-success/90",
        warning:
          "border-transparent bg-warning text-warning-foreground shadow-sm [a&]:hover:bg-warning/90",
        outline:
          "border-border text-foreground bg-background [a&]:hover:bg-secondary",
        ghost:
          "border-transparent text-muted-foreground [a&]:hover:text-foreground [a&]:hover:bg-secondary",
        glow:
          "border-transparent bg-primary text-primary-foreground shadow-md shadow-primary/30 [a&]:hover:shadow-lg [a&]:hover:shadow-primary/40",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

// Dot indicator badge for status
function BadgeDot({
  className,
  color = "primary",
  ...props
}: React.ComponentProps<"span"> & {
  color?: "primary" | "success" | "warning" | "destructive" | "muted"
}) {
  const dotColors = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    muted: "bg-muted-foreground",
  }

  return (
    <span
      data-slot="badge-dot"
      className={cn(
        "inline-flex items-center gap-2 text-sm font-medium text-foreground",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "size-2 rounded-full animate-pulse",
          dotColors[color]
        )}
      />
      {props.children}
    </span>
  )
}

export { Badge, BadgeDot, badgeVariants }
