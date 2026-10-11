# GREEN SPEC implementation work log

> Paths and commands in this document are relative to the repository root (GreenSpec/), unless stated otherwise. This document is stored in agents/.

## 2026-10-09 — M0 foundation in progress

- Cloned GuyJirasin/GreenSpec main into Downloads/EGAT/GreenSpec.
- Deleted only original demo/ per explicit instruction. Hash baseline of all other tracked files saved for verification.
- Frozen v1 specification read from ../document/ (read-only); current requirements supersede historical drafts.
- User approved new frontend/backend/shared files and new implementation records. New UI uses reference theme only, Thai primary.
- Delegated backend, frontend and canonical fixture/domain work to agents with distinct ownership.
- Node/npm available. Docker, psql and Supabase CLI absent from PATH. User declined Docker installation: deliver runnable setup and honest verification limits.
- Backend plans embedded PostgreSQL tests; real Supabase Auth/Storage integration and deployed tests remain pending local infrastructure.

## Release gate

Track AC01–AC34 against implemented behavior and executed tests. Do not mark complete from code presence alone. Do not claim local/deployed Supabase or live AI tests passed without execution.

## Final implementation handoff — 2026-10-09

Implementation for M0–M8 delivered in new directories only; milestone release gates are not marked fully complete because the live local Supabase stack was unavailable and Docker installation was declined.

- M0/M1: Supabase Auth/config/schema/RLS/private Storage, project/member/archive and document/version/upload services; user-scoped frontend and acknowledged save/conflict recovery.
- M2/M3: canonical schema+semantic validation, exact controlled fixtures, persisted simulation jobs, review/feedback/iteration, lock/stale/null/scope guards, immutable finalize/reopen and exports.
- M4/M5: explicit approved-only transactional handoff/replay/lineage reconciliation, tasks/milestones/procurement/delivery/install/corrections/issues/comments.
- M6: ready evidence/verification/history/regression, independent actual cost/carbon and completeness, package/project overview.
- M7: actual targeted fixture DOCX helper, separate source/output versions, compare/unapplied exclusions, approval and historical outdated detection.
- M8: Thai B2B theme landing/contact configuration, basic in-app alerts/target navigation, responsive keyboard/focus states and integrated UI service wiring.

Actual final checks: frontend production build PASS; shared 24/24 tests PASS; PostgreSQL 12/12 behavior suites PASS; Edge TypeScript/module graphs 3/3 PASS (runtime unrun); browser7/7 PASS with controlled test HTTP API. After mobile wrapping CSS adjustment, production build and targeted360px browser check PASS again. 27 original tracked files byte-identical; demo/ removed as requested.

Evidence: qa/verification.log, qa/mobile-verification.log, qa/ACCEPTANCE_REPORT.md, qa/screenshots/. Reproducible commands: TEST_IMPLEMENTATION.ps1. Start/setup: agents/README_IMPLEMENTATION.md and backend/INTEGRATION_CHECKLIST.md.

Remaining validation: real Supabase Auth/email/session, private object transfer, Edge runtime, cron and full browser-to-service journeys. DOCX visual Word rendering unverified (LibreOffice absent), archive/XML/hash invariants tested. No live AI, provider key, cloud deployment, Docker installation, or original source-document changes.

Next action when infrastructure is ready: start authorized local Supabase, configure frontend client key, and execute live integration checklist. Do not claim AC01–AC34 release gate passed before those checks.

## Cloud configuration follow-up — 2026-10-10 Asia/Bangkok

User authorized Supabase cloud configuration and logged in/linked CLI themselves. Verified target GreenSpec/fegwjlytecobdaeqhbdf; no application tables or existing migration history before push. Applied all nine migrations, deployed document/analyze/revision via --use-api (no Docker), and pushed only two declared Auth URL properties using the minimal cloud config. Preserved email confirmation and all undeclared settings.

After an automatic approval review blocked creation/cleanup of synthetic cloud accounts, user explicitly authorized the synthetic account/project test and cleanup. Real Auth/password login, checked RPC/RLS, private DOCX storage/checksum, analyze background jobs, reviews/finalize/handoff, revision, and Chrome frontend login/project list passed. Fixed only smoke-test password length and cleanup parameter name; production handlers/migrations did not require changes. Initial smoke project cleaned via --cleanup-only; final complete run exited 0 and cleaned its account/project. Test projects remain archived with immutable source/audit; synthetic Auth accounts soft-deleted; no emails sent. Server key stayed in process memory, not frontend/files/logs.

Evidence: qa/cloud-verification.log, qa/cloud-login.png. agents/CLOUD_SETUP.md records present cloud status and separates it from historical local integration limitations. Real email delivery/reset, session expiry, every role/browser path, cron firing, and full execution acceptance remain unverified; default email service requires team email or custom SMTP for broader signups.

## MVP Auth preference — 2026-10-10 Asia/Bangkok

