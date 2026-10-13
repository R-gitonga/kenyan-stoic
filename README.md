# Between Thoughts

A personal literary journal for poems, reflections, and ideas across philosophy and everyday life.

## Current state

Sprint 001 implements reading a published piece: a PostgreSQL schema, published-only Axum endpoint, a mobile-first React reading page, safe Markdown, and build-time prerendering. Sprint 002 adds the Between Thoughts homepage, a published-only paginated writing list, logo placeholder, and homepage/listing prerendering. Sprint 003 adds local draft creation/read-back; Sprint 004 adds the local draft list, version-protected editing, and safe unsaved Markdown preview. Author login, publishing controls, logo artwork, and hosting remain deferred.

The normal Vite production build and Vitest runner are currently blocked by Node subprocess restrictions in this Codex Windows environment. Backend tests, TypeScript checks, in-process React checks, and static browser layout checks have passed. Sprints remain verification pending where documented: standard frontend build/tests and production browser hydration are unresolved, and authoring screens still require responsive browser verification.

## Stack and architecture

Rust / Axum / Tokio, PostgreSQL / SQLx; React / TypeScript / Vite; Tailwind, shadcn-compatible components, Lucide; React Router 7, TanStack Query, Axios.

Backend flow: `routes -> handlers -> services -> repositories -> PostgreSQL`.
Frontend data flow: `Page -> Custom Hook -> TanStack Query -> API module -> lib/api.ts -> Rust API`.

Public articles are prerendered at build time using React. A Rust CLI exports published content directly through the repository; browser code never sees database credentials. The prerenderer embeds a safely escaped post payload and the client hydrates the markup with a populated query cache. There is no JavaScript server runtime in the resulting static output. Publishing changes require a rebuild; withdrawn pages remain in an older static build until it is replaced.

See [AGENTS.md](AGENTS.md), [Sprint 001](docs/sprints/SPRINT-001.md), and [the backlog](docs/BACKLOG.md).

## Prerequisites

Rust stable with Cargo, rustfmt and Clippy; Node.js 22+; the pnpm version pinned in `frontend/package.json` (currently 12.9.1); PostgreSQL. This setup uses PostgreSQL 18 locally. Commit both lockfiles.

## Local setup

Run commands from the indicated directories.

### PostgreSQL

From the project root on Windows:

```powershell
./scripts/start-dev-db.ps1
```

Supply `-PostgresBin` if PostgreSQL binaries are not at `C:/Program Files/PostgreSQL/18/bin`. The script creates an isolated cluster under ignored `.local/postgres`, listening only on `127.0.0.1:55432`, with SCRAM authentication and a random password. It does not change your existing PostgreSQL service. Credentials live in ignored `backend/.env` and `.local/postgres-password`; protect them as local secrets.

Alternatively, create your own database, copy `backend/.env.example` to `backend/.env`, and configure `DATABASE_URL`. Never place this URL in frontend configuration.

Stop the project database with `./scripts/stop-dev-db.ps1`.

### Backend

From `backend/`:

```powershell
cargo run --locked
```

The API binds to `127.0.0.1:3000` by default, requires PostgreSQL at startup, and applies SQLx migrations. The pool has five connections and a five-second acquisition timeout. Migration changes are tracked by `build.rs`.

Endpoints:

- `GET /api/health/live`: API liveness.
- `GET /api/health/ready`: SQLx database readiness.
- `GET /api/posts?page=1`: published summaries, ten per page, ordered by publication date and ID descending. Invalid pages return `400`; pages beyond the last return `404`. An empty journal has one empty page. Draft counts and Markdown bodies are excluded.
- `GET /api/posts/{slug}`: public post detail. Unknown and draft posts return the same `404`; invalid slugs return `400`; database unavailability returns a safe `503`.

Slugs contain 1–160 lowercase ASCII letters, digits, or single separating hyphens. Internal status and audit fields are excluded from public responses. There are no public write endpoints.

### Development samples

After starting the API once to apply migrations, run from the project root:

```powershell
./scripts/seed-dev-posts.ps1
```

This optional, idempotent fixture refuses databases other than `kenyan_stoic_dev`. It inserts two published samples and one private draft. Sample writing is explicitly labeled and is not the author's real work.

### Frontend development

From `frontend/` in another terminal:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Vite proxies `/api` to Axum on port 3000.

- Reflection: `http://127.0.0.1:5173/writing/sample-a-morning-pause`.
- Poem: `http://127.0.0.1:5173/writing/sample-between-steps`.
- Draft: `http://127.0.0.1:5173/writing/sample-private-draft` must show not found.

The root is the Between Thoughts literary journal homepage. `/page/2` and later pages show earlier writing once more than ten pieces are published. `/dev/setup` retains the temporary connection screen only in development. Restart your backend after updating so the new listing endpoint and migrations are loaded. The reading page has loading, not-found, validation, retry, and success states. Raw Markdown HTML is disabled; unsafe link protocols are filtered. Markdown images are rendered as their alternative text until image support is introduced. Poems preserve line breaks and stanza spacing.

### Production build and prerendering

Keep PostgreSQL available and configure `backend/.env`. From `frontend/`:

```powershell
pnpm build
pnpm preview
```

