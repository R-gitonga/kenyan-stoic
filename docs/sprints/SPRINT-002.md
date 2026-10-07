# Sprint 002: Discover published writing

- Status: Implemented; verification pending for the standard production build, Vitest runner, and production browser hydration.
- Planned: 2026-10-07
- Feature: A visitor can discover published writing on the Between Thoughts homepage and open a piece to read it.

## Goal and agreed direction

Replace the temporary root setup screen with a quiet literary journal. The public name is **Between Thoughts**, allowing poems, personal reflections, and writing across different philosophical themes. Stoicism remains an interest rather than a restriction on topics.

Use warm colours, serif headings, generous spacing, and a single-column writing list. Reserve a small logo space beside the name; use a neutral typographic placeholder until the author commissions or creates the logo. The placeholder must not appear as a broken image or add a redundant accessible label.

The introduction speaks personally using “I write…”. Proposed placeholder copy, editable by the author:

> I write poems, personal reflections, and thoughts that wander across philosophy and everyday life. This is a space to explore questions, notice small things, and follow ideas wherever they lead.

This is draft site copy, not an approved biography. Keep sample posts clearly identified as development samples.

## Scope

In scope:

- Public homepage with the shared header, logo placeholder, personal introduction, latest writing, and simple footer.
- Published-only, paginated listing endpoint returning summaries rather than full Markdown bodies.
- A chronological list showing type, linked title, excerpt, and publication date. Mix all writing types together.
- Previous/Next pagination, loading, empty, invalid-page, and recoverable error states.
- Prerendered homepage and numbered listing pages with safe hydration data.
- Consistent visible Between Thoughts branding on the homepage, reading pages, document titles, and metadata.
- Move the development connection check to `/dev/setup`, available only in development. Keep it out of public navigation and production prerendering.

Out of scope: logo artwork, author authentication, editing or publishing controls, About page, search, tags, category filters, featured posts, images, comments, newsletters, hosting, and automated rebuilds. Do not rename repository directories, Rust packages, or local databases merely to change public branding.

## Proposed contracts and pagination

`GET /api/posts?page=1` returns:

```json
{
  "items": [
    {
      "id": "uuid",
      "slug": "sample-a-morning-pause",
      "title": "Sample: A morning pause",
      "excerpt": "Clearly labelled development sample.",
      "kind": "reflection",
      "published_at": "2026-10-07T06:00:00Z"
    }
  ],
  "page": 1,
  "page_size": 10,
  "total_items": 1,
  "total_pages": 1
}
```

- Fix page size at 10 for this sprint. Omitted `page` means 1; reject non-positive, non-integer, or out-of-range numeric values safely with `400`. A valid page beyond the last available page returns `404`.
- Empty publication returns page 1 with an empty list, zero items, and one logical page so the homepage remains usable.
- Select only `status = 'published'`. Exclude draft bodies, draft counts, audit fields, and Markdown bodies from listing responses.
- Order by `published_at DESC, id DESC` for deterministic ordering when dates match. Use the same ordering and page boundaries in the API and static build.
- Compute count and page items from a consistent database snapshot. Bound page arithmetic and use parameterized queries.
- Public routes: `/` for page 1 and `/page/:page` for subsequent pages. Redirect `/page/1` to `/`; validate malformed page routes without requesting the API. Reading URLs remain `/writing/:slug`.
- Pagination uses real links so generated pages remain navigable without JavaScript. Mark current pagination context accessibly; omit unavailable Previous/Next links.

Offset pagination is sufficient for this small publication. New publications can move page boundaries; stable ordering prevents arbitrary rearrangement among equal timestamps but does not freeze a changing collection.

## Implementation sequence

### Prerequisites

- Revisit Sprint 001's outstanding production build, Vitest, and hydration checks. Record actual results; do not infer they pass from the user's working development server.
- Inspect the existing public-detail contract, export command, reading layout, and prerendering pipeline before extending them.
- Preserve the agreed stack, lockfiles, and layered structure.

### Backend: migration -> model -> repository -> service -> handler -> route

1. **Migration, if needed:** inspect the existing schema and add a partial index supporting published-date/ID ordering if justified. Do not alter the applied Sprint 001 migration or create a second posts table.
2. **Model:** add public summary and paginated response types in `models/post.rs`. Keep the existing detail contract intact.
3. **Repository:** add published-only count/page queries in `repositories/post.rs`, using a consistent snapshot and deterministic ordering. Keep SQL and row mapping here.
4. **Service:** coordinate retrieval, pagination arithmetic, public response mapping, and empty/out-of-range behavior. Reuse safe database error mapping.
5. **Handler:** parse and validate `page`, invoke the service, and return typed JSON with safe errors.
6. **Route:** wire `GET /api/posts` beside the existing detail route. No public write endpoints.

### Frontend: contracts -> client -> API module -> hook -> page/components

1. Add summary and pagination contracts in `src/types/post.ts`.
2. Reuse the central Axios client; add `getPosts(page)` to `src/api/posts.ts` with cancellation support.
3. Add `usePosts(page)` under `src/hooks/`, with page-specific query keys and deliberate 4xx/recoverable retry behavior. Keep pagination labels consistent with the returned data while requests change.
4. Create `HomePage.tsx` and reusable writing-list/pagination components under `src/components/posts/`. Pages consume hooks, not Axios or query primitives directly.
5. Extend the shared public layout with Between Thoughts branding and a logo placeholder. Preserve article readability, poem formatting, skip navigation, and keyboard focus visibility.
6. Wire `/`, `/page/:page`, and the development-only setup route. Update the article header's Home link to return to the real homepage.
7. Provide loading, empty publication, invalid/not-found page, and retry states. Database failures must not look like an empty journal.

