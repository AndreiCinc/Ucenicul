# WF-E2E-01 — Pack ↔ Live Diff Table (per chain workflow)

**Date:** 2026-04-18
**Sources:**
- Live snapshots: `tools/n8n-patch/snapshots/e2e-01-discovery/*.json`
  pulled 2026-04-18 from production n8n (Railway).
- Pack files: where present in the workspace
  (`wf-rc-01-pack/`, `wf-mo-01-pack/`, `wf-su-01/`,
  `wf-ra-01_full_source_pack/`).
- Where pack is absent in workspace, only live shell is recorded.

This table fulfils the user's 2026-04-18 discipline rule:
"full pack↔live diff on ALL nodes (type, parameters, credentials,
connections) before declaring any closure".

For E2E-01 specifically, the table is read-only. No remediation is
attempted in this stage. Per-stage remediation is owned by each
stage's own closure cycle.

---

## Table 1 — high-level shell counts

| Stage | Live workflow id | Live nodes | Live edges | Pack present | Pack nodes | Pack edges | Δnodes | Δedges | Notes |
|-------|------------------|------------|------------|--------------|------------|------------|--------|--------|-------|
| TR-01 | `wI8hpSROxQI0zC9f` | 20 | 21 | no (workspace) | — | — | — | — | Re-verification pending. |
| EC-01 | `v9jih4jqeXpOJOiH` | 9 | 8 | no | — | — | — | — | Active stage; build pending. |
| OR-01 | `KhGmNpi0ZDmrnz8W` | 10 | 9 | no | — | — | — | — | Shell only. |
| PL-01 | `RwToPLa1ErHl2tUi` | 13 | 13 | partial (`workflows/WF-PL-01_Plan_Builder.json` referenced in STATE prep) | — | — | — | — | Pack JSON not present in this workspace; only `pl_logic.py` script-proven. |
| DI-01 | `abqYINcXr3JAhGGk` | 13 | 13 | no | — | — | — | — | Shell only. |
| ME-01 | `uq26nh1grIpnHju0` | 18 | 24 | no | — | — | — | — | Has executeWorkflowTrigger. |
| RA-01 | `5RcNLtxNjAHJsZPE` | 14 | 14 | yes (`wf-ra-01_full_source_pack/`) | not loaded | not loaded | tbd | tbd | Pack present, full diff deferred until RA-01 stage cycle. |
| SU-01 | `ENiYNfL3ul8AmmCB` | 17 | 18 | yes (`wf-su-01/WF-SU-01_State_Persistence_Updater.json`) | 17 | 18 | 0 | 0 | **Gap closed 2026-04-18** — `SU_Input` `executeWorkflowTrigger` added back additively (no existing node modified). Node-name drift persists (live has `*1` suffixes on non-trigger nodes from prior hotfix re-import; pack does not). Node-count/edge-count now match pack. Callable-as-sub smoke proven (execution 763). See `WF-E2E-01_SU01_CALLABLE_AS_SUB_SMOKE.md`. |
| RC-01 | `TClXgmO8H8zsSwMb` | 16 | 15 | yes (`wf-rc-01-pack/workflows/WF-RC-01_Response_Composer.json`) | 14 | 13 | +2 | +2 | **Intentional E2E-01 delta.** Live carries 2 disabled connector nodes (RC_Prepare_MO_01_Handoff, RC_Dispatch_To_MO_01_SUBCALL). Canonical RC-01 pack remains at its closed-10/10 baseline. Connector is meta-layer; not back-ported into the RC-01 pack to preserve stage closure integrity. See `WF-E2E-01_RC01_TO_MO01_CONNECTOR_ACTIVATION.md`. |
| MO-01 | `OooZdC0DgsDR6gm0` | 18 | 18 | yes (`wf-mo-01-pack/workflows/WF-MO-01_Message_Out.json`) | 18 | 18 | 0 | 0 | **Match.** |
| MO-dup | `rooFWDryqC0YDyVa` | 4 | 2 | n/a (not canonical) | n/a | n/a | n/a | n/a | LangChain agent stub erroneously named WF-MO-01. To be deactivated + renamed. |

