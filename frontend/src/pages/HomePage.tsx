import { useEffect } from "react"
import { Link, Navigate, useParams } from "react-router"
import { ReadingLayout } from "@/components/layout/ReadingLayout"
import { WritingList } from "@/components/posts/WritingList"
import { Button } from "@/components/ui/button"
import { usePosts } from "@/hooks/usePosts"
import { getApiStatus } from "@/lib/api"

export function HomePage() {
  const { page: raw } = useParams()
  const page = raw === undefined ? 1 : Number(raw)
  const valid = (raw === undefined || /^[1-9]\d*$/.test(raw)) && Number.isSafeInteger(page) && page <= 922337203685477580
  const posts = usePosts(page, valid)
  useEffect(() => { document.title = page === 1 ? "Between Thoughts" : `Writing · Page ${page} · Between Thoughts` }, [page])
  if (raw === "1") return <Navigate to="/" replace />
  const status = getApiStatus(posts.error)
  return <ReadingLayout>
    <section aria-labelledby="intro-heading" className="mb-14 sm:mb-20">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">A personal journal</p>
      <h1 id="intro-heading" className="mt-5 font-serif text-4xl leading-tight sm:text-6xl">Between Thoughts</h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">I write poems, personal reflections, and thoughts that wander across philosophy and everyday life. This is a space to explore questions, notice small things, and follow ideas wherever they lead.</p>
    </section>
    <section aria-labelledby="writing-heading">
      <h2 id="writing-heading" className="font-serif text-2xl">{page === 1 ? "Latest writing" : "Earlier writing"}</h2>
      {!valid || status === 400 || status === 404 ? <div className="mt-6"><p>This writing page could not be found.</p><Link className="inline-flex min-h-11 items-center underline" to="/">Return to latest writing</Link></div> :
        posts.isPending ? <p role="status" className="mt-6">Loading writing…</p> : posts.isError ? <div role="alert" className="mt-6"><p>Writing could not load. Please try again.</p><Button className="mt-4" disabled={posts.isFetching} onClick={() => void posts.refetch()}>Try again</Button></div> :
        posts.data && <WritingList data={posts.data} />}
    </section>
  </ReadingLayout>
}
