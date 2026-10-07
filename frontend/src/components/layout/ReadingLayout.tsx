import type { ReactNode } from "react"
import { Link } from "react-router"

export function ReadingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh">
      <a href="#reading-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-10 focus:rounded focus:bg-card focus:p-3">Skip to content</a>
      <header className="mx-auto w-full max-w-4xl border-b border-border px-5 py-6 sm:px-8">
        <Link to="/" className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold uppercase tracking-[0.1em] focus-visible:outline-2 focus-visible:outline-ring"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border font-serif text-lg normal-case tracking-normal">bt</span>Between Thoughts</Link>
      </header>
      <main id="reading-content" tabIndex={-1} className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-16">{children}</main>
      <footer className="mx-auto w-full max-w-4xl border-t border-border px-5 py-6 text-sm text-muted-foreground sm:px-8">Poems, reflections, and ideas along the way. <span className="mt-2 block">© Between Thoughts</span></footer>
    </div>
  )
}
