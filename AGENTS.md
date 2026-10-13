# Project instructions

These instructions apply throughout this repository. More specific instructions in a nested AGENTS.md apply to that subtree. Direct user instructions take precedence.

## Purpose

Build Between Thoughts, a personal publication for poems, reflections, and writing across philosophy and everyday life. The author chose this broad public name; Stoicism is one interest rather than a restriction on topics. Existing project directories and internal identifiers may retain Kenyan Stoic names. The project also helps its author develop intermediate Rust and React skills and learn to collaborate effectively with AI. Favor understandable implementations and explain meaningful decisions and tradeoffs briefly.

## Agreed stack and scope

- Backend: Rust, Axum, and Tokio.
- Database: PostgreSQL, accessed through SQLx with versioned SQL migrations.
- Frontend: React and TypeScript with Vite.
- Styling: Tailwind CSS and shadcn/ui components, with Lucide React icons.
- Routing: React Router 7, including protected administration routes.
- Server state: TanStack Query for fetching, caching, mutations, invalidation, and refetching.
- HTTP: Axios centralized in `frontend/src/lib/api.ts`.
- Application-wide state: React Context for concerns such as authentication, using `AuthProvider` and `useAuth()`.
- Maintain one repository containing `backend/`, `frontend/`, and `docs/`.
- Focus on a functional application first. Defer hosting selection and provider-specific infrastructure until requested.
- The application includes PostgreSQL-backed published article retrieval/pagination, the Between Thoughts homepage, React reading pages, prerendering, and opt-in local draft creation/listing/editing/private preview. Author authentication and publishing controls remain unimplemented. Do not claim checks pass before tool evidence confirms it.
- Public articles use build-time React prerendering with client hydration; development pages fetch through the API. A Rust export command supplies only published content to the build. No JavaScript server runtime is required for serving the built pages. Content changes require rebuilding static pages.
- Markdown is the confirmed content format. Disable raw HTML, retain safe URL filtering, and preserve poem line breaks and stanza spacing. Discuss a format change before adopting it.

## Architecture

### Backend

- `src/main.rs`: application startup, dependency initialization, and server lifecycle.
- `src/app_state.rs`: shared application state, including the PostgreSQL pool and service dependencies.
- `src/config.rs`: environment parsing and application configuration.
- `src/error.rs`: shared application errors and their mapping to HTTP responses.
- `src/models/`: domain types and request/response data types, grouped by blog concepts.
- `src/repositories/`: SQLx queries, persistence operations, and database row mapping.
- `src/services/`: business rules, publishing workflows, authentication logic, and coordination of persistence operations.
- `src/handlers/`: Axum handlers that extract and validate requests, invoke services, and construct responses.
- `src/routes/`: route definitions, router composition, and application of route middleware.
- `migrations`: SQLx migrations.
- `tests`: integration tests.

Use a layered backend structure rather than feature folders. Each directory should expose its modules through `mod.rs`; organize modules around this blog's actual concepts, such as posts, tags, and author authentication. Do not copy unrelated entity names from reference projects.

The normal request flow is `routes -> handlers -> services -> repositories -> PostgreSQL`. Routes wire endpoints and middleware; handlers own HTTP concerns; services enforce business rules; repositories own persistence. Models may be shared across these layers but should not execute queries or depend on handlers. Keep SQL out of handlers and services, and keep publishing decisions out of repositories. Services should coordinate transactions for multi-step operations, with repositories able to execute within the same transaction.

Keep the implementation straightforward: this separation does not require generic repository traits, a dependency-injection framework, microservices, or additional crates. Startup should assemble configuration, the database pool, and application state once. Keep real `.env` files local and ignored; track safe configuration examples in `.env.example`.

Use the layered structure for all new code. Empty untracked directories from the initial scaffold may remain locally; their placeholders have been removed and they are not part of the architecture.

### Frontend

