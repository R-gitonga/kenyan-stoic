import { useEffect } from "react"
import { Link, useParams } from "react-router"
import { ReadingLayout } from "@/components/layout/ReadingLayout"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useDraft } from "@/hooks/useDraft"
import { draftLoadErrorMessage } from "@/lib/drafts"
import { getApiStatus } from "@/lib/api"

export function SavedDraftPage() {
  const { id = "" } = useParams()
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const draft = useDraft(id, valid)
  const status = getApiStatus(draft.error)
  useEffect(() => { document.title = "Saved draft · Between Thoughts" }, [])
  return <ReadingLayout>
    {!valid ? <h1 className="font-serif text-3xl">Invalid draft address</h1> : draft.isPending ? <p role="status">Loading saved draft…</p> : draft.isError ? <section role="alert"><h1 className="font-serif text-3xl">{status === 404 ? "Draft unavailable" : "Draft could not load"}</h1><p className="mt-4">{draftLoadErrorMessage(draft.error)}</p>{status !== 404 && status !== 403 && status !== 400 && <Button className="mt-4" disabled={draft.isFetching} onClick={() => void draft.refetch()}>Try again</Button>}</section> : draft.data && <article>
      <p role="status" className="text-sm font-medium">Draft saved · Private</p>
      <h1 className="mt-4 break-words font-serif text-3xl sm:text-4xl">{draft.data.title}</h1>
      <p className="mt-4 text-muted-foreground">This draft is stored in PostgreSQL. It is not published. You can refresh this address to confirm it is saved.</p>
      <dl className="mt-6 space-y-3 text-sm"><div><dt className="font-medium">Writing type</dt><dd>{draft.data.kind}</dd></div><div><dt className="font-medium">Slug</dt><dd className="break-all">{draft.data.slug}</dd></div><div><dt className="font-medium">Saved</dt><dd><time dateTime={draft.data.updated_at}>{new Intl.DateTimeFormat("en-KE", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(new Date(draft.data.updated_at))}</time></dd></div><div><dt className="font-medium">Excerpt</dt><dd className="break-words">{draft.data.excerpt || "No excerpt"}</dd></div></dl>
      <label htmlFor="saved-body" className="mb-2 mt-8 block font-medium">Saved Markdown (read only)</label><Textarea id="saved-body" rows={16} readOnly className="font-mono text-sm" value={draft.data.body_markdown} />
      <Link className="mt-4 inline-flex min-h-11 items-center underline" to={`/dev/drafts/${id}/edit`}>Edit and preview this draft</Link>
    </article>}
    <Link className="mt-8 inline-flex min-h-11 items-center underline underline-offset-4" to="/dev/drafts/new">Write another draft</Link>
    <Link className="ml-4 inline-flex min-h-11 items-center underline" to="/dev/drafts">All drafts</Link>
  </ReadingLayout>
}
