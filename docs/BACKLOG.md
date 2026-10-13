# Future ideas and improvements

This is a reviewable record of ideas discovered while building Between Thoughts. An entry is a suggestion, not authorization to implement it. Keep current work focused on the agreed scope.

## How to use this file

- Add a concrete idea when implementation or discussion reveals a useful future feature or improvement.
- Describe the benefit, why it can wait, and any important dependency or tradeoff.
- Use a stable ID such as `IDEA-001` and record the date in `YYYY-MM-DD` format.
- New entries begin as **Proposed**. The author can **Approve**, **Defer**, or **Decline** them. Record **Implemented** only when the work is completed and verified.
- Approval records interest in future work; it does not automatically move an item into the active task. Record when the author explicitly brings an item into scope.
- Update an existing entry instead of duplicating it. Retain declined and implemented entries with a brief decision note.
- Keep entries concise. Mention newly added or materially updated ideas in the relevant task handoff so the author can review them.

## Ideas

### IDEA-001 — Rebuild static pages after publishing changes

- Added: 2026-10-07
- Status: Proposed
- Origin: Sprint 001's build-time prerendering architecture.
- Suggestion: Have future publish, edit, and unpublish workflows trigger a new static build and replace previous artifacts; include a clear failure/retry state for the author.
- Benefit: Readers receive current writing, and withdrawn pieces disappear from static output as well as the API.
- Why later: Sprint 001 has no author publishing controls or hosting integration. Rebuilding manually is the current workflow.
- Dependencies / tradeoffs: Requires the publishing feature and the eventual build/deployment mechanism. Publication and build completion are separate events; failures must be visible rather than silently reporting completion. Cache invalidation may also be needed for the chosen host.
- Review / updates: Awaiting author review. On 2026-10-07, Sprint 002 extended static output to homepage and paginated listings; future publication rebuilds must replace those pages as well as articles. Automatic rebuilding remains outside current implementation.

### IDEA-002 — Autosave and recovery of unsaved writing

- Added: 2026-10-13
- Status: Proposed
- Origin: Sprint 004's explicit-save editor and unsaved navigation warnings.
- Suggestion: Add deliberate autosave or a recoverable local composition buffer, with clear saved/unsaved/conflict indicators.
- Benefit: Reduce lost writing after browser crashes, accidental navigation, or network interruptions.
- Why later: The current MVP uses explicit Save and departure warnings. First verify the basic editing and publication workflows.
- Dependencies / tradeoffs: Autosave must respect optimistic concurrency and never overwrite another tab's work. Local storage of private writing needs a clear recovery/clear-data policy, and must not be confused with a server save.
- Review / updates: Awaiting author review; not implemented or moved into active scope.

## Entry template

Copy this template for each new idea:

```markdown
### IDEA-001 — Short title

- Added: YYYY-MM-DD
- Status: Proposed
- Origin: Discussion, implementation finding, or user request.
- Suggestion: What would change.
- Benefit: Why it would help the author, readers, or development workflow.
- Why later: Why this sits outside current scope.
- Dependencies / tradeoffs: Important prerequisites or costs, if known.
- Review / updates: Dated author decisions, scope changes, or implementation notes.
```
