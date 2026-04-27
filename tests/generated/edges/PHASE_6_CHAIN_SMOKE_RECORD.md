# PHASE 6 — Full Primary Chain Smoke Record

Run ID: `run_2026-04-19_autonomous_test_e2e` / Phase 6
Scope: ≥3 full-chain smokes across the activated portion of the primary chain.
Artifact: `tests/generated/edges/phase6_smoke_results.json`.

## 1. Scope

The primary chain is `TR → EC → OR → PL → DI → ME → RA → SU → RC → MO`. Phases 4 and 5
activated edges 5, 6, 7, 9. Edges 1–4 (TR→EC→OR→PL→DI) remain deferred because their
target workflows require refactoring outside the scope of this cycle.

Edge 8 (SU→RC) was **activated during Phase 6** as a pre-requisite so that a single DI
invocation can cascade through all remaining activated stages. `SU_Return_Result1` emits
exactly the envelope `RC_Validate_State_Update_Input` accepts, so the activation required
only a connector node (no adapter transformation).

## 2. Phase-6 changes

### 2.1 Edge-8 activation (SU→RC)

Patch script: `tests/generated/workflows/snapshots/_activate_edge_8_su_to_rc.mjs`.

Applied via `n8n-patch.mjs replace ENiYNfL3ul8AmmCB WF-SU-01_phase6_put.json --reactivate`.

Changes to WF-SU-01:

- Added `SU_Dispatch_To_RC_01_SUBCALL` (type `n8n-nodes-base.executeWorkflow`, targeting
  WF-RC-01 `TClXgmO8H8zsSwMb`, mode `once`).
- Rewired `SU_Return_Result1.main[0]` → `SU_Dispatch_To_RC_01_SUBCALL`.
- Error branches (`SU_Return_Error1`, `SU_Return_Context_Error1`) remain terminal; only
  the success path dispatches to RC.

Snapshot: `WF-SU-01_phase6_pre.json` → `WF-SU-01_phase6_put.json`.

## 3. Smoke cases

Three execution contexts were created fresh (`c0000000-0000-0000-0000-00000000000{1..3}`)
with `status='initialized'` and distinct `idempotency_key` values. Each was submitted as
a one-step `task_create` plan via DI-01's chat trigger.

Each DI invocation cascaded: DI → ME → RA → SU → RC → MO.

### 3.1 Case 1 — ctx `c0000000-…-000001`

| Stage | Exec ID | Status |
|-------|---------|--------|
| DI (WF-DI-01) | 841 | ✅ success |
| ME (WF-ME-01) | 842 | ✅ success |
| RA (WF-RA-01) | 843 | ✅ success |
| SU (WF-SU-01) | 844 | ✅ success |
| RC (WF-RC-01) — fanout | 845, 847, 849 | ✅ success ×3 |
| MO (WF-MO-01) — fanout | 846, 848, 850 | ✅ success ×3 |

### 3.2 Case 2 — ctx `c0000000-…-000002`

| Stage | Exec ID | Status |
|-------|---------|--------|
| DI | 851 | ✅ success |
| ME | 852 | ✅ success |
| RA | 853 | ✅ success |
| SU | 854 | ✅ success |
| RC — fanout | 855, 857, 859 | ✅ success ×3 |
| MO — fanout | 856, 858, 860 | ✅ success ×3 |

### 3.3 Case 3 — ctx `c0000000-…-000003`

| Stage | Exec ID | Status |
|-------|---------|--------|
| DI | 861 | ✅ success |
| ME | 862 | ✅ success |
| RA | 863 | ✅ success |
| SU | 864 | ✅ success |
| RC — fanout | 865, 867, 869 | ✅ success ×3 |
| MO — fanout | 866, 868, 870 | ✅ success ×3 |

## 4. SU fan-out observation

`SU_Build_Downstream_Envelope1` receives three converging inputs inside SU-01:

- `SU_Apply_Execution_State_Update1` (execution state write)
- `SU_Apply_Operational_Writes1` (operational-domain writes)
- `SU_Persist_Memory_Candidates1` (memory candidate persistence)

n8n runs `SU_Build_Downstream_Envelope1` once per incoming item, so the downstream chain
(including `SU_Return_Result1` and `SU_Dispatch_To_RC_01_SUBCALL`) fans out 3×. Each of
the 3 RC sub-executions is dispatched with the same envelope payload but a distinct item
context. All 3 RC calls and all 3 subsequent MO calls return success — **the fan-out is
a functional no-op at the envelope layer**, but it produces redundant downstream work.

### Phase-7 candidate

`SU_Build_Downstream_Envelope1` / `SU_Return_Result1` should deduplicate or aggregate
its 3 incoming items into a single downstream emit. Options:

- **Option A (preferred):** add an upstream Merge node (mode `combine`) that joins the 3
  write-result branches into one item before reaching `SU_Build_Downstream_Envelope1`.
- **Option B:** make `SU_Build_Downstream_Envelope1` idempotent / emit once per
  `execution_context_id` by tracking a seen-set.

This is **low-risk cleanup** — no contract change, just collapsing the fan-out. Kept as
a Phase-7 item to avoid scope creep mid-smoke.

## 5. MO downstream note

All 10 MO sub-executions (3 per smoke × 3 smokes + 1 from Phase-5 edge-9) report
`MISSING_DELIVERY_TARGET` in their payload because the tenant has no mapped telegram
user. This is **downstream of the edge-9 envelope boundary** and does not invalidate any
edge test — MO's validator accepted every envelope. Delivery itself is out of scope for
Phase-5/Phase-6.

## 6. Verdict

**PASS.** Full-activated-chain smoke (DI → ME → RA → SU → RC → MO) succeeds end-to-end
for all 3 cases.

Phase-6 completes the Phase-4/5/6 connector activation arc for the 5 edges that do not
require target-refactor. The remaining 4 deferred edges (1–4: TR→EC→OR→PL→DI) are the
only obstacles to a full TR-through-MO primary-chain smoke and are tracked for a later
refactor cycle.