- `src/api/`: typed API modules grouped by blog concepts, such as posts and authentication.
- `src/components/ui/`: shadcn/ui components.
- `src/components/layout/`: shared public and administration layouts.
- `src/components/auth/`: authentication guards and related interface components.
- `src/components/posts/`: reusable writing and reading components; add other domain component folders when needed.
- `src/context/`: application-wide providers, including `AuthProvider.tsx` when authentication is implemented.
- `src/hooks/`: custom hooks such as `usePost.ts` and `useAuth.ts`.
- `src/lib/api.ts`: central Axios instance, configuration, and shared HTTP error handling.
- `src/lib/utils.ts`: shadcn and shared utilities.
- `src/pages/`: route-level screens named for the blog's actual pages.
- `src/types/`: shared frontend domain types and API request/response contracts.
- `src/App.tsx`: application composition and route wiring.
- `src/main.tsx`: frontend startup and provider setup.
- `src/index.css`: Tailwind entry point and global styles.
- `src/assets` and `public`: build-processed and fixed-URL assets respectively.
- `tests`: frontend behavior tests.

Keep frontend configuration at its root: `components.json`, `package.json`, TypeScript configuration, and `vite.config.ts`. Use blog-specific names rather than copying entities from the reference operations platform. Use the documented frontend structure for all new code; empty legacy scaffold directories are not part of the architecture. Use the pnpm version pinned in package.json (currently 12.9.1) and the committed lockfile.

Follow this server-data flow: `Page / Component -> Custom Hook -> TanStack Query -> API module -> Central Axios client -> Rust API`. Custom hooks encapsulate query keys, fetching, mutation behavior, and invalidation; typed API modules make requests through `src/lib/api.ts` and return application data. Pages and components consume hooks rather than calling Axios, API modules, or query primitives directly. API modules must not depend on React or TanStack Query.

Keep database access and credentials exclusively in the backend. Use TanStack Query for server state; invalidate the relevant queries after successful mutations. Use React Context for application-wide concerns such as authentication, and component-local state for transient interface state. Avoid duplicating query-managed data in Context. Not every hook needs a query: `useAuth()` may consume authentication Context.

Use React Router 7 for navigation and protected administration routes. Frontend route protection improves the interface but never replaces backend authorization. Place shadcn/ui components in `src/components/ui`, use Tailwind for responsive styling, and use Lucide React for icons. Give icon-only controls accessible names and hide decorative icons from assistive technology.

## Content and reader experience

- The homepage is a quiet literary journal with warm colours, serif headings, generous spacing, a personal “I write…” draft introduction, and a typographic logo placeholder. Logo artwork is deferred. Sprint 002 is implemented with verification limitations recorded in its report.
- Prioritize readable typography, responsive layouts, semantic HTML, keyboard access, and sufficient contrast.
- Mobile responsiveness is part of the current scope for both public pages and the administration interface. Build layouts mobile-first, adapt navigation and editor controls to narrow screens, keep touch targets usable, and prevent unintended horizontal overflow.
- Preserve intentional line breaks and stanza spacing in poems.
- Support writing beyond Stoicism; avoid hard-coding every piece into a philosophy category.
- Keep drafts private. Public endpoints, archives, feeds, and previews intended for readers must return only published content.
- Administrative previews and mutations require backend authorization, even when frontend routes are guarded.
- The author deferred login for the MVP. Sprints 003–004 permit explicitly enabled local-only draft creation, listing, editing, and preview, restricted by a loopback listener and validated local request origin/host/custom header. This is not production authentication. Keep authoring disabled by default and absent from production frontend routes; add authentication before online authoring.
- Draft editing uses optimistic concurrency via expected_updated_at. Preserve unsaved input during failures, conflicts, and query refreshes; only replace it after successful save or explicit reload. Preview reuses PostBody and never publishes or exports private writing.
- Begin with one author and no public registration. Add comments, memberships, newsletters, or other features only when requested.
- Do not present invented personal experiences or AI-generated poems as the author's real writing. Label sample content clearly.

## Database and security

