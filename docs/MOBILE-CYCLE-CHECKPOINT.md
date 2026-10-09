# Mobile learning cycle checkpoint — 2026-10-08

## Implemented and protected

Actual starting source: Version 14, commit `6a577f2`, 71 grammar / 18 reading documents, 128 passing tests. Version 13 is historical only. Previous phone navigation, safe areas, soft-keyboard handling, persistent grammar/reading drafts, save-state/readiness distinctions, download fallback and safe PWA update recovery were already implemented; this round builds on those changes.

New changes: prerequisite-aware daily course choice, pinned prerequisite identity, unfinished/wrong-answer reading continuation; reading words/sentences/grammar/mistakes collected into existing SRS with multiple article sources; compact source sheets and return actions; saved review runs with history-based continuation; atomic/idempotent per-rating history and study-time persistence. No Auth/RLS, migrations 001–010, scheduler, course/vocabulary identities or sync protocol changes. No production learning writes.

## Actual content progress

| Language | Level | Grammar now | Reading now | This batch grammar / reading | Remaining grammar / reading |
|---|---|---:|---:|---:|---:|
| ja | N5 | 5 | 1 | +1 / +1 | 65 / 49 |
| ja | N4 | 1 | 1 | 0 / 0 | 99 / 59 |
| ja | N3 | 1 | 1 | 0 / 0 | 149 / 69 |
| ja | N2 | 50 | 10 | 0 / 0 | 130 / 50 |
| ja | N1 | 2 | 1 | +1 / +1 | 178 / 49 |
| en | A1 | 1 | 1 | 0 / 0 | 59 / 39 |
| en | A2 | 1 | 1 | 0 / 0 | 79 / 49 |
| en | B1 | 8 | 2 | 0 / 0 | 92 / 58 |
| en | B2 | 4 | 2 | 0 / 0 | 116 / 58 |
| en | C1 | 1 | 1 | +1 / +1 | 119 / 49 |
| en | C2 | 1 | 1 | +1 / +1 | 99 / 39 |

Totals: **75/1,260 grammar, 22/590 reading; 1,753 documents remain**. No grade is completely empty. This is coverage, not a complete curriculum. Legacy material is retained but not counted as complete V3 material. Vocabulary stays 667 cards.

The four linked course pairs cover permission at a bookshop (N5), formal service closure and preserving archival uncertainty (N1), participle subjects and interpreting a workplace trial (C1), and limiting-adverbial inversion within an argument about public-service measurement (C2). Readings are original instructional scenarios, not fabricated news or research claims. Grade placement is pedagogical, not official JLPT/CEFR certification.

Author review checked natural usage, Japanese example readings, aligned translations, level-dependent length, distractors, answer positions, grammar surfaces and vocabulary linkage. Automated audit: zero schema/duplicate/reference/placeholder errors, zero length warnings. This does not replace independent editorial review. `content/**/mobile-cycle-02.json` contains only new documents; older content is not regenerated.

## Automated evidence

- 139/139 Node tests PASS; TypeScript and ESLint PASS; content audit PASS; production build PASS (`kotoba-2.5.2-e5433a157ecb`, initial JS 353 kB).
- Read-only real Supabase probe reached Data API/Auth settings and confirmed anonymous vocabulary denial (42501); owner-authenticated writes and device sync were not attempted.
- Stable course/prerequisite pins and unavailable-prerequisite fallback tested.
- Reading source and collections → shared SRS → rating → backup/restore tested.
- Repeated collection retains card IDs, schedule, history, first encounter and notes; different articles retain separate source keys.
- Review refresh resumes remaining original cards; repeated operation IDs do not duplicate events/statistics. Visible-time clock excludes background time.
- Downloaded courses load without a network; reconnection fetches catalog without altering private learning data (mocked Cache/fetch tests).
- Existing update-save and recovery tests retained. No cache or learning-data reset.
- Isolated PostgreSQL test PASS: canonical identities, collection/source/run metadata, partial study record, duplicate sync delivery, private role read/insert/update/delete protection. Canonical server study time uses integer seconds; local snapshot retains original fractional minutes.

## Required owner/device acceptance — NOT RUN

No real owner session, browser-control tool or physical device is available here. Do not treat unit/build/isolated SQL checks as device acceptance.

1. Use the existing owner account at the deployed URL. Confirm Today, choose JA N5, begin the daily session; if prerequisite review is suggested, complete it and confirm the next course advances.
2. Pause during grammar practice, refresh, reopen and confirm the same course/answers. Switch grade and back; original review records and notes must remain.
3. Open the new N5 reading; tap a word and collect it twice, save a paragraph, collect linked grammar, answer a comprehension question incorrectly. Confirm adjacent explanation and wrong-question retry.
4. Open “复习本文收集”; flip a card and open its source sheet. Close it, rate one card, refresh mid-run, finish remaining cards. Confirm one history entry per submission and original article return/resume.
5. Download the course pair while online. Switch offline; repeat capture/practice/review. Expect local-save/offline-pending status. Reconnect and expect synced status with no extra records. On the second device, confirm article/task/progress/notes/history restore.
6. At widths 360, 375, 390, 412 and 430, test portrait/landscape, long titles/ruby, sheet scrolling, notes with the keyboard open, bottom safe area and card rating buttons. Existing responsive audit requires a real `OWNER_STORAGE_STATE` kept locally/ignored; never send it in chat.
7. From the installed app, background for several minutes and return; time should exclude the background period. Check update prompt, flush saved state, activate and reopen; learning records must remain. Retain `/api/app-update.html` recovery path.

## Next batch / resume point

After actual core acceptance, expand the very small N4/N3 and A1/A2/C1/C2 libraries with linked grammar-reading-practice pairs, checking each batch against the same audit and mobile cycle. Continue toward the full target without placeholders or duplicate topics. Advanced listening/shadowing, speaking and AI Tutor follow core acceptance; AI and scoring must wait for a real configured server capability. Do not add migrations merely to store these compatible notes.
