# V2-OBS-STORE-PREP-INPUT-PASSTHROUGH — Design Freeze

Frozen: 2026-04-24.
Baseline: `versionId=13e8e767-0b0e-401a-b3da-7db94e1f926a`, 49 nodes, 67 connections, active=true.
Pre-snapshot sha256 `51ab7bc9860dffcee9a823ff7afa1f7de02877b9e434c588152e5015e4479a1d`.

## Q1. What exact live Store_Prep field paths are currently hardcoded?

**Not hardcoded *in Prep* — silently dropped.** The live `ME_Memory_Store_Prep.parameters.jsCode` extracts 13 fields from `step.inputs` and writes them into `__db`. It does NOT extract:

- `inputs.tier`
- `inputs.user_confirmed`
- `inputs.corroboration_count`
- `inputs.evidence_validated` (not listed in mission brief but also in same class)

`ME_Memory_Store_DB.parameters.query` INSERTs 14 columns (13 Prep __db + `embedding`). It does not list `tier` / `user_confirmed` / `corroboration_count` / `evidence_validated` in the projection. PostgreSQL therefore applies the table's `DEFAULT` for those columns on every insert:

| Column | Default | Nullable |
|---|---|---|
| `tier` | `'recent'::memory_tier_enum` | NO |
| `user_confirmed` | `false` | NO |
| `corroboration_count` | `1` | NO |
| `evidence_validated` | `false` | NO |

A caller who passes `step.inputs.tier='long_term'` — intending to promote directly to long_term — sees the DB row land with `tier='recent'`. The caller input is silently ignored. This matches the operator-named symptom "store-memory Prep hardcodes tier/user_confirmed/corroboration_count".

Since `evidence_validated` is *not* named in the operator mission ("Known suspected hardcoded fields: tier / user_confirmed / corroboration_count"), it is **out of scope** for this mission. Leaving it at DB default preserves prior behavior.

## Q2. What exact caller input paths are valid?

Per live validator + architecture, the dispatch envelope always wraps caller inputs as `dispatcher_input.step.inputs`. Inside `inputs`:

- `tier`: one of `memory_tier_enum = {recent, long_term}` (DB enum verified via `SELECT enum_range(NULL::public.memory_tier_enum)`).
- `user_confirmed`: strict boolean `true | false`.
- `corroboration_count`: non-negative integer. The DB column is `int4 NOT NULL DEFAULT 1`.

## Q3. Fields in scope

`tier`, `user_confirmed`, `corroboration_count`.

## Q4. Fields out of scope

- `evidence_validated` (DB column exists, same defaulting pattern, but not named in operator brief).
- Any other DB column.

## Q5. Defaults preserved for omitted fields

- omitted `tier` → `__db.tier = 'recent'` (matches DB default).
- omitted `user_confirmed` → `__db.user_confirmed = false` (matches DB default).
- omitted `corroboration_count` → `__db.corroboration_count = 1` (matches DB default).

These defaults are explicit in the Prep output after the fix, not implicit DB fallbacks. Behavior is byte-equivalent for callers that omit the fields.

## Q6. Invalid values — normalization policy

Policy: fail-open to current defaults (same as existing Prep behavior for `confidence` / `importance` / `durability`). This mirrors the established `Number.isFinite(inputs.confidence) ? inputs.confidence : 0.800` idiom. Rationale: keeps store_memory robust against bad caller input; callers get the current default behavior, never a crash or DB error.

- `inputs.tier` not in `{recent, long_term}` (including `null`, wrong case, arbitrary string) → `__db.tier = 'recent'`.
- `inputs.user_confirmed` not strictly boolean (`"true"` string, `1`, `null`, etc.) → `__db.user_confirmed = false`.
- `inputs.corroboration_count` not a non-negative integer (negative, float, string, null) → `__db.corroboration_count = 1`.

## Q7. Exact patch surface

| Node | Field | Change |
|---|---|---|
| `ME_Memory_Store_Prep` | `parameters.jsCode` | extract + validate + default tier / user_confirmed / corroboration_count; add to `__db` |
| `ME_Memory_Store_DB` | `parameters.query` | INSERT column list +3 columns; VALUES +3 binds (`$14::memory_tier_enum`, `$15::boolean`, `$16::int4`); embedding shifts `$14 → $17` |
| `ME_Memory_Store_DB` | `parameters.options.queryReplacement` | 14 → 17 slots: both branches; append 3 `__db` refs before `embedding_text` |