- Make schema changes through SQLx migrations. Do not modify migrations already applied to shared environments; add a new migration.
- Use parameterized SQL and transactions for operations that must succeed together.
- Enforce appropriate constraints in PostgreSQL as well as request validation in application code.
- Never commit credentials, session secrets, real `.env` files, or sensitive database exports. Document required variables in `.env.example` with safe placeholders.
- Use a maintained password-hashing implementation and deliberate session handling when authentication is implemented.
- Protect cookie-authenticated mutations against CSRF and use secure cookie settings in production.
- Treat Markdown and HTML as untrusted input. Sanitize rendered content or disable raw HTML; never insert unsanitized content into React or templates.
- Avoid logging passwords, tokens, session cookies, or private draft bodies.
- Never reset or delete a database containing user content without explicit authorization. Integration tests must use a dedicated test database.

## Development workflow

- Read relevant code and configuration before editing. Preserve established conventions and package managers.
- Divide work into numbered sprints, each delivering one user-facing feature end to end. Store plans in `docs/sprints/` with status, scope, implementation sequence, acceptance criteria, and verification. Foundation setup needed for the first feature belongs to that sprint rather than becoming a collection of unrelated features.
- Follow the backend implementation order: migration (if needed) -> model -> repository -> service -> handler -> route. Then implement the frontend for the same feature, respecting its data flow. Establish configuration and startup prerequisites before this sequence when necessary.
- For frontend implementation, define contracts/types and the central client, then the API module and custom TanStack Query hook, then the page/components and route. The runtime data flow remains page/component -> hook -> TanStack Query -> API module -> Axios -> Rust API.
- Keep each sprint focused; record future ideas in the backlog. Planning a sprint does not authorize implementation when the user explicitly requests planning only. Record completion only after the feature's acceptance criteria are verified.
- Explain significant architectural choices before making broad changes. Proceed independently with routine implementation details.
- Keep changes focused on the requested task. Do not introduce speculative dependencies or infrastructure.
- Record concrete out-of-scope features and future improvements in `docs/BACKLOG.md` as they emerge. Include their benefit, reason for deferral, and important tradeoffs. Update existing entries rather than duplicating them, and mention new or materially updated entries in the task handoff. Backlog entries are suggestions for author review; do not implement them or move them into active scope without the author's instruction. Do not defer defects that prevent the current task from meeting its requirements merely by adding them to the backlog.
- Commit lockfiles once generated. Avoid dependency upgrades unrelated to the task.
- Document actual setup commands and architectural decisions as they become established. Never invent commands for tooling not yet configured.
- Do not spawn subagents unless the user explicitly requests delegation or parallel agent work.

## Verification and handoff

Once the corresponding projects are initialized, use their configured tooling:

- Rust: run formatting and compilation checks; use Clippy and relevant tests for meaningful backend changes.
- SQLx: validate migrations against a dedicated PostgreSQL test database. If compile-time query macros are used, document the required database or offline metadata workflow.
- Run database-backed tests with `scripts/test-backend.ps1` or an explicitly configured `DATABASE_URL` pointing to `kenyan_stoic_test`. Tests create isolated schemas there and refuse the development database. SQLx queries currently use runtime row mapping, so compilation needs no online database or offline query metadata.
- Frontend: run the configured type checks, build, and relevant behavior tests.
- Prioritize tests for draft visibility, authorization, publishing transitions, database constraints, and API error behavior.
- Check browser behavior for changes to reading layouts, editor interactions, and poem formatting.
- Verify changed screens at representative mobile, tablet, and desktop widths, including a narrow viewport around 320 CSS pixels. Check navigation, touch controls, text wrapping, editor usability, and overflow; do not claim responsiveness based only on desktop inspection.
- Documentation-only changes and folder scaffolds do not require application tests.
- If a check cannot run, report the missing prerequisite and distinguish it from a passing check.
- In each handoff, summarize what changed, how it was verified, and any material remaining limitations. Keep explanations useful to an intermediate developer.
