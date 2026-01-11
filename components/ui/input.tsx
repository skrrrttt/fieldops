import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles
        "flex h-11 w-full min-w-0 rounded-lg border border-border bg-background px-4 py-2 text-base transition-all duration-200",
        // Placeholder & file
        "placeholder:text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Selection
        "selection:bg-primary selection:text-primary-foreground",
        // Focus states
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:border-primary",
        // Dark mode
        "dark:bg-input dark:border-border/50 dark:focus:border-primary",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:focus:ring-destructive",
        // Responsive
        "md:text-sm",
        className
      )}
      {...props}
    />
  )
}

// Search input variant with icon
function InputSearch({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        data-slot="input"
        className={cn(
          "flex h-11 w-full min-w-0 rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-base transition-all duration-200",
          "placeholder:text-muted-foreground",
          "selection:bg-primary selection:text-primary-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:border-primary",
          "dark:bg-input dark:border-border/50 dark:focus:border-primary",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "md:text-sm",
          className
        )}
        {...props}
      />
    </div>
  )
}

export { Input, InputSearch }
