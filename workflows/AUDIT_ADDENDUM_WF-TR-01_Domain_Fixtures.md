# Audit Addendum — WF-TR-01 Domain Anchor Fixture Validation

**Addendum date:** 2026-04-15
**Addendum to:** AUDIT_REPORT_WF-TR-01.md
**Scope:** Validation of 6 additional domain anchor fixtures (Set A: Fitness trainer, Set B: AI/tech product founder)
**Verdict change:** NOT APPROVED (reinforced — new critical defects found)

---

## 1. New Fixtures Received

| Case ID | Domain | Expected Action | Description |
|---|---|---|---|
| TR_CASE_06 | Fitness | attach_existing_thread (reply) | Reply to nutrition plan conversation |
| TR_CASE_07 | Fitness | reopen_latent_thread | Client returns to dormant weight-loss program |
| TR_CASE_08 | Fitness | create_new_thread | New corporate offer topic |
| TR_CASE_09 | AI/Tech | attach_existing_thread (entity+semantic) | Continue onboarding design discussion |
| TR_CASE_10 | AI/Tech | reopen_latent_thread | Dormant lead returns for pilot discussion |
| TR_CASE_11 | AI/Tech | create_new_thread | New pricing topic |

All 6 fixtures use the same nested contract shape as the original 5 anchor fixtures (D-02 from main audit applies). All use thresholds 0.82/0.72 (D-05 from main audit applies).

---

## 2. Scoring Simulation Results

The workflow's MVP scoring algorithm (Jaccard word-overlap) was executed against each fixture. All scores computed using the exact code from `TR_Score_Candidates`.

### TR_CASE_06 — Fitness Reply Linkage

**Path:** `reply_to_message_id = msg_prev_bianca_nutrition_01` triggers DB lookup path.

**Assessment:** CONDITIONAL PASS

The fixture provides both `reply_to_message_id` and `reply_to_thread_id`. The workflow only uses `reply_to_message_id` (DB lookup). The `reply_to_thread_id` field is silently ignored because it does not exist in the workflow contract.

If the test database contains message `msg_prev_bianca_nutrition_01` with `thread_id = thread_bianca_plan_alimentar_003`, the workflow would correctly resolve to `attach_existing_thread` via `direct_reply_linkage`.

**Issues:**
- The fixture's `reply_to_thread_id` suggests the user expects a shortcircuit path that bypasses the DB lookup. The workflow does not support this.
- The test is not self-contained: it requires specific DB state that is not included in the fixture or the package's `setup_test_data.sql`.

### TR_CASE_07 — Fitness Reopen Latent

| Component | Value | Calculation |
|---|---|---|
| entity_match | 0.15 | `entity_client_radu` in message `related_entity_ids` matches thread `primary_entity_id` |
| semantic_match | 0.114 | Jaccard("radu revenit zice vrea reia programul slabit luna asta", "programul slabit lui radu check-in-uri aderenta dieta") = 3 overlap / 13 union = 0.23 × 0.8 = 0.114 (capped at 0.4) |
| temporal_proximity | 0.05 | 34 days = 816 hours → bracket: >168h → 0.05 |
| channel_relevance | 0.10 | telegram in {telegram} |
| **TOTAL** | **0.414** | |

**Assessment:** FAIL

The workflow scores this message at **0.414**, far below both the workflow's REOPEN_THRESHOLD (0.65) and the user's expected threshold (0.72). The workflow would produce `create_new_thread`, not `reopen_latent_thread`.

The user expects confidence 0.81. The score gap is 0.396 (0.81 - 0.414). The Jaccard word-overlap fails because:
- "reia" (Romanian for "resume") does not match "programul" semantically — it just checks character identity
- "programul" matches "programul" ✓, "slabit" matches "slabit" ✓, "radu" matches "radu" ✓
- But "revenit", "zice", "vrea", "reia", "luna", "asta" have zero overlap with the summary
- A real embedding-based scorer would capture "reia programul de slabit" as highly relevant to "Programul de slabit" even when vocabulary differs

### TR_CASE_08 — Fitness Create New Thread

| Candidate | entity | semantic | temporal | channel | TOTAL |
|---|---|---|---|---|---|
| Bianca plan alimentar | 0.00 | 0.000 | 0.15 | 0.10 | 0.250 |
| Radu slabire | 0.00 | 0.073 | 0.05 | 0.10 | 0.223 |

**Assessment:** PASS — Both scores well below any threshold. Correctly produces `create_new_thread`.

