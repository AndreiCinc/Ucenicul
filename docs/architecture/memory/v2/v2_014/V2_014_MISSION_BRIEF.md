# V2-014 Mission Brief

Status: OPEN
Opened: 2026-04-22
Verdict: pending
Authority source: docs/architecture/memory/MEMORY_V2_DECISION_LEDGER.md row V2-014
Precedent lineage: F2b (SQL-shape) + F4 (operator-run CLI channel, patch-node single-field)

## Purpose

Close the accept-predicate gap in `ME_Memory_Promote_DB.parameters.query` so that a `recent`-tier row whose persisted `user_confirmed = TRUE` (or `evidence_validated = TRUE`) is promotable even when the caller did not re-assert those flags. Today the `accept` CTE checks caller inputs ($4, $5) only; the UPDATE OR-merges row + caller but is gated behind a caller-only predicate, so row-persisted confirmation is never honored.

## Truth anchor (Phase 0)

- V2-014 is the correct frontier. F3.1 Stage C closed SUCCESS 2026-04-22T14:30Z; its sole FAIL `f31-promote-012` was classified BAD_TEST_DEFINITION precisely because V2-014 was deferred.
- F6 is NOT opened. No F6 artifacts shall be touched. V2-014 is strictly a SQL-side single-node patch.
- Problem is SQL-side only. The runtime workflow shape, Result-node stamping, Store/Recall paths, RA aggregation, and any brain-layer code are out of scope.
- Live workflow baseline at open: `versionId b8e2f194-0263-46d9-8306-1534cc7c31fe`, active, 45 nodes, 63 connections, target node `ME_Memory_Promote_DB` (id `me-phase5mem-promote-db`, Postgres executeQuery, typeVersion 2.4).

## Patch surface (allowed diff)

Single field: `WF-ME-01.nodes[name="ME_Memory_Promote_DB"].parameters.query`.

Nothing else in the workflow is writable this mission. No other node, no `options.queryReplacement`, no credentials, no connections, no position. Documentation diff is confined to `docs/architecture/memory/v2/v2_014/**` plus the minimal pointer writeback in state/handoff/truth anchors described in Phase 9.

## Baseline SQL (live, frozen for design diff)

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

## Target accept predicate (conservative)

```
corroboration_count >= $3::int
OR ($4::boolean IS TRUE)
OR ($5::boolean IS TRUE)
OR (user_confirmed IS TRUE)
OR (evidence_validated IS TRUE)
```

Rationale: mirrors the UPDATE's OR-merge semantics. `user_confirmed` / `evidence_validated` are reachable without alias inside the `accept` CTE because `accept` selects `FROM target`, and `target` is `SELECT * FROM public.memory_items`.

## Out of scope (do NOT touch)

- Any other node in WF-ME-01
- Any other workflow
- `options.queryReplacement` parameter order
- brain_contract.json
- Module spec / Registry / Architecture spec
- F6, RA aggregation, store_prep input passthrough, recall summary string follow-ups
- Path 5 DB-bypass channel

## Channels

- Apply: operator-run CLI only (V2-025 canonical). `n8n-patch.mjs patch-node` single-field SQL patch.
- Verify pre/post: `mcp__n8n__get_workflow` / `mcp__n8n__verify_workflow`.
- Smoke: `mcp__f2e8be41-bcc3-46de-9ecc-67df952847e0__execute_workflow` + `mcp__postgres__execute_sql` (SELECT-only reads).
- Path 5 is retired; do not use.

## Success criteria

See `V2_014_DONE_CRITERIA_AND_DELIVERABLES.md` mirror (13 hard-gate checks). Verdict is exactly one of: `SUCCESS` or `BLOCKED_WITH_EVIDENCE`.

## Pointers

- Execution plan: `V2_014_EXECUTION_PLAN.md`
- Testing strategy: `V2_014_TESTING_STRATEGY.md`
- Cursor: `V2_014_CURRENT_STAGE.md`
- State JSON: `V2_014_STATE.json`
- Fix log / Blocker register / Dispatch log: siblings in this directory
- Design freeze: `V2_014_DESIGN_FREEZE.md` (Phase 3)
- Build script: `artifacts/build_patch_v2_014.mjs` (Phase 4)
- Params payload: `artifacts/patchV2_014_params.json` (Phase 4)
- Apply command block: `V2_014_APPLY_COMMAND.md` (Phase 5)
- Final status: `V2_014_FINAL_STATUS.md` (Phase 9)