User explicitly requested no email confirmation for this MVP. Changed only cloud auth.email.enable_confirmations to false, reviewed single-property diff, pushed via CLI, and verified live Auth settings mailer_autoconfirm=true/signup enabled after config propagation. Updated agents/CLOUD_SETUP.md. Existing document references remain read-only; this explicit user preference supersedes their confirmation requirement for cloud MVP. Password recovery email still depends on SMTP availability.

## Feature 1 UX/UI redesign — 2026-10-10 Asia/Bangkok

Implemented the user-approved old-demo review workflow with the updated Home reference and the current real Supabase backend. Simple English interface; source/user text preserves its language. Only implemented navigation remains. Feature 2 flow is retained with shared colors.

Added immutable A/B option records, checked option/wording edits, approval reset after content changes, explicit unlock, all-recommendations-reviewed finalize gate, selected-option snapshots and approved-wording DOCX/JSON/CSV output. Controlled sample Option B estimates remain clearly labeled; wording does not recalculate them. Original uploaded files and finalized history are preserved.

Applied migration 202610100010_feature1_options.sql and deployed analyze/revision Edge Functions to the linked cloud project. Safe draft backfill found zero eligible active runs; six pre-existing finalized item snapshots were unchanged. Live cloud verification passed Auth/browser login, checked RPC/RLS, private source checksum, A/B persistence, Thai edited wording, reset/gate/lock rules, selected B final estimates and generated DOCX/XML escaping. Only authorized synthetic QA project/account used; project archived and Auth account soft-deleted without email.

Final TEST_IMPLEMENTATION.ps1 exit 0: frontend production build; shared 29/29; SQL 22/22 executions (15 distinct cases, seven imported base cases repeated); three Edge module graphs; browser 11/11 (five new F1 journeys plus six retained journeys); all 27 original non-demo files byte-identical and demo absent. Screenshots reviewed for Home, compare, summary, edited wording and mobile. Evidence: qa/feature1-verification.log, qa/feature1-cloud-verification.log, qa/screenshots, qa/F1_UX_ACCEPTANCE.md, agents/FEATURE1_REDESIGN.md.

Known limits remain simulated fixture analysis/Option B and unverified real email delivery/cron/full production acceptance. No Docker installation, Git commit or GitHub push. Local frontend remains on http://127.0.0.1:5173/.

## Frontend performance fix — 2026-10-10 Asia/Bangkok

User requested a local commit of completed work before performance changes. Created commit 60a77d8 (Implement Supabase MVP and Feature 1 review redesign); private environment files, dependencies and generated Supabase link metadata excluded. No push. Subsequent performance edits remain uncommitted for review.

Replaced full-project review reloads with acknowledged review-row patches and one targeted analysis-run epoch read. Added per-user/project in-memory cache with 30-second freshness, screen-group loading, independent per-item saving/errors, stale row/version/auth-generation guards, and active-run-only polling with completion read retry. Feature 2 loads its own required tables, including source previews. Review completeness, locking, immutable finalized snapshots and conflict/draft recovery remain enforced. No backend/schema/deployment changes required.

Production build PASS; clean browser suite 21/21 (11 existing +10 performance regressions) PASS. Request counts measured in browser: review save/A-B change two requests rather than the previous source path's25; local navigation/source preview/search/filter zero. Live Supabase Option B independently measured two requests, Details/Compare zero additional reads. Real cloud Auth/RLS/private source SHA/B snapshot/Thai DOCX/gates remained PASS; synthetic project archived and account soft-deleted without email. Initial cloud attempt stopped only because the test's Compare button locator matched two buttons; corrected locator, cleanup completed in both attempts, final cloud test PASS.

Evidence: qa/performance-build.log, qa/performance-verification.log, qa/performance-cloud-verification.log, qa/browser/performance.spec.mjs, agents/PERFORMANCE_FIX.md. Original 27 non-demo files remain unchanged. Latency in milliseconds was not benchmarked; cloud acknowledgment and file/analysis processing still take time. Generic project/document/execution writes refresh their relevant screen group. Test-generated baseline screenshots restored to keep the diff focused.

## Typography readability — 2026-10-10 Asia/Bangkok

Compared the historical demo stylesheet from HEAD~1 with current styles and reviewed the supplied old Home reference. The historical demo used Segoe UI / 14px body text; the new layout reduced many tables/buttons/nav labels to10–12px. Restored Segoe UI with Thai fallbacks, raised body14→15px, primary table/nav/button12→14px, metadata10–11→12–13px, input/source text16px, and headings with a clearer hierarchy. Increased line spacing and darkened secondary text while preserving the supplied palette/layout and source language.

Production build PASS. Existing Home/mobile comparison/read-only narrow-navigation checks3/3 PASS; screenshots visually reviewed at desktop and360px. No new mirrored implementation tests added for this stylesheet-only change. Evidence: qa/typography-verification.log and updated Home/mobile screenshots. No commit/push; this change remains alongside the uncommitted performance fix.

