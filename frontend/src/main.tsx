import { StrictMode } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import App from "./App"
import "./index.css"
import { postKey } from "./hooks/usePost"
import type { Post } from "./types/post"
import type { PostList } from "./types/post"
import { postsKey } from "./hooks/usePosts"

const queryClient = new QueryClient()
const initialList = document.getElementById("initial-list-data")
if (initialList?.textContent) {
  const list = JSON.parse(initialList.textContent) as PostList
  queryClient.setQueryData(postsKey(list.page), list)
}
const initialData = document.getElementById("initial-post-data")
if (initialData?.textContent) {
  const post = JSON.parse(initialData.textContent) as Post
  queryClient.setQueryData(postKey(post.slug), post)
}
const application = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter><App /></BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
const root = document.getElementById("root")!
if (root.hasChildNodes()) hydrateRoot(root, application)
else createRoot(root).render(application)
