# Shared domain foundation

Portable canonical simulated analysis and frozen-contract validation are in `domain.mjs`. `validation.mjs` interprets exactly the keywords present in the frozen v1 schema; it does not claim general support for future Draft 2020 schemas. Independent Ajv2020 differential checks cover frozen shape, nulls, nested additional properties, locators, errors and status branches.

Four valid DOCX fixture sources and their exact SHA256 checksums/paragraph locators are in `fixtures/manifest.json`. `fixtures.mjs` exposes metadata; `fixture-bytes.mjs` exposes original base64 bytes for private backend upload. Source fixtures are synthetic workflow examples and never real environmental evidence. Seven simulation scenarios use these mapped sources: success, zero, missing, overlap, partial, job-failure and malformed.

Run tests: `pnpm install` then `pnpm test` in this directory. 24 meaningful tests passed on 2026-10-09, including byte SHA256, source locators, canonical shape/semantics, missing metric coverage, dedup scopes, iteration locked approvals, procurement/install/verification guards, notification dedup and targeted DOCX output integrity.

`revision.mjs` accepts a JSZip adapter passed by the caller. It verifies approved exact before text at the 1-based paragraph index, changes only text in that paragraph, preserves all other zip parts, and returns unapplied reasons. The original source hash remains unchanged. Backend may use its own equivalent fflate adapter but should retain these invariant tests.

Visual DOCX rendering was attempted using the bundled documents renderer but was blocked because LibreOffice `soffice.exe` was unavailable on PATH. No claim of visual DOCX review is made. Generated OOXML integrity and extraction checks passed; `qa/revised-office-spec.docx` is a test artifact only.


