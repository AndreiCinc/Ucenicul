# WF-ME-01_TEST_MATRIX

## Required live proofs
- V1 shell integrity
- V2 invalid dispatch input
- V3 task_module happy paths
- V4 unsupported module fail-closed
- V5 cross-tenant / context mismatch fail-closed
- V6 DB drift and write-scope verification

## Latest supplied closure posture
The supplied closure evidence marks all of the above as passed on the
`wf-me-01-source-pack-v1.3-cross-tenant-guard` shell.

## Off-node heavy suite
13 families x 50 tests = 650 total tests

## Oracle types per vector

| V | Oracle type(s) | Authoritative observation |
|---|---|---|
| V1 | Schema / shape match | 18 nodes / 24 edges in workflow JSON; three entry triggers converge on `ME_Validate_Dispatcher_Result` |
| V2 | Exact error code match | `module_error.error.code == "INVALID_DISPATCH_INPUT"` or `"MISSING_REQUIRED_FIELDS"` |
| V3 | Exact output match + schema match | `module_result` envelope shape per CONTRACTS §3.a; action-specific `actions_executed[0].action` matches input action |
| V4 | Exact error code match + routing invariant | `error.code == "UNSUPPORTED_MODULE"` AND routed via `ME_Route_Module_Name` output 1 |
| V5 | Exact error code match + routing invariant | `error.code == "CONTEXT_MISMATCH"` AND routed via `ME_Route_Context_OK` output 1 (cross-tenant guard at `ME_Check_Context_Match`) |
| V6 | DB side-effect assertion (zero drift) | `sql/20_read_path_probe.sql` + `sql/21_write_path_probe.sql`: row-count delta = 0 on `execution_contexts`, `threads`; simulated write paths never touch DB |

Off-node harness: 13 families × 50 tests = 650 deterministic tests — each vector uses exact-output oracle against fixture-defined expected envelopes; routing invariants checked via switch branch observations.
