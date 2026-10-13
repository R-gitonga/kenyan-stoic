// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router"
import { AxiosError } from "axios"
import { api } from "../src/lib/api"
import { NewDraftPage } from "../src/pages/NewDraftPage"
import { SavedDraftPage } from "../src/pages/SavedDraftPage"
import { suggestSlug, validateDraft } from "../src/lib/drafts"
import type { CreateDraft } from "../src/types/draft"

const originalAdapter = api.defaults.adapter
const clients: QueryClient[] = []
function mount(path = "/dev/drafts/new") {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } }); clients.push(client)
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes><Route path="/dev/drafts/new" element={<NewDraftPage />} /><Route path="/dev/drafts/:id" element={<SavedDraftPage />} /></Routes></MemoryRouter></QueryClientProvider>)
}
function fill() {
  fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Sample café poem" } })
  fireEvent.change(screen.getByLabelText(/Writing \(required\)/), { target: { value: "  First line\nSecond line\n\nNext stanza\n" } })
  fireEvent.change(screen.getByLabelText("Writing type"), { target: { value: "poem" } })
}
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); api.defaults.adapter = originalAdapter })
it("saves through the API and reloads the persisted draft confirmation", async () => {
  let saved: unknown
  api.defaults.adapter = async config => {
    expect(config.headers["X-Local-Authoring"]).toBe("1")
    if (config.method === "post") saved = { ...JSON.parse(config.data), status: "draft", published_at: null, created_at: "2026-10-13T06:00:00Z", updated_at: "2026-10-13T06:00:00Z" }
    return { data: saved, status: config.method === "post" ? 201 : 200, statusText: "OK", headers: {}, config }
  }
  mount(); fill()
  expect((screen.getByLabelText(/Slug/) as HTMLInputElement).value).toBe("sample-cafe-poem")
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }))
  await screen.findByText("Draft saved · Private")
  expect((screen.getByLabelText("Saved Markdown (read only)") as HTMLTextAreaElement).value).toBe("  First line\nSecond line\n\nNext stanza\n")
})
it("preserves manually chosen slugs and validates before requesting", () => {
  let requests = 0; api.defaults.adapter = async () => { requests++; throw new Error("Unexpected") }
  mount()
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }))
  expect(screen.getByRole("alert").textContent).toContain("highlighted")
  expect(requests).toBe(0)
  fill()
  fireEvent.change(screen.getByLabelText(/Slug/), { target: { value: "my-choice" } })
  fireEvent.change(screen.getByLabelText(/Title/), { target: { value: "Changed title" } })
  expect((screen.getByLabelText(/Slug/) as HTMLInputElement).value).toBe("my-choice")
})
it("keeps text and composition ID after a failed save and explicit retry", async () => {
  const attempts: CreateDraft[] = []
  let saved: unknown
  api.defaults.adapter = async config => {
    if (config.method === "post") {
      attempts.push(JSON.parse(config.data))
      if (attempts.length === 1) throw new AxiosError("private driver detail", "ERR_NETWORK", config)
      saved = { ...attempts[1], status: "draft", published_at: null, created_at: "2026-10-13T06:00:00Z", updated_at: "2026-10-13T06:00:00Z" }
    }
    return { data: saved, status: 200, statusText: "OK", headers: {}, config }
  }
  mount(); fill(); fireEvent.click(screen.getByRole("button", { name: "Save draft" }))
  await screen.findByRole("alert")
  expect((screen.getByLabelText(/Writing \(required\)/) as HTMLTextAreaElement).value).toContain("Next stanza")
  expect(screen.queryByText("private driver detail")).toBeNull()
  expect(attempts).toHaveLength(1)
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }))
  await screen.findByText("Draft saved · Private")
  expect(attempts[0]).toEqual(attempts[1])
})
it("respects Unicode and UTF-8 bounds", () => {
  expect(suggestSlug("Café — A thought!")).toBe("cafe-a-thought")
  const input: CreateDraft = { id: "id", title: "a", slug: "a", excerpt: "", kind: "poem", body_markdown: "é".repeat(50_001) }
  expect(validateDraft(input).body_markdown).toBeTruthy()
  expect(validateDraft({ ...input, body_markdown: "  \n " }).body_markdown).toBeTruthy()
})
