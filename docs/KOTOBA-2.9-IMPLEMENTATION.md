# 2.9 preview — substantive personal study, 2026-10-12

Current branch: `feature/2-9-personal-materials`. This is a reviewable preview, **not a declaration that 2.9 production/device acceptance is complete**. Last actual published site remains 2.8.0/version 25; local 2.8.1 was saved at 4b0a5a1 before this work. User-reported 2.8 completion is separate from the evidence below.

## Available implementation

1. Library → import TXT/Markdown or paste → preview → original/source/manual or unassessed level → reader. Stable content/paragraph IDs; duplicate reuse/explicit copy; UTF-8/size/cancel validation. Immutable original snapshots survive edits/deletion. Existing reader settings, position, notes, manual paragraph translations and completion use existing account-protected snapshot sync. Personal materials do not inflate reviewed curriculum totals.
2. Select a real sentence/paragraph → manually confirm expression/gloss → expression recall or context-cloze self-recall → existing SRS. Distinct senses and contexts stay separate; repeats reuse identity and schedule. Source links preserve snapshot/paragraph and unfinished review card. Edit/pause/archive retain history. Reliable existing grammar exercises can provide another question in the same grammar point; unavailable alternatives are labeled, not generated.
3. Listening workspace → existing original ja/en transcripts or personal material → verified language-matching device voice, current segment loop/speed, hide/show, original recall/self-assessment → microphone recording → local playback/save/delete. Attachments are whole-audio playback after actual browser metadata/format validation; **no automatic audio alignment**. Speech voices are conditional on actual device availability, never labeled human recordings. Playback events, recall completions and recording metadata are distinct. No pronunciation score or automatic cloud upload.
4. Today/Learn → 5/10/20-minute budget → due enrolled cards, unfinished personal text, existing grammar/reading and actually available audio. Explicit estimates (3 reviews/min, ja 200 chars/min, en 140 words/min, existing lesson minutes, listening recall 2 min). Adjustment retains pinned identities/completed steps; skip/replace keep prior records. Backlog dates are unchanged. Current capability must be verified before listing an audio task.
5. Existing JSON export/merge restore includes texts, versions, cards, SRS and event/media metadata. Settings exports a separate media manifest and individually downloads actual local files. Restore reports missing media. JSON export is **not** a full audio backup; attachments/recordings use project+owner-scoped local keys and never claim availability on a second device from metadata alone.

## Database dependency: 012, not applied to production

Text materials/notes use existing 001–011. Context cards need additive `012_personal_context_cards`: existing `vocabulary` uniqueness cannot represent two senses independently, and the old projection only maps vocabulary/grammar/sentence SRS targets. Dropping that uniqueness would break existing upserts, so it stays unchanged.

012 adds an owner-RLS table, expands unified review target kinds, validates parent ownership and original snapshot ranges, and delegates the unchanged prior projection. Existing `record_review` algorithm and transaction are reused. It suspends/restores context cards without deleting reviews. UTF-16 paragraph positions handle emoji. No `DROP TABLE`, `TRUNCATE`, row `DELETE`, reset, old migration edit or owner bypass. It **replaces one CHECK constraint** to allow an additional target kind. Supabase's `rls_auto_enable`/`ensure_rls` remain unchanged.

Production context-card creation is gated by `personal_context_ready`; offline creation requires a previously verified capability for this project/owner. Missing function, API cache ambiguity, auth, network and offline-unverified are distinguished. A browser fixture returning true is not deployment evidence.

### Current manual deployment stage (one migration only)

1. Back up production using the existing export/backup workflow. Confirm actual ledger 001–011 (user supplied successful 011 verification); do not rerun them.
2. Supabase project → **SQL Editor → New query**. Paste the **entire** `supabase/dashboard/012_deploy.sql`. Check project before **Run**. This wrapper is a transaction, checks prior tables/policies/scheduler/helper, records exact SQL, and skips a matching repeated deployment. Any failure rolls the whole transaction back.
3. Expected ledger adds `012 / personal_context_cards`. In a separate query run **only** `supabase/dashboard/012_verify.sql` (read-only). Expected problems `[]`, card_rls/owner_policy/legacy uniqueness/target ready all true, private helper browser access false.
4. Report that result before any subsequent migration. If API cache is stale, check Supabase API schema cache rather than rerunning old SQL. Then actual owner creates two meanings of one expression, reviews once, refreshes, checks logs and a second device; non-owner/anonymous access must be rejected.

### Rollback / recovery boundary

Before commit, the wrapper rolls back automatically on error. After commit, prefer a forward compatibility fix or roll back the application UI to the prior known version while keeping all tables/IDs/snapshots/history. **Do not drop the new table, delete logs or narrow the CHECK while any context rows/reviews exist.** A destructive database rollback needs a separately reviewed data-preserving export/restore plan; none is automatically executed here.

## Example listening provenance and boundaries

At least two transcripts per language are reused from `lib/course-library.ts`: Japanese N5 self-introduction / N4 meeting; English A1 introduction / A2 existing daily conversation. Texts and translations are Kotoba originals, not downloaded human audio. Current-level episodes and imported original snapshots are also selectable. Device voice availability is checked at runtime. Without a matching device voice or an actual attached file, these are **text-only, not verified playable audio units**. No new verified human/AI audio files were invented or shipped.

Reviewed grammar/reading comprehension retains existing answer/explanation mapping. Personal text/listening recall is self-assessment, not authoritative translation, pronunciation or comprehension grading. An installed voice can still fail playback, which shows a retryable error. Offline voice availability, actual Android playback quality, physical microphone, Safari and second-device media remain separate acceptance requirements.

## Content and evidence

Qualified totals remain **927 vocabulary / 154 grammar / 70 reading** (includes the preceding local 2.8.1 N2 batch: +2 reading, +10 contrast exercises; no duplicate vocabulary). New personal materials/cards/listening activity are separately counted. All levels retain phase coverage. Long curriculum targets remain incomplete by **1,626 documents** (1,106 grammar + 520 reading); `--require-targets` must still fail.

Local tests and browser evidence are recorded in the current delivery report. Local PostgreSQL is disposable, never production. Chromium mobile widths and synthetic microphone are emulation, never real Android/owner/second-device acceptance.

## Remaining acceptance / exact continuation

- Deploy and read-only verify **012** manually, then real owner/RLS CRUD and two-device retry tests. No production deployment claimed.
- Test Android/iOS installed PWA, microphone permission/recording/replay, actual ja/en voices and offline voice support; attach real language audio where voices are unavailable. Verify media backup transfer/missing-file notices.
- Expand reviewed listening comprehension with real audio/answer provenance when supplied; current personal listening uses truthful original recall/self-assessment.
- Continue existing curriculum targets separately. Do not count personal imports as edited/qualified lessons.
