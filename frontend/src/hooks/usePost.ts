import { useQuery } from "@tanstack/react-query"
import { getPost } from "@/api/posts"
import { getApiStatus } from "@/lib/api"

export const postKey = (slug: string) => ["posts", "detail", slug] as const

export function usePost(slug: string) {
  return useQuery({
    queryKey: postKey(slug),
    queryFn: ({ signal }) => getPost(slug, signal),
    enabled: Boolean(slug),
    staleTime: 60_000,
    retry: (failures, error) => {
      const status = getApiStatus(error)
      return !(status && status >= 400 && status < 500) && failures < 1
    },
  })
}
