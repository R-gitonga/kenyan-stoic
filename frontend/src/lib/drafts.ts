import axios from "axios"
import { getApiStatus } from "./api"
import type { CreateDraft, DraftFields } from "@/types/draft"

export function suggestSlug(title: string): string {
  return title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 160).replace(/-$/g, "")
}
export function validateDraft(input: CreateDraft): DraftFields {
  const errors: DraftFields = {}
  const title = input.title.trim()
  if (!title || Array.from(title).length > 300) errors.title = "Enter a title of 1 to 300 characters."
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug) || input.slug.length > 160) errors.slug = "Use 1–160 lowercase letters, numbers, or single separating hyphens."
  if (Array.from(input.excerpt.trim()).length > 1000) errors.excerpt = "Keep the excerpt within 1,000 characters."
  if (!input.body_markdown.trim() || new TextEncoder().encode(input.body_markdown).length > 100_000) errors.body_markdown = "Enter writing within 100,000 UTF-8 bytes."
  return errors
}
export function draftErrorFields(error: unknown): DraftFields {
  const fields: DraftFields = {}
  if (axios.isAxiosError(error) && error.response?.status === 422) {
    const incoming = error.response.data?.fields
    for (const name of ["title", "slug", "excerpt", "body_markdown"] as const) {
      if (incoming && typeof incoming[name] === "string") fields[name] = incoming[name]
    }
  }
  return fields
}
export function draftErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data?.code === "draft_changed") return "This draft changed in another tab. Your unsaved writing is still here. Copy any changes you want to keep before reloading the saved version."
  switch (getApiStatus(error)) {
    case 403: return "Local authoring is restricted. Check the configured frontend origin and backend address."
    case 404: return "Local authoring is disabled, or this draft is unavailable. Check the backend setup."
    case 409: return "This slug or composition ID is already in use. Choose another slug, or check whether your previous save succeeded."
    case 413: return "The draft request is too large. Shorten the writing and try again."
    case 422: return "Check the highlighted fields. Your writing is still here."
    case 400: return "The draft could not be accepted. Check its fields and writing type."
    default: return "Could not confirm the save. Your writing is still here. Check the API and database, then try again."
  }
}

export function draftLoadErrorMessage(error: unknown): string {
  if (getApiStatus(error) === 403) return "Use the configured local authoring origin and backend address."
  if (getApiStatus(error) === 404) return "This draft or page is unavailable, or local authoring is disabled."
  return "Could not load saved writing. Check the API and database, then try again."
}
