# GreenSpec JavaScript deployment guide

This guide describes the `guy` branch as synced at `53c5407`. That revision has not been deployed. Keep the existing production project, its domains, and its environment settings unchanged while preparing any new deployment.

## Vercel project settings

Configure the Vercel project at the repository root. Use Node.js 22 or newer, the checked-in install and build commands (`npm ci && npm ci --prefix frontend` and `npm run build`), and `frontend/dist` as the output directory. The root build creates the Vite frontend and bundles `server/server.mjs` into the sole Vercel function entrypoint, `api/index.js`. The `vercel.json` function setting gives this entrypoint a 240-second maximum duration. Enable Vercel Fluid Compute for this project to support the long-running analysis requests.

The only deployed API function should be `api/index.js`. The former Python API entrypoints are under `legacy/python`; do not add them as competing Vercel functions. Rewrites send `/api/*` and `/health` requests to the JavaScript function and client page routes to the SPA.

## Environment variables

Set client variables in the Vercel build environment before building. Set server variables as runtime environment variables. Add the Supabase client variables for the browser and server, and the Typhoon secret for real AI-backed analysis.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Frontend build | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Frontend build | Supabase publishable key. It is public client configuration; database access is controlled by RLS. |
| `SUPABASE_URL` | JavaScript server | Supabase project URL used when the server verifies the user's bearer token and reads their authorized data. |
| `SUPABASE_ANON_KEY` | JavaScript server | Supabase publishable key used with the user's token. The server does not use a service-role key. |
| `TYPHOON_API_KEY` | JavaScript server | Required for the live analysis and specification generation workflow. Without it, the real workflow returns `AI_NOT_CONFIGURED`. Never expose it to the browser. |
| `TYPHOON_BASE_URL` | JavaScript server | Optional provider URL; defaults to `https://api.opentyphoon.ai/v1`. |
| `TYPHOON_MODEL` | JavaScript server | Optional model name; defaults to `typhoon-v2.5-30b-a3b-instruct`. |
| `VITE_AI_ENABLED` | Frontend build | Set to `true` only after the JavaScript server, Supabase environment, and live AI provider are configured. |

The legacy `/api/analyze` and `/api/chat` compatibility endpoints can return an explicitly labeled mock response when no Typhoon key is configured. That mock is for local and legacy use; it does not make the document workflow live. Do not describe mock output as live analysis. Never place a server secret in a `VITE_*` variable, and do not configure or expose a Supabase service-role key in the JavaScript/Vercel server. Supabase Edge Functions retain their platform-provided admin client for atomic persistence only.

## Supabase live workflow

Before enabling `VITE_AI_ENABLED`, apply migration `backend/supabase/migrations/202610100011_live_javascript.sql`, sync the live Supabase domain configuration, and deploy the `analyze` and `revision` Edge Functions. Configure the Edge Function secret `SERVER_AI_URL` with the root GreenSpec JavaScript server URL (HTTPS `*.vercel.app`, no path/query). This secret cannot be supplied by browser requests. Local testing also accepts HTTP localhost. Forwarded bearer tokens are never followed through redirects. Provider calls share a 125-second deadline to leave time for persisting errors before the Supabase Free worker limit. Keep credentials in the Supabase/Vercel secret settings or a secure interactive secret prompt; do not paste keys into chat, documentation, shell history, or source control. The JavaScript server verifies each caller's Supabase user token using the URL and publishable key and performs user-scoped access checks.

The live analyzer currently handles up to three requirements per run when the source explicitly provides a concrete compressive strength in MPa and a volume in m³. It reads DOCX, text-based PDF, and XLSX files; scanned PDFs require OCR and are unsupported. Revision output is supported only for DOCX when the source paragraph can be matched exactly and unambiguously. PDF and XLSX revisions remain unapplied.

## Verification status and smoke checks

Live end-to-end verification against a configured Typhoon account and production-like object transfer has not been completed. The user approved token and necessary document transfer for the guy branch on 2026-10-11. The analyze Edge orchestrator is implemented and tested with explicit provider stubs. A Typhoon key is still unavailable. Do not treat local mock checks as proof of a live AI workflow.

After deployment, check `/health`, `/api/health`, `/api/catalog`, refresh a nested client route, and exercise `/api/tools/mix-design`. For live workflow verification, first confirm the secrets, migration, domain configuration, Edge Function deployment, and `VITE_AI_ENABLED=true`; then use an authorized test account and consented test documents. Confirm unsupported or ambiguous revisions are reported as unapplied rather than silently changed.