## Push boundary and Figma Landing — 2026-10-10 Asia/Bangkok

User explicitly authorized pushing the completed performance and typography work before implementing the supplied Figma landing page. Created commit 062e4dc (Reduce review requests and improve reading sizes) and pushed main successfully. This also published the earlier local MVP commit. Landing changes began after that push and remain uncommitted/unpushed for review.

Implemented the supplied Landing Page node 67:8534 with all website sections, exact local Figma image/icon/mask assets and licensed self-hosted Inter fonts. Excluded the macOS/browser presentation frame. Added responsive layouts and existing Auth links; workflow link scrolls without changing the hash route. Demo contact uses configured mail draft or an honest accessible fallback dialog. Adjusted unsupported marketing claims to current MVP capabilities. Backend unchanged.

Initial production build passed and all27 protected original files remained byte-identical. Visual QA found and corrected a JSX React import issue; desktop visual review passed. Mobile visual review identified masked team-card overflow that a root scroll-width check did not catch; correction and stronger element bounds checks are in progress. Final validation follows below. Details and first-load source-image limitation are documented in agents/LANDING_IMPLEMENTATION.md.

Final Landing validation: production build PASS; clean browser suite 24/24 PASS (21 retained journeys and three new Landing checks). New checks cover desktop1728/mobile360 layout, original local asset loading/native SVG dimensions, text bounds, route-preserving scroll, keyboard Auth entry, configured mail draft and unconfigured contact dialog without sending data. Desktop and mobile screenshots visually reviewed. All27 original protected files remain unchanged; backend unchanged.

The first full run exposed a premature assertion in the existing Option B request-count test. The selected-state assertion and networkidle could complete before the follow-up read began. Waiting for the observable analysis_runs request resolved the focused test and the clean full rerun; the exact one-write/one-read/two-total assertions remain. No product logic changed for this test correction. Baseline screenshots overwritten by browser tests were restored; dedicated Landing captures remain. Evidence: qa/landing-verification.log and qa/screenshots/landing-figma-1728.png, landing-figma-360.png.

Landing changes remain uncommitted and unpushed. HEAD and origin/main remain062e4dc. Local review: http://127.0.0.1:5173/#landing. Contact email remains unset in the local environment, so Request a demo uses the fallback dialog. Forest source first-load weight remains documented in agents/LANDING_IMPLEMENTATION.md.

## Landing publication authorization — 2026-10-10

User reviewed the local Landing and explicitly requested pushing it. Committing the completed Landing implementation, local design assets/fonts, validation evidence and scoped test timing correction to main for the authorized push. Prior production build and24/24 browser checks passed; protected original files verified unchanged again.

## Vercel deployment troubleshooting — 2026-10-10

Inspected the user's existing green-spec-demo Vercel project in Brave. Both latest Git deployments failed because their saved Root Directory was demo, which was removed. Current project settings already showed frontend, Vite, and inclusion of files outside root enabled. Redeployed commit1ad0156 using current settings without build cache. Deployment CqMjrakCrDK4huKu7NH2L1jg9Hx8 reached Ready in12s; public green-spec-demo.vercel.app verified displaying the new Landing. No source code changed. Production environment variables were absent and the public app reports sign-in unavailable; Supabase production build configuration remains a separate unresolved setup step. No CLI installed, no credentials changed, no database writes, no new Git push.

## Root documentation cleanup — 2026-10-10

User requested moving only their newly created root Markdown documents into agents/. Verified file-add history: seven implementation documents were added in our commits60a77d8,062e4dc and1ad0156. Moved all seven, including AGENTS.md; preserved the existing shared README.md and all original contributor files. Retained the uncommitted Vercel troubleshooting entry. Updated document references to agents/ and clarified that commands and other paths remain relative to the repository root. Moving AGENTS.md means it is no longer automatically discovered as root-level repository instructions; its contents remain available in agents/AGENTS.md. No application code changed, no commit or push performed.

## Approved documentation cleanup — 2026-10-10

User corrected the scope: keep AGENTS.md at the repository root and push the cleanup. Restored AGENTS.md to root, retaining its updated agents/IMPLEMENTATION_WORK_LOG.md reference and automatic repository-wide discovery. The other six implementation Markdown documents remain in agents/. Existing shared README.md and all 27 protected original files remain unchanged. Verified document paths and original-file preservation. No application code changed; no runtime tests needed for this documentation-only change. Committing and pushing the approved cleanup to main.


## 2026-10-10 — Thai default and MVP guest entry

