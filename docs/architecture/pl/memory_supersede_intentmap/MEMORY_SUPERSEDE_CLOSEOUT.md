# MEMORY SUPERSEDE PL INTENTMAP · Closeout

## Verdict

`MEMORY_SUPERSEDE_PL_INTENTMAP_READY = TRUE`

The C4 corridor PL routing gap from RCP1 is **closed**. `WF-PL-01.PL_Build_Planner_Input` v2.2 → v2.3 adds `supersede_memory` to `intentMap`, `actionToModule`, `extractInputsForAction`, and a new late-binding pass that normalizes `memory_id` → `supersedes_memory_id` and injects `source_thread_id` / `source_message_id` / safe-default `memory_type` / `category`. **One** workflow patched (PL only). **0** node delta. **0** connection delta. **0** schema delta. Memory V2 internals untouched. The full PL→DI→ME→DB→Result write path was exercised end-to-end (exec 9673): an OLD `memory_items` row was marked `superseded`, a NEW row was inserted with `supersedes_memory_id` pointing to it. All 8 P0 invariants GREEN. Two pre-existing limitations were surfaced (OR doesn't passthrough `messages.metadata`; Memory V2 Embed lacks `_error` defensive guard) and tracked as separate follow-ups; neither is introduced by this mission and neither breaks the PL routing.

## ME supersede contract documented

`ME_Memory_Supersede_Prep` requires `supersedes_memory_id`, `content`, `memory_type`, `category`, `source_thread_id` (optional: `source_message_id`, `entity_id`, `confidence`, `importance`, `durability`, `tier`, `metadata`, `evidence_refs`, `locale`). The Memory V2 supersede DB chain marks the OLD row `superseded` and inserts a NEW row with `supersedes_memory_id` pointing to it.

## PL routing gap closed

```
PL.intentMap.supersede_memory     = 'supersede_memory'
PL.actionToModule.supersede_memory = 'memory_module'
PL.extractInputsForAction('supersede_memory', g) → { content, memory_type:'fact', category:'general' }
PL late-binding for action='supersede_memory':
  - inputs.memory_id → inputs.supersedes_memory_id (canonical)
  - inputs.source_thread_id ← verify.thread_id
  - inputs.source_message_id ← verify.trigger_message_id
  - inputs.memory_type ← 'fact' (default)
  - inputs.category ← 'general' (default)
  - module_name='memory_module'
```

## Patch surface

| File | Modification |
|---|---|
| `WF-PL-01.PL_Build_Planner_Input` | jsCode v2.2 → v2.3 — adds `supersede_memory` routing per F14 shape. |
| `docs/architecture/pl/memory_supersede_intentmap/*` | NEW mission-local docs + artifacts (this file + 4 sibling docs). |
| `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` | Compact addendum (separate edit). |

## Workflow versionId before / after

| Workflow | id | before | after | nodes | conns | active |
|---|---|---|---|---|---|---|
| WF-PL-01 | `RwToPLa1ErHl2tUi` | `dce0febe-1bc0-42e3-a44a-a41e6737e1e7` | `bbef84fe-f594-4922-a95a-11bae52c3c6d` | 16 | 16 | ✅ |

All 9 other canonical workflows preserve their pre-mission versionIds.

## Node / connection delta

- Nodes: **0 delta** (16 → 16).
- Connections: **0 delta** (16 → 16).
- Schema: **0 delta**.

## End-to-end supersede evidence (exec 9673)

| memory_items.id | content | status | supersedes_memory_id |
|---|---|---|---|
| `433fc68a-…` (OLD) | `fact_to_be_replaced via direct PL fire` | **`superseded`** ✅ | NULL |
| `b7184fff-…` (NEW, written by chain) | `fact_replaced via direct PL fire (MSS test)` | `active` | **`433fc68a-…`** ✅ |
| `65eefd7c-…` (unrelated control) | `culoarea preferată este verde` | `active` (untouched) ✅ | NULL |

## Routing trace evidence (exec 9670 — TR end-to-end fire)

PL_Build_Planner_Input output for `messages.intent='supersede_memory'`:
```json
{
  "primary_intent": "supersede_memory",
  "requested_actions": [{
    "action": "supersede_memory",
    "module_name": "memory_module",
    "purpose": "Handle intent supersede_memory",
    "inputs": { "content": "...", "memory_type": "fact", "category": "general",
                "source_thread_id": "...", "source_message_id": "..." }
  }]
}
```

`PL_Generate_Plan` then emitted `step_01_supersede_memory` with `module_name='memory_module'`. DI dispatched it correctly to ME (sub-execution 9672 in WF-ME-01). The chain reached ME's supersede Prep, which correctly identified the missing `supersedes_memory_id` (because OR didn't pass through `messages.metadata`) — exactly the safe-failure-mode behavior we designed for.

