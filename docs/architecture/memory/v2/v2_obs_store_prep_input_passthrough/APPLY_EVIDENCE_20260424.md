# V2-OBS-STORE-PREP-INPUT-PASSTHROUGH — Apply Evidence (2026-04-24)

Canonical channel: V2-028 autonomous agent-run local `n8n-patch.mjs replace`.

## Pre-state

| Field | Value |
|---|---|
| versionId | `13e8e767-0b0e-401a-b3da-7db94e1f926a` |
| nodeCount | 49 |
| connectionCount | 67 |
| active | true |
| pre snapshot sha256 | `51ab7bc9860dffcee9a823ff7afa1f7de02877b9e434c588152e5015e4479a1d` |
| post snapshot sha256 | `bd2f0dc360a8f426ceb261e30d7874cc58272631463661b0146e15154301bb6f` |
| Store_Prep jsCode sha256 (staged + live) | `439837d182b97b2b9f4a762f50b34c974a2a0d360d51bb0e27f7b3f9f1a7f04b` |

## Post-state

| Field | Expected | Got |
|---|---|---|
| versionId | new ≠ baseline | `0bf42f1b-97d1-4b98-a5ff-258427cb2a81` |
| nodeCount | 49 | 49 |
| connectionCount | 67 | 67 |
| active | true | true |

## Diff-surface

| DS-INV | Check | Result |
|---|---|---|
| DS-INV-1 | Only Store_Prep + Store_DB changed | **GREEN** |
| DS-INV-2 | Store_DB SQL only INSERT/queryReplacement grew; UPDATE/CTE unchanged | **GREEN** |
| DS-INV-3 | Store_Embed + Store_Embed_Merge byte-identical | **GREEN** |
| DS-INV-4 | Supersede lane byte-identical | **GREEN** |
| DS-INV-5 | Search / Recall / Promote / RA / Routers / Result byte-identical | **GREEN** |
| DS-INV-11 | Store_DB SQL has 17 distinct binds (`$1`..`$17`); `$17::vector(1536)` CASE-guard present | **GREEN** |
| DS-INV-12 | queryReplacement: success branch 17 `$json.__db.*` refs (includes tier/user_confirmed/corroboration_count/embedding_text); error branch 17 NULLs | **GREEN** |
| DS-INV-13 | Settings unchanged | **GREEN** (`n8n-patch.mjs replace` filters settings through OpenAPI whitelist; no drift) |
| DS-INV-14 | Node count 49; connection count 67 | **GREEN** |

Live merge/prep hashes reconciled: live Store_Prep jsCode byte-identical to the candidate in harness/store_prep_candidate.mjs (after the `$()` lift) — same validation logic, same defaults.
