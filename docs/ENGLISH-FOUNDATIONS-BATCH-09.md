# 3.1.0-preview.11 — A1/B1 contextual learning

Base: Sites b0bd76d / public f9998d0 (preview.10). Preserve all304 prior complete documents and951 vocabulary payloads/IDs, account isolation, Auth/RLS, quota, existing SRS due dates, notes, snapshots, downloads and sync. No dependencies or schema changes; no historical migration replay/edit.

## Actual additions

- A1 grammar: imperatives (base verb, do not, please) and place prepositions (under, behind, between A and B). Reader: **The yellow key**, original school reading-room story;168 English words, five aligned paragraph translations, five explained questions, both grammar references.
- B1 grammar: present perfect continuous (activity vs completed quantity, since/for, state-verb caution) and purpose (to/in order to versus so that with a separate subject, purpose not proof of result). Reader: **A queue moves inside**, original volunteer handover story;307 English words, five aligned paragraph translations, five explained questions, both references.
- Each grammar has4 natural examples with translations, usage/formation/nuance, common mistakes, comparison, meaningful prerequisites, and5 explained exercises. Correct multiple-choice positions vary; text answers accept straight/curly contractions where relevant. Four topics add16 examples +20 grammar exercises; two readers add10 comprehension questions.
-24 globally new context cards: A1 desk,key,pen,pencil,paper,green,yellow,under,behind,between,put,open; B1 queue,shift,deliver,pack,sort,parcel,delay,supply,separate,check,update,entrance. Stable new IDs, broad British-oriented IPA, meanings, original examples/translations, POS, senses/collocations and source. All12 of each grade occur in its actual reader. These are editorial context grades/frequencies, not official exhaustive/corpus facts. The19 legacy repeated terms remain unchanged.

Totals: **975 vocabulary /212 complete grammar /98 readers**. A1 and B1 each12 grammar/6 readers. All212 grammar linked. Full1260/590 target still lacks1048 grammar +492 readers =1540 units; strict audit must retain exit1.

## Integration and regression scope

The existing per-grade JSON/compiler, lazy reader loading, WanaKana and actual wink/Kuroshiro local workers are reused. No second vocabulary index, scheduler or backend. Actual English source-form search keys→key and delivering→deliver uses real local wink output, then original IDs/source notes and existing SRS. Model initialization remains explicit and optional; unknown forms do not create guessed cards or meanings.

New regression tests protect the exact304/951 historical payloads; verify grade/length/links/answers; pin actual course IDs across same-language level changes, Japanese/English switches, backup and catalog reorder; retain selected practice/answer mappings; preserve old SRS dates on duplicate collection and avoid repeated completion. The24 new payloads are independently frozen without capping later catalog expansion.

`UI_AUDIT_V31_COURSES=batch09 node --import tsx scripts/mobile-ui-audit.mjs` checks all4 real course pairs at390px, first at360 and last at430 dark/reduced-motion. It exercises explained practice/refresh, related reader, lookup/duplicate collection and source identity, existing article-scoped SRS/source/reload, comprehension and one completion. Both new readers must separately pass downloaded offline question/note/reload and simulated reconnect. Update QA compares the actual archived preview.10 worker to this clean build. Exact results, screenshots, recording, performance and publication are recorded in the delivery receipt, not presumed here.

Real compiled browser/workers/SW/IDB with isolated fixture accounts/backend is not a physical phone, installed PWA, real owner/RLS-negative or second-device acceptance. External/native-speaker review remains pending; internal editing checks natural expression, meanings, IPA, source evidence, translations, distractors and mapping. No claim that a fictional teaching story defines a real food-service standard.

## Resume

Run existing typecheck/lint/tests/content:audit/vocabulary:audit/build once per changed batch; report require-targets honestly. Publish through the existing Sites audience/domain with exact pushed source/archive; GitHub draft/CI is separate from Sites deployment. No automatic CD, account reset, data clearing, quota change, or APK signing change.

Next: strengthen thin Japanese N3/N1 contextual chains and grade-appropriate source vocabulary, then continue all-level targets. Physical-device/real-account acceptance remains a separate evidence task. Preserve all known IDs, prior hashes and scheduling semantics.