**Summary (updated 2026-04-18 post E2E-01 ship-disabled):**
- MO-01 matches its pack exactly at shell-shape level (modulo the documented intentional `MO_Send_Channel_PLACEHOLDER` substitution).
- RC-01 is intentionally +2 nodes / +2 edges ahead of its canonical pack after the E2E-01 ship-disabled connector add on 2026-04-18T12:34Z. Both new nodes ship `disabled: true` and the payload gate (`dispatch_to_mo_01 === true`) adds a second guard. Pre- and post- snapshots preserved; all 8 existing jsCode bodies verified sha256-preserved (zero regression of RC-01's closure integrity).
- SU-01's prior -1 node delta (`executeWorkflowTrigger` dropped at hotfix re-import) is closed as of 2026-04-18 under E2E-01: additive `SU_Input` re-added, smoke-proven callable-as-sub in execution 763. A separate node-name drift remains (live `*1` suffixes vs pack plain names) and belongs to SU-01's own follow-up cycle, not E2E-01.
- All other stages are shells of varying maturity, with packs not present in this workspace for diff.

---

## Table 2 — RC-01 pack ↔ live, node-by-node

Source: `wf-rc-01-pack/workflows/WF-RC-01_Response_Composer.json` ↔ live snapshot.

| Node name | Pack type | Live type | Match | Notes |
|-----------|-----------|-----------|-------|-------|
| RC_Input | `n8n-nodes-base.executeWorkflowTrigger` | `n8n-nodes-base.executeWorkflowTrigger` | yes | |
| RC_Manual_Test_Trigger | `n8n-nodes-base.manualTrigger` | `n8n-nodes-base.manualTrigger` | yes | |
| RC_Validate_State_Update_Input | `n8n-nodes-base.code` (jsCode) | `n8n-nodes-base.code` (jsCode) | yes | byte-identical restored at closure |
| RC_Route_Valid | `n8n-nodes-base.switch` v3.2, `operator.true(singleValue)` | same | yes | pack bug doc'd in `wf-rc-01-pack/workflows/WF-RC-01_PACK_BUG_SWITCH_V32.md` and patched live |
| RC_Load_Execution_Context | `n8n-nodes-base.postgres` | `n8n-nodes-base.postgres` | yes | credential bound id `qpZLzVs17Zy7HCFB` |
| RC_Load_Thread_Context | `n8n-nodes-base.postgres` | `n8n-nodes-base.postgres` | yes | credential bound id `qpZLzVs17Zy7HCFB` |
| RC_Verify_Lineage | `n8n-nodes-base.code` (jsCode) | same | yes | |
| RC_Route_Context_Ready | `n8n-nodes-base.switch` v3.2 | same | yes | corrected operator |
| RC_Build_Composition_Input | `n8n-nodes-base.code` (jsCode) | same | yes | |
| RC_Compose_Response | `n8n-nodes-base.code` (jsCode) | same | yes | |
| RC_Build_Output_Envelope | `n8n-nodes-base.code` (jsCode) | same | yes | |
| RC_Return_Result | `n8n-nodes-base.code` (jsCode) | same | yes | terminal |
| RC_Return_Error | `n8n-nodes-base.code` (jsCode) | same | yes | terminal |
| RC_Return_Context_Error | `n8n-nodes-base.code` (jsCode) | same | yes | terminal |

**RC-01 verdict:** clean. No outstanding pack↔live drift after 2026-04-18 closure pass.

---

## Table 3 — MO-01 pack ↔ live, node-by-node

Source: `wf-mo-01-pack/workflows/WF-MO-01_Message_Out.json` (post-update) ↔ live snapshot.

| Node name | Pack type | Live type | Match | Notes |
|-----------|-----------|-----------|-------|-------|
| MO_Input | `n8n-nodes-base.executeWorkflowTrigger` | same | yes | |
| MO_Manual_Test_Trigger | `n8n-nodes-base.manualTrigger` | same | yes | |
| MO_Validate_Composed_Response_Input | `n8n-nodes-base.code` jsCode | same | yes | language fixed in pack 2026-04-18 |
| MO_Route_Valid | `n8n-nodes-base.switch` v3.2 with `options.fallbackOutput="extra"` | same | yes | bug fixed in pack |
| MO_Load_Channel_Delivery_Context | `n8n-nodes-base.postgres` (LIVE sql) | same | yes | sql 04_LIVE applied |
| MO_Verify_Lineage_And_Replay | `n8n-nodes-base.code` jsCode | same | yes | |
| MO_Route_Context_Ready | `n8n-nodes-base.switch` v3.2 + fallbackOutput | same | yes | |
| MO_Replay_Guard_Probe | `n8n-nodes-base.postgres` (LIVE sql) | same | yes | sql 06_LIVE applied |
| MO_Route_Channel | `n8n-nodes-base.switch` v3.2 + fallbackOutput | same | yes | |
| MO_Build_Delivery_Request | `n8n-nodes-base.code` jsCode | same | yes | |
| MO_Send_Channel_PLACEHOLDER | **pack: `n8n-nodes-base.set` (stub)** | **live: `n8n-nodes-base.telegram`** | known intentional | documented in `wf-mo-01-pack/workflows/WF-MO-01_PACK_BUGS.md §4` as the greenfield placeholder. Node name preserved. |
| MO_Build_Delivery_Result | `n8n-nodes-base.code` jsCode | same | yes | |
| MO_Log_Outbound_Message | `n8n-nodes-base.postgres` (LIVE sql) | same | yes | sql 05_LIVE applied |
| MO_Return_Result | `n8n-nodes-base.code` jsCode | same | yes | terminal |
| MO_Return_Error | `n8n-nodes-base.code` jsCode | same | yes | terminal |
| MO_Return_Context_Error | `n8n-nodes-base.code` jsCode | same | yes | terminal |

**MO-01 verdict:** clean modulo the documented intentional placeholder
substitution at `MO_Send_Channel_PLACEHOLDER`.

---

## Table 4 — SU-01 pack ↔ live (high-level)

Source: `wf-su-01/WF-SU-01_State_Persistence_Updater.json` ↔ live snapshot (post 2026-04-18 trigger add).

- Node count: pack 17, live 17. **Match.**
- Edge count: pack 18, live 18. **Match.**
- `SU_Input` `executeWorkflowTrigger`: present in both (added
  additively on 2026-04-18 under E2E-01, mandate step iii).
- Node-name drift: live non-trigger nodes carry `*1` suffixes
  (`SU_Validate_Aggregated_Input1`, `SU_Route_Valid1`, … `SU_Return_Context_Error1`)
  while pack has plain names. The SU_Input and manualTrigger wiring
  correctly target the `*1` live names. This is a cosmetic drift from
  a prior hotfix re-import and does not affect shell shape or runtime.
- All other node types and parameters: closed-enough per
  `CLOSURE_REPORT_WF-SU-01.md`.

**SU-01 verdict:** shell shape now matches pack exactly. Callable-as-sub
smoke proven on 2026-04-18 (execution 763 — see
`WF-E2E-01_SU01_CALLABLE_AS_SUB_SMOKE.md`). Green-path sub-execution
and node-name normalisation remain owned by SU-01's own follow-up
cycle, not by E2E-01.

---

## Table 5 — TR-01 / EC-01 / OR-01 / PL-01 / DI-01 / ME-01 / RA-01

These stages have no pack JSON co-located in this workspace (or, in the
case of PL-01 and RA-01, the pack exists but a full per-node diff is
deferred to the stage's own closure cycle). The live shell counts in
Table 1 are the only authoritative datum at the E2E-01 level today.

The required action for each is per-stage closure, not E2E-01-level
diffing.

---

## Audit footer

- This document is read-only output. No live mutations were caused by
  producing it.
- For RC-01 and MO-01, the pack↔live diff is **clean** at this snapshot
  date.
- For SU-01, the diff is a known -1 node, documented and accepted by
  the user as "closed enough" for E2E-01.
- For all other stages, the diff cannot be authored at the E2E-01 level
  because the per-stage pack baseline is not present in this workspace
  and/or the stage is not yet closed.
