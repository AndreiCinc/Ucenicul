# PHASE 5 — Edge-by-edge E2E Run Record

Run ID: `run_2026-04-19_autonomous_test_e2e` / Phase 5
Scope: 50 synthetic + 10 runtime cases per activated edge (4 edges × 60 = 240 cases).
Harness: `tests/edges/test_edges_phase5.py`.

## 1. Activated edges under test

Per `CONNECTOR_ACTIVATION_PLAN.md §2`, Phase-4 activated the four lowest-risk edges:

| # | Edge | Source node | Target trigger | Connector node | Patch type |
|---|------|-------------|----------------|----------------|------------|
| 5 | DI → ME | `DI_Return_Result` | `ME_Input` | `DI_Dispatch_To_ME_01_SUBCALL` | connector-only (new) |
| 6 | ME → RA | `ME_Return_Result` | `RA_Input` | `ME_Dispatch_To_RA_01_SUBCALL` | connector-only (new) |
| 7 | RA → SU | `RA_Build_Downstream_Envelope` | `SU_Input` | `RA_Dispatch_To_SU_01_SUBCALL` | connector-only (new) |
| 9 | RC → MO | `RC_Prepare_MO_01_Handoff` | `MO_Input` | `RC_Dispatch_To_MO_01_SUBCALL` | re-enable disabled |

Deferred (target-refactor required, out of this cycle): edges 1 (TR→EC), 2 (EC→OR), 3 (OR→PL), 4 (PL→DI), 8 (SU→RC).

## 2. Synthetic run — 50 cases × 4 edges = 200 cases

Executed: `python tests/edges/test_edges_phase5.py` → writes `phase5_results.json`.

| Edge | Total | Passed | Failed |
|------|-------|--------|--------|
| edge_5_DI_to_ME | 50 | **50** | 0 |
| edge_6_ME_to_RA | 50 | **50** | 0 |
| edge_7_RA_to_SU | 50 | **50** | 0 |
| edge_9_RC_to_MO | 50 | **50** | 0 |
| **Total** | **200** | **200** | **0** |

All 200 synthetic cases pass. Results snapshot: `tests/generated/edges/phase5_results.json`.

## 3. Fixture strategy

Tenant / thread / execution_context IDs drawn from the DB preflight fixture in Phase 2:

```
tenant_id             = aaaaaaaa-0000-0000-0000-000000000001
thread_id             = 11111111-0000-0000-0000-000000000001
execution_context_id  = 0000ec01-0000-0000-0000-000000000001
trigger_message_id    = aaaabbbb-0000-0000-0000-000000000010
```

Plans use two steps (task_module + reminder_module) with one sequential and one parallel,
both in state `pending` with canonical depends_on / expected_outputs / replan_if /
failure_policy so DI's validator accepts them.

## 4. Edge-layer adapter / normalization notes

Phase-5 synthetic testing composes each source WF's output and validates against the
target WF's entry validator. Three connector-layer adapters were required:

### 4.1 Edge 5 — DI → ME splitter (architectural, not drift)

DI-01 emits a single `dispatch` envelope with `payload.ready_groups = [[module_requests,…]]`.
WF-ME-01's `ME_Validate_Dispatcher_Result` requires a **per-step** dispatch envelope with
top-level `dispatcher_input.step` (single step). The connector layer therefore splits each
ready_group × module_request → one ME subcall. Harness helper: `_split_dispatch_to_per_step`.

This is consistent with the architecture: DI dispatches groups, ME executes one step per call.
The splitter lives at the connector/wire layer, not in DI or ME.

### 4.2 Edge 7 — RA → SU idempotency_key injection

`ra_logic.aggregate_module_results` emits an SU-compatible envelope (all REQUIRED_ENVELOPE_FIELDS
present, `allowed_next_stage: "WF-SU-01"`, `state_update_allowed: true`) but does NOT emit
`idempotency_key`. SU's validator requires one whose string contains the execution_context_id.
Connector adapter adds `idempotency_key = f"ra-to-su:{execution_context_id}:v{i}"`.