- Added persistent Thai/English controls on Landing and app headers. Thai is the default; large headings and sidebar menu labels remain English. Static labels/help/status/forms switch language while source text, project values and edited wording remain unchanged. HTML lang metadata follows the selected interface language; uploaded document content stays unchanged.
- Landing entry/demo/pilot actions now open Home using an existing Supabase session or a new anonymous user. Existing permanent sessions are retained. Browser storage is checked before creation; single-flight entry and Web Locks avoid duplicates within/across supported browser tabs. Entry errors stay visible and allow retry. Returning to Landing retains the account.
- Guest labels replace absent email in account/member/assignee displays. Email member invitations remain for registered accounts; the interface explains this guest limitation.
- Enabled only auth.enable_anonymous_sign_ins on the existing cloud project after reviewing the diff. Kept existing RLS, checked operations and unrelated remote configuration. Local config declares the same flag.
- Used Luna for straightforward localization and browser QA per the user's preference; retained parent review for auth/session behavior. Updated AGENTS.md with language, guest-entry and delegation preferences.
- Verification: production build PASS clean. Full browser run 28/29 passed; adapted the obsolete session-revocation test to the new no-login UI, then targeted rerun 3/3 passed including that case, concurrent browser-tab identity and mobile pending layout. All 31 distinct browser cases verified across those runs. Existing A/B, wording, renewed review, finalize, request counts, concurrency, polling, recovery, viewer access and Feature2 regressions passed. See qa/guest-verification.log.
- Real Supabase smoke test PASS: anonymous Auth, session restoration to same account, project ownership, unauthenticated access denial and forbidden direct write. Archived only the synthetic project and soft-deleted only its test account. See qa/guest-cloud-verification.log.
- Original-file verifier PASS: all 27 protected files unchanged. Restored previous tracked screenshots and kept new guest captures. No commit/push/deployment.
- Limit: identity belongs to a browser profile and website origin while its session remains valid; clearing storage, switching browser/device or private-session renewal creates a new account. No cross-device recovery code is included. Setup and limitations: agents/GUEST_ACCESS_AND_LANGUAGE.md.


## 2026-10-10 — Inter throughout the interface

- Promoted the four existing locally hosted Inter weights (400/500/600/700) from Landing CSS to global CSS. Both root font rules use Inter first; Landing inherits the same stack. Form controls already inherit; pre/code views now inherit too. Existing sizes/weights remain unchanged.
- Retained Noto Sans Thai as the fallback for Thai text. Inspected the local Inter font cmap: Latin A is present and Thai U+0E01 is absent. No new font dependency/download.
- Production build PASS; three existing desktop/mobile Landing and mobile Home/compare browser checks PASS. Original-file verifier PASS for all 27 protected files. Restored generated baseline screenshots. No commit or push.

## TypeScript AI Engine & Hono Serverless API — 2026-10-10 Asia/Bangkok

Implemented the user-approved AIlaw architecture pattern (Hono + TypeScript Deterministic Tools + esbuild + Vercel):
- Created `shared/tools.mjs` with exact mathematical parity to ACI 211.1, TGO carbon factors, ACI 207 thermal limits, and DPT 1101-64 strength conversion. Tested with Node.js built-in test runner: 5/5 tests PASS.
- Created `shared/guardrails.mjs` (Mass Concrete, PT Slabs, Columns) and `shared/catalog.mjs` (Thai certified low-carbon ready-mix).
- Created `shared/typhoon.mjs` supporting both standard JSON and Server-Sent Events (SSE) Streaming. Tested with Node.js: 2/2 tests PASS.
- Created `api/server.mjs` using Hono framework with endpoints: `/health`, `/api/catalog`, `/api/tools/mix-design`, `/api/tools/carbon-calc`, `/api/tools/thermal-check`, `/api/tools/strength-convert`, `/api/tools/cost-estimate`, `/api/analyze`, and `/api/chat` (streaming). Tested with Node.js: 6/6 tests PASS.
- Configured root `package.json` with esbuild server bundling (`api/index.js`, 35.3kb in 13ms) and `vercel.json` rewrites.
- Frontend left 100% clean and untouched for the frontend developer as explicitly instructed.


## Feature 1 reference UI on main — 2026-10-11

Implemented the five supplied screen references in frontend only. Project documents now have a two-column drop area/configuration layout, multi-file browse/drop using existing document mutation/upload endpoints, supported-file validation, duplicate confirmation, sequential uploads, and existing cancellation/retry/version/source controls. Document types and metadata remain editable. Display-order preference is local and never represented as an AI optimization input. Own documents remain stored-only under the current main backend; analysis is honestly labelled as supported samples.

Hotspots show known work-scope baseline shares with a paired breakdown table and material-filter navigation. Recommendations use wide cards with original/proposed wording, A/B-specific cost/carbon side panels, material/known-estimate/cost/status/search/sort filters and reset. Selected Spec and Summary share display totals, account for the selected A/B option, count each scope once, preserve missing estimates, and refuse proposed totals for overlapping selected scopes. Remove resets review to UNREVIEWED using the existing server operation. Summary includes original/proposed totals, review progress, decision log, print/PDF, and existing finalize/export workflow.

