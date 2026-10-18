# 3.1.0-preview.10 — vocabulary from complete learning contexts

Based on preview.9 source `6c71303` / public `56f5c76`. Preserve original298 complete courses,927 original word payloads/IDs, account isolation, Auth/RLS, quota, SRS dates, notes, snapshots, downloads and sync. No dependency upgrade, schema or historical migration change.

## Actual additions

-12 N2-context Japanese cards:配置、回収、設置、補足、照合、窓口、用紙、記載、訂正、記名、貸出、保管.
-12 B2-context English cards:label,draft,entry,duplicate,revision,request,receipt,retain,clarify,specify,checklist,inventory.
- Each is a globally new term in the current language, with a stable context-ID, kana or broad British-oriented IPA, Chinese meaning, original example/translation, POS, senses, collocation and source reference. Grade/frequency are editorial teaching classifications, not an official exhaustive list or measured personal/corpus statistic. Existing homonyms/repeated source cards remain untouched.
- New N2 grammar:最中に (an event during an ongoing activity), ようでは (an inadequate condition and its consequence). New B2 grammar:be/get used to (state/process versus past habit), needn’t have done (completed but unnecessary action versus lack of necessity). Four examples/five explained exercises each, comparisons/prerequisites and fixed answer mapping. Free-text contractions accept typographic and ordinary apostrophes.
- Two original readers:二枚の用紙と一つの箱 (854 Japanese characters), Saved before the second form (411 English words). All24 new cards have actual literal source occurrences in the reader for their language; each has aligned translations, both new grammar links and five explained comprehension questions. No public/private data handling standard is asserted by these fictional teaching scenarios.
-16 examples +20 grammar exercises +10 comprehension questions. Internal editing checks meaning, readings/IPA, noun/verb use (duplicate as noun), actual source occurrence, translations, option distribution and evidence for answers. External/native-speaker review remains pending.

## Preservation and counts

Historical tests previously fixed the entire future catalog at927 words. They now select those927 explicitly frozen IDs while retaining the same original payload hash/count assertions. New tests separately freeze the24 complete distinct additions, verify current catalog ID uniqueness and actual reader links, and preserve the951-card baseline without capping later expansion. This permits additions without weakening detection of deleted/changed historical cards; no old expected payload hash was replaced.

|Scope|Before|Added|After|
|---|---:|---:|---:|
|Vocabulary cards|927|24|951|
|Complete grammar|204|4|208|
|Complete readers|94|2|96|
|N2 grammar / reading|67 / 25|2 / 1|69 / 26|
|B2 grammar / reading|12 / 6|2 / 1|14 / 7|

Original298 document payloads and927 word payloads remain exact. All208 grammar have reader links; first-stage coverage remains met. Full1260/590 library still lacks1052grammar +494readers =1546 units; strict targets remain exit1. Time rules remain200 Japanese characters/minute,160 English words/minute, rounded up.

## Existing system reused

The24 words extend the existing per-grade contextual JSON arrays and compiler; no second dictionary/index/scheduler. Reading, dictionary, vocabulary courses and SRS see the same original new-card IDs. WanaKana alias search findsmadoguchi→窓口; real wink source analysis findsretained→retain, with the actual clicked paragraph preserved. No new third-party package/model or guessed meaning is introduced.

Regression checks freeze old IDs/payloads, verify current card uniqueness and completeness, preserve old SRS dates on duplicate collection, retain one source, restore pinned daily courses and answer mappings across language switches/backup, and audit all literal references. Required checks: typecheck, zero-warning lint, all tests, content/vocabulary audits and production build.

`UI_AUDIT_V31_COURSES=batch08 node --import tsx scripts/mobile-ui-audit.mjs` exercises four actual course pairs: all at390px, first at360px, last at430px in dark/reduced-motion. New words are searched/collected using actual kana/English source forms; practice, source, duplicate completion, refresh and layout are checked. Both new readers run downloaded offline answer/note/reload and simulated reconnect. Final exact results/build/publication/screenshots/recordings are in the delivery receipt.

Real compiled Chromium/UI/language worker/IDB/SW with simulated accounts/backend does not verify a physical Android/installed PWA, real owner/cloud private writes/RLS negatives or second device. Those remain unverified absent separate evidence. Production source/metadata and browser tests are reported separately.

No SQL, RLS bypass, quota change, forced scheduler migration, data clearing or APK re-signing. GitHub draft/source push and explicit native Sites publication remain distinct. Next: continue all-grade reviewed vocabulary/topic units and real account/device plus external teaching acceptance; preserve the full target standard and unknown-analysis safeguards.