No new nodes; no connection edits; no settings change. Apply channel: V2-028 canonical `n8n-patch.mjs replace` (structural change on Store_DB SQL + Store_Prep jsCode; `patch-node` would work per-node but a single `replace` is atomic and matches V2-028 protocol).

## Q8. Why is this the smallest safe diff?

- The 3 caller fields already exist as NOT-NULL DB columns with explicit defaults — no schema change needed.
- Store_Prep's existing defaulting pattern (`Number.isFinite`, `|| default`, array/object type checks) extends naturally; no new validation library or jsCode structural change.
- Store_DB SQL already uses PostgreSQL type casts per-slot (`$N::memory_type_enum`, `$N::numeric`, etc.); adding 3 more `::memory_tier_enum` / `::boolean` / `::int4` slots is the same pattern.
- embedding binding keeps its CASE-guarded shape; only the slot number shifts `$14 → $17`.
- UNION ALL fallback clause keeps `$13::text` (idempotency_key) — unchanged because idempotency_key is slot 13 in both pre and post.
- No search/recall/promote/RA/supersede lane changes.
- F6A store embedding is preserved (same Embed + Embed_Merge nodes; only the DB consumer grows by 3 non-embedding slots; the embedding slot stays last and still CASE-guarded).
- F6A-FOLLOWUP supersede lane is byte-identical (different Prep + different DB node; untouched).

## Q9. How are F6A and F6A-FOLLOWUP embedding lanes protected?

- `ME_Memory_Store_Embed`: byte-identical (DS-INV-3).
- `ME_Memory_Store_Embed_Merge`: byte-identical (DS-INV-3). Merge reads `prep.__db.embedding_text` and merges with `prep.__db.*`; adding 3 new __db fields is a superset — Merge's spread `{...prep.__db, embedding_text}` carries them through untouched.
- `ME_Memory_Supersede_Embed` / `ME_Memory_Supersede_Embed_Merge` / `ME_Memory_Supersede_DB`: byte-identical (DS-INV-4). Different lane; not touched.

## Q10. Tests map (50/50/50)

| Category (pack ID) | Test IDs | Maps to design surface |
|---|---|---|
| Local — defaults_and_shape | SPU-01..10 | Q5 defaults-preservation when caller omits the 3 fields |
| Local — tier_passthrough | SPU-11..20 | Q3 tier passes through to `__db.tier` |
| Local — user_confirmed_passthrough | SPU-21..30 | Q3 user_confirmed passes through to `__db.user_confirmed` |
| Local — corroboration_count_passthrough | SPU-31..40 | Q3 corroboration_count passes through to `__db.corroboration_count` |
| Local — combinations_and_invalids | SPU-41..50 | Q6 invalid normalization + combo preservation |
| Live E2E — defaults_live_store | SPE-01..10 | DS-INV-6 — live row has defaulted `tier='recent'`, `user_confirmed=false`, `corroboration_count=1` |
| Live E2E — tier_live_store | SPE-11..20 | DS-INV-7 — live row.tier equals caller tier |
| Live E2E — user_confirmed_live_store | SPE-21..30 | DS-INV-8 — live row.user_confirmed equals caller value |
| Live E2E — corroboration_live_store | SPE-31..40 | DS-INV-9 — live row.corroboration_count equals caller value |
| Live E2E — idempotent_replay | SPE-41..45 | ON CONFLICT DO NOTHING still honored; rows_for_key=1 |
| Live E2E — invalid_and_regression | SPE-46..50 | DS-INV-10 + regression spot for store-embedding / supersede-embedding / search / recall |
| SQL invariants | SPI-01..50 | 10 default rows / 10 tier rows / 10 uc rows / 10 corro rows / 10 regression rows — all via SELECT only |

## Diff-surface invariants (DS-INV-1..14)

