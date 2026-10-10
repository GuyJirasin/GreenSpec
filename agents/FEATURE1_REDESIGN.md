# Feature 1 redesign — 10 October 2026

> Paths and commands in this document are relative to the repository root (GreenSpec/), unless stated otherwise. This document is stored in agents/.

## Delivered flow

Sign in → Home → project and documents → Overview → Hotspots → Recommendations → Details / Compare options → Selected Spec → Revised Specification → Revision Summary → finalize → optional DOCX or project-work handoff. Revision History retains earlier analyses and finalized revisions.

Home follows the supplied design: white navigation and header, pale green background, mint selection, a forest-to-emerald hero, four metric cards and recent analysis. Metrics use saved records and refer to materials with known data in the analysis. Empty or unknown values are shown explicitly. The sidebar contains only implemented pages.

Interface text uses simple English. Source passages, project names, comments and edited requirements remain in their original language. Feature 2 retains its existing workflow and shares the palette.

## Review and saved data

Option A and Option B are stored on the backend. Users can compare cost and carbon, select an option, and edit the final requirement. A content change returns that recommendation to Not reviewed. Locked decisions require an explicit unlock before editing. Unsaved wording cannot be approved in its editor.

Every recommendation must be approved or rejected before finalize. Finalize stores an immutable snapshot of the choice, wording and estimates. Changing wording does not recalculate estimates. CSV and JSON include the choice and final wording. DOCX output uses approved wording, escapes XML correctly, and retains source files separately. Finalized reviews are read-only; a new revision is required for further changes.

Version checks prevent silent overwrites. A failed save or version conflict keeps a recoverable local draft and requires an explicit retry/restore choice. These drafts are scoped to the user, project and form; they are not offline synchronization.

## Backend rollout

Migration `202610100010_feature1_options.sql` and updated `analyze` / `revision` Edge Functions are applied to the existing Supabase project. Existing finalized history is preserved. The safe draft backfill found no eligible active fixture drafts and verified all six existing finalized item snapshots were unchanged before the new synthetic test.

## Verification

Final validation results are recorded in `qa/feature1-verification.log` and `qa/feature1-cloud-verification.log`. The checks cover production build, shared domain and DOCX behavior, SQL role/lock/version/finalize rules, Edge module compilation, desktop/mobile workflows, and original-file preservation.

The real cloud test uses only an authorized synthetic account and [QA] project. It verifies authenticated login, private source upload/download and checksum, saved A/B options, Thai wording, approval reset, unresolved-review rejection, locked-edit rejection, finalized B estimates and generated DOCX wording. The test project is archived and its Auth account soft-deleted without sending email; source/audit history remains retained.

## Current limits

Analysis still uses controlled sample files and simulated material estimates. Option B is a sample trade-off, not a verified supplier product or certification. Actual design approval needs material data and an engineer's review. Arbitrary uploaded files remain stored but are not analyzed by this provider. Email confirmation is disabled for the MVP; password-reset email still depends on the configured email service.

No Docker was installed. No GitHub commit or push was performed.

Final completed checks: build PASS; shared tests 29/29; SQL tests 22/22 executions (15 distinct cases); Edge module graphs 3/3; browser journeys 11/11; original files 27/27 unchanged; live cloud smoke PASS with synthetic cleanup. See the referenced logs for exact assertions and test boundaries.
