# Phase 12.3 — B11-PL-FIELD-ALIGN

Mission: close the last semantic gap uncovered in the Phase-12 post-fix
TR→MO rerun. After Phase 12.1 (B11-PL input-extraction) and Phase 12.2
(B11-RA module_error envelope), 4/4 chains reached MO structurally but
2/4 modules (`memory_module`, `improvement_module`) still returned
`aggregated_result.status = "failed"` with `MISSING_REQUIRED_FIELDS`.

Root cause: **field-name mismatch** between PL v1.2 extraction and the ME
handler contract / Module_Spec.

| Action              | PL v1.2 emitted   | ME handler / spec requires |
|---------------------|-------------------|----------------------------|
| `search_memory`     | `memory_query`    | `query` (`Module_Spec_Memory.md` §Input Contract) |
| `capture_feedback`  | `feedback_text`   | `feedback_content` (`Module_Registry_Ucenicul.md` improvement_module.inputs_expected) |

PL v1.2's walker (`_walk_b11_pl_extraction.mjs`) asserted against PL's own
extraction keys (`memory_query`, `feedback_text`) and was green, but the
downstream handler validation was never in scope — so the contract drift
between PL and ME survived the B11-PL green light.

Scope guard (user mandate, carried over): *"nu iesi din planificare,
rezolva eroarea, nu halucina."* → one-node jsCode change on
`PL_Build_Planner_Input`, no schema migrations, no new nodes, no new
edges.

## Artifacts

- Patch: `tests/generated/workflows/snapshots/_patch_pl_field_align_phase12_3.mjs`
- Snapshots: `WF-PL-01_phase12_3_pre.json` · `WF-PL-01_phase12_3_put.json`
- Walker: `tests/generated/workflows/_walk_phase12_3_chains.mjs`
- Results: `tests/generated/edges/phase12_3_chain_results.json` — **4/4 PASS**
- New DB fixtures: message_ids `...9502` (create_task), `...9503` (create_reminder),
  `...9504` (search_memory), `...9505` (save_suggestion), all tenant
  `aaaaaaaa-0000-0000-0000-000000000001`, threads
  `4…0004`, `5…0005`, `7…0007`, `8…0008`.

## Change

`WF-PL-01` / `PL_Build_Planner_Input` jsCode: v1.2 → v1.3 (B11-PL-FIELD-ALIGN).
Only `extractInputsForAction` changes:

- `search_memory`  branch: `return { memory_query: q }` → `return { query: q }`
- `capture_feedback` branch: `return { feedback_text: t }` → `return { feedback_content: t }`

Everything else (verify fail-closed, create_task/update_task `description`,
create_reminder `description + remind_at`, observe `observation_text`,
fallback merge with `plannerContext.inputs`, warnings passthrough) is
preserved byte-for-byte from v1.2.

Post-PUT verification asserts:

- required markers present: `v1.3 (B11-PL-FIELD-ALIGN`, `return { query: q };`,
  `return { feedback_content: t };`
- forbidden residues absent: `return { memory_query:`, `return { feedback_text:`

## RED → GREEN evidence

**Pre-fix (post-Phase-12) — TR execs 1258 / 1272 / 1286 / 1300:**

| intent            | ME handler status_kind | aggregated_result.status | failing code              |
|-------------------|------------------------|---------------------------|---------------------------|
| create_task       | success                | success                   | —                         |
| create_reminder   | success                | success                   | —                         |
| search_memory     | error                  | **failed**                | `MISSING_REQUIRED_FIELDS` (`query`) |
| save_suggestion   | error                  | **failed**                | `MISSING_REQUIRED_FIELDS` (`feedback_content`) |

**Post-fix — TR execs 1314 / 1328 / 1342 / 1356 (Phase-12.3 rerun):**

```
Phase-12.3 TR→MO: 4/4 passed

✅ p12-3-01-create_task      TR:1314 → EC:1315 → OR:1316 → PL:1317 → DI:1318 → ME:1319 → RA:1320 → SU:1321 → RC:1322 → MO:1323
    ME: handler=ME_Task_Create_Result  module=task_module  status_kind=success
    RA: agg_status=success modules=["task_module"]       count=1 actions=["create_task"]      per_status={success:1,failed:0} needs_followup=false
✅ p12-3-02-create_reminder  TR:1328 → EC:1329 → OR:1330 → PL:1331 → DI:1332 → ME:1333 → RA:1334 → SU:1335 → RC:1336 → MO:1337
    ME: handler=ME_Reminder_Create_Result module=reminder_module status_kind=success
    RA: agg_status=success modules=["reminder_module"]   count=1 actions=["create_reminder"]  per_status={success:1,failed:0} needs_followup=false
✅ p12-3-03-search_memory    TR:1342 → EC:1343 → OR:1344 → PL:1345 → DI:1346 → ME:1347 → RA:1348 → SU:1349 → RC:1350 → MO:1351
    ME: handler=ME_Memory_Search_Result  module=memory_module     status_kind=success
    RA: agg_status=success modules=["memory_module"]     count=1 actions=["search_memory"]    per_status={success:1,failed:0} needs_followup=false
✅ p12-3-04-save_suggestion  TR:1356 → EC:1357 → OR:1358 → PL:1359 → DI:1360 → ME:1361 → RA:1362 → SU:1363 → RC:1364 → MO:1365
    ME: handler=ME_Improvement_Capture_Result module=improvement_module status_kind=success
    RA: agg_status=success modules=["improvement_module"] count=1 actions=["capture_feedback"] per_status={success:1,failed:0} needs_followup=false
```

Canonical RA envelope shape (sampled on exec 1348, search_memory):

```
aggregated_result.status          = "success"
aggregated_result.module_results_count = 1
aggregated_result.module_names    = ["memory_module"]
aggregated_result.per_status_counts = { success:1, partial:0, failed:0, no_action:0 }
aggregated_result.actions_executed[0].action       = "search_memory"
aggregated_result.actions_executed[0].details.query = "contractul pentru Proiect important A."
aggregated_result.observations    = []
aggregated_result.followup_requests = []
aggregated_result.needs_followup  = false
```

The extracted `query` is now present and honoured end-to-end; the same is
true for `feedback_content` on the save_suggestion path.

## Blast radius and reversibility

- Single jsCode replacement on `PL_Build_Planner_Input` (v1.2 → v1.3).
- No schema migrations, no new edges, no new nodes, no domain writes.
- Rollback: single PUT of the `WF-PL-01_phase12_3_pre.json`
  `nodes`/`connections`/`settings` bundle.

## State of the chain after Phase 12.3

- TR-originated full primary chain (10 hops) completes structurally **and**
  semantically for all four canonical intents
  (`create_task`, `create_reminder`, `search_memory`, `save_suggestion`).
- `aggregated_result.status === "success"` with `per_status_counts.failed === 0`
  on all four cases.
- No `MISSING_REQUIRED_FIELDS` in either `observations[]` or `followup_requests[]`.
- Both B11-RA (failed-module envelope adapter) and B11-PL
  (input extraction + field alignment) paths are proven green.

This retires the "zero known issues" precondition the user set for the
`memory_module` build phase.
