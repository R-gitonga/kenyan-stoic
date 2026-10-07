export interface Post {
  id: string
  slug: string
  title: string
  excerpt: string
  body_markdown: string
  kind: "reflection" | "poem" | "other"
  published_at: string
}
export type PostSummary = Omit<Post, "body_markdown">
export interface PostList { items: PostSummary[]; page: number; page_size: number; total_items: number; total_pages: number }