The build type-checks, bundles browser assets, builds the React prerenderer, and invokes `cargo run --locked --quiet --bin export-posts` from the backend directory. The Rust CLI exports only published records. The homepage is written to `dist/index.html`, later listing pages to `dist/page/<number>/index.html`, and each article produces `dist/writing/<slug>/index.html` with complete content, title/description, and a safe hydration payload. Vite cleans the previous output during a full build; rebuild after content changes, especially withdrawals.

The intermediate renderer lives in ignored `frontend/.generated/`. Database access is a build prerequisite, not a browser or static-serving dependency. Future hosting must serve the generated article directories correctly. Hosting selection is deferred.

## Verification

### Local draft authoring (Sprints 003–004)

For persistent local authoring, add `ENABLE_LOCAL_AUTHORING=true` and `BACKEND_ADDR=127.0.0.1:3000` to ignored `backend/.env`, then restart the backend. Changing `.env` does not reconfigure an already-running process. Terminal environment variables override `.env` values.

If creating a draft returns `404`, author routes may be disabled or an older backend may still be running. Restart with local authoring enabled and retry Save from the original editor. A failed create does not produce a saved confirmation page; its composition URL can return not found. Keep unsaved text before refreshing or leaving the editor.

Stop any existing backend, then run from `backend/`:

```powershell
$env:ENABLE_LOCAL_AUTHORING = 'true'
cargo run --locked
```

With `pnpm dev` running, open `http://localhost:5173/dev/drafts/new`. Save a title, unique slug, optional excerpt, writing type, and Markdown body. The saved confirmation URL can be refreshed to read the draft from PostgreSQL. Open `/dev/drafts` to find saved pieces and select a title to edit. Preview shows unsaved Markdown using the public reading renderer. Save changes persists; Reload saved version fetches the latest stored draft and warns before discarding unsaved text. Version checks prevent overwriting another tab, and failures retain your input. Publishing remains deferred. Drafts stay absent from all public endpoints and build exports.

Authoring is disabled by default and requires a loopback backend listener. Default frontend origins are `http://localhost:5173` and `http://127.0.0.1:5173`; set `LOCAL_AUTHORING_ORIGIN` for a different exact HTTP loopback origin/port. Browser writes require the matching Origin, backend Host, and `X-Local-Authoring: 1` header; GET reads can use a matching Referer origin when Origin is absent. The frontend API module supplies the custom header. This is a local development workflow, not production authentication. Do not expose it through tunnels or public proxies. Set `$env:ENABLE_LOCAL_AUTHORING = 'false'` and restart to disable it.

Sprint 003 verification on 2026-10-13: 13 backend checks, Rust formatting/compilation/Clippy, frontend TypeScript, and supplemental editor/API component checks passed. Vite/Vitest remain blocked by `spawn EPERM`; browser checks were stopped because the computer-use tool could not reliably determine Chrome's URL. Responsive editor verification remains pending. See `docs/sprints/SPRINT-003.md`.

Sprint 004 verification on 2026-10-13: all 16 backend checks, Rust formatting/Clippy, TypeScript, and supplemental list/edit/preview/conflict checks passed. Responsive browser checks and normal Vitest/build execution remain pending. See `docs/sprints/SPRINT-004.md`; IDEA-002 in the backlog proposes future autosave/recovery.

From `backend/`:

```powershell
cargo fmt --check
cargo check --locked
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked --test health
```

Run the full database-backed suite from the project root:

```powershell
./scripts/test-backend.ps1
```

The runner creates/uses `kenyan_stoic_test` on the isolated cluster. Tests create their own schemas, apply the real migration, and remove those schemas after success. They refuse a database URL naming another database. For another PostgreSQL installation, explicitly set `DATABASE_URL` to `kenyan_stoic_test` before `cargo test --locked`; do not point tests at development or production data.

From `frontend/`:

```powershell
pnpm typecheck
pnpm test
pnpm build
```

### Results on 2026-10-07

- Passed: Rust formatting, compilation, Clippy, and nine backend tests, including published-only pagination.
- Passed: frontend TypeScript compilation.
- Passed: live public endpoint and Rust export; both published fixtures were exported and the private draft was excluded.
- Passed: in-process checks of the actual React query/API boundary, reading states, poem formatting, Markdown safety, server rendering, metadata escaping, and hydration payload serialization. These were supplemental checks, not a passing Vitest run.
- Passed: a temporary static QA preview using the actual React prerenderer and compiled Tailwind styles at 320, 768, and 1280px. No horizontal overflow; direct navigation/refresh, stanza spacing, and keyboard skip navigation worked.
- Blocked: Vite build/dev and Vitest encounter `spawn EPERM` because Node cannot launch child processes in the current execution environment. Complete production bundling and browser hydration still need verification in a normal terminal. No TLS verification or sandbox protections were disabled.

The retained QA preview is a static layout preview, not the full development application. Screenshots are saved in `docs/screenshots/sprint-001-poem.png` and `docs/screenshots/sprint-002-home.png`. Sprint 002 also passed supplemental jsdom hydration, list/retry/pagination checks, static browser navigation and responsive checks, and matching live API/export ordering. Full production hydration remains unverified.
