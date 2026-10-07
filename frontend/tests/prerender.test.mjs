import { describe, expect, it } from "vitest"
import { buildPostHtml, buildHomeHtml, listingPages } from "../scripts/html.mjs"

describe("prerender HTML envelope", () => {
  it("splits published snapshots and keeps homepage payloads separate", () => {
    const posts = Array.from({ length: 12 }, (_, id) => ({ id, title: "</script><script>bad</script>", body_markdown: "Private-to-detail body" }))
    const pages = listingPages(posts)
    expect(pages.map(page => page.items.length)).toEqual([10, 2])
    expect(pages[0].items[0]).not.toHaveProperty("body_markdown")
    expect(listingPages([])[0].total_pages).toBe(1)
    const template = '<title>old</title><meta name="description" content="old"><div id="root"></div>'
    const home = buildHomeHtml(template, pages[0], "<main>Home</main>")
    expect(home).toContain('id="initial-list-data"'); expect(home).not.toContain('id="initial-post-data"')
    expect(JSON.parse(home.match(/type="application\/json">([^<]*)<\/script>/)[1])).toEqual(pages[0])
    const article = buildPostHtml(template, { title: "Piece", excerpt: "Text" }, "<article>Writing</article>")
    expect(article).not.toContain("<main>Home</main>"); expect(article).toContain("Between Thoughts")
  })
  it("escapes metadata and embeds safe, round-trippable data", () => {
    const post = { title: '$& <script>', excerpt: '"><script>bad</script>', body_markdown: "</script><script>alert(1)</script>" }
    const html = buildPostHtml('<title>old</title><meta name="description" content="old" /><div id="root"></div>', post, "<article>Sample</article>")
    expect(html).toContain("$&amp; &lt;script&gt;")
    expect(html).not.toContain('content=""><script>')
    const embedded = html.match(/type="application\/json">([^<]*)<\/script>/)[1]
    expect(JSON.parse(embedded)).toEqual(post)
    expect(html).not.toContain("</script><script>alert(1)")
  })
})
