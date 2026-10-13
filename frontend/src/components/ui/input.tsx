import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn("min-h-11 w-full min-w-0 rounded-md border border-border bg-card px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60", className)} {...props} />
}
