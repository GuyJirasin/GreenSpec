# GREEN SPEC

Working frontend demo for **Feature 1: AI Green Spec Analysis**.

The application is in [`demo/`](./demo). It uses React, Tailwind CSS and Vite, with the white / dark-green / mint navigation theme from the original UI reference.

## Run locally

Requires Node.js **22.18+** (or a newer supported LTS version).

```sh
cd demo
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173`.

```sh
npm run build
npm run preview
```

The production build is written to `demo/dist`. Vite uses relative asset paths so the build can be hosted in a subdirectory. This React version runs through Vite or a static HTTP server; it is not a standalone HTML file.

## Demo workflow

1. Open the sample analysis, or create a project with **New analysis**.
2. Add local files or choose **Use sample documents**. Set document types and optimization priority.
3. Start the simulated analysis and review its processing steps.
4. Explore baseline carbon / cost and material hotspots.
5. Filter and sort recommendations. Inspect existing / proposed wording, references, performance, risk, confidence and sample compliance checks.
6. Compare Original, Option A and Option B. Approve, reject with a reason, comment / request adjustment, or save for review. Approved changes lock immediately; explicitly unlock to edit.
7. Review the revision summary: approved, rejected and unresolved items, source references, combined CO₂ and cost impacts. Intentionally unresolved items may remain unchanged.
8. Request another revision with round-level feedback. Processing returns to recommendation review; locked approvals are preserved. Inspect immutable previous rounds in Revision History.
9. Accept the revision, then optionally generate a sample text specification or finish without a document. Both paths preserve the approved change set.
10. Review final impact, download approved changes (`.json`), view / print the final summary, return to the dashboard, or view the local Project Management handoff.

Use the left sidebar **Demo scenario** selector before analyzing to exercise successful, failed, missing-information and no-recommendation states. **Reset demo** restores the sample project.

## Scope and behavior

- Mock data only. No backend, AI service, authentication or file-upload endpoint.
- Uploaded files stay on the local device. Only file metadata is used; document contents are not parsed.
- Every project uses the same illustrative sample dataset.
- Failed critical engineering checks block acceptance. Review-required alternatives use an explicit demo acknowledgement.
- Finalized revisions are read-only. Before finalization, unlock an approved item explicitly to change its option, wording, feedback or review decision.
- Edited wording does not recalculate carbon, cost or compliance.
- Project state, review decisions, feedback and revision history persist in this browser's local storage. Download analysis JSON for a portable record; importing it is not implemented. Reset demo starts fresh.
- Regeneration is deterministic mock logic using both feedback levels and reject reasons; it is not a semantic AI interpretation or real budget/engineering optimization.
- Document generation produces a sample `.txt` from approved mock excerpts. It does not edit an uploaded TOR / BOQ / PDF. Project Management is a local handoff page, not an external integration.
- Project Matching, Materials, Suppliers and Knowledge Hub display future-feature placeholders.
- No engineering standards, product EPDs or supplier certificates are actually verified. Figures are not certified carbon assessments or approved construction specifications.

## Source structure

```text
demo/
  src/
    App.jsx          screens and workflow state
    components.jsx   reusable interface components
    data.js          mock recommendations and documents
    model.js         impact calculations and validation
    revisions.js     locking, revision snapshots and approved change sets
    RevisionFlow.jsx revision checkpoint, feedback, final output and history
    model.test.js    decision and validation tests
    styles.css       Tailwind theme and shared styles
    main.jsx         React entry point
  tests/flow.spec.js  browser workflow tests
```

## Tests

```sh
cd demo
npm test
npx playwright install chromium
npm run test:e2e
```

To use an already installed Chromium browser, set `PLAYWRIGHT_EXECUTABLE_PATH` to its executable path. Browser tests start their own local Vite server. Set `GREEN_SPEC_TEST_PORT` to use a separate test port when 5173 is occupied.

The calculation tests cover combined reductions, additional costs, mutually exclusive alternatives, engineering acceptance rules, and file validation. Browser tests cover the main workflow, review / blocked acceptance, rejection, filters, analysis scenarios, and mobile page overflow.
