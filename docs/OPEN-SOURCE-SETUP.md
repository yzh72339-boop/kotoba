# Open-source setup

The open-source snapshot contains Kotoba 2.6.0 application code, course content,
tests, Supabase migrations and Edge Functions. It uses the MIT License. Private
deployment bindings, verification receipts, real environment files, user data
and the private repository history are excluded.

## Run locally

Install Node.js 24, then run `npm ci`. Copy `.env.example` to `.env.local` and
configure your own Supabase project root URL, Publishable Key and owner email.
Keep `.env.local` ignored. Without configuration, the app can build but its
private sign-in gate stays closed; a successful build is not a live login test.

## Set up your own database

Use a new, empty Supabase project or isolated local development database.
Review migrations `001` through `011` in filename order and apply them through
Supabase migrations. Do not run them against the original author's project,
reset an existing database or replay already-installed versions.

Historical deployment templates in the public snapshot use `owner@example.com`
and `https://your-project.supabase.co` instead of the author's identifiers.
These are placeholders, not usable credentials. On a fresh project apply the
complete migration sequence before creating an owner account. Then set your
own `ALLOWED_USER_EMAIL` and run the existing `npm run backend:configure` on a
trusted local machine, with `SUPABASE_SERVICE_ROLE_KEY` and optional
`PRIVATE_ACCOUNT_PASSWORD` provided only in the ignored local environment.
This configures the database owner whitelist and provisions the private
identity. Remove the bootstrap password/administrative key when no longer
needed. Never expose them as `NEXT_PUBLIC_*` or send them in chat.

Historical Dashboard SQL is provided for reference, not as evidence that your
database is deployed. Its owner placeholders must be reviewed before use.
Do not blindly run fresh-project bundles or rollback scripts on a used project.

## Authentication and deployment

Email/password uses the single configured owner. Google login is optional:
create your own Google OAuth Web Client, use your Supabase callback
`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`, and configure its secret
directly in Supabase Auth. Set the application origin and redirect allowlist
for your deployment. Do not open public registration to debug login.

`npm run build` produces `out/` for HTTPS static hosting. Keep `sw.js` update
checks uncached and allow the manifest and static content packs to load. PWA
installation needs HTTPS or localhost. Each fork must deploy its own app and
database; a fork has no access to the original private data or account.

AI Tutor and cloud backup are optional. Configure your own server-side secrets
and deploy the existing Supabase Edge Functions if needed. Ordinary reading,
grammar and review do not require an AI API key.

## Verification

Run the commands in CONTRIBUTING.md. Live owner login, RLS read/write,
cross-device sync, offline reconnection and installed PWA behavior must be
tested separately in your own environment. Local checks do not certify them.

## Publication

Publish the prepared snapshot rather than making private deployment history
public. On GitHub create a public `kotoba` repository, or review an existing
repository and its entire history before changing visibility. Enable Issues
and pull requests as desired. Anyone can fork and submit changes; original
main-branch writes and releases remain maintainer-controlled.
