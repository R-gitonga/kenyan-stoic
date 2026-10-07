import { useQuery } from "@tanstack/react-query"
import { getPosts } from "@/api/posts"
import { getApiStatus } from "@/lib/api"

export const postsKey = (page: number) => ["posts", "list", page] as const
export function usePosts(page: number, enabled = true) {
  return useQuery({ queryKey: postsKey(page), queryFn: ({ signal }) => getPosts(page, signal), enabled,
    staleTime: 60_000, retry: (failures, error) => {
      const status = getApiStatus(error)
      return !(status && status >= 400 && status < 500) && failures < 1
    },
  })
}
