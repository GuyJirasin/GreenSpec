# Backend checkpoint — 2026-10-09

Implemented exclusively inside the new `backend/` folder. Existing engine, API, tests and reference documents were not changed. No cloud deploy, infrastructure install, credentials or live provider integration.

Implemented: nine versioned PostgreSQL migrations, checked security-definer workflow RPCs, membership read RLS, no browser direct domain writes, private immutable registered-path Storage policies, local Auth configuration, persisted deterministic analysis jobs, exact SHA-256 fixture/source verification, immutable finalized snapshots, explicit idempotent package handoff/reconciliation, execution/procurement guards, quantity corrections, evidence verification, separate actual totals, comments/activity, in-app notification evaluation/daily schedule, retained uploads/jobs, targeted DOCX revision with output versions and exclusion approvals, historical/outdated output labeling. All Edge imports stay inside the function mount using checksum-verified generated copies of canonical shared modules.

Verification performed:

- Actual PGlite PostgreSQL engine executes all migrations with Auth/Storage schemas deliberately stubbed. 12 behavioral tests passed: role/RLS/last owner; optimistic conflicts; finalize/immutable snapshots/idempotent handoff; quantities/issues/actual independence; unchanged and started-package reconciliation; partial/stale/overlap/empty decisions; evidence/completion regression/notification dedup; registered Storage paths/client overwrite denial and immutable READY sources; canonical Edge copy parity; NaN/Infinity rejection; real fixture engine persisted job/locked iteration/stale reopen; separate revision output/explicit exclusions/unchanged versus removed approved decisions.
- Three Edge Functions passed TypeScript syntax and local module graph compilation with esbuild. This did not execute Deno/Supabase Edge runtime.
- Supabase developer CLI dependency locked at 2.120.0; Edge SDK import pinned 2.117.3; npm lock audit reported zero vulnerabilities when generated.

Known verification boundary: Docker absent and installation explicitly declined. Supabase local stack, real Auth verification/reset, private object transfers/signed downloads, Deno Edge execution, scheduled cron and browser integration against real Supabase have not been run. `INTEGRATION_CHECKLIST.md` lists concrete checks for that runtime. PGlite roles/object metadata are test infrastructure, not a running product substitute. README explains setup with generated local public keys only; service secrets never enter frontend.

Next: after Docker becomes available under user control, start/reset the local stack, serve functions and run the remaining real infrastructure checks. No remaining code requirement depends on installing Docker during this implementation session.

## Feature 1 UX restoration — 2026-10-10

Migration `202610100010_feature1_options.sql` adds immutable server-generated recommendation choices A/B, membership-scoped read access, and separate selected option/custom wording on review rows. `gs_review_change` enforces role, archived project, row version, request replay, explicit unlock and frozen review guards. Any real choice/wording change clears approval and requires review again. Blank wording is invalid; null means the server default wording.

Finalize still blocks unresolved review and scope overlap, but now freezes selected option payload, `final_wording`, and a clear estimate note for user-edited wording. Summary totals come from the selected option. Existing historical default-A snapshots remain equivalent for handoff and revision history. Reopen and unchanged locked iterations retain B/custom wording; changed analysis proposals need fresh review. Feature 2 workflow is unchanged and consumes the chosen finalized snapshot.

The analysis Edge worker generates the options with canonical `shared/options.mjs`. The service-only finish RPC accepts flattened option rows, validates source/quantity linkage, and inserts missing immutable options. A completed nonfinalized fixture run may be backfilled without replacing results/reviews. Finalized runs are excluded from backfill. All browser writes use checked RPCs; the legacy worker helper is private.

Validation: original 12 SQL suites plus 2 new suites passed together (21 reported executions because imported 7 suites execute in both test files). After adding the final historical guard and iteration suite, all 3 new focused suites passed. These test persisted SQL, RLS, replay, conflicts, lock/finalized guards, Thai wording, B totals, snapshots, handoff, reopen, carry and changed proposals. No cloud deployment performed by this agent; parent coordinates deployment and integration.
