# Open-source snapshot verification

Checked 2026-10-09, Node.js 24 / locked dependencies, Kotoba 2.6.0.

- TypeScript: PASS.
- ESLint, zero warnings: PASS.
- Node tests: 165 PASS, no failures.
- Content audit: 150 grammar / 60 readings, 0 errors, 0 length warnings.
- 2.6 stage minimum: PASS. Full content targets: still 1,640 units short.
- Production static build: PASS without copying any production environment.
- Source scan: no detected real secrets; two explicit negative-test fixtures remain.
- Private source history scan: 20 commits, 548 unique blobs, no credential findings.
- Original deployment data, environment, Auth/RLS and migration history: unchanged.

Public snapshot only: historical email/project references become placeholders;
private deployment evidence and hosting bindings are omitted. Application
business code, course/card IDs, content, lockfile and scheduling are preserved.

Publication target: https://github.com/yzh72339-boop/kotoba.
The owner made the existing repository public and added the MIT License. Its
original 2.5.2 history was inspected before preparing a 2.6 publication commit.
The release preserves that history and the owner's MIT license. No force push,
private environment file or deployment history from the running app is used.
Remote branch verification is required after a successful push.

Owner login, second-device sync, installed PWA, offline reconnection and AI calls
for independent installations are not verified by these local checks.
