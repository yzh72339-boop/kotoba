# 2.8.1 — N2 inference, concession and cause

Date: 2026-10-12. Baseline: Sites `8628c0a4335619b981d778573f1c9f4cd747352b` / GitHub `756df8c6703b2db3c4352f5fd2143b52e70d1c44`, package 2.8.0. Branch: `feature/2-8-n2-inference`. No applicable AGENTS.md was found. Preserve the adopted development plan and existing architecture; this batch continues 2.8, not RC or full-curriculum completion.

## Delivered content

| Retained grammar ID | New original reading | Teaching focus |
|---|---|---|
| grammar-ja-n2-ni-chigainai | article-ja-n2-delivery-inference — 発送の通知、その先は | Strong inference from information, not a confirmed fact |
| grammar-ja-n2-ni-kimatteiru | article-ja-n2-delivery-inference | Subjective conviction, not a delivery guarantee |
| grammar-ja-n2-nimo-kakawarazu | article-ja-n2-final-file — 「最終版」はどれだったか | Result contrary to expectation |
| grammar-ja-n2-monodakara | article-ja-n2-final-file | Explanatory reason / request for understanding |
| grammar-ja-n2-bakari-ni | article-ja-n2-final-file | Regretted cause of an unfavorable consequence |

Two original N2 stories contain 799 and 869 Japanese characters, five aligned Chinese paragraph translations each, literal grammar references, 19 vocabulary references (18 distinct existing cards), and five explained comprehension questions each. Four/five-minute reading estimates explicitly use approximately 200 Japanese characters/minute rounded upward; not measured personal speed or quiz time.

Each reused grammar keeps its four examples, first five exercise IDs/prompts/options/answers and all stored learning identities. Add two contrast exercises each (ten new grammar questions). No old question or course is removed/renamed; existing completed courses are not reset. Previous drafts remain restorable, and additional questions are available in practice. No vocabulary is regenerated; all 927 original/current card payloads remain hash-guarded. The original 667 and 260 contextual additions retain their records and schedules.

The existing catalog compiler, prerequisite planner, pinned daily course IDs, mobile grammar/reader, source capture, SRS and offline download consume these documents. No new schema/state protocol/UI architecture or dependency is introduced. Auth/RLS, migrations 001–011, IndexedDB, owner/project caches, scheduling and sync remain unchanged. No production SQL was run.

## Current qualified coverage

| Language | Grade | Cards | Complete grammar | Complete reading |
|---|---|---:|---:|---:|
| Japanese | N5 | 70 | 10 | 6 |
| Japanese | N4 | 70 | 10 | 5 |
| Japanese | N3 | 81 | 10 | 5 |
| Japanese | N2 | 210 | 54 | 19 |
| Japanese | N1 | 70 | 10 | 5 |
| English | A1 | 70 | 10 | 5 |
| English | A2 | 70 | 10 | 5 |
| English | B1 | 76 | 10 | 5 |
| English | B2 | 70 | 10 | 5 |
| English | C1 | 70 | 10 | 5 |
| English | C2 | 70 | 10 | 5 |
| Total | | 927 | 154 | 70 |

Delta: grammar +0 (five reused/enriched), reading +2, grammar questions +10, reading questions +10, vocabulary cards +0. Explicit grammar-reading coverage: 139 → 144; unlinked: 15 → 10 (nine N2 + one N1). Every grade meets its own phase minimum. Full targets remain 1,260 grammar / 590 reading: 1,106 grammar + 520 reading absent, total gap 1,626. `--require-targets` still exits 1; standards were not lowered.

## Review and current engineering evidence

Editorial self-review distinguishes inference from evidence, conviction from truth, concession from cause, and explanation from responsibility. Nuance descriptions are tendencies: に違いない is not objective proof and に決まっている is not necessarily wrong. Text-supported answers, distractors, source identity, translation alignment and mixed fixed answer positions were checked. Fictional characters/events are not private user data or claims about real businesses. Author review and automated audits do not replace independent Japanese/pedagogical review.

Current TypeScript, zero-warning Lint, 186 Node tests, content/vocabulary audits and production build pass. Existing four linked-course regressions now cover ten grammar IDs and four articles across both batches: original answer identity, prerequisites/linked selection, plan restore through reversed catalog and scope parking, all old five-question drafts, unfinished reading position, per-article collection, preserved SRS, two genuine source links and idempotent errors/results. Test count remains 186; coverage expanded without duplicating the suite. Content audit: zero errors and zero length warnings. Vocabulary audit: zero errors; 19 legacy repeated terms retained.

Current mobile batch passed with no reported errors; the external delivery contains screenshots and recordings. It checked seven course/width combinations at 360/390/430, all seven grammar exercises and all five reading questions per pair, exact answer reload, one completion after double-click, existing vocabulary/SRS/source collection and layout. Both new articles are downloaded through actual content cache for local Service Worker offline note/ID restoration and simulated reconnect, with dark/reduced-motion captures and strict offline save-label checks. Chromium/CDP resets navigator.onLine after cached navigation here; the established runner reapplies browser network conditions to the new document without overriding application/navigator code. Physical offline-status behavior is separate.

The current core runner passed Today → due review → full prerequisite grammar → related reading → 3/3 → Home → reload, one review despite repeated click, source collection, wrong/correct explanations, rapid navigation/Back, dictionary scope change and local offline reload. This constrained profile uses existing motion fallback; it does not establish physical/native FPS. All backend requests are intercepted or blocked; unsigned fixtures cannot authenticate to production.

**Unverified**: real owner CRUD/RLS, physical Android/iOS, real IME/safe area/FPS, second device, installed-PWA update. Static deployment, source push and merging a GitHub PR are separate states; the external native deployment receipt proves publication only.

## Next exact breakpoint

Nine N2 topics remain unlinked: 〜上に, 〜ずにはいられない, 〜ざるを得ない, 〜どころか, 〜どころではない, 〜ほかない, 〜にほかならない, 〜っこない, 〜ことなく. N1 〜限りだ also needs a level-appropriate reading. Next bounded batch should link the necessity/contrast/emotion group (ざるを得ない / ほかない / どころか / どころではない / ずにはいられない), then the remaining N2 group, with separate appropriate N1 coverage. Preserve old IDs and source language/level, audit and verify mobile practice/collection/restore before counting content. Long targets and owner/device acceptance remain independently tracked. Listening/AI require real traceable services, not simulated capability claims.
