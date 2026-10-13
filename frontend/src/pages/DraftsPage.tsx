import { useEffect } from "react"
import { Link, useSearchParams } from "react-router"
import { ReadingLayout } from "@/components/layout/ReadingLayout"
import { Button } from "@/components/ui/button"
import { useDrafts } from "@/hooks/useDraft"
import { draftLoadErrorMessage } from "@/lib/drafts"
import { getApiStatus } from "@/lib/api"

const path = (page: number) => page === 1 ? "/dev/drafts" : `/dev/drafts?page=${page}`
export function DraftsPage() {
  const [params] = useSearchParams()
  const raw = params.get("page") ?? "1"
  const page = Number(raw)
  const valid = /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(page)
  const drafts = useDrafts(page, valid)
  const status = getApiStatus(drafts.error)
  useEffect(() => { document.title = "Your drafts · Between Thoughts" }, [])
  return <ReadingLayout>
    <p className="text-xs uppercase tracking-widest text-muted-foreground">Local authoring</p><h1 className="mt-4 font-serif text-3xl sm:text-4xl">Your drafts</h1><p className="mt-4 text-muted-foreground">Private writing, ready to return to. Most recently saved first.</p><Link className="mt-5 inline-flex min-h-11 items-center underline" to="/dev/drafts/new">Write a new draft</Link>
    {!valid || status === 400 ? <p className="mt-6" role="alert">Invalid page. <Link to="/dev/drafts" className="underline">Return to the first page</Link>.</p> : drafts.isPending ? <p className="mt-6" role="status">Loading drafts…</p> : drafts.isError ? <section className="mt-6" role="alert"><p>{draftLoadErrorMessage(drafts.error)}</p>{status === 404 && <Link className="inline-flex min-h-11 items-center underline" to="/dev/drafts">Return to first page</Link>}{status !== 404 && status !== 403 && <Button className="mt-4" disabled={drafts.isFetching} onClick={() => void drafts.refetch()}>Try again</Button>}</section> : drafts.data && <>
      {drafts.data.items.length === 0 ? <p role="status" className="mt-8">No drafts yet. Start with a new piece.</p> : <ul className="mt-6 divide-y divide-border">{drafts.data.items.map(item => <li key={item.id} className="py-6"><p className="text-xs uppercase tracking-widest text-muted-foreground">{item.kind} · Private draft</p><h2 className="mt-2 break-words font-serif text-2xl"><Link className="inline-block min-h-11 py-2 underline underline-offset-4" to={`/dev/drafts/${item.id}/edit`}>{item.title}</Link></h2>{item.excerpt && <p className="mt-2 break-words text-muted-foreground">{item.excerpt}</p>}<time className="mt-3 block text-sm text-muted-foreground" dateTime={item.updated_at}>{new Intl.DateTimeFormat("en-KE", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(new Date(item.updated_at))}</time></li>)}</ul>}
      {drafts.data.total_pages > 1 && <nav aria-label="Draft pages" className="mt-6 flex flex-wrap items-center justify-between gap-4">{page > 1 && <Link className="inline-flex min-h-11 items-center underline" to={path(page - 1)}>Previous</Link>}<span aria-current="page" className="text-sm">Page {page} of {drafts.data.total_pages}</span>{page < drafts.data.total_pages && <Link className="inline-flex min-h-11 items-center underline" to={path(page + 1)}>Next</Link>}</nav>}
    </>}
  </ReadingLayout>
}