This matches the canonical pattern: idempotency keys are injected at edge boundaries by the
caller, which is RA's Execute-Workflow node on the wire.

### 4.3 Edge 9 — RC → MO field-name drift (CONTRACT DRIFT FINDING)

**Severity: low (aliasable) / but requires documentation.**

RC-01's `rc_logic.compose_response` + live `RC_Build_Output_Envelope` emit:

```
composed_response: {
  final_response_text: "...",
  response_status: "success",
  ...
}
```

MO-01's `mo_logic.validate_input` and live `MO_Validate_Input` require:

```
composed_response: {
  response_text: "...",
  response_status: "success",
  ...
}
```

The harness normalizes via `response_text = final_response_text` before calling MO.
The same aliasing must be applied at one of:

- **Option A (preferred):** RC_Build_Output_Envelope emits `response_text` in addition to
  (or replacing) `final_response_text`.
- **Option B:** MO_Validate_Input reads `final_response_text` as a fallback.
- **Option C:** connector node `RC_Dispatch_To_MO_01_SUBCALL` transforms the payload.

Recommended fix: Option A — RC is the canonical source of the composed response and should
emit the canonical key. This is a **Phase-6 candidate micro-patch** (single field rename
in one code node + same change in `rc_logic.py`). No schema change upstream or downstream
is needed.

## 5. Runtime (live) phase — 10 cases × 4 edges

Runtime validation invokes each source WF via `execute_workflow` (MCP) with a valid
payload matching that WF's entry validator, then asserts (a) the source returns success
and (b) the connector subcall (Execute-Workflow) executed successfully against the target.

Runtime records are captured in `tests/generated/edges/phase5_runtime_results.json` and
summarised below.

| Edge | WF to invoke | Payload shape | Expected outcome | Cases | Pass | Fail |
|------|-------------|----------------|------------------|-------|------|------|
| 5 | WF-DI-01 | plan envelope (status_kind=success, result_type=plan, 1 step) | DI emits dispatch + ME subcall succeeds | 10 | see §5.1 | — |
| 6 | WF-ME-01 | per-step dispatch envelope | ME emits module_result + RA subcall succeeds | 10 | see §5.2 | — |
| 7 | WF-RA-01 | module_batch aggregation envelope | RA emits aggregated_result + SU subcall succeeds | 10 | see §5.3 | — |
| 9 | WF-RC-01 | state_update_result envelope | RC emits composed_response + MO subcall succeeds | 10 | see §5.4 | — |

Runtime cases use the same GOOD_ROW fixture as the synthetic harness, with per-case
variation in descriptions / due dates to avoid idempotency_key collision.

### 5.0 Runtime execution — method

Runtime runs used the MCP `execute_workflow` tool against the live published workflows.

Edges 5, 6, 7 share the same DI→ME→RA→SU chain: a single DI invocation exercises all
three connector boundaries. Each DI invocation was therefore counted as one runtime case
for each of the three edges (10 DI runs × 3 edges = 30 runtime-edge passes).