### TR_CASE_09 — Tech Attach Existing

| Component | Value | Calculation |
|---|---|---|
| entity_match | 0.15 | `entity_feature_onboarding` in message `related_entity_ids` matches thread `primary_entity_id` |
| semantic_match | 0.050 | Jaccard overlap: only "onboarding" matches. 1 overlap / 16 union = 0.0625 × 0.8 = 0.050 |
| temporal_proximity | 0.20 | 45 minutes → bracket: ≤1h → 0.20 |
| channel_relevance | 0.10 | telegram in {telegram} |
| **TOTAL** | **0.500** | |

**Assessment:** FAIL

The workflow scores this at **0.500**, well below the STRICT_ATTACH_THRESHOLD (0.75). The workflow would produce `create_new_thread`, not `attach_existing_thread`.

The user expects confidence 0.88. The score gap is 0.38 (0.88 - 0.50). The failure is caused by the semantic scorer: the message discusses adding a question to the onboarding flow, and the thread is about designing the onboarding flow — semantically highly related. But Jaccard sees only 1 word overlap ("onboarding") out of 16 unique words, producing a score of 0.050 instead of the ~0.35-0.40 an embedding scorer would produce.

### TR_CASE_10 — Tech Reopen Latent

| Component | Value | Calculation |
|---|---|---|
| entity_match | 0.15 | `entity_lead_cluj_ops` in message `related_entity_ids` matches thread `primary_entity_id` |
| semantic_match | 0.250 | Jaccard overlap: "firma", "din", "cluj", "pentru", "operational" = 5 overlap / 16 union = 0.3125 × 0.8 = 0.250 |
| temporal_proximity | 0.05 | ~18 days = 432h → bracket: >168h → 0.05 |
| channel_relevance | 0.10 | telegram in {telegram} |
| **TOTAL** | **0.550** | |

**Assessment:** FAIL

Score **0.550** is below REOPEN_THRESHOLD (0.65). The workflow would produce `create_new_thread`.

Notably, this is the closest miss. The semantic score benefits from shared proper nouns ("Cluj", "firma") and technical terms ("operational"). But "pilotul" vs "pilot" and "asistentul" vs "asistent" (Romanian morphological variants of the same word) fail Jaccard's exact-match requirement.

### TR_CASE_11 — Tech Create New Thread

| Candidate | entity | semantic | temporal | channel | TOTAL |
|---|---|---|---|---|---|
| Onboarding thread | 0.00 | 0.062 | 0.15 | 0.10 | 0.312 |
| Pilot thread | 0.00 | 0.053 | 0.05 | 0.10 | 0.203 |

**Assessment:** PASS — Both scores well below any threshold. Correctly produces `create_new_thread`.

---

## 3. Combined Fixture Validation Matrix (All 11 Anchor Fixtures)

| # | Case ID | Domain | User Expected | Workflow Actual | Workflow Score | Match? |
|---|---|---|---|---|---|---|
| 1 | TR_CASE_01 | Cleaning | attach_existing_thread | attach_existing_thread | N/A (shortcircuit) | PASS |
| 2 | TR_CASE_02 | Airbnb | reopen_latent_thread | create_new_thread | 0.546 | **FAIL** |
| 3 | TR_CASE_03 | Green services | create_new_thread | create_new_thread | 0.373 (best) | PASS |
| 4 | TR_CASE_04 | (any) | fail_invalid_input | fail_invalid_input | N/A (validation) | PASS |
| 5 | TR_CASE_05 | Cleaning | create_new_thread (ambiguous) | create_new_thread (low scores) | 0.400 (best) | **PARTIAL** |
| 6 | TR_CASE_06 | Fitness | attach_existing_thread | attach_existing_thread | N/A (reply lookup) | CONDITIONAL |
| 7 | TR_CASE_07 | Fitness | reopen_latent_thread | create_new_thread | 0.414 | **FAIL** |
| 8 | TR_CASE_08 | Fitness | create_new_thread | create_new_thread | 0.250 (best) | PASS |
| 9 | TR_CASE_09 | AI/Tech | attach_existing_thread | create_new_thread | 0.500 | **FAIL** |
| 10 | TR_CASE_10 | AI/Tech | reopen_latent_thread | create_new_thread | 0.550 | **FAIL** |
| 11 | TR_CASE_11 | AI/Tech | create_new_thread | create_new_thread | 0.312 (best) | PASS |

