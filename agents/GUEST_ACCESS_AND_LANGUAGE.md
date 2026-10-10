# Guest access and language

The MVP opens Home without an email/password form. Entry buttons reuse a valid Supabase session or create one anonymous account. Projects, uploads and decisions still use real user ownership and existing RLS/checked operations.

## Returning visitors

Supabase stores and refreshes the session in browser storage. The same website origin and browser profile reuse the same account while that session remains valid. Different browsers, profiles, devices, cleared site storage or a new private session create new accounts. Shared browser profiles share the account. Localhost and the public Vercel domain have separate browser storage. This identifies browser sessions, not verified people. There is no recovery across devices without an additional recovery/account feature.

The sidebar return action keeps the session. Repeated entry clicks are single-flight; Web Locks serialize entry across tabs in supported browsers. Existing permanent accounts remain intact. Entry failures stay on Landing with an error and retry. Browser storage must be writable before creating an account.

## Language

Thai is the first-visit default. The switch in the Landing header and app header saves the preference in localStorage (greenspec-language). Large headings and sidebar labels remain English. Controls and help text switch language. Source files, project names, extracted text and edited requirements are not translated.

## Configuration

Local backend/supabase/config.toml and cloud-config/supabase/config.toml declare auth.enable_anonymous_sign_ins = true. On 2026-10-10 the reviewed cloud diff had exactly this one declared change; it was applied to fegwjlytecobdaeqhbdf. Existing database policies remain unchanged. Frontend still needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (publishable key accepted) in each build environment. No secret/service-role key belongs in frontend.

## Limits

Guest accounts have no email, so email-based member invitations cannot identify another guest. Member displays use guest labels where no email exists. Analysis remains the existing controlled sample workflow. New anonymous accounts consume Supabase resources; rate limits remain enabled. No recovery code or account reset is included.
