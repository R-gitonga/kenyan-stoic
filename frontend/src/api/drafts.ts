import { api } from "@/lib/api"
import type { CreateDraft, Draft, DraftList, UpdateDraft } from "@/types/draft"

const headers = { "X-Local-Authoring": "1" }
export async function createDraft(input: CreateDraft): Promise<Draft> {
  return (await api.post<Draft>("/author/drafts", input, { headers })).data
}
export async function getDraft(id: string, signal?: AbortSignal): Promise<Draft> {
  return (await api.get<Draft>(`/author/drafts/${encodeURIComponent(id)}`, { signal, headers })).data
}

export async function updateDraft(id: string, input: UpdateDraft): Promise<Draft> {
  return (await api.put<Draft>(`/author/drafts/${encodeURIComponent(id)}`, input, { headers })).data
}
export async function getDrafts(page: number, signal?: AbortSignal): Promise<DraftList> {
  return (await api.get<DraftList>("/author/drafts", { params: { page }, signal, headers })).data
}
