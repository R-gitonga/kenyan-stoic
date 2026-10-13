# Sprint 004: Reopen, edit, and preview a draft

- Status: Implemented; verification pending for normal Vitest/build execution and responsive browser checks.
- Started: 2026-10-13
- Feature: The author finds an existing private draft, edits it, previews its reader formatting, and saves changes.

## Scope

Add a local-only draft list (20 summaries per page, newest updated first), an editor at `/dev/drafts/:id/edit`, and an unsaved Markdown preview using the public `PostBody` component. The existing saved confirmation links to editing. Preview reflects current form values, including writing type, line breaks and stanza spacing; clearly label it private and unsaved. It must not export or publish anything.

Keep Sprint 003's explicit local-authoring opt-in, loopback listener, Origin/Host/custom-header checks, no-store responses, safe validation and public draft exclusion. GET reads may use a matching Referer origin. Author routes stay absent by default and frontend routes stay development-only.

The draft list is the entry point for reopening work, not a separate dashboard feature. Defer publishing, deletion, authentication, autosave, scheduling, uploads, hosting, and logo artwork.

## Contracts and conflict handling

- `GET /api/author/drafts?page=1`: `{ items, page, page_size: 20, total_items, total_pages }`. Summary fields: ID, title, slug, excerpt, kind, updated_at; no Markdown bodies. Filter drafts explicitly; order by updated_at DESC, id DESC. An empty collection has one logical page; bad page parameters produce 400, beyond-last pages 404.
- `PUT /api/author/drafts/{id}`: `{ title, slug, excerpt, kind, body_markdown, expected_updated_at }`. Reject extra fields; ID comes from the route. Apply existing content normalization and limits. Return the persisted draft and a new updated_at, retaining ID, created_at, private status, and publication timestamp.
- Compare expected_updated_at against the database during the update. A changed version returns safe 409 `draft_changed`; keep the author's unsaved text. Never silently overwrite a newer draft. Unknown and published IDs return identical 404.
- Allow an identical retry of an already-applied update to succeed without changing content/version again. A retry with different content and an old version remains a conflict. Slug conflicts remain safe 409.
- Do not automatically refresh query data into a dirty form. Seed the editor once from its initial load. Offer an explicit reload action that warns before discarding unsaved changes. Normal failures retain all fields and offer manual retry.

## Sequence

1. Migration: none required; existing updated_at supports optimistic concurrency and the current table supports editing.
2. Models: update request, private draft summary, paginated response.
3. Repository: parameterized draft-only listing/count snapshot and conditional update. Keep database rules and row mapping here.
4. Service: reuse content validation, coordinate transactional update/retry/conflict behavior and safe errors.
5. Handler/routes: validated page and UUID/JSON, same body limits and local middleware, no-store responses.
6. Frontend types/API/hooks: typed list/update modules through central Axios; query keys include page/ID, mutation retries disabled, invalidate local list/detail after save without changing public caches.
7. Editor/list/preview: accessible mobile-first fields, explicit Edit/Preview modes, unsaved-state messaging, pending controls, conflict/reload behavior, and navigation between list, editor and confirmation.
8. Test, document results and record any future improvements.

## Acceptance and verification

- Find a saved draft in the local list, open it for editing, update each field, save, and refresh to see persisted changes.
- Preview uses identical safe Markdown/poem rendering to public reading, reflects unsaved changes, and never sends a write request.
- Pending saves prevent duplicate submission; failures retain text. Switching preview/edit does not lose input. Refresh/tab departure warns about unsaved changes where supported.
- Concurrent edits and explicit stale-version retries cannot overwrite another tab's work. Identical retries succeed; published records cannot be edited through draft routes.
- No drafts, list counts, previews, or private payloads leak through public API/builds. All local restrictions apply to new endpoints.
- List pagination is stable for an unchanged dataset, handles empty/error states, and excludes full bodies/published records.
- Editor, list, and preview work at 320px, tablet, and desktop widths; keyboard access, form labels/errors, wrapping, touch controls, poem layout, and overflow are checked.
- Use isolated schemas in `kenyan_stoic_test` for database tests. Run Rust formatting/check/Clippy/tests, frontend typecheck/tests/build, and UI checks; report any blocked checks explicitly.

## Results

Implemented on 2026-10-13. Added local draft summary pagination, conditional versioned updates, draft-list/editor routes, private unsaved preview, and edit links from saved confirmation. Reused form fields between create/edit and the public Markdown renderer for preview. Added warnings for refresh/tab departure and primary same-tab link navigation. These warnings are not autosave or guaranteed browser history interception.

Verification:

- Passed Rust formatting, compilation/Clippy with warnings denied, and all 16 backend checks. New database tests cover immutable ID/created_at/status, poem spacing, persistence, identical retries, stale-version conflicts, two concurrent writers, slug conflicts, refusal to edit published IDs, draft-only summary counts/pagination/order, and access restrictions on list/update routes. Tests used isolated schemas in `kenyan_stoic_test`.
- Passed frontend TypeScript compilation. Added permanent Vitest tests for preview safety/formatting, versioned save requests, dirty-state preservation during query refresh, confirmed/cancelled reload, draft-list pagination/navigation, and unsaved departure warnings.
- Passed supplemental in-process checks of the actual React components, hooks, and Axios boundary for those flows. Also reran the create-draft checks after extracting shared fields: validation/suggested/manual slug, preserved text and identity after retry, read-back/poem spacing, pending controls and UTF-8 limits all passed. These do not constitute a successful Vitest run.
- Standard Vite bundling and Vitest startup still fail with `spawn EPERM` in this execution environment. Production build/private-route stripping remains unverified by a real build.
- Responsive browser checks remain pending. The prior browser automation attempt was stopped because it could not establish Chrome's URL confidently; no new browser automation or layout-verification claim was made in this sprint. No temporary proxy/database configuration was introduced.

Restart the backend with `ENABLE_LOCAL_AUTHORING=true`, then open `/dev/drafts` on the development frontend. Select a title to edit; Preview renders current unsaved fields, Save changes persists, and Reload saved version explicitly discards local changes after confirmation. Published workflows remain deferred.

Future suggestion IDEA-002 records autosave/recovery for author review. The sprint remains verification pending until configured frontend tests/build and browser checks pass.
