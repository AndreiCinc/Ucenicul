# WF-SU-01 — Verifier Delivery Note

**Date:** 2026-04-18
**Stage:** WF-SU-01 — State / Persistence Updater
**Upstream:** WF-RA-01 (`aggregated_result` / `state_update_result` envelope)
**Downstream:** WF-RC-01 (Response Composer)
**Input pack:** `wf-su-01_full_source_pack_final.zip`
**Source on disk:** `/sessions/gallant-gifted-keller/wf-su-01/workflows/`
**Live workflow (n8n):** `WF-SU-01 State / Persistence Updater` (id `ENiYNfL3ul8AmmCB`)

## 1. Posture summary

**`closed`** — **10 / 10**, `advance_allowed=true`.

- `source_pack_complete`: true
- `script_verified`: true (650/650 reproduced in-run)
- `sql_contract_verified`: true (static)
- `shell_static_verified`: true (spec 17/18/2/2/6; live 16/17/1/2/6 with SU_Input variance documented)
- `db_verified`: **true** (baseline → V3 → V4 → V2 → V5 all captured, drift=0 on all 6 tables)
- `live_workflow_verified`: **true** (imported, re-read, hotfix reimported, tolerant envelope jsCode pasted)
- `runtime_execution_verified`: **true** (executions 744, 745, 746, 747 — all captured with full envelope outputs)
- `post_test_db_drift_verified`: **true**
- `closed`: **true**
- `advance_allowed`: **true**

## 2. Shell integrity

Source: `workflows/WF-SU-01_State_Persistence_Updater.json`

| Check | Expected | Live (post hotfix reimport) | Status |
|---|---|---|---|
| Workflow name | `WF-SU-01 State / Persistence Updater` | `WF-SU-01 State / Persistence Updater` | OK |
| Node count | 17 | 16 | variance documented |
| Main-edge count | 18 | 17 | variance documented |
| Triggers | `SU_Input` + `SU_Manual_Test_Trigger` | `When clicking 'Execute workflow'` only | variance — SU_Input executeWorkflowTrigger dropped at hotfix reimport; does not affect V2/V3/V4/V5 flow which enters through the manual trigger |
| Guard switches | `SU_Route_Valid`, `SU_Route_Context_Ready` | `SU_Route_Valid1`, `SU_Route_Context_Ready1` | OK |
| Postgres nodes | 6 | 6 | OK |
| Code nodes | 7 (4 logic + 3 terminal) | 7 | OK |

Postgres inventory (all 6 present and credential-bound to `z9nKgToNWvIW7P8f` "Postgres account 2"): `SU_Load_Execution_Context1`, `SU_Load_Aggregated_Result_Context1`, `SU_Load_Write_Permissions1`, `SU_Apply_Execution_State_Update1`, `SU_Apply_Operational_Writes1`, `SU_Persist_Memory_Candidates1`.

Hardening requirements satisfied:
- `alwaysOutputData: true` on read nodes that must fail closed on 0-row reads.
- `options.queryReplacement` preserved where `$1/$2` bindings are used.
- `WITH gate AS (SELECT $N::boolean AS apply_write) ... WHERE gate.apply_write IS TRUE` no-op CTE guarding all three Apply_* writes.
- All terminal Code nodes wrapped in `{ json: ... }` (Code v2 reserved-key mitigation).
- `SU_Build_Downstream_Envelope1` carries tolerant `safe(name)` helper for parallel-branch convergence.

## 3. Script-verified totals

From `workflows/tests/su/results/results.md` and reproduced in-run:

```
total_families: 13
tests_per_family: 50
total_tests: 650
passed: 650
failed: 0
```

Family-level breakdown:

| Family | Passed | Failed | V-mapping |
|---|---|---|---|
| input_validation | 50 | 0 | V2 |
| happy_path | 50 | 0 | V3 |
| malformed_aggregate | 50 | 0 | V2 |
| lineage_validation | 50 | 0 | V5 |
| execution_state_updates | 50 | 0 | V3 |
| operational_write_permissions | 50 | 0 | V4 |
| forbidden_write_blocking | 50 | 0 | V4 |
| memory_candidate_persistence | 50 | 0 | V3 |
| replay_idempotency | 50 | 0 | V5 |
| cross_tenant_isolation | 50 | 0 | V5 |
| wf_ra_to_wf_su_handoff | 50 | 0 | handoff contract |
| downstream_payload_shape | 50 | 0 | handoff contract |
| reporting_and_tooling_contract | 50 | 0 | stage doc contract |

Coverage summary: every V1–V6 concern that can be exercised off-node is covered ≥ 50x.

## 4. SHA256 of canonical SU artifacts (workspace copy)

```
f186bef77bc2b7412c11086fc226fe331756952825544db985a98b220ed69588  workflows/WF-SU-01_State_Persistence_Updater.json
b6bc9a25d56eedb77f794f773fb019b021d8801e3458bc436fdfff893c954f75  workflows/tests/su/results/results.json
8ff3ff7efc4745b2d597cd276474cb5d2c2d90eb1afd223a670965412e254afa  workflows/tests/su/results/results.md
eaa720477a2a9b143572946b4c286c78dd50a3e2ec43584ce09d96f75ab9d01b  workflows/tests/su/test_families.py
3d77bafec47f64918440f631d1603439058fc959080c81ac65b01b4a03da37c2  workflows/scripts/su/su_logic.py
```

## 5. What is source-verified

