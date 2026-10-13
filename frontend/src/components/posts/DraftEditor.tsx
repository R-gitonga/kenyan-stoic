import { useRef, useState } from "react"
import type { FormEvent } from "react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { DraftFormFields } from "./DraftFormFields"
import { PostBody } from "./PostBody"
import { useUpdateDraft } from "@/hooks/useDraft"
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges"
import { draftErrorFields, draftErrorMessage, draftLoadErrorMessage, suggestSlug, validateDraft } from "@/lib/drafts"
import type { CreateDraft, Draft, DraftFields } from "@/types/draft"

const composition = (draft: Draft): CreateDraft => ({ id: draft.id, title: draft.title, slug: draft.slug, excerpt: draft.excerpt, kind: draft.kind, body_markdown: draft.body_markdown })
export function DraftEditor({ initial, reload }: { initial: Draft; reload: () => Promise<Draft> }) {
  // Query refreshes must never replace the author's unsaved input.
  const [input, setInput] = useState(() => composition(initial))
  const [version, setVersion] = useState(initial.updated_at)
  const [mode, setMode] = useState<"edit" | "preview">("edit")
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<DraftFields>({})
  const [message, setMessage] = useState("")
  const [reloading, setReloading] = useState(false)
  const notice = useRef<HTMLDivElement>(null)
  const saving = useUpdateDraft(initial.id)
  const busy = saving.isPending || reloading
  useUnsavedChanges(dirty)
  function update(name: keyof CreateDraft, value: string) {
    setInput(previous => ({ ...previous, [name]: value })); setDirty(true); setMessage(""); setErrors(previous => ({ ...previous, [name]: undefined }))
    // Keep a conflict visible while the author copies or reconciles their input.
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return
    const fields = validateDraft(input); setErrors(fields)
    if (Object.keys(fields).length) { setMode("edit"); notice.current?.focus(); return }
    const { id: _id, ...content } = input
    try {
      const saved = await saving.mutateAsync({ ...content, expected_updated_at: version })
      setInput(composition(saved)); setVersion(saved.updated_at); setDirty(false); setMessage("Changes saved. Your draft is still private.")
    } catch (error) { setErrors(draftErrorFields(error)); if (Object.keys(draftErrorFields(error)).length) setMode("edit"); notice.current?.focus() }
  }
  async function reloadSaved() {
    if (dirty && !window.confirm("Reloading discards your unsaved changes. Copy anything you want to keep first. Reload?")) return
    setReloading(true)
    try {
      const saved = await reload(); setInput(composition(saved)); setVersion(saved.updated_at); setDirty(false); setErrors({}); saving.reset(); setMessage("Loaded the latest saved version.")
    } catch (error) { setMessage(draftLoadErrorMessage(error)) }
    finally { setReloading(false) }
  }
  return <>
    <p role="status" className="mt-4 text-sm text-muted-foreground">{dirty ? "Unsaved changes — preview does not save or publish." : "Showing your saved draft. Nothing here publishes it."}</p>
    <div role="group" aria-label="Writing view" className="mt-6 flex flex-wrap gap-3"><Button variant={mode === "edit" ? "default" : "outline"} type="button" aria-pressed={mode === "edit"} disabled={busy} onClick={() => setMode("edit")}>Edit</Button><Button variant={mode === "preview" ? "default" : "outline"} type="button" aria-pressed={mode === "preview"} disabled={busy} onClick={() => setMode("preview")}>Preview</Button></div>
    <form className="mt-6" noValidate onSubmit={submit}>
      <div ref={notice} tabIndex={-1} className="focus-visible:outline-2 focus-visible:outline-ring">
        {(saving.isError || Object.values(errors).some(Boolean)) && <p role="alert" className="mb-6 rounded-md border border-border bg-card p-4">{saving.isError ? draftErrorMessage(saving.error) : "Check the highlighted fields. Your writing is still here."}</p>}
      </div>
      <fieldset disabled={busy} className="min-w-0 space-y-6">
        {mode === "edit" ? <DraftFormFields input={input} errors={errors} update={update} useTitleSlug={() => update("slug", suggestSlug(input.title))} /> : <section aria-label="Private draft preview" className="rounded-md border border-border bg-card p-4 sm:p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Private preview · {input.kind}</p><h2 className="mt-4 break-words font-serif text-3xl leading-tight sm:text-4xl">{input.title.trim() || "Untitled draft"}</h2>{input.excerpt && <p className="mt-5 break-words text-lg leading-relaxed text-muted-foreground">{input.excerpt}</p>}<div className="mt-8"><PostBody body={input.body_markdown} poem={input.kind === "poem"} /></div>
        </section>}
        <Button type="submit" className="w-full sm:w-auto">{saving.isPending ? "Saving…" : "Save changes"}</Button>
      </fieldset>
    </form>
    {message && <p role="status" className="mt-4 text-sm">{message}</p>}
    <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap"><Button type="button" variant="outline" disabled={busy} onClick={() => void reloadSaved()}>{reloading ? "Reloading…" : "Reload saved version"}</Button><Link className="inline-flex min-h-11 items-center underline" to={`/dev/drafts/${initial.id}`}>View saved confirmation</Link><Link className="inline-flex min-h-11 items-center underline" to="/dev/drafts">All drafts</Link></div>
  </>
}
