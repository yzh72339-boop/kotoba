# Curriculum batch 02 and V3.1 language tools

This batch adds **11 grammar /5 original reading documents**, without revising any of the 241 previous course documents or 927 word payloads. The previous baseline IDs/hash are frozen in tests; old tests were scoped to those IDs so later additions do not masquerade as changes to existing material.

| Level | Added grammar | Added reading | Current full grammar | Current full reading |
|---|---:|---:|---:|---:|
| Japanese N4 | 7 | 3 | 17 | 8 |
| English C1 | 2 | 1 | 12 | 6 |
| English C2 | 2 | 1 | 12 | 6 |

Other levels are unchanged. Current overall **927 words /177 grammar /80 reading**, all 177 grammar topics explicitly linked to at least one article. Remaining full targets: **1,083 grammar /510 reading**. Strict `--require-targets` continues to fail; the 1,260/590 goals are retained.

N4 topics: potential forms, volitional forms, volitional + と思う／と思っている, passive, causative, ば and たら. Already-present ようになる／ようにする／ことにする／ことになる were not duplicated or reclassified. New prerequisite relationships are acyclic and point to actual existing IDs; new courses do not rewrite the prior N2 prerequisite chains. Advanced-course preparatory suggestions remain a follow-up.

C1: stipulated provided conditions and parallel whereas contrasts. C2: corrective not so much X as Y and formal concessive Be that as it may. Each topic has four examples, five explained exercises, contextual distinctions/mistakes and references. Open answers remain self-assessed against a reference, with no fake semantic AI scoring.

N4 readings: 最初の読書会, 自分で選ぶページ, 雨の日の待ち合わせ (230/246/237 Japanese characters). C1: What counts as a useful opening? (670 words). C2: A label that leaves room to disagree (964 words). Each has aligned Chinese paragraph translations, genuine existing vocabulary, linked grammar and five evidence-backed comprehension questions. The advanced texts distinguish counts from purposes, evidential weight, interpretation, concessions, uncertainty and register; they are not padded beginner stories. People/events are fictional original teaching contexts. Minutes are transparent estimates (Japanese 200 characters/minute; English 180 words/minute).

Editorial self-review checked form, kana, translations, question evidence, distractors and fixed answer mapping. Schema, near-duplicate/reference/length checks pass. Independent native-speaker/teacher certification has not been performed. Automatic analyzer outputs are explicitly tentative and do not override the authored lessons.

Language tool adapters and bounded limitations are described in OPEN-SOURCE-REVIEW-V3.1.md. In particular, reading as a noun must not be forcibly mapped to the verb read; real browser tests collect written → write with the actual clicked paragraph. Japanese single-kanji fragments and common/multiple-reading ambiguities are left unannotated. Full arbitrary Japanese morphological annotation remains deferred.

Next content: expand N4 practice/reader variety and actual prerequisite suggestions, then further C1/C2 units. Next integration: evaluate optional morphology dictionary downloads in a worker against real phone memory/latency and editorial fixtures before enabling full furigana. Production device/account acceptance and the existing build-dependency advisory review remain distinct tasks. Do not replay SQL, change RLS/Auth/SRS or clear learning data to fix UI/model loading.
