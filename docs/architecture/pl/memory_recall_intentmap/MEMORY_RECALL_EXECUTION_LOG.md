# MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP · Execution Log

Run-tag: `mr-2026-04-27`. Repo root: `/sessions/hopeful-gifted-carson/mnt/Ucenicul`.
Started: 2026-04-27 (autonomous run, post-M1 close).

## Discovery

- WF-PL-01.PL_Build_Planner_Input v2.4 jsCode pulled live; saved to
  `artifacts/PL_Build_Planner_Input_v2.4.js`.
- Confirmed `intentMap.recall_memory` and `actionToModule.recall_memory`
  are absent in v2.4.
- `WF-ME-01` already has the recall handler chain
  (`ME_Memory_Recall_Prep/DB/Result`) and `ME_Route_Memory_Action`
  switches the action `recall_memory`. **No ME change needed.**
- `WF-DI-01.DI_Load_Module_Registry` already lists
  `memory_module.recall_memory` as a capability. **No DI change needed.**
- ME's Recall_Prep requires AT LEAST ONE structural filter
  (`entity_id|source_thread_id|category|memory_type`) → PL late-binding
  must inject `source_thread_id` from `verify.thread_id` to avoid
  `MISSING_REQUIRED_FIELDS` on bare `intent='recall_memory'` requests.

## Design freeze

Single-jsCode rewrite, 4 surgical changes (header comment + 1 intentMap
line + 1 actionToModule line + 1 extractInputsForAction clause + 1
late-binding map). 0 node delta. 0 connection delta. 0 schema mutation.
Memory V2 NOT reopened. ME / DI / OR / EC / TR untouched. Path 5: NO.

## Build phase

- v2.5 jsCode constructed via `node` string-surgery against
  v2.4 source. Wrote `artifacts/PL_Build_Planner_Input_v2.5.js`.
- Parse-checked via `new Function(...)` wrap (n8n Code-node semantics):
  **OK_PARSE**.
- Wrote `params.json` for the n8n-patch CLI:
  `{"jsCode": "<v2.5 source>"}`.

## Apply phase

```
node n8n-patch.mjs patch-node RwToPLa1ErHl2tUi PL_Build_Planner_Input \
    --params artifacts/PL_Build_Planner_Input_v2.5.params.json
{"id":"RwToPLa1ErHl2tUi","name":"WF-PL-01","patched":"PL_Build_Planner_Input","keys":["jsCode"]}
```

Verify post-apply:

```
mcp__n8n__verify_workflow id=RwToPLa1ErHl2tUi
versionId 839b1750-… → 4e0406c3-9813-4374-9178-581409c6bdc4
nodes 16 → 16, connections 16 → 16, active=true.
```

## Probe phase

7 sequential probes through TR `wI8hpSROxQI0zC9f`:

| # | Case | Tenant | Intent | TR exec | Verdict |
|---|---|---|---|---|---|
| 1 | MR-001 | default | recall_memory | 10599 | ✅ chain reached `step_01_recall_memory`; 0 writes |
| 2 | MR-002 | default | recall_memory | 10613 | ✅ |
| 3 | MR-003 | default | search_memory | 10627 | ✅ search regression read-only |
| 4 | MR-004 | tenant B | recall_memory | 10641 | ✅ EC in tenant B only; 0 cross-tenant rows |
| 5 | R-1   | default | store_memory | 10655 | ✅ wrote 1 memory row |
| 6 | R-2   | default | create_task | 10669 | ✅ wrote 1 task row |
| 7 | R-3   | default | save_suggestion | 10683 | ✅ wrote 1 improvement_requests row |

## Closeout

Verdict: **`MEMORY_RECALL_PL_INTENTMAP_READY = TRUE`**.

Workflow mutation count: **1** (WF-PL-01 only). Schema mutation count:
**0**. Path 5: NO. Duplicate workflows: 0. Memory V2 reopen: NO. Task
module: byte-identical. Improvement module: byte-identical. ME / DI /
OR / EC / TR / RA / SU / RC / MO: byte-identical.
