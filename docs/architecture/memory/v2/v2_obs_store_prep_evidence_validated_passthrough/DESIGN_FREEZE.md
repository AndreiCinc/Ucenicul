# V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH — Design Freeze

Frozen: 2026-04-24.
Baseline (verified live): `versionId=67cb8545-f1a0-40ab-b8f4-5bf5edd89328`, 49 nodes, 67 connections, active=true.
Pre-snapshot sha256: `bb63069396b347d2dea2f0bd83b25dd7bf37db39e81c9dd93759715a1e22cd43`.

## Q1. Live cartography findings

`ME_Memory_Store_Prep` (post-V2-031) emits `__db` with 16 fields: tenant_id, memory_type, category, content, confidence, importance, durability, source_thread_id, source_message_id, entity_id, evidence_refs, metadata, idempotency_key, **tier, user_confirmed, corroboration_count**. **`evidence_validated` is NOT extracted** — caller value silently dropped; DB inserts default `false`.

`ME_Memory_Store_DB.parameters.query` has 17 binds (`$1..$17`) with embedding CASE-guard at `$17`. INSERT column list: `..., idempotency_key, tier, user_confirmed, corroboration_count, embedding`. **No `evidence_validated` column projection** → DB column gets `false` default on every INSERT.

DB schema: `memory_items.evidence_validated bool NOT NULL DEFAULT false`. **No CHECK constraint** (verified live; no `pg_constraint` row matches `evidence_validated`).

Promote_DB accept predicate (frozen since V2-014) already includes `OR (evidence_validated IS TRUE)` row-persisted disjunct; Promote_Result already pushes `'evidence_validated'` into `acceptance_signals` when `row.evidence_validated === true`. This means **Step 2 is a pure probe** — once Step 1 makes the row state truthful, accept-via-evidence_validated-row works without any further code change.

## Q2. Caller input contract

`step.inputs.evidence_validated`: strict boolean `true | false`. Same shape as `user_confirmed`.

## Q3. In-scope diff

| Node | Field | Change |
|---|---|---|
| `ME_Memory_Store_Prep` | `parameters.jsCode` | extract + safe-default caller `evidence_validated`; add `evidence_validated` to `__db` (right after `corroboration_count`, mirroring pattern) |
| `ME_Memory_Store_DB` | `parameters.query` | INSERT column list +1 (`evidence_validated`); VALUES +1 bind (`$17::boolean`); embedding shifts `$17 → $18` (CASE guard updates) |
| `ME_Memory_Store_DB` | `parameters.options.queryReplacement` | 17 → 18 slots in both branches; new slot 17 = `$json.__db.evidence_validated`; embedding_text shifts to slot 18 |

## Q4. Out of scope

- All other nodes (Search/Recall/Promote/Supersede/RA/F6A embed/F6A-FOLLOWUP supersede embed) — byte-identical.
- Promote_DB SQL — already accepts via `evidence_validated IS TRUE`; no change.
- Promote_Result jsCode — already reports `acceptance_signals:['evidence_validated']`; no change.

## Q5. Defaults preserved on omit

Caller omits `evidence_validated` → Prep sets `__db.evidence_validated = false` → DB row gets `false` (matches DB default). Byte-equivalent to pre-patch behavior for callers that omit.

## Q6. Invalid normalization policy

Same as `user_confirmed`: strict boolean check. Anything other than `true`/`false` (string `"true"`, integer `1`, `null`, etc.) defaults to `false`. Mirror of V2-031 user_confirmed validation.

## Q7. SQL bind shift

Pre: 17 binds, `$17::vector(1536)` for embedding.
Post: 18 binds. New `$17::boolean` for evidence_validated. Embedding shifts to `$18::vector(1536)` (CASE guard `$18::text IS NULL ...`).

UNION ALL fallback uses `$13::text` for idempotency_key — unchanged (slot 13 still idempotency_key).

## Q8. queryReplacement

Pre (17): `[..., $json.__db.idempotency_key, $json.__db.tier, $json.__db.user_confirmed, $json.__db.corroboration_count, $json.__db.embedding_text]`
Post (18): `[..., $json.__db.idempotency_key, $json.__db.tier, $json.__db.user_confirmed, $json.__db.corroboration_count, $json.__db.evidence_validated, $json.__db.embedding_text]`

Error branch: 17 NULLs → 18 NULLs.

## Q9. DS-INV-1..14 (diff-surface invariants)

| DS-INV | Assertion |
|---|---|
| DS-INV-1 | Only Store_Prep + Store_DB change |
| DS-INV-2 | Store_DB UPDATE/CTE shape unchanged; only INSERT projection + queryReplacement grow |
| DS-INV-3 | Store_Embed + Store_Embed_Merge byte-identical |
| DS-INV-4 | Supersede lane (Prep + Embed + Embed_Merge + DB + Result) byte-identical |
| DS-INV-5 | Search / Recall / Promote / RA / Routers / Result byte-identical |
| DS-INV-6 | Store_Prep output preserves V2-031 fields (tier/user_confirmed/corroboration_count) byte-identically |
| DS-INV-7 | Caller `evidence_validated:true` → `__db.evidence_validated=true` |
| DS-INV-8 | Caller `evidence_validated:false` → `__db.evidence_validated=false` |
| DS-INV-9 | Caller omit → `__db.evidence_validated=false` |
| DS-INV-10 | Invalid type (string/int/null/object) → `__db.evidence_validated=false` |
| DS-INV-11 | Store_DB SQL has 18 distinct bind slots (`$1..$18`); `$17::boolean` for evidence_validated; `$18::vector(1536)` CASE guard |
| DS-INV-12 | queryReplacement success branch: 18 `$json.__db.*` refs ending with `evidence_validated, embedding_text`; error branch: 18 NULLs |
| DS-INV-13 | Settings unchanged |
| DS-INV-14 | nodeCount=49, connectionCount=67 |

## Q10. BUILD-INV-1..10

Standard deterministic-build asserts (rerun byte-identical, only 2 nodes modified, non-target byte-identical, etc.) — same template as V2-031.

## Q11. Test mapping (4×50 = 200)

| Pack file | Scope | Maps to DS-INV |
|---|---|---|
| `unit_store_prep_evidence_validated_50.json` | EVU-01..50 | DS-INV-7..10 + V2-031 regression (DS-INV-6) |
| `runtime_store_prep_evidence_validated_50.json` | live execute_workflow Store happy/error paths | DS-INV-7/8/9, embedding intact |
| `e2e_store_prep_evidence_validated_50.json` | persist + readback + idempotency + non-target regression | full 14 DS-INV against live state |
| `sql_store_prep_evidence_validated_50.sql` | SELECT-only DB invariants | DS-INV-7/8 row-state + idempotency + non-namespace untouched |

## Rollback

Pre snapshot at `artifacts/WF-ME-01_pre_evpt.json` sha256 `bb630693…`. Rollback = `n8n-patch.mjs replace uq26nh1grIpnHju0 <pre snapshot>`.