Runtime flow: `HomePage -> usePosts -> TanStack Query -> api/posts.ts -> lib/api.ts -> Rust API`.

### Prerendering and branding

- Extend the existing Rust published-content export and React renderer rather than introducing a second database connection mechanism in JavaScript.
- Build homepage/listing data from the same published export snapshot used for article pages; exclude drafts from HTML, payloads, and counts.
- Render page 1 to `dist/index.html`, and subsequent pages to `dist/page/<number>/index.html`, alongside existing article output. Generate an empty homepage when no writing is published.
- Populate matching query keys during server rendering and client hydration. Safely escape payloads and metadata, and avoid hydration mismatches.
- Preserve the original Vite HTML template before writing the rendered root page; article pages must not accidentally inherit homepage markup or hydration data.
- Use Between Thoughts in visible branding and route-specific titles/descriptions. Internal project identifiers remain unchanged.
- Continue documenting manual rebuilds after content changes. Hosting and automatic publication rebuilds remain deferred under IDEA-001.

## Acceptance criteria

- `/` presents the agreed literary journal design, personal draft introduction, logo placeholder, and published writing list.
- Each list title opens the correct existing reading page; its Home link returns to `/`.
- Drafts never appear in API summaries, totals, static pages, or hydration payloads.
- More than 10 published pieces produce correct, deterministic pagination without duplicates for an unchanged dataset. Boundary and empty states behave as specified.
- Loading, empty, invalid/not-found, and server-error states are distinct and accessible; recoverable failures offer retry.
- Complete homepage and pagination HTML contain writing links before JavaScript executes. Refresh and direct navigation work for root, numbered pages, and article URLs.
- Client hydration and subsequent API fetching work without markup mismatch warnings.
- The header, logo placeholder, introduction, long titles, excerpts, and pagination work at 320px, tablet, and desktop widths without unintended horizontal scrolling. Link touch targets and keyboard focus remain usable.
- Public branding reads Between Thoughts consistently. The development connection screen is absent from production routes and public navigation.
- No unrelated authoring features, logo artwork, hosting configuration, or database/package renames are introduced.
- README commands and route documentation match implementation. Completion requires evidence for the standard build and relevant tests; unresolved checks remain explicit.

## Verification plan

- Use the dedicated PostgreSQL test database for migrations and integration tests. Cover published-only items/counts, equal-date ordering, multiple page boundaries, empty results, malformed/out-of-range pages, and safe database failures.
- Frontend behavior tests cover list-to-article navigation, pagination requests/query keys, empty/error/retry states, and the absence of drafts.
- Prerender tests verify root and later-page HTML, safe payloads, correct metadata, template reuse, and unchanged article generation.
- Run Rust formatting, compilation, Clippy, relevant tests, frontend type checks, Vitest, and the production build.
- In the real production preview, inspect page source and navigation with JavaScript disabled, then verify hydration and client navigation with JavaScript enabled. Test refresh on numbered listing and article URLs.
- Browser-check 320px, representative tablet, and desktop widths; inspect keyboard navigation, focus, wrapping, and overflow.
- Record results and remaining limitations here when implemented. Keep Sprint 001's unresolved checks visible until verified.

## Results

Implemented on 2026-10-07 following the backend layers and frontend data flow above. Added a partial published-order index, snapshot-consistent summary pagination, the literary journal homepage, a typographic logo placeholder, development-only setup route, and homepage/listing prerendering. Updated public branding without renaming internal project identifiers.

Verification:

- Passed Rust compilation, formatting, Clippy with warnings denied, and all nine backend integration tests. The new listing test covers empty publication, draft exclusion from items/counts, equal-date ordering, unchanged-result stability, page boundaries, invalid/overflowing pages, and safe database outage behavior.
- Backend tests used isolated schemas in `kenyan_stoic_test`. A separate ignored Cargo target directory avoided the executable lock held by the user's running API.
- Passed frontend TypeScript compilation. Added permanent Vitest tests for homepage states, pagination/query requests, article navigation, prerendered links, safe payload separation, and page slicing.
- Passed supplemental in-process checks of the actual React/API boundary: page-specific queries, pagination boundaries, malformed route validation without a request, empty journal, outage/retry recovery, complete server markup, and summary payloads without Markdown bodies. Supplemental jsdom hydration produced no recoverable mismatch errors. These checks are not a successful Vitest run or a production browser hydration test.
- A temporary API instance on loopback port 3001 applied the migration and returned the two published development samples. Its ordering matched the Rust export; the draft was excluded.
- Browser-checked a static QA preview generated with the actual React renderer and Tailwind stylesheet at 320, 768, and 1280px. No horizontal overflow; homepage-to-poem-and-home navigation, pagination navigation/refresh, and keyboard skip-to-main focus worked. Pagination used additional clearly labelled QA fixtures without modifying the development database. Screenshot: `docs/screenshots/sprint-002-home.png`.
- Still blocked: standard Vite production bundling and Vitest startup return `spawn EPERM` in this execution environment. Production browser hydration and the complete built directory output remain unverified. The user must restart the already-running backend on port 3000 to load the new endpoint; Windows denied stopping that process here. No security protections were weakened.

The sprint remains verification pending until the normal frontend tests/build and production preview checks pass. The static QA preview is a layout/navigation check, not a substitute for the complete production bundle. IDEA-001 still tracks automatic rebuilding after publication changes; no new backlog feature was introduced.
