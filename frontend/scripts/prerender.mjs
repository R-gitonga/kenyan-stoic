import { execFileSync } from "node:child_process"
import { readFile, mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"
import { renderPost, renderHome } from "../.generated/renderer/prerender.js"
import { buildPostHtml, buildHomeHtml, listingPages } from "./html.mjs"

const frontendRoot = fileURLToPath(new URL("../", import.meta.url))
const backendRoot = fileURLToPath(new URL("../../backend/", import.meta.url))
const posts = JSON.parse(execFileSync("cargo", ["run", "--locked", "--quiet", "--bin", "export-posts"], {
  cwd: backendRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024,
}))
const template = await readFile(resolve(frontendRoot, "dist/index.html"), "utf8")

for (const data of listingPages(posts)) {
  const directory = data.page === 1 ? resolve(frontendRoot, "dist") : resolve(frontendRoot, "dist/page", String(data.page))
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, "index.html"), buildHomeHtml(template, data, renderHome(data)))
}

for (const post of posts) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(post.slug) || post.slug.length > 160) throw new Error("Invalid exported slug")
  const html = buildPostHtml(template, post, renderPost(post))
  const directory = resolve(frontendRoot, "dist/writing", post.slug)
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, "index.html"), html)
}
console.log(`Prerendered ${posts.length} published pieces.`)
