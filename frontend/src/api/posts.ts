import { api } from "@/lib/api"
import type { Post, PostList } from "@/types/post"

export async function getPosts(page: number, signal?: AbortSignal): Promise<PostList> {
  return (await api.get<PostList>("/posts", { params: { page }, signal })).data
}

export async function getPost(slug: string, signal?: AbortSignal): Promise<Post> {
  return (await api.get<Post>(`/posts/${encodeURIComponent(slug)}`, { signal })).data
}
