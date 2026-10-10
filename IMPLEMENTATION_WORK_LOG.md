# GREEN SPEC implementation work log

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

Evidence: qa/verification.log, qa/mobile-verification.log, qa/ACCEPTANCE_REPORT.md, qa/screenshots/. Reproducible commands: TEST_IMPLEMENTATION.ps1. Start/setup: README_IMPLEMENTATION.md and backend/INTEGRATION_CHECKLIST.md.

Remaining validation: real Supabase Auth/email/session, private object transfer, Edge runtime, cron and full browser-to-service journeys. DOCX visual Word rendering unverified (LibreOffice absent), archive/XML/hash invariants tested. No live AI, provider key, cloud deployment, Docker installation, or original source-document changes.

Next action when infrastructure is ready: start authorized local Supabase, configure frontend client key, and execute live integration checklist. Do not claim AC01–AC34 release gate passed before those checks.

## Cloud configuration follow-up — 2026-10-10 Asia/Bangkok

User authorized Supabase cloud configuration and logged in/linked CLI themselves. Verified target GreenSpec/fegwjlytecobdaeqhbdf; no application tables or existing migration history before push. Applied all nine migrations, deployed document/analyze/revision via --use-api (no Docker), and pushed only two declared Auth URL properties using the minimal cloud config. Preserved email confirmation and all undeclared settings.

After an automatic approval review blocked creation/cleanup of synthetic cloud accounts, user explicitly authorized the synthetic account/project test and cleanup. Real Auth/password login, checked RPC/RLS, private DOCX storage/checksum, analyze background jobs, reviews/finalize/handoff, revision, and Chrome frontend login/project list passed. Fixed only smoke-test password length and cleanup parameter name; production handlers/migrations did not require changes. Initial smoke project cleaned via --cleanup-only; final complete run exited 0 and cleaned its account/project. Test projects remain archived with immutable source/audit; synthetic Auth accounts soft-deleted; no emails sent. Server key stayed in process memory, not frontend/files/logs.

Evidence: qa/cloud-verification.log, qa/cloud-login.png. CLOUD_SETUP.md records present cloud status and separates it from historical local integration limitations. Real email delivery/reset, session expiry, every role/browser path, cron firing, and full execution acceptance remain unverified; default email service requires team email or custom SMTP for broader signups.

## MVP Auth preference — 2026-10-10 Asia/Bangkok

User explicitly requested no email confirmation for this MVP. Changed only cloud auth.email.enable_confirmations to false, reviewed single-property diff, pushed via CLI, and verified live Auth settings mailer_autoconfirm=true/signup enabled after config propagation. Updated CLOUD_SETUP.md. Existing document references remain read-only; this explicit user preference supersedes their confirmation requirement for cloud MVP. Password recovery email still depends on SMTP availability.

## Feature 1 UX/UI redesign — 2026-10-10 Asia/Bangkok

Implemented the user-approved old-demo review workflow with the updated Home reference and the current real Supabase backend. Simple English interface; source/user text preserves its language. Only implemented navigation remains. Feature 2 flow is retained with shared colors.

Added immutable A/B option records, checked option/wording edits, approval reset after content changes, explicit unlock, all-recommendations-reviewed finalize gate, selected-option snapshots and approved-wording DOCX/JSON/CSV output. Controlled sample Option B estimates remain clearly labeled; wording does not recalculate them. Original uploaded files and finalized history are preserved.

Applied migration 202610100010_feature1_options.sql and deployed analyze/revision Edge Functions to the linked cloud project. Safe draft backfill found zero eligible active runs; six pre-existing finalized item snapshots were unchanged. Live cloud verification passed Auth/browser login, checked RPC/RLS, private source checksum, A/B persistence, Thai edited wording, reset/gate/lock rules, selected B final estimates and generated DOCX/XML escaping. Only authorized synthetic QA project/account used; project archived and Auth account soft-deleted without email.

Final TEST_IMPLEMENTATION.ps1 exit 0: frontend production build; shared 29/29; SQL 22/22 executions (15 distinct cases, seven imported base cases repeated); three Edge module graphs; browser 11/11 (five new F1 journeys plus six retained journeys); all 27 original non-demo files byte-identical and demo absent. Screenshots reviewed for Home, compare, summary, edited wording and mobile. Evidence: qa/feature1-verification.log, qa/feature1-cloud-verification.log, qa/screenshots, qa/F1_UX_ACCEPTANCE.md, FEATURE1_REDESIGN.md.

Known limits remain simulated fixture analysis/Option B and unverified real email delivery/cron/full production acceptance. No Docker installation, Git commit or GitHub push. Local frontend remains on http://127.0.0.1:5173/.
