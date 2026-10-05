# KOTOBA V2.5.2 — GitHub Development Handoff

This package is a clean GitHub handoff of the existing KOTOBA V2.5.2 source tree.
It is intended for continuing development in another GitHub/Codex account without
rebuilding the project from scratch.

## First actions for the next developer / Codex

1. Read `README.md`.
2. Read `docs/CODEX-HANDOFF.md`, `docs/CURRENT-STATUS.md`,
   `docs/ACCEPTANCE.md`, and `docs/DEPLOYMENT.md`.
3. Run `npm ci`.
4. Run the smallest baseline verification first:
   - `npm run typecheck`
   - `npm test`
   - `npm run lint`
   - `npm run build`
5. Configure local secrets in `.env.local` using `.env.example`.
   Never commit `.env.local`, access tokens, service-role keys, passwords,
   or private API keys.
6. Preserve the existing Supabase migrations 001–009, RLS/Auth design,
   SRS behavior, IndexedDB/local persistence, and sync architecture unless
   a verified defect requires a minimal change.

## Priority order

Focus on production validation and minimal fixes in this order:

app startup → owner auth → production Supabase → RLS → persistence →
SRS learning loop → cross-device sync → AI function → PWA/mobile checks.

Do not begin with a visual redesign, dependency overhaul, architecture rewrite,
or unrelated feature expansion.

## Known validation still required

Production acceptance still requires real-environment checks such as owner login,
Supabase/RLS read-write behavior, cross-device sync, AI Edge Function behavior,
Android Chrome / Mobile Safari, PWA standalone/offline/slow-network behavior,
microphone degradation, and real-device responsive validation.

## GitHub first commit

Recommended initial commit message:

`Initial Kotoba V2.5.2 FINAL`

Recommended repository: `yzh72339-boop/kotoba`

## Security note

This handoff intentionally contains no `.env.local`. `.env.example` contains
variable names/placeholders only. Test files may contain obvious fixture/dummy
secret strings used by security tests; these are not production credentials.
