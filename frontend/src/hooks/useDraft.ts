import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createDraft, getDraft, getDrafts, updateDraft } from "@/api/drafts"
import type { UpdateDraft } from "@/types/draft"
import { getApiStatus } from "@/lib/api"

export const draftKey = (id: string) => ["drafts", "detail", id] as const
export function useCreateDraft() {
  const client = useQueryClient()
  return useMutation({ mutationFn: createDraft, retry: false, onSuccess: () => { void client.invalidateQueries({ queryKey: ["drafts", "list"] }) } })
}
export function useDraft(id: string, enabled: boolean) {
  return useQuery({ queryKey: draftKey(id), queryFn: ({ signal }) => getDraft(id, signal), enabled,
    staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
    retry: (failures, error) => { const status = getApiStatus(error); return !(status && status >= 400 && status < 500) && failures < 1 },
  })
}

export const draftsKey = (page: number) => ["drafts", "list", page] as const
export function useDrafts(page: number, enabled = true) {
  return useQuery({ queryKey: draftsKey(page), queryFn: ({ signal }) => getDrafts(page, signal), enabled, gcTime: 0,
    retry: (failures, error) => { const status = getApiStatus(error); return !(status && status >= 400 && status < 500) && failures < 1 },
  })
}
export function useUpdateDraft(id: string) {
  const client = useQueryClient()
  return useMutation({ mutationFn: (input: UpdateDraft) => updateDraft(id, input), retry: false,
    onSuccess: (saved) => { client.setQueryData(draftKey(id), saved); void client.invalidateQueries({ queryKey: ["drafts", "list"] }) },
  })
}
