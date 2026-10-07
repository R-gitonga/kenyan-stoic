# Sprint 001: Read a published piece

- Status: Implemented; verification pending for the standard production build, Vitest runner, and browser hydration.
- Planned: 2026-10-07
- Feature: A visitor can open a published reflection or poem by its URL and read it comfortably on mobile or desktop.

## Goal and scope

Deliver the first working path from PostgreSQL through the Rust API to a React reading page. Include only the application initialization needed to support this feature.

In scope: project/tooling initialization, local PostgreSQL configuration, a minimal posts table, one public detail endpoint, Markdown rendering, a responsive reading page, and loading/not-found/error states.

Out of scope: archive/list endpoint, homepage design, author login, editing, publishing controls, tags, search, comments, newsletters, uploads, and hosting. Populate local sample posts through an explicit development fixture, not an unauthenticated write endpoint or production data migration. Clearly label sample writing.

## Decisions before implementation

1. Resolved on 2026-10-07: the author requested prerendering in this sprint. Build complete article HTML with React, embed a safe published-post payload, and hydrate on the client. A Rust export command reads published posts through the repository; no public listing endpoint or JavaScript serving runtime is added.
2. Resolved on 2026-10-07: the author confirmed Markdown. Disable raw HTML, preserve poem line breaks and stanza spacing, and retain react-markdown's safe URL handling.
3. Check local Rust, Node, and PostgreSQL availability. Select and document the package manager and actual setup commands when initializing. Keep local database provisioning separate from the deferred hosting decision.

## Proposed contract

`GET /api/posts/{slug}` returns a published post or `404`. A draft and an unknown slug must have the same public not-found behavior.

Successful response fields: `id`, `slug`, `title`, `excerpt`, `body_markdown`, `kind`, and `published_at`. Dates use ISO 8601 timestamps with timezone information. Do not return private fields. Database failures produce a safe server error; do not treat them as an empty result or expose SQL details.

Public frontend route: `/writing/:slug`. Validate the slug format and a reasonable length in the handler; define those limits consistently with the schema during implementation.

## Implementation sequence

### Prerequisites

- Initialize Cargo/Axum and React/TypeScript/Vite with the agreed libraries and lockfiles.
- Align scaffold directories with AGENTS.md; preserve any existing code.
- Configure environment parsing, the PostgreSQL pool, application state, shared errors, and startup.
- Configure local frontend-to-backend requests without committing secrets. Add safe `.env.example` files.

### Backend: migration -> model -> repository -> service -> handler -> route

1. **Migration:** create `posts` with UUID identifier, unique slug, title, excerpt, Markdown body, kind (`reflection`, `poem`, or `other`), status (`draft` or `published`), nullable publication timestamp, and creation/update timestamps. Default status to draft; require a publication timestamp for published rows. Scheduling is outside this sprint.
2. **Model:** define persistence and public response types in `models/post.rs`; keep internal fields out of the response contract.
3. **Repository:** implement a parameterized SQLx lookup in `repositories/post.rs` that explicitly selects only published records. Accept the database executor/pool without accessing HTTP state.
4. **Service:** implement public retrieval in `services/post.rs`, mapping absence to the shared not-found error and returning the public model. Enforce public visibility through the published-only repository operation.
5. **Handler:** validate the slug, invoke the service, and construct safe HTTP responses in `handlers/post.rs`.
6. **Route:** wire the detail endpoint in `routes/post.rs` and the application router.

### Frontend: contracts -> client -> API module -> hook -> page/components

1. Define the public post contract in `src/types/post.ts`.
2. Configure the central Axios client in `src/lib/api.ts`; keep secrets out of browser configuration.
3. Implement `getPost(slug)` in `src/api/posts.ts`, returning typed data and supporting request cancellation.
4. Implement `usePost(slug)` in `src/hooks/usePost.ts` with TanStack Query. Include the slug in the query key and avoid retrying not-found responses.
5. Build `src/pages/PostPage.tsx` and reading components in `src/components/posts/`, using the hook. Handle loading, not found, retryable failure, reflection/poem rendering, and long content.
6. Add the shared reading layout under `src/components/layout/` and wire the React Router route. Use mobile-first Tailwind styling; install/use shadcn components and Lucide icons only where needed.

