# WF-ME-01_TEST_ENTRY_EXIT_POINTS

Derived from `docs/WF-ME-01_NODE_MAP.md` and `docs/WF-ME-01_CONNECTION_MAP.md`.

## Entry points (inputs)

| Node | Purpose | Used in tests? |
|---|---|---|
| `ME_Input` | Canonical Execute Workflow entrypoint from WF-DI-01. Primary test entry. | YES — V1/V2/V3/V4/V5 shell path |
| `ME_Manual_Test_Trigger` | Manual-trigger shell path for local authoring. Same downstream path as ME_Input. | YES — unit/authoring |
| `When chat message received` | Chat-trigger harness for MCP / live runtime proof. | YES — V1/V6 live runtime proof |

All three entry points converge on `ME_Validate_Dispatcher_Result` (edges 1, 2, 21 in CONNECTION_MAP). Tests MAY exercise any entry point; oracles are identical.

## Exit points (outputs)

| Node | Emits | Oracle type |
|---|---|---|
| `ME_Return_Result` | Canonical `module_result` success envelope (§3.a of CONTRACTS) | Schema match + exact-field assertions |
| `ME_Return_Error` | Canonical `module_error` envelope (§3.b of CONTRACTS) | Schema match + exact `error.code` assertion |

`ME_Return_Error` is reachable from 4 sources (CONNECTION_MAP edges 5, 9, 15, 24):
- `ME_Route_Valid` output 1 → INVALID_DISPATCH_INPUT / MISSING_REQUIRED_FIELDS
- `ME_Route_Module_Name` output 1 → UNSUPPORTED_MODULE
- `ME_Route_Task_Action` output 5 → UNSUPPORTED_ACTION
- `ME_Route_Context_OK` output 1 → CONTEXT_MISMATCH

`ME_Return_Result` is reachable from 5 sources (CONNECTION_MAP edges 16–20):
- `ME_Task_Create_Result` → action=create_task
- `ME_Task_List_Result` → action=list_tasks
- `ME_Task_Update_Result` → action=update_task
- `ME_Task_Complete_Result` → action=complete_task
- `ME_Task_Delete_Result` → action=delete_task

## Decision-point taps (intermediate observation points for routing oracles)

| Node | Emits | Observe |
|---|---|---|
| `ME_Route_Valid` | Two outputs: valid dispatch vs invalid | Output index taken |
| `ME_Check_Context_Match` | Boolean match decision | True/false |
| `ME_Route_Context_OK` | context_ok vs context_mismatch | Output index taken |
| `ME_Route_Module_Name` | task_module vs unsupported | Output index taken |
| `ME_Route_Task_Action` | 5 action branches + 1 error | Output index taken |

## Test harness binding

- Off-node harness: `tests/test_families.py` — 13 families × 50 tests = 650 total.
- Fixture harness: `sql/10_fixtures_create.sql` + `sql/11_fixtures_cleanup.sql`.
- Probes: `sql/20_read_path_probe.sql` (read-path V6), `sql/21_write_path_probe.sql` (write-path V6).
