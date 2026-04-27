# MEMORY SUPERSEDE PL INTENTMAP · Patch Evidence

> Mission: `MEMORY_SUPERSEDE_PL_INTENTMAP_FOLLOWUP`
> Apply channel: V2-028 canonical local CLI `n8n-patch.mjs replace`.

---

## Workflow versions before / after

| Workflow | id | versionId before | versionId after | nodes | conns |
|---|---|---|---|---|---|
| WF-PL-01 | `RwToPLa1ErHl2tUi` | `dce0febe-1bc0-42e3-a44a-a41e6737e1e7` | `bbef84fe-f594-4922-a95a-11bae52c3c6d` | 16 (unchanged) | 16 (unchanged) |
| WF-ME-01 | `uq26nh1grIpnHju0` | `4fd95689-39f9-4dff-8ed2-6d0ccb5270de` | (unchanged) | 61 | 79 |

All 8 other canonical workflows preserve pre-mission versionIds.

## Diff surface

- **Workflows touched**: 1 (`WF-PL-01`)
- **Nodes touched**: 1 (`PL_Build_Planner_Input`, jsCode rewrite v2.2 → v2.3)
- **Node delta**: 0
- **Connection delta**: 0 (16 source-node keys → 16; 16 total edges → 16)
- **Schema delta**: 0
- **Memory V2 internals**: not modified (audit confirmed: `ME_Memory_Supersede_{Prep,Embed,Embed_Merge,DB,Result}` byte-identical post-patch)

## Apply channel evidence

```
$ cd .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch
$ node n8n-patch.mjs replace RwToPLa1ErHl2tUi \
    docs/architecture/pl/memory_supersede_intentmap/artifacts/WF-PL-01.next.json \
    --reactivate
{
  "id": "RwToPLa1ErHl2tUi",
  "name": "WF-PL-01"
}
reactivated RwToPLa1ErHl2tUi
```

`mcp__n8n__verify_workflow` post-apply:
```json
{ "summary": { "id": "RwToPLa1ErHl2tUi", "nodeCount": 16, "connectionCount": 16, "active": true,
               "versionId": "bbef84fe-f594-4922-a95a-11bae52c3c6d" },
  "checks":  [ { "check": "nodeCount", "pass": true, "got": 16, "want": 16 },
               { "check": "connectionCount", "pass": true, "got": 16, "want": 16 } ],
  "allPass": true }
```

## Routing live-trace evidence (execution 9670 — TR end-to-end fire)

PL output (after the patch is applied) for `messages.intent='supersede_memory'`:

```json
{
  "_context_ready": "true",
  "primary_intent": "supersede_memory",
  "requested_actions": [{
    "action": "supersede_memory",
    "module_name": "memory_module",
    "purpose": "Handle intent supersede_memory",
    "inputs": {
      "content": "culoarea preferată în albastru",
      "memory_type": "fact",
      "category": "general",
      "source_thread_id": "217fd2ac-7557-4411-8fd4-5cd24d80e555",
      "source_message_id": "17ae4a77-5244-4564-871f-6ebb84903214"
    }
  }]
}
```

`PL_Generate_Plan` then emitted `step_01_supersede_memory` with `module_name='memory_module'`, dispatched correctly through DI to ME (sub-execution 9672 in WF-ME-01).

## End-to-end DB write evidence (execution 9673 — direct PL fire with explicit `supersedes_memory_id`)

To exercise the full PL→DI→ME→DB→Result write path, a direct PL chat fire was issued with a complete `planner_context.requested_actions[0].inputs.supersedes_memory_id` (canonical caller-provided contract).

| Memory ID | content | status | supersedes_memory_id |
|---|---|---|---|
| `433fc68a-3833-4a6c-82ff-c0278f390b3f` (OLD, pre-seeded) | `fact_to_be_replaced via direct PL fire` | **`superseded`** ✅ | NULL |
| `b7184fff-affc-46b9-95ff-076ae16d2621` (NEW, written by chain) | `fact_replaced via direct PL fire (MSS test)` | `active` | **`433fc68a-…`** ✅ |
| `65eefd7c-1486-40fe-8124-a74f93b85dc7` (unrelated, pre-seeded) | `culoarea preferată este verde` | `active` (unchanged) ✅ | NULL |

The full Memory V2 supersede chain (`Prep → Embed → Embed_Merge → DB → Result`) wrote the new row, marked the old row superseded, and emitted the canonical `module_result` envelope with `actions_executed[0].details = {old_memory_id, new_memory_id, ...}`. This proves PL routing + DI dispatch + ME supersede chain are all functional given proper inputs.

## Spot-check on other PL routes (byte-identical behavior preserved)

Offline simulation of patched PL against 5 inputs (TEST 1-5 in DISCOVERY §2):
- TEST 1 supersede with explicit memory_id from `plannerContext.inputs` → emits canonical action with `supersedes_memory_id` populated.
- TEST 2 supersede with no memory_id → emits action; ME will fail closed at `MISSING_REQUIRED_FIELDS` (correct).
- TEST 3 supersede with full `requested_actions` from upstream → passes through, late-binding adds source_thread_id only if missing.
- TEST 4 store_memory regression → canonical action with `content`, `memory_type='fact'`, `category='general'`, late-binding source fields.
- TEST 5 create_task regression → canonical action with `description`, `due_type`.

All other intents (capture_feedback, search_memory, list_tasks, etc.) preserved byte-identical in the v2.3 jsCode.

## No Path 5 / no duplicate / no unauthorized MCP write

- Path 5 (direct `workflow_entity` SQL): not used.
- Duplicate workflows: 0 — only `RwToPLa1ErHl2tUi` modified in place.
- MCP `patch_workflow_nodes` write: not used.
- Memory V2 reopen: not done. ME_Memory_Supersede_* nodes byte-identical post-patch.

## Artifacts

- `artifacts/WF-PL-01.pre.json` — pre-apply baseline
- `artifacts/WF-PL-01.next.json` — PUT-applied JSON
- `artifacts/PL_Build_Planner_Input.pre.js` — pre-apply jsCode (v2.2)
- `artifacts/PL_Build_Planner_Input.next.js` — new jsCode (v2.3)
- `artifacts/ME_Memory_Supersede_Prep.pre.js` — Memory V2 reference (read-only)
- `artifacts/ME_Memory_Supersede_DB.pre.json` — Memory V2 reference (read-only)
- `artifacts/ME_Memory_Supersede_Result.pre.js` — Memory V2 reference (read-only)
- `artifacts/build_supersede_patch.mjs` — assembler (V2-028 channel)
