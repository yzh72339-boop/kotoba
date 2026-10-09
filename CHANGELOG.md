# Changelog

## 2.7.0 — 2026-10-09

- Retain the silver/graphite/blue system and interruptible shared-course transitions. Course browsing no longer labels every grammar as today's assigned task; the top bar changes surface gently after scrolling without changing its height.
- Mobile vocabulary uses a vertical list and focused, scrollable word sheet. Switching language/level clears stale searches, selections and flashcard runs; external word selections remain usable on first mount.
- Add 220 original vocabulary cards: 20 per JLPT/CEFR grade. All 667 old payloads and IDs remain byte-for-byte compatible; duplicate older source terms are retained to protect existing records.
- Add current-grade vocabulary references to existing readings and share strict whole-word/phrase matching with audits. Existing article/course IDs and question ordering remain stable.
- Add N5 `朝の図書館で` and N2 `直せることと、約束できること`, with aligned translations, linked grammar/vocabulary and five explained questions each. Foundation prerequisites now have a linked reading rather than an unrelated N2 fallback.
- A completed prior-day plan no longer appears as today's completed progress. Completed-plan CTAs explain the next course pair; Learn shows enrolled due reviews rather than confusing all unseen cards with due cards. Reading labels, source capture and speech use the displayed content's language and grade.
- Version, lockfile metadata, settings and generated worker build identity use 2.7.0. No dependency versions, migrations, Auth/RLS, SRS semantics or sync protocol were changed.

Verification and remaining acceptance: [V2.7 checkpoint](docs/KOTOBA-2.7-CHECKPOINT.md). This is not a complete 1,260/590 curriculum or exhaustive dictionary.
