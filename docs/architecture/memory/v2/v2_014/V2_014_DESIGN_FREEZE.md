# V2-014 Design Freeze

Frozen: 2026-04-22
Target: `WF-ME-01.nodes[name="ME_Memory_Promote_DB"].parameters.query`
Pre versionId: `b8e2f194-0263-46d9-8306-1534cc7c31fe`
Precedent lineage: F2b (same node, SQL-shape) + F4 (operator-run CLI channel, patch-node, single-key payload)

## Motivation

The `accept` CTE's `ok` predicate currently gates on caller inputs only:

```
corroboration_count >= $3::int OR $4::boolean OR $5::boolean
```

The UPDATE below stamps row + caller OR:

```
user_confirmed     = (m.user_confirmed     OR $4::boolean),
evidence_validated = (m.evidence_validated OR $5::boolean)
```

But because `accept.ok` only reads caller, a row with `m.user_confirmed = TRUE` and a caller that passes `$4 = FALSE` never reaches the UPDATE — it drops through to `acceptance_criteria_not_met`. The UPDATE's row-OR semantics are therefore unreachable from row state. Post-F4 project direction explicitly says persisted confirmation should be sufficient. V2-014 closes that gap.

## Old SQL (verbatim, baseline)

```sql
WITH target AS (
  SELECT * FROM public.memory_items
  WHERE id = $1::uuid AND tenant_id = $2::uuid
  FOR UPDATE
),
accept AS (
  SELECT id,
         (corroboration_count >= $3::int OR $4::boolean OR $5::boolean) AS ok,
         tier
  FROM target
),
promoted AS (
  UPDATE public.memory_items m
  SET tier = 'long_term',
      last_reconfirmed_at = now(),
      user_confirmed     = (m.user_confirmed     OR $4::boolean),
      evidence_validated = (m.evidence_validated OR $5::boolean)
  FROM accept
  WHERE m.id = accept.id AND accept.ok AND accept.tier = 'recent'
  RETURNING m.*, TRUE AS promoted, 'accepted'::text AS denial_reason
)
SELECT * FROM promoted
UNION ALL
SELECT t.*, FALSE AS promoted,
       CASE
         WHEN t.tier <> 'recent' THEN 'not_in_recent_tier'
         ELSE 'acceptance_criteria_not_met'
       END AS denial_reason
  FROM target t
 WHERE NOT EXISTS (SELECT 1 FROM promoted)
LIMIT 1;
```

## New SQL (verbatim, post-patch)

```sql
WITH target AS (
  SELECT * FROM public.memory_items
  WHERE id = $1::uuid AND tenant_id = $2::uuid
  FOR UPDATE
),
accept AS (
  SELECT id,
         (corroboration_count >= $3::int
            OR ($4::boolean IS TRUE)
            OR ($5::boolean IS TRUE)
            OR (user_confirmed IS TRUE)
            OR (evidence_validated IS TRUE)) AS ok,
         tier
  FROM target
),
promoted AS (
  UPDATE public.memory_items m
  SET tier = 'long_term',
      last_reconfirmed_at = now(),
      user_confirmed     = (m.user_confirmed     OR $4::boolean),
      evidence_validated = (m.evidence_validated OR $5::boolean)
  FROM accept
  WHERE m.id = accept.id AND accept.ok AND accept.tier = 'recent'
  RETURNING m.*, TRUE AS promoted, 'accepted'::text AS denial_reason
)
SELECT * FROM promoted
UNION ALL
SELECT t.*, FALSE AS promoted,
       CASE
         WHEN t.tier <> 'recent' THEN 'not_in_recent_tier'
         ELSE 'acceptance_criteria_not_met'
       END AS denial_reason
  FROM target t
 WHERE NOT EXISTS (SELECT 1 FROM promoted)
LIMIT 1;
```

## Unified diff (logical)

```diff
 accept AS (
   SELECT id,
-         (corroboration_count >= $3::int OR $4::boolean OR $5::boolean) AS ok,
+         (corroboration_count >= $3::int
+            OR ($4::boolean IS TRUE)
+            OR ($5::boolean IS TRUE)
+            OR (user_confirmed IS TRUE)
+            OR (evidence_validated IS TRUE)) AS ok,
          tier
   FROM target
 ),
```

All other lines byte-identical. No change outside the `accept` CTE's `ok` expression.

## Column-resolution proof

Inside `accept`, columns `user_confirmed` and `evidence_validated` resolve to `target.user_confirmed` / `target.evidence_validated` because `accept` selects `FROM target`, and `target` is `SELECT * FROM public.memory_items`. No alias is required; no column name collides with a parameter token. Confirmed against `db/schema/README.md` schema (both are `boolean NOT NULL DEFAULT FALSE`).

## Invariants (must hold after patch)

| # | Invariant | Status |
|---|---|---|
| 1 | Parameter order $1..$5 unchanged | UNCHANGED |
| 2 | `options.queryReplacement` unchanged | UNCHANGED |
| 3 | UPDATE SET clause unchanged (row-OR semantics preserved) | UNCHANGED |
| 4 | `accept.tier = 'recent'` gate unchanged | UNCHANGED |
| 5 | `promoted` CTE RETURNING clause unchanged | UNCHANGED |
| 6 | UNION-ALL denial branch unchanged | UNCHANGED |
| 7 | `denial_reason` vocabulary unchanged (`accepted` / `not_in_recent_tier` / `acceptance_criteria_not_met`) | UNCHANGED |
| 8 | LIMIT 1 unchanged | UNCHANGED |
| 9 | FOR UPDATE lock retained in `target` | UNCHANGED |
| 10 | No new CTE added, none removed | UNCHANGED |
| 11 | No column added to UPDATE SET | UNCHANGED |
| 12 | No cross-node side effects (single parameters.query edit) | UNCHANGED |

## Rollback-equivalence argument

If the caller passes `$4 = TRUE` or `$5 = TRUE`, the new `ok` predicate returns the same TRUE as the old predicate (each new disjunct is redundant in that case). If the caller passes both `$4 = FALSE` and `$5 = FALSE` and `corroboration_count < $3`, the old predicate returns FALSE; the new predicate returns TRUE iff the row's persisted `user_confirmed` or `evidence_validated` is TRUE. Therefore the new predicate is a pure superset: it never denies a case the old predicate accepted, and never accepts a case where row flags are all FALSE and caller/corroboration gates are all FALSE. This preserves both safety reruns #2 (caller accept) and #3 (denial).

## Out-of-scope confirmation

- No change to `options.queryReplacement` tuple order `[memory_id, tenant_id, corroboration_threshold, user_confirmed, evidence_validated]`.
- No change to `continueOnFail` or `alwaysOutputData` node-level flags.
- No change to credentials, position, typeVersion.
- No change to any other node in WF-ME-01.
- No new column writes. No new tier state. No new denial reason. No change to `last_reconfirmed_at` semantics.

## Build hashes

Populated 2026-04-22 by deterministic builder (byte-identical on second run).

- `patchV2_014_params.json` SHA-256: `cf0c7ace937139a1d28c5d85e79bafcac14176af7d35eed58c0e4bfd1597367d`
- `build_patch_v2_014.mjs` SHA-256: `67ab3c4a3ec30eb5c8c4e1a05db1547af06b2a5ac07bd7365de5de597af7189a`
- query bytes: 1041
