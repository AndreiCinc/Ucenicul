# F14 — PL `store_memory` IntentMap · Closeout

## Verdict

`F14_STORE_MEMORY_INTENTMAP_READY = TRUE`

## Files modified

| File | Modification |
|---|---|
| `WF-PL-01.PL_Build_Planner_Input.parameters.jsCode` | v2.0 → v2.1 (single jsCode rewrite via V2-028 canonical local CLI) |
| `docs/architecture/Module_Registry_Ucenicul.md` | not modified — `memory_module` capabilities already list `store_memory` |
| `docs/architecture/pl/f14_store_memory_intentmap/*` | new mission-local artefacts: `F14_STORE_MEMORY_EXECUTION_LOG.md`, `F14_STORE_MEMORY_DISCOVERY.md`, `F14_STORE_MEMORY_PATCH_EVIDENCE.md`, `F14_STORE_MEMORY_PROBE_RESULTS.md`, `F14_STORE_MEMORY_CLOSEOUT.md`, `artifacts/build_f14_patch.py`, `artifacts/WF-PL-01.pre.json`, `artifacts/WF-PL-01.next.json` |
| `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` | compact addendum (handled separately) |

## Workflow modified

- `WF-PL-01` (`RwToPLa1ErHl2tUi`) — single jsCode rewrite on `PL_Build_Planner_Input`. No other workflow touched.

## VersionId before / after

| Workflow | versionId before | versionId after | nodes | connections | active |
|---|---|---|---|---|---|
| WF-PL-01 | `898fa273-68d3-4443-b6f9-9990d1739bb2` | `c4d9796d-f972-49fa-974e-520fe58556a2` | 16 (unchanged) | 16 (unchanged) | ✅ |

All other 9 canonical workflows preserve their pre-mission versionIds (TR `89b783f8`, EC `78569035`, OR `2d37a1f3`, DI `8b10a865`, ME `3804ec0e`, RA `4a2be8b4`, SU `4e7bc0d1`, RC `6d3f5208`, MO `4e0163b2`).

## Node / connection delta

- Nodes: **0 delta** (16 → 16).
- Connections: **0 delta** (16 → 16).
- Schema mutations: **0**.

## Exact PL mapping added

```
intentMap.store_memory      = 'store_memory'
actionToModule.store_memory = 'memory_module'
```

Plus a new `extractInputsForAction('store_memory', goalText)` clause and a late-binding pass on `requestedActions` that injects `source_thread_id` (from `verify.thread_id`), `source_message_id` (from `verify.trigger_message_id`), and safe defaults `memory_type='fact'`, `category='general'` for any `store_memory` action whose inputs lack them. Caller-provided values via `plannerContext.inputs` continue to win.

Detail in `F14_STORE_MEMORY_PATCH_EVIDENCE.md` §4.

## store_memory probe result

✅ **GREEN.** Probe 1 (`Ține minte că prefer întâlnirile de dimineață, ideal la ora 9.`) produced one `public.memory_items` row id `4b459e04-7d43-470c-a140-806e4721f39e` with `content='prefer întâlnirile de dimineață, ideal la ora 9'`, `memory_type='fact'`, `category='general'`, `source_thread_id` matching the probe thread, and `idempotency_key='store_memory:9e97affc-…:step_01_store_memory'` (Memory V2 contract). PL stripped the `Ține minte că ` prefix as designed.

Probe 2 (replay of identical envelope) produced **0 new rows**. Final state: 1 row total, 1 distinct idempotency_key. Idempotency held at the DB layer (Memory V2's existing UNIQUE constraint + ON CONFLICT DO NOTHING + UNION ALL fallback).

## search_memory regression result

✅ **GREEN.** Probe 3 (`Ce știi despre preferințele mele de întâlniri?`) returned `status:"success"` with 0 row delta in `public.memory_items`. Memory V2 search path unaffected.

## task regression result

✅ **GREEN.** Probe 4 (`Creează task: F14 regression smoke pentru task path.`) wrote `tasks` row `09217452-2157-46f9-9579-bedfc85f4331`, status `open`, with proper chain-derived idempotency marker.

## reminder-as-task regression result

✅ **GREEN.** Probe 5 (`Remind me tomorrow at 11 to F14-reminder-route-check.`) wrote `tasks` row `f15d3a44-1c6a-48ac-907b-a6fac6eb3fba` with `due_type=datetime`, `due_at=2026-04-26T11:00:00Z`, `metadata.origin='reminder_intent'`. Zero `public.reminders` writes. ADR-REMINDER-AS-TASK-LAYER invariant preserved.

## SQL / DB side-effect evidence

```sql
-- Window: created_at >= '2026-04-25T14:36:00', tenant default
new_tasks=2, new_memory=1, reminders_writes=0
-- store_memory replay invariant
store_rows=1, distinct_keys=1
-- reminders baseline
count=1, last_updated='2026-04-13T20:17:13Z'  -- unchanged
-- cross-tenant memory_items leak probe
0
```

Detail in `F14_STORE_MEMORY_PROBE_RESULTS.md` §3-4.

## No Memory V2 reopen confirmation

Confirmed. Zero changes to:

- any node in `WF-ME-01` (memory store / recall / supersede / search / promote handlers all byte-identical);
- the `public.memory_items` schema or any Memory V2 design freeze artefact;
- Memory V2 phase gates / write-fence / decision ledger.

The patch only added a planner-side intent → action → module mapping that connects to the **already-existing** Memory V2 store handler.

## No duplicate workflow confirmation

Confirmed. Only `WF-PL-01` (`RwToPLa1ErHl2tUi`) was patched. No `WF-PL-01-fixed`, no `v2_copy`, no parallel canonical workflow, no MCP `patch_workflow_nodes` write, no Path 5.

## Stop conditions evaluated — none triggered

- ❌ `store_memory` does not require Memory V2 internals modification.
- ❌ ME store handler is real and contract-aligned.
- ❌ Patch is small (1 jsCode rewrite); not a broad planner rewrite.
- ❌ task_module not regressed (probe 4 GREEN).
- ❌ No cross-tenant memory leak (probe 5.4 = 0).
- ❌ Replay does not produce duplicates (probe 2 → 1 row total).
- ❌ No schema migration required.
- ❌ No Path 5.
- ❌ No duplicate workflow.

## Next recommended frontier

Two parallel candidates, both small and contract-backed:

1. **`improvement_module` live execution** — same surgical pattern as the closed `task_module` mission. ME_Improvement_Capture_Result is currently a stub; replace with Prep + DB + Result chain writing to `public.improvement_requests`. Unblocks corridors that need a feedback-capture domain side-effect (e.g. `save_suggestion` corridors C2/L4, C12 with feedback fragment).

2. **Resume `PROJECT-E2E-RICH-TEST-MATRIX` for memory-side corridors** — C2 (memory write), C3 (memory recall), C4 (memory update / supersede), C9 (cross-thread durable memory). With F14 closed, the C2 / C4 / C11-write paths now route correctly to `memory_module` through the canonical chain; the matrix can be exercised live for these corridors using the same harness pattern as the task-corridors-phase1 mission (run-tag `tcp1-2026-04-25`).

Memory V2 stays closed. Task module stays untouched.

`F14_STORE_MEMORY_INTENTMAP_READY = TRUE`