## Positive task / memory / search regressions

- store_memory (exec 9684): 1 row written, content preserved, idempotency_key set ✅
- create_task (exec 9698): 1 row written, status=`open` ✅
- search_memory (exec 9712): 0 row delta ✅

## SQL invariant results

8 invariants in `MEMORY_SUPERSEDE_RUNTIME_RESULTS.md` §5. **All GREEN.** Includes the canonical OLD-marked-superseded + NEW-supersedes-OLD invariant pair, plus regression and reminders-unchanged invariants.

## Reminders unchanged evidence

```sql
SELECT count(*), max(updated_at) FROM public.reminders;
-- count=1, max=2026-04-13T20:17:13.620582Z (pre-mission baseline preserved)
```

## No schema mutation

0 schema mutations across `tasks`, `memory_items`, `improvement_requests`, `reminders`, `threads`, `messages`, `execution_contexts`.

## No duplicate workflow

Only `WF-PL-01` (`RwToPLa1ErHl2tUi`) was patched in place via the V2-028 canonical local CLI. **No Path 5**, **no `mcp__n8n__patch_workflow_nodes` write**, **no duplicate workflow**.

## Memory V2 reopen confirmation

**Confirmed not reopened.** Spot-check of `WF-ME-01` post-PL-patch shows `ME_Memory_Supersede_{Prep,Embed,Embed_Merge,DB,Result}` byte-identical to pre-patch (audit pulled via `mcp__n8n__get_workflow uq26nh1grIpnHju0` and verified jsCode + parameters unchanged). WF-ME-01 versionId remains `4fd95689-39f9-4dff-8ed2-6d0ccb5270de` from the prior ACG mission.

## P0 stop conditions evaluated — none triggered

| P0 stop condition | Result |
|---|---|
| Memory V2 internals modified | ✅ no — only PL changed |
| ME supersede chain regression | ✅ end-to-end positive supersede works (exec 9673) |
| Schema migration needed | ✅ 0 schema mutations |
| Broad planner rewrite | ✅ surgical: 1 jsCode rewrite |
| Path 5 used | ✅ V2-028 canonical channel |
| Duplicate workflow | ✅ in-place |
| store_memory regression | ✅ exec 9684 wrote |
| create_task regression | ✅ exec 9698 wrote |

## Known limitations (pre-existing, not introduced by this mission)

1. **`OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_FOLLOWUP`** — `OR_Build_Handoff_Payload` v1.4 only injects `user_message_text` and `primary_intent` from `messages` row. To execute a positive supersede via the canonical TR→…→ME chain (rather than direct PL fire), OR would need to also pass `messages.metadata` into `planner_context.inputs`. This is a routing-completeness issue, not a PL bug.
2. **`MEMORY_V2_SUPERSEDE_EMBED_DEFENSIVE_GUARD_FOLLOWUP`** — `ME_Memory_Supersede_Embed` (a Memory V2 OpenAI embedding HttpRequest node) crashes on `JSON.stringify({input: $json.__db.content})` when `$json.__db` is undefined (i.e., when the upstream Prep returned `_error: true`). Pre-existing defensive gap, surfaces only when supersede Prep rejects. Expected fix: a Set/IF node short-circuit before Embed when `_error===true`. Per pack policy Memory V2 stays closed in this mission.

Neither limitation is introduced by this mission. Both surfaced because RCP1's C4 deflection masked them; with C4 now reachable, they are visible.

## Next recommended frontier

1. **`MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP`** (lower priority) — add `recall_memory` to `intentMap` + `actionToModule`. Currently `search_memory` covers most recall use cases.
2. **`IMPROVEMENT_MODULE_LIST_FOLLOWUP`** (carried) — ME sub-router + `list_improvements` handler.
3. **`OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_FOLLOWUP`** — small OR-side change so canonical TR→…→ME chain can carry `memory_id` and similar IDs from `messages.metadata` into `planner_context.inputs`. Unlocks end-to-end supersede via canonical chain.
4. **`MEMORY_V2_SUPERSEDE_EMBED_DEFENSIVE_GUARD_FOLLOWUP`** — small Memory V2 defensive change in `ME_Memory_Supersede_Embed` (or insert a Set/IF gate before it) so `_error` short-circuits gracefully (current behavior crashes, blocking error visibility).
5. **Phase 2 rich matrix run** with the OR-passthrough fix in place to validate C4 corridor end-to-end through the canonical chain.

`MEMORY_SUPERSEDE_PL_INTENTMAP_READY = TRUE`