Preserved Thai default, English headings/navigation, document language and Inter. No backend/schema, cloud data, live provider, Git push, or deployment changes. The guy branch integration remains separate. Files: frontend/src/{F1Screens,AnalysisPanels,main,i18n}.jsx, analysis-ui.css, analysis-display.mjs, and focused QA updates.

Verification: production frontend build passed; display-estimate tests 3/3; browser tests 19/19 with local intercepted Supabase API only (five screens at 1440/390 widths, upload and invalid files, hotspot/filter cache, selected removal, A/B wording/review/finalization, save conflicts, cache/session isolation and polling). Original tests were updated only for renamed headings and the collapsed project-details control. Screenshots are qa/screenshots/redesign-*.png. Main dev server is http://127.0.0.1:5173; first mock demo stays at http://127.0.0.1:5174. Backend configuration/integration follows in the next task; real cloud end-to-end behavior was not retested here.

## 2026-10-11 — Live-only MVP cleanup and readiness audit

Removed runtime scenarios/sample files/fixture ingestion, simulated result generation, synthetic options, unverified supplier catalog, AI fallbacks (JS/Python), and guessed shipped-API financial impacts. Historical cloud data is preserved and hidden from live views; QA-only test fixtures remain excluded from deployment. Integrated the JavaScript document pipeline into main while preserving the five-page redesign, caching, A/B, edited source-language wording and review-all finalization. Added live-only migration 0012 and fixed reopen preservation of selected B/edited wording.

Verification: production client/server build and three Edge import compilations passed; 12 API/workflow, 9 shared, 5 backend/PGlite and 3 display tests passed. 21 distinct browser cases passed across runs (one old sample-heading expectation updated and rerun). No live paid provider/cloud E2E claimed. Normal git diff --check passed with Windows line-ending notices only.

Read-only cloud audit: Vercel green-spec-demo root remains frontend and Production has only two VITE_SUPABASE_* variables; TYPHOON_API_KEY is absent. Supabase remote migrations stop at 0010 and SERVER_AI_URL is absent. Prepared 0011/0012 and updated functions have not been deployed. See agents/MVP_READINESS.md for rollout order, real document rehearsal and pitch scope limitations. Local UI restarted on 5173. No commit, push, deployment or cloud data deletion in this task.

## 2026-10-11 — Authorized Supabase live deployment

User requested steps 3/4 after configuring Vercel: CLI 2.120.0 was already installed under backend; no installation or Docker required. Applied migrations 202610100011_live_javascript.sql and 202610110012_live_only.sql with linked db push. Set SERVER_AI_URL=https://green-spec-demo.vercel.app. Deployed analyze/document/revision using --use-api. Verification: remote migration list matches all local migrations; analyze ACTIVE version 4, document ACTIVE version 3, revision ACTIVE version 4; SERVER_AI_URL exists; all three OPTIONS preflights returned 204. Existing cloud records were preserved. No real paid AI E2E performed.

Remaining integration blocker: Vercel root is now . and output frontend/dist, but /api/health still returns 404. Production remains deployment dpl_9M5edBWH1fjHZVSgDsMByiEwrwXB from 14:24. Read-only fetch confirms origin/main=d853062 (merge guy), which does not include local main bcf4e9e (live-only/redesign). Do not overwrite either branch or force push. Integrate remote changes while preserving the new local UI/live-only work, push latest main when authorized, then deploy and rehearse real documents. No GitHub push or Vercel deployment in this Supabase task.

## Historical guy integration notes retained during main merge

These notes describe the older branch state; the newer main live-only rollout above supersedes their sample-mode and branch-only instructions.

## JavaScript integration on guy — 2026-10-10

- Synced main from origin (already current at 53c5407); created local branch guy. No commit, push, deployment or cloud database mutation during this integration.
- Moved competing Python API entries to legacy/python; JavaScript sources now live in server/, with api/index.js as the only Vercel function entry. Kept the Python engine and its files. Root config builds frontend/dist and the bundled Hono API; explicit rewritten routes are restored by both adapters. Added scoped deployment exclusions.
- Added private-document extraction (DOCX paragraphs, text-PDF pages, XLSX cells) and source-grounded concrete analysis adapter. Live scope requires explicit MPa and m3/m³ quantities, up to three requirements. Arbitrary text/units, fabricated quotations and mock provider output are rejected. A/B estimates and source-language editable wording are mapped to the canonical review contract. These estimates are not supplier quotes, EPDs or engineer approval.
- Added additive live SQL migration, service-only one-time extraction attachment before any analysis references a READY source, source validation, persisted A/B/manual wording, complete review before finalize, live immutable snapshots/reopen/revision mode. Revised DOCX exports only target exact approved specification paragraphs; quantity source cells are not rewritten.
- Frontend live selector is gated by VITE_AI_ENABLED (false by default), with honest live/sample labels and Thai interface copy. Existing sample workflow remains available.
- Verification actually executed: 36/36 shared tests; 14/14 Node API/workflow tests; 30/30 combined local PGlite backend tests (includes shared setup cases); full root frontend+server production build; three Edge module-graph/syntax bundles; Git diff whitespace check. Started local JavaScript server at 127.0.0.1:3001 and verified health/catalog HTTP responses. Live-source/provider tests use explicit stubs, not Typhoon. No actual AI/cloud/deployment success is claimed.
- BLOCKED: automatic approval review rejected editing the analyze Edge orchestrator to send a user bearer token/document-derived data to SERVER_AI_URL. Existing simulated analyze function was restored; live orchestrator is NOT integrated yet. Asked the user explicitly for permission to send to the GreenSpec Vercel server and necessary source text onward to Typhoon; awaiting reply. Do not deploy or enable live mode until this is resolved and orchestrator integration is tested.
- User confirmed TYPHOON_API_KEY is not configured. Real-provider and cloud end-to-end verification remain pending, plus preview root-project setup and scoped Edge/migration deployment. Setup instructions are in agents/GUY_DEPLOYMENT.md. Existing production project remains unchanged.

