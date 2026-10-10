# Feature 1 UX and UI acceptance

Date: 2026-10-10 (Asia/Bangkok). This report covers the user-approved replacement of Feature 1 screens with the previous demo workflow and new Home reference, while keeping the real database backend.

## Browser results

The isolated Chrome acceptance run passed **11/11 journeys**. The output is recorded in `f1-browser-verification.log`. Test HTTP responses represent Supabase contracts; these browser tests do not claim to be live cloud tests. Separate cloud verification is recorded by the parent integration task.

Five new Feature 1 journeys cover:

- Home reads saved project and analysis data; unimplemented sidebar modules are absent.
- Option B selection persists; user-edited Thai wording survives reload; changing approved wording requires another review; finalization stays disabled until all items are reviewed; saved final snapshots use Option B impacts and the final wording; no execution package is created automatically.
- At 360px, Home has no page overflow and the contained comparison table can scroll to Option B, keep its button within the screen, and save the selection.
- Source evidence keeps focus inside its dialog and closes with Escape; search and status filters work; hidden unreviewed items still prevent finalization.
- A conflicting wording save leaves server text unchanged; its local draft is restored only by explicit user choice and is cleared after a successful save.

Six retained regression journeys cover English login/contact disclosure, notification links, project autosave and file-free document drafts, viewer restrictions/mobile navigation, conflicting project draft recovery, and execution-task Bangkok time plus a real zero actual-cost entry.

After the complete run, the strengthened mobile viewport-selection assertion and revision-summary capture passed in a targeted **2/2** run. Screenshot capture now scrolls to the top before capturing fixed navigation. The integration task runs the consolidated checks against the final code.

## Visual artifacts

- `screenshots/f1-home-desktop.png`
- `screenshots/f1-compare-desktop.png`
- `screenshots/f1-revised-final.png`
- `screenshots/f1-summary-desktop.png`
- `screenshots/f1-compare-mobile.png`

All screenshots use synthetic test data. Source text, project names and user wording remain in their original language; interface text uses simple English.

## Run again

From the `qa` folder, run `npm ci` followed by `npm run test:browser`. The test server defaults to port **5175**, separate from the user's preview on 5173. Set `QA_PORT` to use another test port. The test environment explicitly supplies local test-only API settings; production has no mock fallback.

`npm run test:sql` includes both additional and Feature 1 options suites. Their imported baseline suites execute twice in the Node runner: count distinct behavior cases separately from execution totals.
