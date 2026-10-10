# GREEN SPEC — implementation verification

Date: 2026-10-09 (project/client date). Scope: new standalone simulated workflow; no cloud deployment or Docker installation.

## Executed evidence

The delivered `TEST_IMPLEMENTATION.ps1` completed successfully against the final implementation. `verification.log` records actual output:

| Check | Executed result | Practical limit |
|---|---|---|
| Frontend production build | PASS | Compilation, not live backend integration |
| Shared domain/fixtures/schema/revision | 24/24 PASS | Synthetic fixtures; independent Ajv2020 differential validation and real DOCX archive/XML integrity |
| PostgreSQL behavior integration | 12/12 PASS | PGlite runs real SQL/RLS/functions with explicitly stubbed Auth/Storage identities/schemas; pgcrypto extension declaration omitted, core UUID generation retained |
| Edge module graphs | 3/3 PASS | TypeScript syntax/local imports checked; Supabase Edge runtime and remote npm imports not executed |
| Browser UI | 7/7 PASS | Chrome, controlled test HTTP API; no production mock fallback |
| Original file preservation | PASS: 27 original tracked files byte-identical | Original `demo/` intentionally removed |

After the full run, a mobile wrapping CSS adjustment was compiled successfully and the targeted 360px browser check passed again (`mobile-verification.log`). Its assertions check heading bounds, scroll width, navigation, and read-only controls.

Browser checks cover landing/contact disclosure and keyboard Auth, task notification target resolution, acknowledged 800ms autosave, draft document/no-file reload, viewer denial and 360px navigation, source modal focus/Escape, approve/reject reload, independent Feature 1 finalization, approved-only explicit handoff, version conflict/draft recovery, Bangkok task time conversion and zero actual cost independent of execution status.

PostgreSQL checks cover owner/editor/viewer/nonmember RLS, last owner, archive/restore denial, direct write denial, cross-project references, operation replay, row conflicts including null versions, immutable audit/source/decisions, finalize guards and omissions, unchanged-lineage handoff, changed started execution, quantities/installation, verification evidence and regression, actual incompleteness and numeric finiteness, notification recipients/dedup, private registered upload paths, persisted canonical fixture jobs/locked iteration/stale reopen, revision output/exclusions/outdated history, and canonical bundled-module parity.

## Acceptance trace and remaining gate

This table maps implemented areas to evidence; **it does not mark AC01–AC34 fully passed on a running Supabase stack**.

| Criteria | Implemented area | Evidence available / remaining live validation |
|---|---|---|
| AC01–02 | Name-only projects, resumable drafts, no-file documents | SQL nullable context/draft creation and browser incomplete setup/reload; live persistence journey pending |
| AC03–04 | Format/size registration, per-file failures/retry/cancel and duplicate warning | Server validation/private upload registration and UI handling; actual transfer/abort/reload/network failure pending |
| AC05–06 | Explicit fixture inputs, arbitrary-file exclusion, frozen shape and exact source validation | Shared/Ajv checks, real source SHA/locators, canonical SQL pipeline, browser evidence viewer; live fixture upload pending |
| AC07–08 | Persistent jobs/request dedup, partial/failed outputs and explicit omission reason | SQL job/replay/locks and finalize omission tests; Edge waitUntil/polling/timeout with live service pending |
| AC09–11 | Saved reviews/activity, feedback iteration/approved locks, unique/null-aware impacts | Shared and SQL checks; browser review reload; live multi-user review pending |
| AC12–14 | Guarded immutable finalization, JSON/CSV, reopen and historical/outdated outputs | SQL snapshot/conflict/stale/empty-set guards; browser independent finalization; full live export/reopen journeys pending |
| AC15–16 | Targeted fixture DOCX revision and explicit unapplied exclusions | Actual zip/paragraph/source hash checks + SQL separate output/exclusion/history tests; live object transfer and Word visual rendering pending |
| AC17–19 | Explicit approved-only handoff, replay/lineage and changed execution guard | SQL reconciliation/start guards and browser no-implicit-package/approved-only handoff; real concurrent HTTP clients pending |
| AC20–23 | Member assignments, tasks/milestones/procurement, quantity corrections and blocking issues | Shared guards and SQL membership/quantity/issue tests; browser task/time control; full execution UI with live storage pending |
| AC24–26 | Evidence/verification, execution completion independent of actual metrics, aggregate completeness | SQL pass/nonconformance/coverage/actual independence; browser explicit zero and estimate/actual panels; real evidence upload pending |
| AC27–28 | Comments, immutable activity, in-app recipients/dedup and daily evaluation | SQL protected audit/notification tests, browser correct target open; live cron scheduling pending |
| AC29 | Member-only DB/Storage/RPC access and client-key-only frontend | SQL role/path/mutation negative tests; real JWT expiry/email/Auth/Storage download boundary pending |
| AC30–31 | Acknowledged saves, conflict recovery, archive/restore and retained source versions | Browser draft/conflict recovery and SQL archive/immutable READY versions; interrupted actual transfers/source downloads pending |
| AC32 | Keyboard/error/focus and responsive UI, per-user draft recovery | Browser keyboard/modal/360px tests and visual screenshots; full accessibility audit and real expired-session/multi-account integration pending |
| AC33–34 | B2B landing/contact/future supplier notice, canonical simulated adapter | Browser disclosure/recipient and shared validated engine/Edge graph; no live provider calls implemented |

## Release limits

Supabase Auth confirmation/reset/session behavior, actual private object transfers, Edge execution, scheduled cron, and browser-to-Supabase full end-to-end journeys have **not run** because Docker was unavailable and the user explicitly declined installation. Follow `../backend/INTEGRATION_CHECKLIST.md` once infrastructure is available.

Fixture analysis/targets are simulated. Recorded actual values need their own source/method; the UI explicitly does not claim comparable actual carbon reduction without a validated comparable basis. No verified engineering/EPD/supplier certification is implied.

LibreOffice was unavailable: DOCX visual rendering remains unverified. Original byte and untouched zip-part checks passed. All screenshots are QA fixture UI states, not evidence of production or live Supabase service operation.
