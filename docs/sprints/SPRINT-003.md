# Sprint 003: Create and save a draft

- Status: Implemented; verification pending for browser responsiveness, normal Vitest execution, and the production build.
- Started: 2026-10-13
- Feature: The author writes a piece locally and explicitly saves it as a private draft.

## Scope and decisions

Build a mobile-responsive development editor for title, slug, excerpt, kind (reflection, poem, other), and Markdown body. Offer a suggested ASCII slug from the title until manually changed. Keep Save explicit; preserve form data after failures. After saving, open a read-only saved-draft confirmation URL that can be refreshed and loaded from PostgreSQL. This is persistence confirmation, not a formatted preview or editor for existing writing.

Author login is deferred by the author. Local authoring is an opt-in backend mode, disabled by default, permitted only on a loopback listener. Draft routes check an exact configured local frontend Origin, backend Host, and a custom authoring header; no CORS permissions are added. Frontend authoring routes exist only in Vite development mode. These restrictions establish a local workflow, not user identity or production authorization. Never expose this mode through public hosting, tunnels, or a proxy. Authentication remains a prerequisite for online authoring.

Out of scope: login, draft listing, editing existing drafts, formatted previews, autosave, publishing/withdrawal, uploads, logo artwork, and hosting. Existing reader features stay intact. Use the existing posts schema unless inspection reveals a required schema change; do not modify applied migrations.

## Contracts

- `POST /api/author/drafts`: JSON `{ id, title, slug, excerpt, kind, body_markdown }`. The client creates a UUID once per composition. Return `201` with persisted draft data; a retry with the same ID and identical normalized fields returns `200`. Reusing an ID for different content or a taken slug returns safe `409`.
- `GET /api/author/drafts/{id}`: retrieve only a draft through local authoring restrictions, with `Cache-Control: no-store`. Unknown and published IDs return identical `404`.
- Responses contain ID, title, slug, excerpt, kind, Markdown body, draft status, null publication timestamp, and creation/update times. Do not accept client-supplied status, publication times, or audit timestamps; unknown fields are rejected.
- Trim title/excerpt at the service boundary; preserve body bytes including intentional poem spacing. Require a nonblank title of at most 300 Unicode characters, valid existing slug syntax (1–160 ASCII bytes), excerpt at most 1,000 characters, and nonblank body of at most 100,000 UTF-8 bytes. Limit HTTP bodies to 512 KiB; return safe validation/payload-too-large errors.
- Frontend routes: `/dev/drafts/new` and `/dev/drafts/:id`. Add a development-only authoring link on the setup screen, not public reader navigation.

## Implementation sequence

1. Inspect existing schema, validation, error handling, and development setup. No new migration is currently necessary: posts already support private drafts, unique slugs, and timestamps.
2. Model: typed request/kind, draft database row, public-to-local draft response; reject extra input fields.
3. Repository: parameterized transactional create/read operations, explicit draft filters, safe conflict handling and retry semantics.
4. Service: normalize and validate content, create drafts with server-owned status/timestamps, coordinate idempotent retry semantics, map database errors safely.
5. Handler: extract local-authorized JSON/UUID requests, safe malformed/large-body errors, creation status, and no-store response headers.
6. Routes/configuration: opt-in local routes and middleware, validate loopback listener/origin, preserve default public-only router. Document environment variables without storing credentials in frontend code.
7. Frontend types/API/custom hooks: central Axios -> draft API -> TanStack mutation/query hooks. Do not automatically retry mutations; keep one composition ID for explicit retries.
8. Responsive editor and read-only saved page: accessible labels, field errors, pending/success/retry states, text preservation, explicit new-draft action. Guard accidental departure with a dirty-form warning where supported.
9. Verify, document commands/results, and record concrete future ideas in the backlog.

## Acceptance and verification

- A valid reflection, poem, or other piece saves as a draft; refresh of its confirmation URL reads persisted content with poem spacing intact.
- Drafts stay absent from public detail/list/counts and static export. Read-only confirmation refuses published IDs.
- Default backend configuration has no author routes. Enabling authoring on a non-loopback address fails startup. Wrong/missing Origin, Host, or custom header fails before database access.
- Invalid content, extra fields, malformed JSON/UUID, oversize requests, slug conflicts, changed-content ID reuse, and database outages produce safe errors. Repeated identical saves create only one row.
- Form content survives errors; pending saves disable duplicate submission. Required fields and limits are communicated, with keyboard-accessible errors and controls.
- Editor/confirmation pages work at 320px, tablet, and desktop widths without page overflow. Published reader/prerendering behavior remains unchanged.
- Database tests use isolated schemas in `kenyan_stoic_test`. Run Rust fmt/check/Clippy/tests, frontend typecheck/behavior tests/build, and browser checks. Report restrictions as blocked checks, not passes.

## Results

2026-10-13: Implemented local draft creation and read-back through all agreed backend/frontend layers. No migration or dependency changes were necessary. A client composition ID supports identical-save retries without duplicate rows. The form preserves writing after errors, suggests editable slugs, disables controls during saves, and warns on refresh/tab departure with unsaved text. The confirmation page reads stored Markdown without publishing or formatted preview.

- Passed Rust compilation, formatting, Clippy with warnings denied, and all 13 backend checks. These cover persistence, poem spacing, trimming, retry identity, conflicts, public/detail/list/export exclusion, validation, malformed/oversize requests, access restrictions, and safe errors. Database checks used isolated schemas in `kenyan_stoic_test`.
- Passed frontend TypeScript compilation. Added permanent Vitest editor tests.
- Passed supplemental in-process checks of actual React components/hooks/Axios: validation before requests, suggested/manual slugs, retained writing and composition ID on retry, read-back confirmation, poem spacing, pending-control disabling, and Unicode/UTF-8 bounds. These do not constitute a successful Vitest run.
- Standard Vite build and Vitest still return `spawn EPERM` in this execution environment.
- Browser checking was stopped by the computer-use tool because it could not confidently determine Chrome's current URL. No browser inputs were performed; mobile/tablet/desktop editor verification remains pending. The temporary proxy change, local QA API, and isolated browser-test schema were cleaned up. The normal proxy again points to port 3000.

Operational note: default API configuration has no authoring routes. In the backend terminal, set `$env:ENABLE_LOCAL_AUTHORING = 'true'` before `cargo run --locked`, then open `/dev/drafts/new` on the development frontend. Stop/restart any older backend first. Defaults accept `http://localhost:5173` and `http://127.0.0.1:5173`; a custom local frontend origin requires `LOCAL_AUTHORING_ORIGIN`. Browser GET reads may use a matching Referer origin when Origin is absent; writes always require Origin. The custom header is supplied by the typed API module. Never expose local authoring through hosting, tunnels, or public proxies.

The sprint remains verification pending. Login is deferred; editing/preview and publication belong to subsequent sprints.
