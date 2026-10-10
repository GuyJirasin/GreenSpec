# Frontend request and cache improvements — 10 October 2026

The completed Supabase MVP / Feature 1 redesign was committed locally as `60a77d8` before these changes. No push was performed. The performance fix remains a separate working-tree change for review.

## Scope

Reduce repeated reads after review actions, keep previously loaded project data in an in-memory cache, load Feature 2 records only when needed, limit analysis polling, and isolate pending states by recommendation. Preserve server authorization, version checks, immutable finalization, acknowledged saving, and draft recovery. No database schema or Edge Function change is planned.

## Validation boundaries

Request-count assertions measure HTTP traffic rather than assume a latency improvement. Browser network gates cover delayed acknowledgments and stale responses. Mock browser checks must be distinguished from real Supabase runtime verification. Actual response time depends on the network and cloud service; no fixed millisecond promise is made.

## Implemented behavior

- Review writes patch only the acknowledged review row and then request only its analysis run for the current review epoch. Approve, Reject, Unlock, A/B and wording use this path.
- Cache entries are scoped by user and project, remain in browser memory, and are fresh for 30 seconds. Fresh previously loaded screen groups reuse data. Older cached groups appear immediately and revalidate in the background. No cache survives a reload or logout.
- Feature 1 no longer reads execution-only tables. Feature 2 loads its own records on entry, including source documents required by direct execution links.
- A pending review disables only that item's edit/review actions. Other items and read-only navigation remain usable. Finalize waits for all pending saves and a valid review epoch.
- An acknowledged save is retained if the follow-up run request fails. The user is told it was saved and must load current data before finalizing. Failed/conflicting writes retain existing draft recovery.
- Background reads merge row versions and review epochs, protect acknowledged rows against older snapshots, and ignore old project/authentication responses. Identity changes clear cache and notices; ordinary token refresh does not clear data.
- Analysis polling reads only active run IDs every two seconds. Terminal results load related recommendations/reviews/options once; failures retry before marking the run ready. Polling stops after completion, and recovered polling errors clear.

## Request evidence

The previous source path made 25 application API requests per review action: one write, one project-list read and 23 project-data requests. Browser tests count actual new requests: a successful review save or A/B change makes two requests (write plus run read); local stage navigation, source previews, search and filtering make zero. The live cloud Option B measurement independently confirmed two requests and zero extra reads for Details/Compare navigation. Counts exclude CORS preflight and authentication traffic.

Evidence: `qa/performance-build.log`, `qa/performance-verification.log`, and `qa/performance-cloud-verification.log`. Live cloud verification also retains the review/finalize gates, selected B snapshot, Thai revised DOCX and synthetic cleanup. No backend migration/deployment was needed. Original-file preservation check passed for all 27 original non-demo files.

Actual wall-clock saving speed was not benchmarked. Saves still wait for the cloud response; large uploads, analysis and document generation still take their required processing time. Generic project/document/execution mutations refresh the relevant screen group rather than using the per-review path.

Validation completed: production build PASS; clean browser suite 21/21 PASS (11 existing journeys and 10 performance regressions); real-cloud request budget and integration PASS; original files 27/27 unchanged. The focused polling recovery check additionally verifies its recovered error notice clears automatically. Fix files remain uncommitted; only the earlier completed implementation is committed as 60a77d8.