Edge 9 (RC→MO) was exercised by 10 separate RC invocations. Because the published RC-01
only had `executeWorkflowTrigger` + `manualTrigger` — neither of which MCP's
`execute_workflow` can invoke directly — a `chatTrigger` + JSON-parse node
(`RC_Chat_Trigger` → `RC_Parse_Chat_Input` → `RC_Validate_State_Update_Input`) was added
via `_add_rc_chat_trigger.mjs` + `WF-RC-01_phase5b_put.json`. This preserves all Phase-5
patches (including the `RC_Prepare_MO_01_Handoff` rewrite that aliases
`final_response_text → response_text` for MO's validator).

Runtime results artifact: `tests/generated/edges/phase5_runtime_results.json`.

### 5.1 Edge 5 runtime — DI → ME

Source: `DI_Return_Result` → `DI_Build_ME_Envelopes` (adapter: ready_groups→per-step
splitter) → `DI_Dispatch_To_ME_01_SUBCALL` → WF-ME-01 entry.

| Case | exec_ctx | DI exec | ME sub-exec | Pass |
|------|----------|---------|-------------|------|
| 1  | a7ae786a-9f64-46b8-b02a-3df62080a8f7 | 781 | 782 | ✅ |
| 2  | b0000002-0000-0000-0000-000000000002 | 785 | 786 | ✅ |
| 3  | b0000003-0000-0000-0000-000000000003 | 789 | 790 | ✅ |
| 4  | b0000004-0000-0000-0000-000000000004 | 793 | 794 | ✅ |
| 5  | b0000005-0000-0000-0000-000000000005 | 797 | 798 | ✅ |
| 6  | b0000006-0000-0000-0000-000000000006 | 801 | 802 | ✅ |
| 7  | b0000007-0000-0000-0000-000000000007 | 805 | 806 | ✅ |
| 8  | b0000008-0000-0000-0000-000000000008 | 809 | 810 | ✅ |
| 9  | b0000009-0000-0000-0000-000000000009 | 813 | 814 | ✅ |
| 10 | b0000010-0000-0000-0000-000000000010 | 817 | 818 | ✅ |

Result: **10 / 10 PASS**. DI emits a valid per-step dispatch envelope; ME accepts it and
produces a module_result in every case.

### 5.2 Edge 6 runtime — ME → RA

Source: `ME_Return_Result` → `ME_Build_RA_Envelope` (adapter: module_result→module_batch
wrapper) → `ME_Dispatch_To_RA_01_SUBCALL` → WF-RA-01 entry.

| Case | ME exec | RA sub-exec | Pass |
|------|---------|-------------|------|
| 1  | 782 | 783 | ✅ |
| 2  | 786 | 787 | ✅ |
| 3  | 790 | 791 | ✅ |
| 4  | 794 | 795 | ✅ |
| 5  | 798 | 799 | ✅ |
| 6  | 802 | 803 | ✅ |
| 7  | 806 | 807 | ✅ |
| 8  | 810 | 811 | ✅ |
| 9  | 814 | 815 | ✅ |
| 10 | 818 | 819 | ✅ |

Result: **10 / 10 PASS**. ME emits module_result, adapter wraps it into an
`aggregation_input.module_batch` envelope; RA accepts and emits an `aggregated_result`.

### 5.3 Edge 7 runtime — RA → SU

Source: `RA_Build_Downstream_Envelope` → `RA_Build_SU_Envelope` (adapter:
idempotency_key injector) → `RA_Dispatch_To_SU_01_SUBCALL` → WF-SU-01 entry.

| Case | RA exec | SU sub-exec | Pass |
|------|---------|-------------|------|
| 1  | 783 | 784 | ✅ |
| 2  | 787 | 788 | ✅ |
| 3  | 791 | 792 | ✅ |
| 4  | 795 | 796 | ✅ |
| 5  | 799 | 800 | ✅ |
| 6  | 803 | 804 | ✅ |
| 7  | 807 | 808 | ✅ |
| 8  | 811 | 812 | ✅ |
| 9  | 815 | 816 | ✅ |
| 10 | 819 | 820 | ✅ |

Result: **10 / 10 PASS**. RA emits an aggregated_result; adapter adds
`idempotency_key = "ra-to-su:{execution_context_id}:v1"` when missing; SU accepts and
applies the state update. (SU also mutates `execution_contexts.status → completed` as a
side-effect, which is the expected terminal state for the chain.)

### 5.4 Edge 9 runtime — RC → MO

Source: `RC_Build_Output_Envelope` → `RC_Prepare_MO_01_Handoff` (adapter: alias
`final_response_text → response_text` plus re-shape for MO input) →
`RC_Dispatch_To_MO_01_SUBCALL` → WF-MO-01 entry.

RC-01 was patched with `RC_Chat_Trigger` + `RC_Parse_Chat_Input` to accept MCP-driven
chat invocations; all Phase-5 patches (including the Handoff adapter) remain intact.

| Case | exec_ctx | RC exec | MO sub-exec | MO validator pass | Note |
|------|----------|---------|-------------|-------------------|------|
| 1  | b0000002-0000-0000-0000-000000000002 | 821 | 822 | ✅ | first run; MO reported MISSING_DELIVERY_TARGET downstream (telegram user not mapped) — envelope boundary PASSED |
| 2  | b0e90000-0000-0000-0000-000000000001 | 823 | 824 | ✅ | |
| 3  | b0e90000-0000-0000-0000-000000000002 | 825 | 826 | ✅ | |
| 4  | b0e90000-0000-0000-0000-000000000003 | 827 | 828 | ✅ | |
| 5  | b0e90000-0000-0000-0000-000000000004 | 829 | 830 | ✅ | |
| 6  | b0e90000-0000-0000-0000-000000000005 | 831 | 832 | ✅ | |
| 7  | b0e90000-0000-0000-0000-000000000006 | 833 | 834 | ✅ | |
| 8  | b0e90000-0000-0000-0000-000000000007 | 835 | 836 | ✅ | |
| 9  | b0e90000-0000-0000-0000-000000000008 | 837 | 838 | ✅ | |
| 10 | b0e90000-0000-0000-0000-000000000009 | 839 | 840 | ✅ | |

Result: **10 / 10 PASS**. RC composes a `composed_response` envelope, the Handoff adapter
emits `composed_response.response_text` (aliased from `final_response_text`), MO's
`MO_Validate_Input` accepts the envelope in all 10 cases.

The field-name drift recorded in §4.3 is now neutralized at the connector layer. A
follow-up Phase-6 micro-patch (rename `final_response_text → response_text` inside
`RC_Compose_Response` + `rc_logic.py`) is still the preferred long-term fix so the alias
in `RC_Prepare_MO_01_Handoff` becomes a no-op and the adapter can be simplified.

### 5.5 Runtime totals

| Edge | Runtime cases | Pass | Fail |
|------|---------------|------|------|
| 5 — DI→ME | 10 | **10** | 0 |
| 6 — ME→RA | 10 | **10** | 0 |
| 7 — RA→SU | 10 | **10** | 0 |
| 9 — RC→MO | 10 | **10** | 0 |
| **Total** | **40** | **40** | **0** |

## 6. Phase-5 findings

1. **Edge 9 field-name drift (§4.3) — open.** Minor, aliasable, flagged for a Phase-6
   single-node patch in RC or MO. Does not block Phase-5 synthetic acceptance.
2. **Edge 5 splitter (§4.1) — architectural confirmation.** DI emits grouped dispatch
   and the connector splits into per-step ME subcalls. Behavior is as-designed; recorded
   here so future test authors understand why the wire shape differs from DI's emit shape.
3. **Edge 7 idempotency_key (§4.2) — architectural confirmation.** Connector boundary is
   the correct place for idempotency_key injection when the caller does not carry one;
   RA does not, so the RA_Dispatch_To_SU_01_SUBCALL node's pass-through / Set node is
   the right place in n8n.

## 7. Verdict

**PASS.** Synthetic: 200 / 200. Runtime: 40 / 40. Phase 5 complete over the 4 activated
connector edges (DI→ME, ME→RA, RA→SU, RC→MO).

Connector-layer adapters applied (all four live in n8n production workflows):

- `DI_Build_ME_Envelopes` in WF-DI-01 (ready_groups → per-step envelope splitter; subcall mode=each)
- `ME_Build_RA_Envelope` in WF-ME-01 (module_result → module_batch wrapper)
- `RA_Build_SU_Envelope` in WF-RA-01 (idempotency_key injector)
- `RC_Prepare_MO_01_Handoff` (rewrite) in WF-RC-01 (final_response_text → response_text alias)

Carry-over items for Phase 6:

1. Rename `final_response_text → response_text` inside `RC_Compose_Response` +
   `rc_logic.py` so the RC-Prepare-MO-Handoff alias becomes a no-op.
2. If telegram delivery in MO is wanted for smoke tests, map a telegram user on the
   tenant (MO currently returns MISSING_DELIVERY_TARGET, which is a valid downstream
   outcome but prevents end-to-end delivery verification).
3. The RC chatTrigger (`RC_Chat_Trigger` + `RC_Parse_Chat_Input`) added to enable MCP-
   driven runtime tests can remain (harmless) or be removed before production cut-over.
