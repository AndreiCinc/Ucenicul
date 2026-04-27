# WF-SU-01 Test Matrix

## Live matrix targets
- V1 shell integrity
- V2 invalid aggregated_result input
- V3 happy path state finalization
- V4 forbidden write / permission denial
- V5 lineage mismatch / replay block
- V6 DB drift verification

## V1 shell integrity
- workflow imported
- node count = 17
- main-edge count = 18
- triggers present
- `alwaysOutputData = true` on read nodes
- `options.queryReplacement` present on Postgres nodes using `$1/$2`

## V2 invalid input
- missing required top-level fields -> `INVALID_STATE_UPDATE_INPUT`
- wrong `allowed_next_stage` -> `INVALID_STATE_UPDATE_INPUT`
- wrong `state_update_allowed` -> `WRITE_PERMISSION_DENIED`

## V3 happy path
- input is canonical RA `aggregated_result`
- execution_context row found and tenant/thread aligned
- state finalizes cleanly
- downstream envelope emits:
  - `result_type = state_update_result`
  - `allowed_next_stage = WF-RC-01`
  - `response_generation_allowed = true`

## V4 forbidden write / permission denial
Use `_write_permission_override` on the test envelope.
Example:
```json
"_write_permission_override": {
  "allowed_write_classes": ["thread_state_update", "audit_persistence", "memory_candidate_persistence"],
  "denied_write_classes": ["execution_state_update"]
}
```
Expected:
- denied class no-ops at the SQL layer
- downstream result reports blocked write classes honestly
- no hidden business writes

## V5 lineage mismatch / replay
- no execution_context row -> `LINEAGE_MISMATCH`
- tenant mismatch -> `LINEAGE_MISMATCH`
- thread mismatch -> `LINEAGE_MISMATCH`
- replayed idempotency key -> `REPLAY_BLOCKED`
For replay live coverage, use `_replay_seen_input_hash` on the test envelope.

## V6 DB drift
- pre/post counts recorded for:
  - execution_contexts
  - threads
  - tasks
  - reminders
  - messages
  - rag_memories
- expected drift outside fixture window: 0 on non-owned business tables

## Oracle types per vector

| V | Oracle type(s) | Authoritative observation |
|---|---|---|
| V1 | Schema / shape match | Node count = 17, main-edge count = 18; Postgres nodes carry `queryReplacement` with `$1/$2`; read nodes carry `alwaysOutputData = true` |
| V2 | Exact error code match | `error.code == "INVALID_STATE_UPDATE_INPUT"` for missing top-level fields; `"WRITE_PERMISSION_DENIED"` when `state_update_allowed=false` |
| V3 | Exact output match + DB side-effect + downstream handoff | `result_type == "state_update_result"`, `allowed_next_stage == "WF-RC-01"`, `response_generation_allowed=true`; `execution_contexts.status` transitions `aggregating→completed`; `threads.activity_at` updated |
| V4 | State transition + exact output match | Denied write classes appear in `state_update_result` as blocked; SQL layer emits no row changes for denied classes; row-count delta = 0 on affected tables |
| V5 | Exact error code match | `error.code == "LINEAGE_MISMATCH"` on tenant/thread/context-row mismatch; `"REPLAY_BLOCKED"` on duplicate `_replay_seen_input_hash` |
| V6 | DB side-effect assertion | Pre/post row counts on `execution_contexts`, `threads`, `tasks`, `reminders`, `messages`, `rag_memories`: delta = 0 outside declared write scope |

Off-node harness (650 tests): exact-output oracle per fixture + schema match on envelope structure; state-transition oracle for V3/V4 branches.
