import { CheckCircle2, RefreshCw } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { useReadiness } from "@/hooks/useReadiness"
import { getApiErrorMessage } from "@/lib/api"

export function SetupPage() {
  const readiness = useReadiness()
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col justify-center px-5 py-12 sm:px-8">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Between Thoughts</p>
      <h1 className="font-serif text-4xl leading-tight sm:text-5xl">A place for reflection.</h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">Philosophy, poetry, and everyday life. Our writing space begins here.</p>
      <section className="mt-8" aria-labelledby="samples-heading">
        <h2 id="samples-heading" className="text-lg font-semibold">Explore the sample writing</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">These development samples demonstrate the reading page. They are not the author's writing. Load them with the development seed script first.</p>
        <nav className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-5" aria-label="Sample writing">
          <Link className="inline-flex min-h-11 items-center underline underline-offset-4" to="/writing/sample-a-morning-pause">Read a sample reflection</Link>
          <Link className="inline-flex min-h-11 items-center underline underline-offset-4" to="/writing/sample-between-steps">Read a sample poem</Link>
        </nav>
      </section>
      <section className="mt-10 rounded-xl border border-border bg-card p-5 sm:p-7" aria-labelledby="setup-heading">
        <h2 id="setup-heading" className="text-lg font-semibold">Development connection check</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">This temporary setup page verifies the frontend, Rust API, and PostgreSQL connection.</p>
        <div className="mt-5 min-h-12 text-sm leading-relaxed" role="status" aria-live="polite">
          {readiness.isPending ? <p>Checking the database connection…</p> : readiness.isError ? <p>{getApiErrorMessage(readiness.error)}</p> : (
            <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />API ready. PostgreSQL connected.</p>
          )}
        </div>
        <Button className="mt-4 w-full sm:w-auto" disabled={readiness.isFetching} onClick={() => void readiness.refetch()}>
          <RefreshCw className={readiness.isFetching ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
          {readiness.isFetching ? "Checking…" : "Check connection"}
        </Button>
      </section>
    </main>
  )
}
