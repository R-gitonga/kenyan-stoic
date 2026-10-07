import { Link } from "react-router"
import type { PostList } from "@/types/post"

export const pagePath = (page: number) => page === 1 ? "/" : `/page/${page}`
export function WritingList({ data }: { data: PostList }) {
  return <>
    {data.items.length === 0 ? <p className="mt-6 text-muted-foreground">There is no published writing yet. Check back soon.</p> :
      <ul className="mt-4 divide-y divide-border">{data.items.map(post => <li key={post.id} className="py-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{post.kind}</p>
        <h3 className="mt-3 break-words font-serif text-2xl leading-snug sm:text-3xl"><Link className="inline-block min-h-11 py-2 underline decoration-border underline-offset-4 hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-ring" to={`/writing/${post.slug}`}>{post.title}</Link></h3>
        {post.excerpt && <p className="mt-3 break-words leading-relaxed text-muted-foreground">{post.excerpt}</p>}
        <time className="mt-4 block text-sm text-muted-foreground" dateTime={post.published_at}>{new Intl.DateTimeFormat("en-KE", { dateStyle: "long", timeZone: "Africa/Nairobi" }).format(new Date(post.published_at))}</time>
      </li>)}</ul>}
    {data.total_pages > 1 && <nav aria-label="Writing pages" className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
      {data.page > 1 && <Link className="inline-flex min-h-11 items-center underline" to={pagePath(data.page - 1)}>Previous</Link>}
      <span aria-current="page" className="text-sm text-muted-foreground">Page {data.page} of {data.total_pages}</span>
      {data.page < data.total_pages && <Link className="inline-flex min-h-11 items-center underline" to={pagePath(data.page + 1)}>Next</Link>}
    </nav>}
  </>
}
