import { useEffect } from "react"
import { Link, useParams } from "react-router"
import { ReadingLayout } from "@/components/layout/ReadingLayout"
import { DraftEditor } from "@/components/posts/DraftEditor"
import { Button } from "@/components/ui/button"
import { useDraft } from "@/hooks/useDraft"
import { draftLoadErrorMessage } from "@/lib/drafts"
import { getApiStatus } from "@/lib/api"

export function EditDraftPage() {
  const { id = "" } = useParams()
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const draft = useDraft(id, valid)
  const status = getApiStatus(draft.error)
  useEffect(() => { document.title = "Edit draft · Between Thoughts" }, [])
  return <ReadingLayout>
    <p className="text-xs uppercase tracking-widest text-muted-foreground">Local authoring · Private draft</p><h1 className="mt-4 font-serif text-3xl sm:text-4xl">Return to your writing</h1>
    {!valid ? <p className="mt-6">Invalid draft address.</p> : draft.data ? <DraftEditor key={id} initial={draft.data} reload={async () => { const result = await draft.refetch({ throwOnError: true }); if (!result.data) throw new Error("Draft unavailable"); return result.data }} /> : draft.isPending ? <p className="mt-6" role="status">Loading saved draft…</p> : <section role="alert" className="mt-6"><p>{draftLoadErrorMessage(draft.error)}</p>{status !== 404 && status !== 403 && status !== 400 && <Button className="mt-4" disabled={draft.isFetching} onClick={() => void draft.refetch()}>Try again</Button>}</section>}
    {!draft.data && <Link className="mt-6 inline-flex min-h-11 items-center underline" to="/dev/drafts">All drafts</Link>}
  </ReadingLayout>
}
