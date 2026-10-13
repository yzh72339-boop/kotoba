# Preview update recovery — 2026-10-13

The owner reported being online while the independent recovery page said to reconnect. The page's build validator accepted only numeric release names and rejected the deployed `kotoba-2.9.0-preview.1-2c8b8fc75b33`. Its catch handler then misreported every failure as a network problem. Settings' active-build reader had the same validator. This is a confirmed code defect, not evidence that the owner's phone was offline; the screenshot alone does not reveal all possible phone-side failures.

Both readers now accept release/prerelease build names. Recovery checks the server build before registration, and distinguishes browser-reported offline, authentication-required responses, unexpected HTML, invalid build identifiers, HTTP errors, request timeout, installation failure, worker timeout and version mismatch. It never offers activation for an unverified build. Installation still needs explicit confirmation and is blocked while another Kotoba window is open. Its script URL has a patch-specific query key so an HTTP-cached old script does not retain the rejected-preview validator; this does not clear learning caches.

No migration, Auth/RLS, course/card identity, scheduler, learning storage, sync protocol or dependency changed. No learning data was cleared. Package remains `2.9.0-preview.1`; the asset-derived worker hash changes with this patch. The previous confirmed production publication was Sites version 27; the next exact source/version/deployment is reported by the native publication receipt, not inferred here.

## Verification

- 209 Node tests pass, including preview recognition, explicit confirmation, mismatched builds and classified failure cases.
- TypeScript, zero-warning Lint and production export pass. The export also runs vocabulary/content compilation checks; course totals remain 927 vocabulary /154 grammar /70 reading. Full course targets remain incomplete.
- `node scripts/update-recovery-audit.mjs` runs real compiled workers on loopback in isolated Chromium profiles at 360/390/430px, including dark and reduced-motion settings. Numeric old build → preview download → other-window block → confirmed activation → repeated check all pass, with no horizontal overflow.
- Isolated IndexedDB course/step/queue sentinels, local session sentinel and the existing persistent download cache survive activation. These fixtures do not establish real owner sync or token refresh correctness.
- Physical Android/iOS, the user's installed PWA, second-device sync and owner CRUD are not verified. A successful production deployment receipt establishes publication only; the owner must retry the recovery page to confirm the phone-side result.

Open `/api/app-update.html` in the same browser used by Kotoba, check/download, confirm progress is synchronized, close other Kotoba windows, and install. Do not clear IndexedDB or reset production SQL to resolve an update failure. If retry fails, the new classified message is the next diagnostic evidence.