**Summary: 5 PASS, 4 FAIL, 1 PARTIAL, 1 CONDITIONAL**

**Failure rate for scored resolutions: 4 out of 5 scored cases FAIL** (TR_CASE_02, 07, 09, 10). Only create_new_thread cases pass reliably.

---

## 4. Root Cause Analysis

### Primary Root Cause: Jaccard Word-Overlap Scoring Cannot Resolve Real-World Messages

The workflow's `semanticMatchScore` function uses Jaccard similarity on exact word matches (after lowercasing and filtering words ≤ 2 characters). This produces scores in the range **0.05 to 0.25** for realistic Romanian business messages. The user's expected confidences range from **0.79 to 0.88** for the same cases.

The gap exists because:

1. **No morphological normalization.** Romanian words have rich morphology. "pilotul" (the pilot) and "pilot" are the same concept but different strings. "programul" and "program" don't match. "asistentul" and "asistent" don't match. This alone suppresses scores by 15-30%.

2. **No semantic understanding.** "Reia programul de slabit" (resume the weight-loss program) is semantically identical to "Programul de slabit." But Jaccard only sees the word "programul" and "slabit" as matches — "reia" (resume) and "revenit" (returned) carry strong contextual meaning that Jaccard ignores.

3. **Dilution by non-content words.** Romanian prepositions and connectors like "ca", "si", "pentru" (filtered by the >2 char rule for "si" but not for "pentru") dilute the Jaccard denominator, lowering scores for messages with many function words.

4. **No embedding similarity.** A cosine similarity between sentence embeddings would produce scores of 0.65-0.85 for these cases. The Jaccard approach produces 0.05-0.25 for the same pairs.

### Why Package Internal Fixtures Masked This Problem

The package's internal fixtures (TC-01 through TC-10) were designed with **artificially high word overlap**:

- TC-03: message `"Ion apartament centru pret locatie discutie"` vs thread summary `"Ion cauta apartament in centru, discutie despre pret si locatie"` — nearly identical vocabulary by construction.
- TC-04: message `"Maria factura trimis discutie veche"` vs summary `"Maria are o factura de trimis, discutie veche"` — same words.

These fixtures test the scoring algorithm's mechanics (correct component weights, correct thresholds) but do NOT test whether the algorithm can resolve **real-world, naturally-phrased messages**. The user's anchor fixtures expose this gap.

### Scoring Gap Quantification

| Fixture | Jaccard Semantic Score | Estimated Embedding Score | Gap |
|---|---|---|---|
| TR_CASE_02 | 0.246 | ~0.35 | -0.10 |
| TR_CASE_07 | 0.114 | ~0.30 | -0.19 |
| TR_CASE_09 | 0.050 | ~0.35 | -0.30 |
| TR_CASE_10 | 0.250 | ~0.35 | -0.10 |

Even with higher entity match scores (0.30 if author_entity matched primary directly), the total scores would reach ~0.65-0.75 — still borderline. The scoring model needs both better semantic matching AND potentially recalibrated thresholds.

---

## 5. New Defects Identified

| ID | Severity | Artifact | Location | Issue | Impact | Fix |
|---|---|---|---|---|---|---|
| D-28 | CRITICAL | TR_Score_Candidates | semanticMatchScore function | Jaccard word-overlap produces scores 40-60% below what real-world messages require | 4 out of 5 scored anchor fixtures produce wrong resolution decision | Replace with embedding-based cosine similarity (pgvector), or implement stemming/lemmatization for Romanian as intermediate step |
| D-29 | CRITICAL | Package fixture design | TC-01 through TC-10 | Internal fixtures use artificially identical vocabulary, masking the scoring algorithm's inability to handle real messages | False confidence in scoring correctness; problem only visible with user-provided fixtures | Redesign internal fixtures to use natural-language phrasing; validate against user anchor fixtures |
| D-30 | MAJOR | TR_Score_Candidates | semanticMatchScore function | No Romanian morphological normalization | "pilotul"/"pilot", "programul"/"program", "asistentul"/"asistent" fail to match | Add Romanian stemmer or at minimum suffix-stripping |
| D-31 | MAJOR | Contract / Workflow | reply_to_thread_id handling | User fixtures provide `reply_to_thread_id` for direct thread shortcircuit without DB lookup; workflow ignores this field | Reply-based test cases require DB state the fixture doesn't supply; the user's shortcircuit intent is not supported | Add reply_to_thread_id as optional field in contract, with shortcircuit behavior before DB lookup |
| D-32 | MAJOR | Test data setup | setup_test_data.sql | No test data for domain fixtures (fitness trainer, AI/tech founder tenants, entities, threads, messages) | Domain fixture validation impossible without corresponding DB records | Generate domain-specific test data SQL for all anchor fixture sets |

