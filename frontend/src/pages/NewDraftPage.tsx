import { useEffect, useRef, useState } from "react"
import type { FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { Save } from "lucide-react"
import { ReadingLayout } from "@/components/layout/ReadingLayout"
import { Button } from "@/components/ui/button"
import { DraftFormFields } from "@/components/posts/DraftFormFields"

import { useCreateDraft } from "@/hooks/useDraft"
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges"
import { draftErrorFields, draftErrorMessage, suggestSlug, validateDraft } from "@/lib/drafts"
import type { CreateDraft, DraftFields } from "@/types/draft"

export function NewDraftPage() {
  const [input, setInput] = useState<CreateDraft>(() => ({ id: crypto.randomUUID(), title: "", slug: "", excerpt: "", kind: "reflection", body_markdown: "" }))
  const [customSlug, setCustomSlug] = useState(false)
  const [errors, setErrors] = useState<DraftFields>({})
  const [dirty, setDirty] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const notice = useRef<HTMLDivElement>(null)
  const saving = useCreateDraft()
  const navigate = useNavigate()
  useEffect(() => { document.title = "New draft · Between Thoughts" }, [])
  useUnsavedChanges(dirty)
  function update(name: keyof CreateDraft, value: string) {
    setDirty(true); setErrors(previous => ({ ...previous, [name]: undefined }))
    if (saving.isError) saving.reset()
    if (name === "slug") setCustomSlug(true)
    setInput(previous => ({ ...previous, [name]: value, ...(name === "title" && !customSlug ? { slug: suggestSlug(value) } : {}) }))
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.isPending) return
    const fields = validateDraft(input)
    setErrors(fields)
    if (Object.keys(fields).length) { notice.current?.focus(); return }
    setAttempted(true)
    try {
      const saved = await saving.mutateAsync(input)
      setDirty(false)
      navigate(`/dev/drafts/${saved.id}`)
    } catch (error) {
      setErrors(draftErrorFields(error)); notice.current?.focus()
    }
  }
  const hasErrors = Object.values(errors).some(Boolean)
  return <ReadingLayout>
    <p className="text-xs uppercase tracking-widest text-muted-foreground">Local authoring · Private draft</p>
    <h1 className="mt-4 font-serif text-3xl sm:text-4xl">A space to write</h1>
    <p className="mt-4 leading-relaxed text-muted-foreground">Save a new draft here. Nothing on this page publishes your writing. Save before leaving; unsaved text stays only in this tab.</p>
    <form className="mt-8" onSubmit={submit} noValidate>
      <div ref={notice} tabIndex={-1} className="focus-visible:outline-2 focus-visible:outline-ring">
        {(hasErrors || saving.isError) && <div role="alert" className="mb-6 rounded-md border border-border bg-card p-4"><p>{saving.isError ? draftErrorMessage(saving.error) : "Check the highlighted fields. Your writing is still here."}</p>
          {attempted && saving.isError && <Link className="mt-3 inline-flex min-h-11 items-center underline" to={`/dev/drafts/${input.id}`}>Check this composition's saved draft</Link>}
        </div>}
      </div>
      <fieldset disabled={saving.isPending} className="min-w-0 space-y-6">
        <DraftFormFields input={input} errors={errors} update={update} useTitleSlug={() => { setCustomSlug(false); setInput(previous => ({ ...previous, slug: suggestSlug(previous.title) })); setDirty(true); setErrors(previous => ({ ...previous, slug: undefined })) }} />
        <Button type="submit" className="w-full sm:w-auto"><Save className="size-4" aria-hidden="true" />{saving.isPending ? "Saving…" : "Save draft"}</Button>
      </fieldset>
      {saving.isPending && <p role="status" className="mt-3 text-sm text-muted-foreground">Saving your draft…</p>}
    </form>
  </ReadingLayout>
}
