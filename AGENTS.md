# GREEN SPEC implementation rules

> Paths and commands in this document are relative to the repository root (GreenSpec/), unless stated otherwise. Implementation documentation is stored in agents/. AGENTS.md remains at the repository root.

User-authorized implementation on 2026-10-09.

- Existing cloned repository files are read-only. Only the original root demo/ may be deleted, as explicitly requested. Do not edit api/, greenspec_core/, tests/, docs/, app.py, README.md, or .gitignore.
- New implementation belongs in frontend/, backend/, shared/, and new implementation documentation. Agents own their assigned directories.
- Authoritative specifications are ../document/ current Frozen v1 sections. Historical drafts are superseded. Read those files, never modify them.
- Theme: white, forest green, mint and emerald; new Thai-primary responsive UI. Do not reuse old demo UI.
- React/Vite with Supabase Auth, PostgreSQL, private Storage and Edge Functions. Simulated controlled fixtures only; no live AI, fabricated arbitrary-upload analysis, or supplier engine.
- Validate canonical analysis schema and semantic sources/units. Preserve immutable finalized snapshots and referenced sources. Enforce authorization and concurrency on the server.
- Finish Feature 1 independently; PM requires explicit finalized approved-only handoff. Quantity, verification and metric completeness are separate.
- Tests and milestone log must report what actually ran. No deployment or Docker installation authorized; user requested code and setup instructions while Docker is unavailable.
- Preserve credentials outside version control; frontend only uses publishable keys.
- Keep agents/IMPLEMENTATION_WORK_LOG.md updated with progress, tests, limitations, and next steps. Do not modify original ../document/WORK_LOG.md.

## User-approved Feature 1 redesign — 2026-10-10

Latest user instructions override the earlier Thai/new-UI-only notes above: reuse historical demo UX/UI for Feature1, Home layout from latest attached screenshot, forest/emerald/mint palette throughout. All interface text simple English; source/document content preserves its original language. Home after sign-in, only real sidebar sections. Add real persisted A/B choices and editable final wording. All items must be reviewed before finalize. Feature2 workflow stays unchanged; palette and interface language may change. User permits subagents when useful. Do not commit or push GitHub until expressly instructed. Supabase cloud configuration was previously authorized; apply only scoped reviewed changes, preserve user data, and report actual verification evidence. Existing original repo files/documents remain read-only.


## User-approved language and MVP guest entry — 2026-10-10

- Default interface language is Thai; offer a persistent Thai/English switch. Keep large headings and sidebar menu labels in English. Preserve document/source text and user-entered content in their original language.
- Landing entry and demo actions open Home using Supabase anonymous Auth. Reuse an existing session, including permanent users; browser-local sessions define returning guests. Return-to-landing must retain the session. Never use IP/fingerprinting to identify a guest.
- For useful delegated work, use gpt-6-luna for straightforward tasks. Keep the normal model for difficult reasoning tasks. Do not commit or push without an explicit request.

## User-approved main MVP work — 2026-10-11

The user now authorizes implementation directly on main and editing contributor files as needed to ship the MVP. This overrides the earlier contributor read-only and guy-only constraints for repository code. Keep external project reference documents and synced sources read-only. The current task changes Feature 1 frontend UI only; backend work will follow separately. Preserve database contracts, complete review before finalize, A/B, source-language wording, and saved final revisions. Do not push or deploy without a new explicit request. If delegation is necessary, use the user's authenticated agy CLI with the requested Gemini 3.8 Flash high model and a tightly bounded assignment; do not use built-in subagents for this work.

## User-approved live-only MVP — 2026-10-11

The latest task removes every runtime example/mock path on main and audits readiness for MVP pitching. This overrides the earlier simulated-fixtures-only and frontend-only scope. Runtime generation_mode must be live, sources must be uploaded READY documents with checksum and exact extracted evidence. Missing keys or provider errors must fail honestly, never generate fallback recommendations or synthetic A/B. Unverified supplier claims are not shown; missing real prices stay null. Historical database rows are preserved and excluded from live UI. Synthetic fixtures may remain only under QA and never ship. Carbon is an engineering estimate for identified scopes, not verified whole-building emissions. No push or deployment in this task; record local checks and outstanding cloud migration/configuration separately.

## Current main workflow — 2026-10-11

All ongoing implementation is on main. The user authorized integration and push of current main in this turn. The historical guy transfer approval is retained in agents/IMPLEMENTATION_WORK_LOG.md; current live-only requirements supersede older sample workflows. Preserve other contributors' changes that remain compatible with the current user requirements.
