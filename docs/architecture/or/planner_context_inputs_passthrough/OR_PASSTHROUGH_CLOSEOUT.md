# OR PASSTHROUGH PLANNER CONTEXT INPUTS · Closeout

## Verdict

`OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_READY = TRUE`

The chat envelope's `metadata` field now flows TR → EC → OR → PL → ME via 6 surgical jsCode rewrites across 3 workflows. The canonical TR→…→ME chain executed a positive `supersede_memory` end-to-end for the first time (exec 9732), marking the OLD `memory_items` row `superseded` and inserting the NEW row with `supersedes_memory_id`. Strict allowlist (`memory_id`, `target_memory_id`, `supersedes_memory_id`, `task_id`, `entity_id`, `business_id`, `source_thread_id`, `source_message_id`) + UUID regex validation prevent arbitrary blob leakage. **0 schema mutation. 0 node delta. 0 connection delta.** Memory V2, PL, DI, RA, SU, RC, MO untouched. Reminders unchanged.

## Exact OR fields passed through

`OR_Build_Handoff_Payload` v1.5 reads `envelope_metadata` from `OR_Extract_Handoff_Input` and writes the allowlisted UUIDs into `payload.planner_context.inputs`:

```js
const ALLOWED_KEYS = new Set([
  'memory_id','target_memory_id','supersedes_memory_id',
  'task_id','entity_id','business_id',
  'source_thread_id','source_message_id'
]);
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
```

Non-allowlisted keys are dropped silently. Non-UUID values are dropped silently. Unrecognized fields never reach PL.

## Workflow versionIds before / after

| Workflow | id | before | after |
|---|---|---|---|
| WF-TR-01 | `wI8hpSROxQI0zC9f` | `89b783f8…` | new versionId after re-patched v1.1 |
| WF-EC-01 | `v9jih4jqeXpOJOiH` | `78569035…` | `d25e4316-f584-4f2b-ba83-423ff82d749b` |
| WF-OR-01 | `KhGmNpi0ZDmrnz8W` | `2d37a1f3…` | `f4925ede-35c5-41a1-baff-54c9a2de8101` |
| (other 7 canonical workflows) | — | unchanged | unchanged |

## Node / connection delta

- TR: 24 nodes / 25 connections (unchanged)
- EC: 11 nodes / 10 connections (unchanged)
- OR: 13 nodes / 12 connections (unchanged)
- All 7 other workflows: unchanged

## Canonical TR→…→ME supersede evidence

Execution 9732 (live):
- TR_Build_EC_Envelope: `envelope_metadata: {"memory_id":"f6cf6926-…"}` ✅
- EC_Return_Result: forwarded `envelope_metadata` ✅
- OR_Build_Handoff_Payload: `payload.planner_context.inputs: {"memory_id":"f6cf6926-…"}` (allowlist + UUID gate) ✅
- PL_Build_Planner_Input: action.inputs includes both `memory_id` and `supersedes_memory_id` (PL's existing late-binding alias) ✅
- ME_Memory_Supersede_Prep: full required fields satisfied (no `_error`) ✅
- ME_Memory_Supersede_DB: marked OLD `superseded`, inserted NEW with `supersedes_memory_id` ✅

## Old/new memory state evidence

| memory_items.id | content | status | supersedes_memory_id |
|---|---|---|---|
| `f6cf6926-fc91-4aa4-8262-dda1be92b492` | OLD culoarea preferata era verde | **`superseded`** ✅ | NULL |
| `8572b8b1-847f-4c9c-b2ba-106f0e9dc9b8` | culoarea preferata in albastru (e2e supersede via metadata.memory_id) | `active` | **`f6cf6926-…`** ✅ |

## Replay evidence

Probe 2 fired the same `idempotency_key="orpt:1:e2e"` → 0 NEW supersede rows pointing to OLD. Total NEW rows pointing to OLD `f6cf6926-…` after both fires = exactly 1. Memory V2's `idempotency_key` UNIQUE constraint + `ON CONFLICT (idempotency_key) DO NOTHING` + UNION ALL fallback held.

## Wrong-tenant evidence

Probe 3 (default-tenant request with tenant-A `memory_id`):
- tenant-A row `87cc077d-…` stayed `status='active'` ✅
- 0 NEW supersede rows pointing to it ✅
- ME's supersede SQL `WHERE id=$1 AND tenant_id=$2` filter rejected the cross-tenant id (no `old_row` rows; `marked` empty; `inserted` empty); the chain emitted `SUPERSEDE_TARGET_INVALID` (visible via Memory V2 Embed defensive gap; the failure surface is the same as MISSING_REQUIRED_FIELDS pre-existing limitation, but tenant isolation is enforced by SQL regardless).

## Regressions for store / search / task / improvement / reminder-as-task

| Class | Outcome |
|---|---|
| store_memory | 1 new memory_items row (exec 9763) ✅ |
| search_memory | 0 row delta (exec 9777) ✅ |
| create_task | 1 new tasks row (exec 9791) ✅ |
| capture_feedback | 1 new improvement_requests row (exec 9805) ✅ |
| create_reminder→task with `due_at` | 1 new tasks row (exec 9819) ✅ |

## Reminders unchanged

```sql
SELECT count(*), max(updated_at) FROM public.reminders;
-- 1 / 2026-04-13 20:17:13.620582+00
```

## No schema mutation

`information_schema.columns` for `public.tasks`, `public.memory_items`, `public.improvement_requests`, `public.reminders`, `public.threads`, `public.messages`, `public.execution_contexts` — unchanged from pre-mission shape.

## No duplicate workflow

Only `WF-TR-01`, `WF-EC-01`, `WF-OR-01` patched in place via the V2-028 canonical local CLI. **No Path 5**, **no `mcp__n8n__patch_workflow_nodes` write**, **no duplicate workflow**.

## P0 stop conditions evaluated — none triggered

| P0 stop condition | Result |
|---|---|
| Broad rewrite | ❌ no — 6 surgical jsCode rewrites (1 in TR, 2 in EC, 3 in OR), each ≤ 30 lines |
| Metadata blob leak | ❌ no — strict allowlist + UUID regex |
| Wrong-tenant supersede succeeds | ❌ no — SQL guard prevents it |
| Valid task/memory/improvement regress | ❌ no — all 5 regression probes GREEN |
| Schema migration | ❌ none |
| Workflow duplicate | ❌ none |
| Path 5 | ❌ not used |
| Memory V2 internals modified | ❌ no |

## Next recommended frontier

1. **`MEMORY_V2_SUPERSEDE_EMBED_DEFENSIVE_GUARD_FOLLOWUP`** (pre-existing) — the only remaining limitation around supersede: `ME_Memory_Supersede_Embed` crashes on `_error` short-circuit. Narrow Memory V2 reopen to add a defensive guard (or a Set/IF gate node). Now that supersede works end-to-end via the canonical chain, this defensive gap matters mainly for the missing-id ambiguous case.
2. **`MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP`** (lower priority).
3. **`IMPROVEMENT_MODULE_LIST_FOLLOWUP`** (carried).
4. **Phase 2 rich matrix run** — full C1..C12 corridors with metadata-passthrough + supersede working end-to-end. C4 corridor is now reachable through canonical chain.

`OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_READY = TRUE`
