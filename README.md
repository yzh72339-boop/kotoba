# Kotoba

Open-source personal English and Japanese learning system. Next.js, TypeScript,
Supabase and an installable PWA. The project code and original course content
are licensed under [MIT](LICENSE): anyone may copy, modify, fork and redistribute
it. Contributions use [pull requests](CONTRIBUTING.md).

## Current release

- Version **2.6.0**, based on the existing V2.5.2 codebase.
- 667 vocabulary course cards, 150 complete grammar courses and 60 readings.
- Japanese N5–N1 and English A1–C2 courses, practice and reading continuation.
- Daily learning, vocabulary, shared SRS, sentence collection and mistake notes.
- Private owner Auth/RLS, IndexedDB offline state and Supabase synchronization.
- Unified mobile/desktop UI, dark/system themes, PWA installation and update recovery.
- Optional server-side AI Tutor and cloud backup.

The full content plan remains **1,260 grammar courses / 590 readings** and is
not complete. See [CONTENT-AUDIT.md](CONTENT-AUDIT.md). Existing current-status
and handoff documents are historical development records, not guarantees that
a new installation has been deployed or verified.

## Start

Use Node.js 24 and the existing lockfile:

```bash
npm ci
cp .env.example .env.local
# Set your own Supabase URL, Publishable Key and owner email in .env.local.
npm run dev
```

Without configuration the private login gate remains closed. To sign in,
complete [independent database and owner setup](docs/OPEN-SOURCE-SETUP.md) using
your own Supabase project. Apply migrations 001–011 only to an appropriate
fresh development project, then configure its owner with the existing bootstrap
script. Do not run scripts against another person's production database.

## Verify and build

```bash
npm run typecheck
npm run lint
npm test
npm run content:audit
npm run build
```

The static output is `out/`, suitable for HTTPS hosting. PWA install and offline
use need separate browser/device checks. A build does not validate live Auth,
RLS, AI services or cross-device synchronization.

## Privacy and contributions

Each installation is a private personal application. The MIT License covers
source modification; it grants no access to another installation's accounts,
learning data, keys or recordings. Auth, RLS and private Storage remain enabled.
Use your own backend for development. Keep real environment files and session
state out of Git. See [SECURITY.md](SECURITY.md).

The public-source snapshot excludes private environment files, hosting bindings,
deployment receipts and private Git history. Historical owner/project references
are replaced with placeholders in this snapshot only. Existing deployed migration
history is unchanged. Dependencies and third-party material retain their own
licenses.
