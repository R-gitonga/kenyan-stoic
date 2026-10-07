// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest"
import { cleanup, render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router"
import { AxiosError } from "axios"
import { api } from "../src/lib/api"
import { HomePage } from "../src/pages/HomePage"
import { renderHome } from "../src/prerender"
import type { PostList } from "../src/types/post"

const clients: QueryClient[] = []
const adapter = api.defaults.adapter
const data: PostList = { items: [{ id: "one", slug: "sample-one", title: "Sample one", excerpt: "Sample excerpt", kind: "poem", published_at: "2026-10-07T06:00:00Z" }], page: 1, page_size: 10, total_items: 11, total_pages: 2 }
function mount(path = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } }); clients.push(client)
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes><Route path="/" element={<HomePage />} /><Route path="/page/:page" element={<HomePage />} /><Route path="/writing/:slug" element={<h1>Reading destination</h1>} /></Routes></MemoryRouter></QueryClientProvider>)
}
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); api.defaults.adapter = adapter })
it("uses page-specific requests, paginates, and opens writing", async () => {
  const pages: number[] = []
  api.defaults.adapter = async config => { pages.push(config.params.page); return { data: { ...data, page: config.params.page }, status: 200, statusText: "OK", headers: {}, config } }
  mount()
  fireEvent.click(await screen.findByRole("link", { name: "Next" }))
  await screen.findByText("Page 2 of 2")
  expect(pages).toEqual([1, 2])
  expect(screen.queryByRole("link", { name: "Next" })).toBeNull()
  fireEvent.click(screen.getByRole("link", { name: "Sample one" }))
  expect(await screen.findByRole("heading", { name: "Reading destination" })).toBeTruthy()
})
it("shows an empty journal, rather than an error", async () => {
  api.defaults.adapter = async config => ({ data: { ...data, items: [], total_items: 0, total_pages: 1 }, status: 200, statusText: "OK", headers: {}, config })
  mount(); expect(await screen.findByText(/no published writing yet/)).toBeTruthy()
})
it("rejects malformed route pages without a request", () => {
  let calls = 0; api.defaults.adapter = async () => { calls++; throw new Error("Unexpected request") }
  mount("/page/nope"); expect(screen.getByText(/page could not be found/)).toBeTruthy(); expect(calls).toBe(0)
})
it("offers a retry that recovers from an API outage", async () => {
  api.defaults.adapter = async config => { throw new AxiosError("private details", "ERR_BAD_REQUEST", config, undefined, { data: {}, status: 503, statusText: "Unavailable", headers: {}, config }) }
  mount(); await screen.findByRole("button", { name: "Try again" }, { timeout: 4000 })
  api.defaults.adapter = async config => ({ data, status: 200, statusText: "OK", headers: {}, config })
  fireEvent.click(screen.getByRole("button", { name: "Try again" })); expect(await screen.findByRole("link", { name: "Sample one" })).toBeTruthy()
})
it("prerenders homepage links and page boundaries without loading markup", () => {
  const html = renderHome(data)
  expect(html).toContain('href="/writing/sample-one"'); expect(html).toContain('href="/page/2"'); expect(html).not.toContain("Loading writing")
  expect(renderHome({ ...data, page: 2 })).toContain('href="/"')
})
