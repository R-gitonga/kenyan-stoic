import { api } from "@/lib/api"
import type { ReadinessResponse } from "@/types/health"

export async function getReadiness(signal?: AbortSignal): Promise<ReadinessResponse> {
  const response = await api.get<ReadinessResponse>("/health/ready", { signal })
  return response.data
}
