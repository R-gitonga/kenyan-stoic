// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router"
import { AxiosError } from "axios"
import { api } from "../src/lib/api"
import { PostPage } from "../src/pages/PostPage"
import { PostBody } from "../src/components/posts/PostBody"
import { renderPost } from "../src/prerender"
import type { Post } from "../src/types/post"

const originalAdapter = api.defaults.adapter
const clients: QueryClient[] = []
const fixture: Post = {
  id: "00000000-0000-4000-8000-000000000001", slug: "sample-piece",
  title: "Sample reading", excerpt: "Clearly labeled sample.",
  body_markdown: "First line\nSecond line\n\nNext stanza",
  kind: "poem", published_at: "2026-10-07T06:00:00Z",
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })
  clients.push(client)
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/writing/sample-piece"]}><Routes><Route path="/writing/:slug" element={<PostPage />} /></Routes></MemoryRouter></QueryClientProvider>)
}

afterEach(() => {
  cleanup()
  clients.forEach((client) => client.clear())
  clients.length = 0
  api.defaults.adapter = originalAdapter
})

describe("reading page through the query and API boundary", () => {
  it("shows loading then renders a published poem", async () => {
    let finish: (() => void) | undefined
    api.defaults.adapter = (config) => new Promise((resolve) => { finish = () => resolve({ data: fixture, status: 200, statusText: "OK", headers: {}, config }) })
    const { container } = renderPage()
    expect(screen.getByRole("status").textContent).toContain("Loading")
    await waitFor(() => expect(finish).toBeDefined())
    finish!()
    expect(await screen.findByRole("heading", { name: fixture.title })).toBeTruthy()
    expect(container.querySelectorAll(".reading-poem br")).toHaveLength(1)
    expect(container.querySelectorAll(".reading-poem p")).toHaveLength(2)
  })

  it("does not retry a missing piece or expose error details", async () => {
    const adapter = vi.fn(async (config) => {
      throw new AxiosError("Private driver detail", "ERR_BAD_REQUEST", config, undefined, { data: { message: "Private driver detail" }, status: 404, statusText: "Not Found", headers: {}, config })
    })
    api.defaults.adapter = adapter
    renderPage()
    expect(await screen.findByRole("heading", { name: "Piece not found" })).toBeTruthy()
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/Private driver detail/)).toBeNull()
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
  })

  it("offers retry for a recoverable failure", async () => {
    api.defaults.adapter = async (config) => { throw new AxiosError("offline", "ERR_NETWORK", config) }
    renderPage()
    expect(await screen.findByRole("heading", { name: "This piece could not load" }, { timeout: 4000 })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy()
  })
})

describe("safe content and prerendering", () => {
  it("ignores raw HTML and unsafe links", () => {
    const { container } = render(<PostBody body={'Visible\n\n<script>alert("secret")</script>\n\n[unsafe](javascript:alert(1))'} poem={false} />)
    expect(container.querySelector("script")).toBeNull()
    expect(container.innerHTML).not.toContain("javascript:")
    expect(container.textContent).toContain("Visible")
  })

  it("renders the full article from the populated query cache", () => {
    const html = renderPost(fixture)
    expect(html).toContain("Sample reading")
    expect(html).toContain("First line")
    expect(html).not.toContain("Loading this piece")
    expect(html).toContain("<br")
  })
})
