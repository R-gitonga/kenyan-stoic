import type { Post } from "./post"

export interface CreateDraft {
  id: string
  title: string
  slug: string
  excerpt: string
  kind: Post["kind"]
  body_markdown: string
}
export interface Draft extends CreateDraft {
  status: "draft"
  published_at: null
  created_at: string
  updated_at: string
}
export type DraftFields = Partial<Record<keyof CreateDraft, string>>
export type UpdateDraft = Omit<CreateDraft, "id"> & { expected_updated_at: string }
export type DraftSummary = Pick<Draft, "id" | "title" | "slug" | "excerpt" | "kind" | "updated_at">
export interface DraftList { items: DraftSummary[]; page: number; page_size: number; total_items: number; total_pages: number }
