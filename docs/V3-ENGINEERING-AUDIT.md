> 2.6 current update: see KOTOBA-2.6-CHECKPOINT.md. The 101-test / 81-document results below are a historical engineering checkpoint, not current results.

# Kotoba V3 engineering audit and compatibility update

Audited: 2026-10-08. Foundation package remains **2.5.2**. This update is not a claim that the full V3 curriculum or production acceptance is complete.

## Scope and evidence

The local audit inventory read 184 README/configuration, documentation, app, component, library, Supabase and test files (1,439,317 bytes before this update). It inspected imports and TypeScript syntax, migration/security definitions, the vocabulary layers and the actual learning, navigation, Auth, cache, sync and AI call paths. The existing content audit separately validates the content documents. Automated source reading and checks do not prove browser rendering or production permissions.

- TypeScript strict mode is enabled. Baseline AST inventory: 0 explicit `any`, 0 `ts-ignore` / `ts-expect-error`, 103 casts, 11 non-null assertions. Casts are not automatically safe; validated boundaries and merge logic need continued review.
- No local import cycle was detected in the initial inventory. React owns one learning state; atomic IndexedDB persistence and the existing Supabase revision coordinator are retained.
- Large data files are vocabulary sources, not oversized React views. Large learning components are retained; no cosmetic component rewrite was performed.
- Browser Supabase initialization reads only the two intended public environment variables. Owner validation occurs in database RPC/RLS and the Edge Function's live Auth check, not a client email comparison.
- There is no generated Supabase `Database` type yet. Critical account/input and backup boundaries have Zod schemas; full generated RPC/table types remain follow-up work.
- README/handoff descriptions saying version 2.5.0 and “010 does not exist” were stale. Actual package/schema and the newer content compatibility migration take precedence.

## Confirmed issues fixed

| Issue | Result |
|---|---|
| Today/sidebar/daily plan and Review used different card sets | A shared queue includes personal words, sentences, mistakes and learned grammar; counts agree. |
| Changing level removed earlier course cards from the queue | Previously scheduled cards from other levels remain available; due scheduled cards precede unseen cards. |
| Calendar statistics ignored the configured personal timezone | Date grouping, daily plan keys, new sessions and streak use the profile timezone, with DST-safe calendar arithmetic. Undated legacy sessions keep their recorded day. |
| Background time inflated study sessions | A monotonic visible-time clock pauses on document visibility changes. It measures visible elapsed time, not proof of attention. |
| Progress omitted new grammar and mixed languages | Language-specific day/week/month statistics include the new course records, accurate empty states, deduplicated event IDs and separate vocabulary growth/recall signals. Legacy grammar completion remains coarse; no fabricated per-lesson history. |
| Reading continuation used a hardcoded seed article | The latest unfinished article is resolved from its actual ID/metadata; legacy reading opens the legacy view. |
| Query parameters leaked into ordinary navigation; same-page Back did not restore the library | Central route construction clears stale parameters, safely parses malformed hashes, and handles browser history/individual course links. |
| Dictionary searched only the current level and did repeated full-history scans | Search supports all levels, readings/Chinese meanings, prefixes, one English typo, history and pagination. Filter checks use review counters. Explicit add-to-learning and favorite actions preserve the selected word ID. |
| System appearance was resolved once and not retained as a preference | Light/Dark/System share a synced preference in existing notes; each device resolves system mode locally. The old backup and `theme` enum stay compatible. |
| AI browser response was trusted without validation and had no client timeout | Bounded structured output is validated before persistence; a 45-second abort and actionable Auth/rate-limit errors are available. Replies retain their original language if the user switches during a request; IME Enter does not submit prematurely. |
| JSON backup parsing silently stripped existing optional lexicon metadata | Validated optional senses, collocations, POS, register, source and usage fields survive restoration without changing the archive version. |
| Noninitial pages inflated startup JS | Reader, Listening, Speaking, AI, Progress and Settings are loaded on demand with an accessible reduced-motion-aware skeleton. |
| First-time setup was only a manual link | A genuinely new empty account is guided after initial synchronization; returning learners are not forced through onboarding again. |

