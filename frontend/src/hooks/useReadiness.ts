import { useQuery } from "@tanstack/react-query"
import { getReadiness } from "@/api/health"

export function useReadiness() {
  return useQuery({
    queryKey: ["health", "readiness"],
    queryFn: ({ signal }) => getReadiness(signal),
    retry: false,
    staleTime: 0,
  })
}