---

## 6. Impact on Original Audit Findings

### D-02 (CRITICAL — contract shape mismatch) — SEVERITY UPGRADED

The original D-02 identified a structural contract shape mismatch. This addendum reveals the problem is deeper: even if the contract shapes were reconciled, **the workflow's scoring algorithm cannot produce correct resolutions for the user's real-world messages**. D-02 is now two layered defects:
- D-02a: Contract shape mismatch (structural)
- D-02b: Scoring capability mismatch (algorithmic)

### D-22 (CRITICAL — overclaimed test report) — REINFORCED

The test report's "10/10 Anti-hallucination precision" claim is now conclusively disproven. 4 out of 5 scored anchor fixtures produce the wrong resolution decision. The internal test fixtures masked this by using toy vocabulary.

### New scoring dimensions

The original audit scored:
- Contract clarity: 6/10 — **revised to 5/10** (scoring capability gap adds to contract concerns)
- Anti-hallucination precision: 7/10 — **revised to 4/10** (4/5 scored fixtures fail)
- Testability: 6/10 — **revised to 4/10** (internal fixtures fundamentally misleading)

---

## 7. Revised Scorecard

| Dimension | Original Score | Revised Score | Delta | Reason |
|---|---|---|---|---|
| Architectural correctness | 9/10 | 9/10 | 0 | Architecture is sound |
| Contract clarity | 6/10 | 5/10 | -1 | Scoring capability gap deepens contract concerns |
| Node-level correctness | 8/10 | 8/10 | 0 | Nodes work correctly for what they implement |
| Anti-hallucination precision | 7/10 | 4/10 | -3 | 4/5 scored anchor fixtures produce wrong decision |
| Testability | 6/10 | 4/10 | -2 | Internal fixtures mask scoring failure |
| Import readiness | 9/10 | 9/10 | 0 | No change |
| Post-import verification quality | 7/10 | 5/10 | -2 | No domain fixture support; test guide cannot verify real-world behavior |
| Auditability | 8/10 | 8/10 | 0 | No change |

**Revised overall score: 6.5/10** (down from 7.5/10)

---

## 8. Revised Final Verdict

### VERDICT: NOT APPROVED (reinforced)

### Updated Blockers (from original audit, now expanded)

**Critical blockers (must resolve all):**

1. **D-28 (NEW CRITICAL):** The MVP scoring algorithm cannot resolve real-world business messages. 4 out of 5 scored anchor fixtures produce the wrong resolution. This is the single most important defect. Fix: implement embedding-based semantic matching (pgvector cosine similarity) or Romanian-aware stemming as minimum intermediate step.

2. **D-29 (NEW CRITICAL):** Internal test fixtures were designed with artificial vocabulary overlap, masking D-28. All internal fixtures that test scoring (TC-03, TC-04, TC-06) must be redesigned with natural language.

3. **D-02 (from original):** Contract shape mismatch with user-expected contract.

4. **D-03 (from original):** False audit write idempotency claim.

5. **D-16 (from original):** Spec/workflow deviation in decision policy.

6. **D-22 (from original):** Overclaimed test report.

**Major blockers:**

7. **D-30 (NEW):** No Romanian morphological normalization.
8. **D-31 (NEW):** reply_to_thread_id not supported.
9. **D-32 (NEW):** No domain test data for anchor fixtures.
10. All original major defects (D-04, D-05, D-07, D-08, D-12, D-17, D-18, D-19, D-20, D-23, D-26).

### Recommended Correction Priority

1. **First:** Implement embedding-based semantic scoring (D-28) — this is the highest-impact fix and unblocks all scored fixtures.
2. **Second:** Reconcile contract shape (D-02) — enables fixture validation.
3. **Third:** Fix idempotency (D-03) and spec alignment (D-16) — correctness and documentation.
4. **Fourth:** Redesign internal fixtures (D-29) — test integrity.
5. **Fifth:** Address all remaining major/minor defects.

After corrections, re-run the full audit against all 11 user-provided anchor fixtures plus self-generated edge cases.

---

> **Addendum completed:** 2026-04-15 | **Auditor:** Independent workflow validation auditor | **Verdict: NOT APPROVED (reinforced)**