Runtime flow: `PostPage -> usePost -> TanStack Query -> api/posts.ts -> lib/api.ts -> Axum -> service -> repository -> PostgreSQL`.

## Acceptance criteria

- A documented local setup starts the backend and frontend against PostgreSQL.
- A published fixture is readable at its direct URL, including after a browser refresh.
- Draft and nonexistent slugs return `404` and never reveal draft content.
- Invalid slugs produce a safe validation response; database outages produce safe error responses.
- Markdown is rendered safely; poems retain intentional line breaks and stanza spacing.
- The interface distinguishes loading, not found, and request failure, with an appropriate retry action for recoverable failures.
- The reading page works at 320px, a representative tablet width, and desktop width without unintended horizontal scrolling. Long titles and words wrap; controls are keyboard accessible.
- No public create/update/delete endpoints are introduced.
- The README matches the new structure and records reproducible commands and environment prerequisites.

## Verification and completion

- Apply migrations to a dedicated PostgreSQL test database and verify slug uniqueness and published timestamp constraints.
- Integration-test public retrieval of a published post, exclusion of a draft, unknown/invalid slugs, and safe error mapping.
- Verify frontend loading, success, not-found, and failure states through the hook/API boundary.
- Inspect safe Markdown behavior and poem formatting in the browser, including direct navigation and refresh.
- Run configured Rust formatting, compilation, Clippy, relevant tests, frontend type checks, and build. Report any blocked checks accurately.
- Record actual results here when implemented. Capture concrete future ideas in `docs/BACKLOG.md`; none are added merely to fill the backlog.

## Results

2026-10-07: Axum/React initialization and SQLx connection wiring implemented as sprint prerequisites. An isolated local PostgreSQL database runs on port 55432. Rust formatting, compilation, Clippy, and both health tests passed. Frontend TypeScript compilation passed. Live API readiness returned `{"status":"ready","database":"connected"}`. Node subprocess launches return `EPERM` in the current Windows execution environment, blocking Vite build/dev startup, esbuild's install hook, Vitest execution, and browser/responsive checks. These are unresolved verification limitations, not passing results.

### Feature implementation and verification

- Implemented migration -> model -> repository -> service -> handler -> route, then the typed frontend API, custom query hook, reading components/page, and React Router route.
- Startup applies embedded SQLx migrations. Optional local fixtures contain a clearly labeled reflection, poem, and private draft; they are not production migrations.
- Passed Rust formatting, compilation, Clippy with warnings denied, and all eight backend tests. Schema tests run in independent schemas within `kenyan_stoic_test`, avoiding per-test database creation that stalled in this Windows environment.
- Passed frontend TypeScript compilation.
- Passed live API retrieval and Rust export: exactly two published fixtures exported; the draft was excluded. Draft and unknown URLs return the same 404 body; no public write endpoint exists.
- Passed in-process checks using the actual React components, hooks, Axios boundary, and query client: loading/success, not-found without retry or private error leakage, recoverable errors, poem structure, unsafe HTML/link filtering, full-content server rendering, and metadata/hydration-payload escaping. These checks do not constitute a passing Vitest run.
- Browser-verified a static QA preview generated from the actual React prerenderer and Tailwind stylesheet at 320, 768, and 1280 viewport widths. No page overflow appeared. Direct poem navigation and refresh worked without client JavaScript; poem line breaks and stanza spacing were retained. Skip navigation moved focus to the main content; the header link is 44px tall. Screenshot: `docs/screenshots/sprint-001-poem.png`.
- Still blocked: normal Vite production build/dev startup and Vitest execution encounter Node `spawn EPERM`. Production asset bundling and browser hydration remain unverified. The temporary static QA preview exercises server-rendered markup and styles, not the complete production bundle.
- Future suggestion recorded as IDEA-001 in `docs/BACKLOG.md`: trigger static rebuilds when content is published or withdrawn.

The sprint is not marked complete until the remaining build and hydration checks pass. Run the documented frontend commands in an environment that allows Node child processes.
