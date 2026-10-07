import { useEffect } from "react"
import { useParams } from "react-router"
import { RefreshCw } from "lucide-react"
import { ReadingLayout } from "@/components/layout/ReadingLayout"
import { PostBody } from "@/components/posts/PostBody"
import { Button } from "@/components/ui/button"
import { usePost } from "@/hooks/usePost"
import { getApiStatus } from "@/lib/api"

export function PostPage() {
  const { slug = "" } = useParams()
  const post = usePost(slug)
  const status = getApiStatus(post.error)
  useEffect(() => {
    document.title = post.data ? `${post.data.title} · Between Thoughts` : "Writing · Between Thoughts"
    return () => { document.title = "Between Thoughts" }
  }, [post.data])
  return (
    <ReadingLayout>
      {post.isPending ? <p role="status">Loading this piece…</p> : post.isError && (!post.data || status === 404 || status === 400) ? (
        <section aria-labelledby="post-error-title">
          <h1 id="post-error-title" className="font-serif text-3xl">{status === 404 ? "Piece not found" : status === 400 ? "Invalid writing address" : "This piece could not load"}</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">{status === 404 ? "It may be unavailable, or the address may be incorrect." : status === 400 ? "Check the address and try again." : "Please try again in a moment."}</p>
          {status !== 404 && status !== 400 && <Button className="mt-6" disabled={post.isFetching} onClick={() => void post.refetch()}><RefreshCw className="size-4" aria-hidden="true" />{post.isFetching ? "Retrying…" : "Try again"}</Button>}
        </section>
      ) : post.data ? (
        <article>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{post.data.kind}</p>
          <h1 className="mt-4 font-serif text-3xl leading-tight sm:text-5xl">{post.data.title}</h1>
          <time dateTime={post.data.published_at} className="mt-5 block text-sm text-muted-foreground">
            {new Intl.DateTimeFormat("en-KE", { dateStyle: "long", timeZone: "Africa/Nairobi" }).format(new Date(post.data.published_at))}
          </time>
          {post.data.excerpt && <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{post.data.excerpt}</p>}
          <div className="mt-10"><PostBody body={post.data.body_markdown} poem={post.data.kind === "poem"} /></div>
          {post.isError && <p role="status" className="mt-6 text-sm text-muted-foreground">Could not refresh this piece. Showing the last available version.</p>}
        </article>
      ) : null}
    </ReadingLayout>
  )
}