## Branch guy transfer approval and Edge integration — 2026-10-11

- User explicitly approved the session-token/source transfer for branch guy. The prior transfer approval block is resolved. No change to main, no commit/push, no Vercel deployment, and no cloud database mutation in this continuation.
- Implemented analyze/orchestrator.mjs plus analyze/index.ts integration. Live preparation checks project edit access, selected READY sources, provider configuration, exact extraction version/checksum, and service-only persistence before gs_begin_live_analysis. The Node destination comes exclusively from SERVER_AI_URL; HTTPS Vercel project URLs or HTTP localhost only, and redirects are rejected. Never forward a service-role credential.
- Analysis workers claim QUEUED atomically, send heartbeat while running, validate same run/mode/fingerprint plus canonical source-grounded A/B, enforce common baselines and mandatory Option A, preserve locked approved parent proposals/options, and finish through the atomic SQL RPC. Provider errors persist an honest FAILED result. The sample workflow keeps its deterministic source validation.
- Provider calls share a 125-second deadline (individual analysis call capped at 110 seconds) to leave room for failure persistence on Supabase Free. Real provider latency is not verified.
- Auto-review rejected adding an orchestrator test inside protected root tests/. Used a safer workspace-only verification file without changing that directory. Actual executed verification: 9/9 orchestrator tests (explicit provider stubs, no network/credentials) covering access, destination/redirect restrictions, missing key, extraction identity, locked A/B, source/option contracts, live/sample worker success, duplicate claim skip, failed result persistence and timer cleanup; all three Edge module-graph/TypeScript syntax bundles pass; Git diff whitespace check passes. Prior 36 shared, 14 Node/API and 30 local PGlite checks remain documented above.
- Live functionality is now integrated at code level. Real cloud end-to-end verification remains pending: user has no TYPHOON_API_KEY, no new guy preview SERVER_AI_URL has been configured, and the migration/updated Edge Functions have not been applied/deployed. Keep VITE_AI_ENABLED=false until setup is complete. See agents/GUY_DEPLOYMENT.md and backend/.env.example.

## Branch publication requested — 2026-10-11

User requested pushing branch guy. Publish the reviewed JavaScript/Supabase integration changes to origin/guy only. Main and the existing production Vercel project remain unchanged. No credentials are included; environment examples contain empty keys/placeholders. Real AI verification, preview environment setup, and cloud migration/Edge deployment remain pending.

## Authorized main integration and push — 2026-10-11

Integrated origin/main d853062 with the current redesigned live-only main. Retained the already integrated JavaScript engine and newer source, option, pricing and no-fallback safeguards; preserved remote deployment documentation and both work logs. The user explicitly requested pushing main. Supabase live migrations/functions are already deployed. Verification and push status recorded after checks.
Pre-push verification: root client/server build passed; all three Edge function import compilations passed; 20 focused live-only API/workflow/database/provider tests passed. Merge resolution changed only instructions/history documentation relative to the reviewed local implementation.

## Vercel route validation fix — 2026-10-11

GitHub's Vercel status on f4582e0 reports failure with invalid-route-source-pattern before a new deployment exists. Production still serves the old 14:24 deployment. Replaced the RegExp-style SPA source with a grouped path-to-regexp pattern, preserving API exclusion. This syntax requirement is documented in https://vercel.com/docs/errors/error-list#invalid-route-source-pattern . Local build success did not validate Vercel route syntax. Deployment verification follows this fix.

The route fix 12aaf21 deployed successfully as dpl_6TgugUKpHVdaiXZUR7P5QzgDk7MR; production serves the expected new UI asset index-BSMB7HhI.js and no sample button. Runtime checks then found PDF.js eager import crashing every API route because Vercel tracing omitted @napi-rs/canvas (DOMMatrix undefined). Added an explicit pinned native canvas dependency and function includeFiles for native/worker assets; PDF imports are now lazy and use the package's worker/CanvasFactory helper with embedded worker data. No fake polyfill or fabricated parser result is used.

