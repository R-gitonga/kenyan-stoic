import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { CreateDraft, DraftFields } from "@/types/draft"

interface Props {
  input: CreateDraft
  errors: DraftFields
  update: (name: keyof CreateDraft, value: string) => void
  useTitleSlug: () => void
}
export function DraftFormFields({ input, errors, update, useTitleSlug }: Props) {
  const help = (name: keyof CreateDraft) => errors[name] ? <p id={`${name}-error`} className="mt-2 text-sm">{errors[name]}</p> : null
  return <>
    <legend className="sr-only">Draft details</legend>
    <div><label htmlFor="title" className="mb-2 block font-medium">Title <span className="text-sm text-muted-foreground">(required)</span></label><Input id="title" value={input.title} onChange={event => update("title", event.target.value)} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "title-error" : "title-hint"} required /><p id="title-hint" className="mt-2 text-sm text-muted-foreground">Up to 300 characters.</p>{help("title")}</div>
    <div><label htmlFor="slug" className="mb-2 block font-medium">Slug <span className="text-sm text-muted-foreground">(required)</span></label><Input id="slug" value={input.slug} onChange={event => update("slug", event.target.value)} spellCheck={false} autoCapitalize="none" aria-invalid={Boolean(errors.slug)} aria-describedby={errors.slug ? "slug-error" : "slug-hint"} required /><p id="slug-hint" className="mt-2 break-words text-sm text-muted-foreground">Future reading address: /writing/{input.slug || "your-title"}. Up to 160 lowercase letters, numbers, and single separating hyphens.</p><Button type="button" variant="outline" className="mt-2" onClick={useTitleSlug}>Use title for slug</Button>{help("slug")}</div>
    <div><label htmlFor="kind" className="mb-2 block font-medium">Writing type</label><select id="kind" className="min-h-11 w-full rounded-md border border-border bg-card px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-ring" value={input.kind} onChange={event => update("kind", event.target.value)}><option value="reflection">Reflection</option><option value="poem">Poem</option><option value="other">Other</option></select></div>
    <div><label htmlFor="excerpt" className="mb-2 block font-medium">Excerpt <span className="text-sm text-muted-foreground">(optional)</span></label><Textarea id="excerpt" rows={3} value={input.excerpt} onChange={event => update("excerpt", event.target.value)} aria-invalid={Boolean(errors.excerpt)} aria-describedby={errors.excerpt ? "excerpt-error" : "excerpt-hint"} /><p id="excerpt-hint" className="mt-2 text-sm text-muted-foreground">A short introduction, up to 1,000 characters.</p>{help("excerpt")}</div>
    <div><label htmlFor="body_markdown" className="mb-2 block font-medium">Writing <span className="text-sm text-muted-foreground">(required)</span></label><Textarea id="body_markdown" rows={16} className="font-mono text-sm" value={input.body_markdown} onChange={event => update("body_markdown", event.target.value)} aria-invalid={Boolean(errors.body_markdown)} aria-describedby={errors.body_markdown ? "body_markdown-error" : "body-hint"} required /><p id="body-hint" className="mt-2 text-sm text-muted-foreground">Use Markdown. Poem line breaks and blank lines between stanzas are preserved. Limit: 100,000 UTF-8 bytes.</p>{help("body_markdown")}</div>
  </>
}