## Security and database review

Migrations **001–010 are unchanged and have not been executed against production by this update**. The scheduler and snapshot/conflict protocol are unchanged.

- 002 creates owner-only policies with both `USING` and `WITH CHECK`, covering read/write operations; example/collocation and sentence join tables check parent ownership. Review logs, snapshots and identity maps are read-only to the browser and written through controlled RPCs.
- 009 adds restrictive owner fences on business tables, keeps private buckets private, restricts Storage paths to the owner UID and independently revokes broad privileges. RLS is not used as a substitute for revoking TRUNCATE.
- No literal `USING (true)` policy was found in the migration sources. References to TRUNCATE in 001/002/009 are safety comments/revocations, not commands to truncate data. The policy replacement in the already-deployed 002 is not rerun.
- SECURITY DEFINER functions pin their search path and check live owner identity where applicable. The platform `rls_auto_enable()` / `ensure_rls` are preserved.
- Secrets stay out of the browser. Google/OpenAI/server credentials are not in this change; private Storage continues to use signed URLs.
- A real read-only connection check reached the Supabase Data API and received the expected anonymous vocabulary denial (42501). Auth settings show Google enabled. **Public signup is not confirmed disabled in Dashboard**; database signup guards still reject unauthorized identities. Do not remove those guards.
- Existing user-supplied receipts confirm production 001–009 deployment. **010 has an owner-supplied production verification receipt** (`supabase/dashboard/evidence/010_verification.json`). New curriculum progress stays gated until the authenticated readiness RPC succeeds.

## Validation and limits

Automated regression coverage includes personal timezone boundaries, DST/late sync, retained cross-level cards, shared queue counts, event deduplication, course counts, exact reading resumption, safe deep links, theme synchronization/backup compatibility, visible study duration, typo search and AI response schemas. Existing Auth, SRS, sync, audio and content tests remain present.

Owner read/write in production, another-account rejection, Android Chrome/iOS Safari, installed PWA updates, real offline queue retry and cross-device UI continuity must still be exercised with the real account. No owner credential is available to this worker; no browser QA tool is available in this environment. These are not marked passed.

## Next production checkpoint

1. Keep the existing 010 receipt; do not rerun migrations 001–010. Verify the live owner-authenticated readiness check.
2. Confirm the existing owner can log in, then in Supabase Authentication settings disable public new-user signup; keep the database owner guard and RLS enabled. Do not send passwords/secrets in chat.
3. Complete the core acceptance path on the owner's devices: login → Today → review → save → refresh → second device → offline review → reconnect → unchanged history/no duplicates.
4. AI Edge Function deployment and server secrets remain a separate operator step. The improved client does not claim that a missing function is deployed.

## Outstanding V3 work

The validated 2.6 library contains 150 grammar / 60 reading documents, far below the complete 1,260 / 590 target. Full editorial review, comprehensive comparison/prerequisite courses, per-lesson exercise variety, deeper adaptive practice, automatic full-article furigana, password recovery/account-deletion flows, notifications delivery and real device accessibility/layout acceptance remain open. Modern FSRS is not introduced without a migration/compatibility plan and evidence that it improves the current lifecycle.

### Results for this update

- TypeScript: PASS; ESLint: PASS, zero warnings.
- Node regression suites: **101 / 101 PASS** (87 retained + 14 new cases).
- Content audit: 81 documents, 0 structure errors / 0 length warnings; complete V3 target remains NOT MET.
- Production static build: PASS. Initial JS: **348 kB**, compared with 368 kB before this update. Article bodies are still separate JSON assets.
- PWA generated cache version: `kotoba-2.5.2-368dfd1d8dd3`, 26 app assets. This is build evidence, not proof of an installed update on an actual device.
- Isolated PostgreSQL 17: migration compatibility, identity projection, idempotency and expanded non-owner/anonymous checks PASS. Production was not accessed by that test.
- The isolated test startup probe was corrected to check final TCP readiness instead of the temporary initialization socket; a subsequent run passed.
