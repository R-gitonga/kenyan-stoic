import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn("w-full min-w-0 resize-y rounded-md border border-border bg-card px-3 py-2 text-base leading-relaxed focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60", className)} {...props} />
}