| DS-INV | Assertion |
|---|---|
| DS-INV-1 | Only `ME_Memory_Store_Prep` + `ME_Memory_Store_DB` change |
| DS-INV-2 | Store_DB UPDATE/CTE shape unchanged; only INSERT projection + queryReplacement grow |
| DS-INV-3 | Store_Embed + Store_Embed_Merge byte-identical |
| DS-INV-4 | Supersede lane byte-identical (Prep + Embed + Embed_Merge + DB + Result) |
| DS-INV-5 | Search / Recall / Promote / RA / Routers / Result nodes byte-identical |
| DS-INV-6 | Store_Prep output preserves defaults when inputs omit tier/user_confirmed/corroboration_count |
| DS-INV-7 | Valid caller `tier` appears in `__db.tier` |
| DS-INV-8 | Valid caller `user_confirmed` appears in `__db.user_confirmed` |
| DS-INV-9 | Valid caller `corroboration_count` appears in `__db.corroboration_count` |
| DS-INV-10 | Invalid values normalize to defaults per Q6 |
| DS-INV-11 | Store_DB SQL has 17 distinct bind slots; $13 = idempotency_key; $17 = embedding CASE-guard |
| DS-INV-12 | queryReplacement success branch: 17 `$json.__db.<field>` refs; error branch: 17 nulls |
| DS-INV-13 | Settings object unchanged in candidate JSON |
| DS-INV-14 | node count unchanged (49); connection count unchanged (67) |

## Build invariants (BUILD-INV-1..10)

| BUILD-INV | Property |
|---|---|
| BUILD-INV-1 | Deterministic: rerun on same input produces byte-identical output |
| BUILD-INV-2 | Exactly 0 nodes added; exactly 2 nodes' parameters changed |
| BUILD-INV-3 | Non-target nodes byte-identical (47 nodes) |
| BUILD-INV-4 | Connections byte-identical |
| BUILD-INV-5 | Store_DB SQL has exactly 17 distinct `$N` binds; `$17::vector(1536)` CASE-guard present |
| BUILD-INV-6 | queryReplacement error branch has 17 nulls; success branch has 17 __db refs |
| BUILD-INV-7 | Store_Prep jsCode extracts inputs.tier, inputs.user_confirmed, inputs.corroboration_count with normalization |
| BUILD-INV-8 | Defaults are 'recent' / false / 1 |
| BUILD-INV-9 | No change to existing subjective-guard, required-fields, or category-validation logic |
| BUILD-INV-10 | sha256 of post JSON is printed by builder |

## SQL target (exact)

```sql
WITH ins AS (
  INSERT INTO public.memory_items (
    tenant_id, memory_type, category, content,
    confidence, importance, durability,
    source_thread_id, source_message_id, entity_id,
    evidence_refs, metadata, idempotency_key,
    tier, user_confirmed, corroboration_count, embedding
  )
  VALUES (
    $1::uuid, $2::memory_type_enum, $3::text, $4::text,
    $5::numeric, $6::numeric, $7::rag_durability_enum,
    $8::uuid, $9::uuid, $10::uuid,
    $11::jsonb, $12::jsonb, $13::text,
    $14::memory_tier_enum, $15::boolean, $16::int4,
    CASE WHEN $17::text IS NULL THEN NULL ELSE $17::vector(1536) END
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING *, TRUE AS inserted
)
SELECT * FROM ins
UNION ALL
SELECT mi.*, FALSE AS inserted
  FROM public.memory_items mi
 WHERE mi.idempotency_key = $13::text AND NOT EXISTS (SELECT 1 FROM ins)
LIMIT 1;
```

## queryReplacement target (exact)

```
={{ $json._error ? [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null] : [$json.__db.tenant_id, $json.__db.memory_type, $json.__db.category, $json.__db.content, $json.__db.confidence, $json.__db.importance, $json.__db.durability, $json.__db.source_thread_id, $json.__db.source_message_id, $json.__db.entity_id, $json.__db.evidence_refs, $json.__db.metadata, $json.__db.idempotency_key, $json.__db.tier, $json.__db.user_confirmed, $json.__db.corroboration_count, $json.__db.embedding_text] }}
```

## Rollback

Pre snapshot at `artifacts/WF-ME-01_pre_v2obs_sppt.json` sha256 `51ab7bc9860dffcee9a823ff7afa1f7de02877b9e434c588152e5015e4479a1d`. Rollback = `n8n-patch.mjs replace uq26nh1grIpnHju0 <pre snapshot>`.
