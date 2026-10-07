import axios from "axios"

export const api = axios.create({
  baseURL: "/api",
  timeout: 10_000,
  headers: { Accept: "application/json" },
})

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 503) return "The database is unavailable. Check the backend and database."
    if (!error.response) return "Could not reach the API. Check that the backend is running."
    return "The API could not complete the request."
  }
  return "An unexpected error occurred."
}

export function getApiStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}
