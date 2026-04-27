# MEMORY V2 SUPERSEDE EMBED · Defensive Guard · Closeout

## Verdict

`MEMORY_V2_SUPERSEDE_EMBED_DEFENSIVE_GUARD_READY = TRUE`

The single defensive gap in the supersede chain that surfaced after `MEMORY_SUPERSEDE_PL_INTENTMAP_FOLLOWUP` and `OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_FOLLOWUP` is closed. Negative supersede paths (missing `memory_id`, invalid UUID, wrong-tenant) now short-circuit cleanly through the chain instead of crashing at `ME_Memory_Supersede_Embed`. **Positive path unchanged.** **All 18 invariants GREEN.** **0 schema mutations. 0 node delta. 0 connection delta. 0 duplicate workflow.** Memory V2 store / search / recall / promote chains are byte-identical post-patch — the narrow Memory V2 reopen authorized by this mission was used only on the supersede negative-path defensive gap.

## Exact patch location

`WF-ME-01.ME_Memory_Supersede_Embed.parameters.jsonBody` — defensive ternary that never dereferences `__db.content` when missing. Plus `continueOnFail: true` and `alwaysOutputData: true` on the same node for belt-and-suspenders.

```
Before: ={{ JSON.stringify({ model: 'text-embedding-3-small', input: $json.__db.content }) }}

After:  ={{ ($json && $json.__db && typeof $json.__db.content === 'string')
              ? JSON.stringify({ model: 'text-embedding-3-small', input: $json.__db.content })
              : JSON.stringify({ model: 'text-embedding-3-small', input: 'noop' }) }}
```

## Workflow versionId before / after

| Workflow | id | before | after |
|---|---|---|---|
| WF-ME-01 | `uq26nh1grIpnHju0` | `4fd95689-39f9-4dff-8ed2-6d0ccb5270de` | `3c7b95dd-1c5d-4b20-8fca-3d86aef73290` |
| (all 9 others) | — | unchanged | unchanged |

## Node / connection delta

- Nodes: **0 delta** (61 → 61)
- Connections: **0 delta** (79 → 79)
- Schema: **0 delta**

## Valid supersede evidence

Probe 1 (exec 9833) — canonical TR→EC→OR→PL→DI→ME chain with `metadata.memory_id="11c66583-…"`:
- OLD `11c66583-c60b-4982-8eb0-618aea10eaf4` → status `superseded` ✅
- NEW row `active`, `supersedes_memory_id` points to OLD ✅
- Unrelated control row `24809ce4-…` stays `active` ✅

## Missing memory_id clean-error evidence

Probe 2 (exec 9847) — same envelope, but `metadata: {}`:
- Pre-patch: chain CRASHED at `ME_Memory_Supersede_Embed` with `NodeOperationError: The value in the "JSON Body" field is not valid JSON`.
- Post-patch: chain returns `status:"success"` (the outer chain status); internally Prep emits `MISSING_REQUIRED_FIELDS`; Embed sends a noop OpenAI call (cost: 1 wasted API call); Embed_Merge short-circuits via `prep._error===true`; DB queryReplacement `_error ? all-null : […]` produces zero matches in the supersede CTE; Result emits canonical `_error` envelope; **0 memory_items row delta**.

## Invalid UUID evidence

Probe 3 (exec 9861) — `metadata: {memory_id: "NOT-A-UUID-AT-ALL"}`:
- OR_Build_Handoff_Payload v1.5 allowlist + UUID regex from prior mission drops the non-UUID value silently.
- ME Prep then sees `inputs.supersedes_memory_id` missing → `MISSING_REQUIRED_FIELDS`.
- Same downstream short-circuit as INV-4. **0 row delta.**

## Wrong-tenant evidence

Probe 4 (exec 9875) — default-tenant request with `metadata.memory_id="ea076ebb-…"` (tenant-A's row):
- ME Prep receives `supersedes_memory_id` (allowlist passed it).
- Memory V2 SQL `WHERE id=$1::uuid AND tenant_id=$2::uuid` finds nothing (id is in tenant A but request runs under default tenant).
- The supersede CTE's `marked` is empty → `inserted` is empty → `Result` emits `SUPERSEDE_TARGET_INVALID`.
- Tenant-A row `ea076ebb-…` stays `active` ✅; 0 NEW rows pointing to it ✅.

## Replay evidence

Probe 5 (exec 9889) — same `message_id` and `idempotency_key` as probe 1:
- Memory V2's `idempotency_key` UNIQUE + `ON CONFLICT DO NOTHING` + UNION ALL fallback held.
- Total NEW rows pointing to OLD = exactly **1**.

## Store / search regressions

- store_memory (probe 6, exec 9892): 1 new memory_items row ✅
- search_memory (probe 7, exec 9906): 0 row delta ✅

## Task / improvement / reminder regressions

- create_task (probe 8, exec 9920): 1 new tasks row ✅
- capture_feedback (probe 9, exec 9934): 1 new improvement_requests row ✅
- create_reminder→task with `due_at` (probe 10, exec 9948): 1 new tasks row with `due_at` ✅

## Ambiguous-content guard regressions (cross-mission)

- Ambiguous task `Fa chestia aia pentru mine` (probe 11, exec 9962): 0 tasks row ✅ — `AMBIGUOUS_OR_EMPTY_TASK` from prior mission still fires
- Ambiguous memory `Tine minte asta` (probe 12, exec 9976): 0 memory_items row ✅ — `AMBIGUOUS_OR_EMPTY_MEMORY` from prior mission still fires

## Reminders unchanged

```sql
SELECT count(*), max(updated_at) FROM public.reminders;
-- 1 / 2026-04-13 20:17:13.620582+00
```

## Schema mutation count

**0.**

## Duplicate workflow count

**0.**

## P0 stop conditions evaluated — none triggered

| Condition | Result |
|---|---|
| Positive supersede regresses | ❌ no — Probe 1 wrote OLD/NEW pair correctly |
| Missing memory_id still crashes | ❌ no — Probe 2 returned status:success with 0 row delta |
| Wrong-tenant supersede succeeds | ❌ no — Probe 4 left tenant-A unchanged |
| Replay duplicates | ❌ no — Probe 5 produced 0 new supersede rows |
| Memory V2 store/search regress | ❌ no — Probes 6-7 GREEN |
| task/improvement/reminder regress | ❌ no — Probes 8-10 GREEN |
| Schema migration | ❌ none |
| Broad Memory V2 rewrite | ❌ no — single node `parameters` change |
| Workflow duplicate | ❌ no |
| Path 5 used | ❌ no |

## Next recommended frontier

1. **`MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP`** (lower priority) — add `recall_memory` to PL.intentMap (currently `search_memory` covers most use cases).
2. **`IMPROVEMENT_MODULE_LIST_FOLLOWUP`** (carried) — ME sub-router + `list_improvements` handler chain.
3. **Phase 2 rich matrix run** — full C1..C12 corridors. With C4 supersede now end-to-end clean (positive + 4 negative paths verified) and ACG guards landed, the chain has no known blockers for Phase 2.

`MEMORY_V2_SUPERSEDE_EMBED_DEFENSIVE_GUARD_READY = TRUE`