Production verification after c127a93: deployment dpl_FbNpUHeDeHBrrrWin7XQ2eTzut3s is Ready and aliased to green-spec-demo.vercel.app. Function artifact includes native/worker dependencies (28.27MB). Public homepage and current frontend asset return 200; new upload UI exists and sample button is absent. /api/health returns 200 with GreenSpec Hono Engine ok; /api/catalog returns 200 with empty verified catalog; unauthenticated /api/workflow/status returns the intended 401. No paid provider call, cloud source upload or AI end-to-end claim in this verification. The intermediate 0d2d7ab deploy was rejected because includeFiles requires a string, fixed to a brace glob in c127a93. Local PDF regression extracts actual page text and rejects a blank PDF; all 13 API/workflow cases passed across the targeted runs.

## 2026-10-11 — Prepared pitch demo and unified navigation
- User explicitly replaced live-only UI requirements with prepared demo results. Real Supabase guest identity, projects and uploaded files remain; document analysis now opens local example results without calling extraction, Typhoon or Edge analyze.
- Four prepared material recommendations, distinct A/B impacts and Thai wording. Demo sources are labelled examples and never attributed to uploaded files. Home and the project list show local demo rounds.
- User/project-scoped browser storage retains round history, selected options, comments, edits and finalized snapshots. Every item must be reviewed and at least one approved before finalize. Editing requires unlock and renewed review. Final rounds are immutable in UI. JSON and text exports are explicitly marked DEMO. This is browser-local demo state, not cloud/shared revisions or backend authorization.
- Project breadcrumb/name appears once in the app header. One workflow navigation shared by Documents and all analysis stages replaces the two stacked tab bars; Project work and Members remain in the sidebar.
- Validation: frontend production build passed; 2 demo state/metric/finalization tests passed; browser workflow passed covering real-ready document metadata, no AI requests, Option B, custom wording, all-item review, finalization, refresh persistence, new round, unified navigation and mobile containment. QA uses isolated test fixtures, not live paid AI or user mutations.
- No agy or built-in agents were used. No push/deployment performed for this task.

- Follow-up: user requested Demo text only in the topbar and authorized push. Removed sidebar/banners and mode wording from UI actions, round labels and headings. Topbar badge retains explanatory hover text; example-source notices and machine-readable demo provenance remain accurate.

## 2026-10-11 — Clean workflow navigation and TIS references
- Hid the horizontal workflow scrollbar while keeping swipe, horizontal scrolling and keyboard navigation available.
- Removed the Thai demonstration prefix from recommendation rationales, including previously stored rounds via a read-only presentation adapter. Persisted decisions and finalized snapshots are not rewritten.
- Added related product-quality standards with official TISI links in recommendations, details and A/B comparison: concrete 213-2560 and fly ash 2135-2545; deformed steel bars 24-2559; AAC option A 1505-2541; non-loadbearing hollow blocks option B 58-2560, with applicability notes. Unspecified insulation explicitly needs a material type before selecting a standard.
- These references do not claim certification or that prepared carbon/cost figures or fly-ash percentages come from TIS. No fabricated clause citations or uploaded-document attribution.
- Validation: production client build, 2 existing demo state tests and browser pitch workflow passed; browser checks cover links and hidden scrollbar. Follow-up browser regression also checks existing saved text is cleaned for display without mutating storage.
- No agents used. Changes are local; no commit, push or deployment requested in this follow-up.

## 2026-10-11 — Civil Engineering Tool Calling & Two-Step Requirement Verification
- Executed /grill-me alignment across 6 architectural branches: Hybrid workflow (Document Review + Floating Copilot), Two-Step Review Gate with missing-field validation, interactive clarification dialogue for incomplete prompts, rich engineering calculation cards with TIS/ACI references, direct Option A/B generation with carbon deltas, and seamless hybrid fallback for pitches.
- Backend (shared/typhoon.mjs, server/server.mjs): Added CIVIL_ENGINEERING_TOOLS schema and multi-turn chatWithTools. Implemented POST /api/extract-requirements extracting fc_prime_mpa, volume_m3, element_type with READY/NEEDS_INPUT status. Integrated tool execution into POST /api/chat with both JSON and SSE streaming (tool_executions event).
- Frontend (frontend/src/): Created ChatCopilot.jsx (dockable assistant with live streaming and visual calculation cards), ReviewFillInModal.jsx (modal with required field gates, presets, and 1-click ksc to MPa conversion), and chat-copilot.css (GreenSpec forest/emerald theme). Integrated into main.jsx to populate Option A & B specs directly upon verification.
- Validation: Client Vite build + Server esbuild passed; shared test suite (9/9) passed; API test suite (15/15) passed; backend test suite (5/5) passed; Playwright pitch-demo test (1/1) passed with graceful fallback.