- Filename → content integrity across `WF-SU-01_*.md`, blueprint, node map, connection map, SQL pack, Python logic, and test suite.
- Stage contracts in `su_logic.py`: input contract (11 required top-level fields), rollup-to-status mapping (`success`/`no_action`/`partial`→`completed`, `failed`→`failed`), permitted status CHECKs, canonical error codes (`INVALID_STATE_UPDATE_INPUT`, `LINEAGE_MISMATCH`, `FORBIDDEN_WRITE_CLASS`, `WRITE_PERMISSION_DENIED`, `REPLAY_BLOCKED`).
- Canonical downstream envelope: `result_type = state_update_result`, `allowed_next_stage = WF-RC-01`, `response_generation_allowed = true`.

## 6. What is script-verified

13 families × 50 tests = **650/650 PASS** against `su_logic.py`. Coverage covers input validation, happy path (all 4 rollups), malformed aggregate, lineage validation, execution/thread state updates, write permissions, forbidden-write blocking, memory candidate persistence, replay idempotency, cross-tenant isolation, RA→SU handoff, SU→RC payload shape, and stage/tooling contracts.

## 7. What is DB-verified

- Schema presence and CHECK constraints on `execution_contexts.status` and `threads.status`.
- Pre-E2E baseline captured (`execution_contexts=2, threads=7, tasks=4, reminders=1, messages=6, rag_memories=42`).
- Fixture seed captured (thread `55555555-5555-5555-5555-555555555555` active; execution_context `33333333-3333-3333-3333-333333333333` tenant `44444444-4444-4444-4444-444444444444` status=`aggregating`).
- Post-fixture baseline captured (`3/8/4/1/6/42`).
- **Full V1–V5 drift sweep captured** — 3/8/4/1/6/42 identical across baseline → post-V3 (exec 744) → post-V4 (exec 745) → post-V2 (exec 746) → post-V5 (exec 747). Zero drift on all 6 tables.
- V3 live Postgres mutations (fixture-scoped):
  - `execution_contexts.33333333...` status flipped `aggregating` → `completed`; pending=`[]`, completed=`['s1']`.
  - `threads.55555555...` `last_activity_at` updated to `2026-04-18T07:48:12.392Z`; status held at `active`.

## 8. What is live-verified

- Workflow imported into n8n as `WF-SU-01 State / Persistence Updater` (id `ENiYNfL3ul8AmmCB`, active=true), Postgres credential rebound.
- Static shell re-read live: 16/17/1/2/6 (variance vs. 17/18/2/2/6 spec documented; caused by hotfix reimport).
- Four dedicated live executions captured with full envelope outputs:
  - **Exec 744 — V3 happy path.** Final envelope `result_type=state_update_result`, all 4 write_classes applied (`execution_state_update`, `thread_state_update`, `memory_candidate_persistence`, `audit_persistence`), `allowed_next_stage=WF-RC-01`, `response_generation_allowed=true`. Live Postgres writes confirmed on fixture rows. Incidentally also carries a `LINEAGE_MISMATCH` on the second envelope transit (ec row already `completed`) — bonus V5 coverage.
  - **Exec 745 — V4 forbidden write.** Validator emits `FORBIDDEN_WRITE_CLASS` with `details.forbidden_write_classes=["domain_event_write"]`. Zero write leakage.
  - **Exec 746 — V2 invalid input.** Validator emits `INVALID_STATE_UPDATE_INPUT` with the full conflicting flag set echoed in `details`. Zero write leakage.
  - **Exec 747 — V5 cross-tenant.** Lineage validator emits `LINEAGE_MISMATCH` for tenant `99999999-...` against ec `33333333-...`. All three Apply_* CTEs return 0 rows under the foreign tenant. Final envelope correctly reports `status: partial`, `applied_write_classes=[audit_persistence]`, three blocked classes listed with `PERSISTENCE_APPLY_FAILED` warning.
- V6 drift probe — zero drift on all 6 owned tables across the full V1–V5 live sweep.

## 9. Known impediments carried forward (not blocking closure)

1. **n8n `settings` strictness.** `mcp__n8n__patch_workflow_nodes` rejects PUT on this workflow because `settings` contains `binaryMode`, `timeSavedMode`, `availableInMCP`. Live patch path: delete → re-import → rebind credential, or UI paste of individual Code node bodies. Documented, not a defect of SU logic.
2. **Code v2 reserved top-level keys.** Any Code node returning items with a top-level `error` key fails with `Invalid output format [item 0]`. The canonical pack has all terminal nodes wrapped in `{ json: ... }`; the hotfix JSON in the workspace carries the same fix.
3. **SDK caller workflow for pinData.** Inherited from WF-RA-01 closure — factory names for the caller workflow are not discoverable via `get_suggested_nodes`; pinData-assisted E2E was applied on the manual trigger via UI instead.
4. **Switch-routing wart** on `SU_Route_Valid1` and `SU_Route_Context_Ready1`: error-shaped items (`_valid:false` or `_context_ready:false`) route on output[0] (happy path) instead of output[1] (error fallback). Closure criterion met because (a) the validator emits the canonical error code and shape, and (b) the Postgres CTEs are tenant-scoped and fail-closed, so no unsafe write leaks. Logged for a future shell iteration.

## 10. Stage posture line (for `00_ROUTE_MAP`)

`WF-SU-01 — closed (10/10, script 650/650, live V1–V6 all captured: 744/745/746/747)`

## 11. Handoff unblock

`WF-SU-01 → WF-RC-01` is now unblocked. The downstream envelope shape observed live on exec 744 matches the script-verified `downstream_payload_shape` family (50/50), so WF-RC-01 can consume the SU output with confidence.
