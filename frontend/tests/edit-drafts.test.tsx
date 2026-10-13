// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router"
import { AxiosError } from "axios"
import { api } from "../src/lib/api"
import { EditDraftPage } from "../src/pages/EditDraftPage"
import { DraftsPage } from "../src/pages/DraftsPage"
import { draftKey } from "../src/hooks/useDraft"
import type { Draft } from "../src/types/draft"

const fixture: Draft = { id: "00000000-0000-4000-8000-000000000020", title: "Sample saved poem", slug: "sample-saved-poem", excerpt: "Sample writing", kind: "poem", body_markdown: "Line one\nLine two\n\nA stanza", status: "draft", published_at: null, created_at: "2026-10-13T06:00:00Z", updated_at: "2026-10-13T06:00:00Z" }
const originalAdapter = api.defaults.adapter
const clients: QueryClient[] = []
function mount(path = `/dev/drafts/${fixture.id}/edit`) {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } }); clients.push(client)
  const view = render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes><Route path="/dev/drafts" element={<DraftsPage />} /><Route path="/dev/drafts/:id/edit" element={<EditDraftPage />} /></Routes></MemoryRouter></QueryClientProvider>)
  return { ...view, client }
}
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); api.defaults.adapter = originalAdapter; vi.restoreAllMocks() })
it("previews unsaved Markdown safely, preserves poem spacing, and never saves on preview", async () => {
  let writes = 0
  api.defaults.adapter = async config => { if (config.method !== "get") writes++; return { data: fixture, status: 200, statusText: "OK", headers: {}, config } }
  const { container } = mount(); await screen.findByDisplayValue(fixture.title)
  const body = "Changed line\nSecond line\n\nNew stanza\n\n<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))"
  fireEvent.change(screen.getByLabelText(/Writing \(required\)/), { target: { value: body } })
  fireEvent.click(screen.getByRole("button", { name: "Preview", exact: true }))
  expect(container.querySelectorAll(".reading-poem br")).toHaveLength(1)
  expect(container.querySelector("script")).toBeNull()
  expect(container.innerHTML).not.toContain("javascript:")
  expect(writes).toBe(0)
  fireEvent.click(screen.getByRole("button", { name: "Edit", exact: true }))
  expect((screen.getByLabelText(/Writing \(required\)/) as HTMLTextAreaElement).value).toBe(body)
})
it("saves edits with the loaded version and updates saved state", async () => {
  let request: Record<string, unknown> | undefined
  api.defaults.adapter = async config => {
    if (config.method === "put") { request = JSON.parse(config.data); return { data: { ...fixture, ...request, updated_at: "2026-10-13T07:00:00Z" }, status: 200, statusText: "OK", headers: {}, config } }
    return { data: fixture, status: 200, statusText: "OK", headers: {}, config }
  }
  mount(); await screen.findByDisplayValue(fixture.title)
  fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Edited title" } })
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }))
  await screen.findByText("Changes saved. Your draft is still private.")
  expect(request?.expected_updated_at).toBe(fixture.updated_at)
  expect(request?.title).toBe("Edited title")
  expect(request).not.toHaveProperty("status")
  expect(request).not.toHaveProperty("id")
})
it("query refreshes do not overwrite dirty editor fields", async () => {
  api.defaults.adapter = async config => ({ data: fixture, status: 200, statusText: "OK", headers: {}, config })
  const { client } = mount(); await screen.findByDisplayValue(fixture.title)
  fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Unsaved title" } })
  await act(async () => { client.setQueryData(draftKey(fixture.id), { ...fixture, title: "Another tab's title" }) })
  expect((screen.getByLabelText(/Title/) as HTMLInputElement).value).toBe("Unsaved title")
})
it("warns before leaving unsaved work through a same-tab link or refresh", async () => {
  api.defaults.adapter = async config => ({ data: fixture, status: 200, statusText: "OK", headers: {}, config })
  mount(); await screen.findByDisplayValue(fixture.title)
  fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Unsaved title" } })
  const confirmation = vi.spyOn(window, "confirm").mockReturnValue(false)
  fireEvent.click(screen.getByRole("link", { name: "All drafts" }))
  expect(confirmation).toHaveBeenCalled()
  expect((screen.getByLabelText(/Title/) as HTMLInputElement).value).toBe("Unsaved title")
  const departure = new Event("beforeunload", { cancelable: true })
  window.dispatchEvent(departure)
  expect(departure.defaultPrevented).toBe(true)
})
it("preserves conflicted work and requires explicit confirmation to reload", async () => {
  let reads = 0
  api.defaults.adapter = async config => {
    if (config.method === "put") throw new AxiosError("private details", "ERR_BAD_REQUEST", config, undefined, { data: { code: "draft_changed" }, status: 409, statusText: "Conflict", headers: {}, config })
    reads++; return { data: reads === 1 ? fixture : { ...fixture, title: "Latest version", updated_at: "2026-10-13T08:00:00Z" }, status: 200, statusText: "OK", headers: {}, config }
  }
  mount(); await screen.findByDisplayValue(fixture.title)
  fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "My unsaved change" } })
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }))
  expect((await screen.findByRole("alert")).textContent).toContain("another tab")
  expect((screen.getByLabelText(/Title/) as HTMLInputElement).value).toBe("My unsaved change")
  const confirmation = vi.spyOn(window, "confirm").mockReturnValue(false)
  fireEvent.click(screen.getByRole("button", { name: "Reload saved version" }))
  expect(reads).toBe(1)
  confirmation.mockReturnValue(true)
  fireEvent.click(screen.getByRole("button", { name: "Reload saved version" }))
  await screen.findByDisplayValue("Latest version")
  expect(reads).toBe(2)
})
it("lists paginated drafts and opens the correct editor", async () => {
  const pages: number[] = []
  api.defaults.adapter = async config => {
    if (config.params?.page) { pages.push(config.params.page); return { data: { items: [fixture], page: config.params.page, page_size: 20, total_items: 21, total_pages: 2 }, status: 200, statusText: "OK", headers: {}, config } }
    return { data: fixture, status: 200, statusText: "OK", headers: {}, config }
  }
  mount("/dev/drafts"); fireEvent.click(await screen.findByRole("link", { name: "Next" }))
  await screen.findByText("Page 2 of 2"); expect(pages).toEqual([1, 2])
  fireEvent.click(screen.getByRole("link", { name: fixture.title }))
  await screen.findByDisplayValue(fixture.title)
})
