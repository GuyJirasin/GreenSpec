# GREEN SPEC frontend

React / Vite client for the Supabase implementation in `../backend`. Only analysis is simulated; project, file, review, decision and execution records use the authenticated backend.

## Start locally

1. Follow the repository local setup guide and start Supabase from `../backend`.
2. Copy `.env.example` to `.env.local` and set the local URL and **public anon key** from `supabase status`. Never use a service-role key in browser configuration.
3. Optionally set `VITE_CONTACT_EMAIL` to the team's actual contact address. When omitted the landing page clearly states that contact is not configured.
4. Run `npm ci`, then `npm run dev`. Open `http://127.0.0.1:5173`.
5. Register or sign in. The configured cloud MVP allows sign-up without email confirmation. Local email settings follow `backend/supabase/config.toml`; reset messages use the configured email service.

`npm run build` produces `dist/`; `npm run preview` serves that build locally. The default development server binds to loopback only. No website is deployed by these commands.

## Working with the MVP

Create a project with a name, then add its description. Document drafts may remain without a file. Upload PDF, DOCX or XLSX up to 25 MiB; arbitrary uploaded files are retained but cannot be analyzed by the simulated provider. Choose the fixture files matching the explicit scenario. The included/excluded source list is displayed before analysis. Sources preserve the exact version, checksum and paragraph/page/cell locator.

Review all recommendations; comments alone do not approve them. Summaries count approved unique scopes, and missing values remain unknown. Finalize creates an immutable snapshot. JSON/CSV exports preserve simulation provenance. Optional fixture DOCX revisions and explicit execution handoff are separate actions.

Execution supports assigned tasks/milestones, procurement, quantities and append-only corrections, blocking issues, proof files and verification history. Actual cost and carbon records require their own source/methodology and are independent from execution completion. No placeholder supplier or library menu is displayed.

Draft text is cached best-effort in this browser, scoped to the signed-in user, project and form. Recovery requires an explicit restore/discard choice. It is cleared only after acknowledged persistence. This is not offline synchronization. Autosave errors and version conflicts require review/retry; no automatic overwrite is performed.

## Validation

Production compilation was run successfully with Vite 7.3.7. `npm audit` after upgrading Vite reported zero known vulnerabilities. Integrated browser checks live in the new repository `qa/` directory; test API doubles used there are not an application fallback. Full database/storage end-to-end validation requires the local Supabase stack running.

## Feature 1 redesign (2026-10-10)

The authenticated Home dashboard uses the supplied reference layout: a white sidebar, mint active navigation, forest-to-emerald hero, four metric cards, and recent analysis. Values come from saved analysis and review rows; there is no hardcoded building baseline. Baseline carbon covers only known scopes in the analysis.

The interface uses simple English. Uploaded source text, user project names, comments, and revised requirements retain their original language. Feature 2 keeps its existing flow and uses the same palette.

Feature 1 screens: Overview, Documents, Hotspots, Recommendations, Details, Compare options, Selected Spec, Revised Specification, Revision Summary, Revision History, and completion. Search, review-status filters, and cost/carbon sorting use persisted records. A/B choices come from server-stored `recommendation_options`; earlier finalized A-only runs remain readable without invented B values.

Changing an option or saving edited wording calls `gs_review_change`. A locked review must first be explicitly unlocked. A saved content change returns the item to Not reviewed. Edited wording does not recalculate estimates. Unsaved wording cannot be approved in the editor. Users must approve or reject every item before finalizing. Finalized wording and choices are preserved in immutable snapshots and JSON/CSV/DOCX output.

Draft wording uses the same device-local recovery flow as other forms. DOCX generation and project-work handoff remain optional after finalization.
