# Live-only MVP readiness — 2026-10-11

The main working tree now uses uploaded documents and the JavaScript/Typhoon pipeline only. These changes are local and have not been committed, pushed, or deployed. The local UI is running at http://127.0.0.1:5173/.

## Removed from the application

- Sample document buttons, scenario selection, downloadable sample DOCX assets, fixture ingestion operation, and simulated analysis generation.
- Synthetic alternative option generation and missing-key/provider-error AI fallbacks in JavaScript and Python.
- Unverified supplier/product/certification catalog entries. The catalog is empty until verified products are supplied.
- Guessed savings from the document workflow and the shipped engineering API. Financial impacts stay null; the cost endpoint reports PRICING_NOT_CONFIGURED.
- Historical simulated runs, fixture sources, simulated snapshots/packages and simulated actuals are excluded from the live UI. No existing cloud records were deleted.

Test-only synthetic examples are isolated under qa/simulation and excluded from deployment. Historical migrations remain as history; additive migration 202610110012 disables their old creation paths. The separate historical demo preview requested earlier was not changed.

## Confirmed blockers for a live pitch

1. **Vercel currently deploys only frontend.** CLI inspection of guydev/green-spec-demo confirms Root Directory = frontend, Framework = Vite, Output Directory = dist. The JavaScript server in server/ and api/ is outside this root. Change the project root to the repository root, use the root vercel.json (install both packages, run npm run build, output frontend/dist), and deploy this working-tree change after review. The existing production deployment is Ready, but that does not verify the new live pipeline.
2. **No Typhoon provider key on Vercel.** Environment-name inspection shows only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Production. Configure server-only TYPHOON_API_KEY; never use a VITE_ prefix. The server can use the existing public Supabase variables or explicit SUPABASE_URL / SUPABASE_ANON_KEY; all requests also require the user's JWT and project rights.
3. **Cloud database/functions still need the live changes.** Supabase migration inspection confirms remote migrations stop at 202610100010; 202610100011_live_javascript.sql and 202610110012_live_only.sql are pending. Secret-name inspection confirms SERVER_AI_URL is absent. Apply the two migrations, set SERVER_AI_URL to the deployed GreenSpec JavaScript server URL, sync the shared domain, and deploy analyze/document/revision functions. These are prepared and locally checked, not applied to cloud in this task.
4. **A full real-provider rehearsal remains.** After configuration, use a genuine project document and a dedicated test project to verify returning guest session, storage upload/checksum, extraction, paid AI response, exact source evidence, Option A/B, edited wording, review-all requirement, finalize, reopen, DOCX revision approval/download and reload persistence. No paid live AI call or cloud end-to-end success is claimed here.

## Scope and evidence limits to state in the pitch

- Analysis currently supports concrete requirements with explicitly stated MPa strength and m³ quantity, at most three extracted requirements per run. Steel and other materials are not yet supported by this document pipeline. General TOR upload must not be described as complete multi-material analysis.
- DOCX, readable-text PDF and XLSX extraction are implemented. Scanned PDFs need OCR; IFC/DWG are unsupported. Limits: 25 MiB/file, 5,000 extracted segments, 150,000 characters, and 20 selected files.
- Hotspots and totals cover identified scopes, not whole-building carbon. Carbon uses engineering model factors, not supplier-verified EPDs. Default test age/slump/exposure and mix suitability need engineer review.
- Cost savings require actual document/BOQ baseline prices and supplier option prices. Supplier availability/certification requires verified catalog evidence. Neither capability is currently ready to demonstrate as a real-data claim.
- Source-preserving rewritten document download supports DOCX with exact paragraph matches. PDF/XLSX produce comparison/unapplied reports rather than rewritten original files.

For the fastest credible pitch, limit the promise to concrete specification review and use a real supported DOCX containing explicit strength and quantity. Financial savings, supplier matching, OCR, and full-building carbon require further work if included in the pitch promise.

## Verification completed

- Root production build: React/Vite client and bundled JavaScript API passed.
- Three Edge Functions: TypeScript/local import graph compiled; Deno/cloud runtime was not executed.
- API/workflow: 12 tests passed, including DOCX/XLSX extraction, grounded source checks, distinct engineering A/B, approved DOCX wording, provider failures, unverified-pricing rejection, and Vercel routing adapter.
- Shared domain: 9 tests passed, including live-only schema parity and rejection of simulated envelopes/provider fallback.
- Backend: 5 tests passed. All migrations executed in isolated PGlite; authorization, extraction immutability, source rollback, selected Option B, edited wording, finalize/reopen and live-only creation guards passed.
- Frontend calculations: 3 tests passed; unknown amounts remain unknown and repeated scopes are not double-counted.
- Browser: 21 distinct tests passed across runs. The first run passed 18/19; its sole failure expected the removed sample heading. After updating the expectation, that case and two new live-only cases passed. Covers responsive five-page UI, review concurrency, caching, uploads, no sample prerequisite, historical mock exclusion, and configuration errors. Browser/service contract tests use isolated QA stubs and do not prove a live cloud AI call.
- Normal git diff --check passed (Windows line-ending notices only).

No push, deployment, database update, or cloud record deletion was performed. Read-only Vercel/Supabase inspections supplied the deployment findings above.

## Supabase rollout update — 2026-10-11

The cloud blockers described above are now partly resolved: migrations 0011/0012 were applied, SERVER_AI_URL was set to https://green-spec-demo.vercel.app, and analyze/document/revision were deployed through the existing CLI without Docker. All are ACTIVE (versions 4/3/4); preflight returned 204 for each. No user records were deleted.

Vercel settings now use repository root . and output frontend/dist. However, the live /api/health endpoint still returns 404 and production is still the old 14:24 deployment. GitHub main d853062 merged guy but does not contain local main bcf4e9e (the current UI/live-only implementation). Integrate/push the latest main and deploy before real AI end-to-end verification. The user reports TYPHOON_API_KEY was added; no paid provider call was made in this rollout.

## Vercel rollout update — 2026-10-11, 15:44

Production is now Ready on c127a93 (deployment dpl_FbNpUHeDeHBrrrWin7XQ2eTzut3s). Invalid rewrite syntax was corrected, then the missing PDF native/worker packaging was fixed. The domain serves the current UI bundle and live-only upload screen; /api/health and /api/catalog return 200, while unauthenticated workflow access correctly returns 401. The deployment/root/API-startup blockers above are resolved. Actual paid Typhoon analysis and a full genuine-document rehearsal remain unverified; analysis scope, OCR, cost/supplier evidence and DOCX export limits still apply.

## Active pitching mode — 2026-10-11
The user now requests a clearly labelled prepared demo. Current Feature 1 UI uploads real files to Supabase, then opens prepared results instantly; no live analysis is requested by the demo action. Reviews/final snapshots are browser-local, scoped by user/project, and exported with DEMO labels. Do not describe these figures as analysis of uploads, certified compliance or verified prices. Live backend code remains available for later work, but its unit/OCR/standard-grounding limitations do not block this prepared walkthrough. Cloud live rows are preserved, not overwritten. Local build and isolated browser demo flow are checked; this change is not yet pushed or deployed.
