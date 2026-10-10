# Local integration gate

Docker installation/start was intentionally not performed. The following checks remain required against actual Supabase local before considering deployment:

1. Start local stack, reset all migrations, serve three Edge functions, configure frontend with local public key.
2. Register owner/editor/viewer/nonmember accounts, verify local emails, sign in; reset password and expire a session.
3. Create a project, add registered members, verify viewer/nonmember cannot mutate/read/download cross-project data. Nonmember cannot restore/archive. Last owner cannot be removed.
4. Create no-file document draft, upload DOCX/PDF/XLSX (<=25MiB), commit actual checksum, refresh and download private bytes. Verify wrong-project upload and READY object overwrite/delete are denied. Cancel/retry and duplicate-byte UI warning.
5. Load every scenario's exact fixture set (partial has separate SPEC/BOQ files). Analyze, leave/return, poll; verify result schema/source locators. Arbitrary upload cannot be mapped to fixtures. Negative malformed result never reaches approval. No-results and failed/partial jobs are distinct.
6. Approve/reject/comment, lock an unchanged approval, iterate; verify locked unchanged carry-over and reset of changed content. Try stale finalize, partial without omission reason, duplicate approved scope and wrong review_epoch.
7. Finalize then explicit handoff; repeat requests and new keys; verify immutable snapshots, unchanged lineage return, reason-required untouched replacement, started-change issue and no partial package creation.
8. Record task/milestone/procurement prerequisites, partial delivery/install, overdelivery reason, installation exceeding delivery denial and retained corrections.
9. Verify PASS denied without full installation/evidence/notes or with blocking issue; latest nonconformance regresses completion. Record actual 0 THB distinct from missing carbon. Actual units/method/source remain separate from target estimates.
10. Generate targeted DOCX revision, check original bytes hash, exact paragraphs/output version/report, unapplied/exclusion reasons, revision approval/download and outdated result after divergent finalized decisions.
11. Force two clients to save the same row_version and finalize review epoch: one succeeds and one receives current state conflict. Retry the same operation key without duplicates.
12. Evaluate notifications on changes and daily scheduler. Check recipient/dedup/Bangkok date, resolved conditions, archives and restore. Verify tasks/records still survive page reload.

Keep service keys server-only and use disposable local synthetic evidence. Simulation proves the workflow, not structural certification, supplier quotes or live carbon analysis.
