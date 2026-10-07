import { renderToString } from "react-dom/server"
import { StaticRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import App from "./App"
import { postKey } from "./hooks/usePost"
import type { Post } from "./types/post"
import type { PostList } from "./types/post"
import { postsKey } from "./hooks/usePosts"
import { pagePath } from "./components/posts/WritingList"

export function renderHome(data: PostList): string {
  const client = new QueryClient()
  client.setQueryData(postsKey(data.page), data)
  const html = renderToString(<QueryClientProvider client={client}><StaticRouter location={pagePath(data.page)}><App /></StaticRouter></QueryClientProvider>)
  client.clear()
  return html
}

export function renderPost(post: Post): string {
  const client = new QueryClient()
  client.setQueryData(postKey(post.slug), post)
  const html = renderToString(
    <QueryClientProvider client={client}>
      <StaticRouter location={`/writing/${post.slug}`}><App /></StaticRouter>
    </QueryClientProvider>,
  )
  client.clear()
  return html
}