## 2026-10-11 — Systematic Debugging & Resilience Audit
- Carried out 4-phase systematic debugging across frontend state, streaming parser, server tool execution, and document analysis wiring:
  1. Frontend React State: Fixed stale initial state in ReviewFillInModal.jsx by introducing a useEffect hook to sync extractedItems from async API responses; fixed button disabled logic when items is empty.
  2. SSE Multibyte / Fragmentation: Implemented persistent streamBuffer and TextDecoder { stream: true } in ChatCopilot.jsx to prevent packet fragmentation from dropping Thai UTF-8 text and tool execution payloads.
  3. LLM Request Deduplication: In server/server.mjs POST /api/chat, eliminated duplicate LLM calls when chatWithTools returned a non-empty natural language reply without tool calls.
  4. Document Property Resolution: Fixed undefined version name access in main.jsx handleStartAnalysis by properly querying document titles/filenames, and synchronized sources[0].exact_text in handleConfirmRequirements to ensure verified requirements display in comparison tables.
  5. Input Sanitization & Error Trapping: Added strict Number.isFinite validation in executeCivilTool, wrapped tool execution in shared/typhoon.mjs chatWithTools with try/catch to return structured errors to the model rather than crashing. Added 2 automated unit test cases in tests/api_server.test.mjs.
- Validation: 17/17 API tests passed, 9/9 shared tests passed, 5/5 backend tests passed, Vite + esbuild production build passed, Playwright pitch-demo browser test (1/1) passed.

## 2026-10-11 — Civil AI Copilot 401 Authorization Fix
- Fixed 401 UNAUTHORIZED failure on POST /api/chat: Removed overly restrictive Supabase user session blocker from /api/chat in server/server.mjs so that the Civil AI Copilot widget is directly usable by guests, bypass users, and local reviewers.
- Verified live end-to-end execution: OpenTyphoon LLM correctly called calculateEmbodiedCarbon (320 kg OPC, 100 kg Fly Ash, 1500 m3) and convertConcreteStrength (280 ksc), returning deterministic tool execution payloads alongside streaming Thai civil engineering explanations.

## 2026-10-11 — Demo Project Data Seeder & Interactive Testing Environment
- Built demo data seeder (frontend/src/demo-seeder.mjs) enabling immediate testing and exploration across projects, documents, and analysis stages:
  1. Bangkok Green Tower (อาคารนวัตกรรมสีเขียว): 32-story LEED Gold office building seeded with READY documents (BOQ_งานโครงสร้างและคอนกรีตฐานราก.xlsx, ข้อกำหนดทางเทคนิค_คอนกรีตคาร์บอนต่ำ_ACI211.docx), work packages, and an active analysis round with approved Option B concrete and Option A steel, populating Home dashboard with 465 tCO2e reduction and 800,000 THB savings.
  2. Eco-Transit Line (ระบบคมนาคมสีเขียว): Heavy civil mass-concrete infrastructure seeded with unanalyzed ready specification (สเปกคอนกรีตฐานรากหนา_1.8m_Mass_Concrete.docx), allowing direct interactive testing of the Two-Step Review Gate & Modal (ReviewFillInModal) and tool calling.
- Integrated seeder into main.jsx:
  - Added seamless fallback user handling (`user = 'guest'`) ensuring projects and documents load immediately even before async auth hydration completes.
  - Added "Reset demo projects" button in Projects header and prominent "Load sample projects" button in the empty state.
  - Added localized Thai translations in frontend/src/i18n.jsx.
## 2026-10-11 — Live OpenTyphoon Model Integration for Document & Specification Analysis
- Removed restrictive database session blocker on /api/analyze in server/server.mjs, allowing guests, reviewers, and pitch demos to execute live analysis with Typhoon LLM.
- Wired frontend handleConfirmRequirements in frontend/src/main.jsx to make asynchronous POST /api/analyze requests with verified engineering parameters (f'c, volume, SCM type, element type).
- Enhanced analysis round model: returns live generation metadata (generation_mode: 'live', model: 'typhoon-v2.5-30b-a3b-instruct') and genuine Thai (CSI 3-Part) and English (CSI MasterFormat 03 30 00) specification clauses.
- Added live model presentation in frontend/src/DemoReview.jsx:
  - Prominent badge: ⚡ Live OpenTyphoon Model (SCB 10X: typhoon-v2.5-30b-a3b-instruct).
  - Expandable specification drawer: 📄 ข้อกำหนด TOR ที่ร่างโดย OpenTyphoon AI (คลิกเพื่อเปิดดูฉบับเต็ม) displaying complete Thai and English clauses for committee review.
- Dynamic fallback: preserves deterministic engine calculations in case of network timeouts or offline mode.
- Validation: Client Vite build + Server esbuild passed cleanly; shared test suite (9/9) passed; API test suite (18/18) passed; backend test suite (5/5) passed. Live curl verification confirmed genuine specification clauses and carbon calculations returned directly from OpenTyphoon.

