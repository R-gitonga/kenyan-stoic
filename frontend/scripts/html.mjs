export function buildPostHtml(template, post, body) {
  const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character])
  const data = JSON.stringify(post).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")
  if (!template.includes('<div id="root"></div>')) throw new Error("Missing root placeholder")
  return template.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(post.title)} · Between Thoughts</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, () => `<meta name="description" content="${escapeHtml(post.excerpt)}" />`)
    .replace('<div id="root"></div>', () => `<div id="root">${body}</div><script id="initial-post-data" type="application/json">${data}</script>`)
}

export function buildHomeHtml(template, data, body) {
  // Reuse the existing escaping and root validation; select the listing payload ID.
  const html = buildPostHtml(template, { title: data.page === 1 ? "A personal journal" : `Writing · Page ${data.page}`, excerpt: "Poems, personal reflections, and ideas across philosophy and everyday life." }, body)
  const payload = JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")
  return html.replace(/<script id="initial-post-data" type="application\/json">[\s\S]*?<\/script>/, () => `<script id="initial-list-data" type="application/json">${payload}</script>`)
}

export function listingPages(posts) {
  const summaries = posts.map(({ body_markdown, ...summary }) => summary)
  const total_pages = Math.max(1, Math.ceil(summaries.length / 10))
  return Array.from({ length: total_pages }, (_, index) => ({ items: summaries.slice(index * 10, (index + 1) * 10), page: index + 1, page_size: 10, total_items: summaries.length, total_pages }))
}
