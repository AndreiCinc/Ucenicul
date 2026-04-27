# WF-PL-01_TEST_ENTRY_EXIT_POINTS

Derived from `docs/WF-PL-01_NODE_MAP.md` and `docs/WF-PL-01_CONNECTION_MAP.md`.

## Entry points (inputs)

| Node | Type | Purpose | Used in tests? |
|---|---|---|---|
| `When clicking 'Execute workflow'` | Manual trigger | Shell-safe manual execution path for authoring and local validation | YES — V1/V2/V3/V4/V5 shell path |
| `When chat message received` | Chat trigger / webhook-registered trigger | Parity with carry-forward testing pattern; adapter-safe payload handling | YES — V1/V6 live runtime proof (exec 712, 713, 714 all used chat trigger) |

Both entry points converge on `PL_Validate_OR_Handoff` (edges 1, 2 in CONNECTION_MAP). Tests MAY exercise any entry point; oracles are identical for equivalent payloads.

---

## Exit points (outputs)

| Node | Emits | Oracle type |
|---|---|---|
| `PL_Return_Result` | Canonical `plan` success envelope (§3.a of CONTRACTS) | Schema match + exact-field assertions (status_kind, result_type, allowed_next_stage, dispatcher_input flags, step count, step structure) |
| `PL_Return_Error` | Canonical `error` envelope (§3.b of CONTRACTS) | Schema match + exact `error.code` assertion + missing_fields array match |

### Exit paths to `PL_Return_Error`

`PL_Return_Error` is reachable from 3 sources (per CONNECTION_MAP):

| Source | Edge | Error codes emitted |
|---|---|---|
| `PL_Route_Valid` output: `invalid` | Line 19 | `INVALID_HANDOFF_INPUT` (from `PL_Validate_OR_Handoff` failure) |
| `PL_Route_Context_Ready` output: `not_ready` | Line 24 | `INSUFFICIENT_PLANNING_CONTEXT` or `CONTEXT_MISMATCH` (from `PL_Build_Planner_Input` failure or `PL_Verify_Context_Match` failure) |
| (Implicit) | — | `PLAN_BUILD_FAILED` (from `PL_Generate_Plan` failure if module resolution fails) |

### Exit paths to `PL_Return_Result`

`PL_Return_Result` is reachable from one source (per CONNECTION_MAP line 14):

| Source | Edge | Success payload features |
|---|---|---|
| `PL_Generate_Plan` output | Line 14 | status_kind=success, result_type=plan, allowed_next_stage=WF-DI-01, dispatcher_input with all four guard flags, steps array with step_id + module_name + purpose + inputs |

---

## Decision-point taps (intermediate observation points for routing oracles)

| Node | Type | Output field | Observe | Branches |
|---|---|---|---|---|
| `PL_Route_Valid` | Switch | `_valid` | boolean validity flag | `"true"` → continue; `"invalid"` → error |
| `PL_Verify_Context_Match` | Code | `_verified` | boolean context match result | Used internally by `PL_Build_Planner_Input` via `$('PL_Verify_Context_Match').first()` |
| `PL_Build_Planner_Input` | Code | `_context_ready` | string "true" or "false" | Used by switch below |
| `PL_Route_Context_Ready` | Switch | `_context_ready` | string routing field | `"true"` → continue to plan generation; `"false"` → error |

---

## Canonical execution paths (from CONNECTION_MAP)

### Happy path (V1)

```
Trigger 
  → PL_Validate_OR_Handoff
  → PL_Route_Valid[_valid="true"]
  → PL_Extract_Planning_Input
  → PL_Load_Execution_Context
  → PL_Verify_Context_Match
  → PL_Load_Module_Registry
  → PL_Build_Planner_Input
  → PL_Route_Context_Ready[_context_ready="true"]
  → PL_Generate_Plan
  → PL_Return_Result
```

Expected oracle: `status_kind=success`, `result_type=plan`, `allowed_next_stage=WF-DI-01`.

### Invalid handoff path (V2)

```
Trigger 
  → PL_Validate_OR_Handoff
  → PL_Route_Valid[_valid="invalid"]
  → PL_Return_Error
```

Expected oracle: `status_kind=failed`, `error.code=INVALID_HANDOFF_INPUT`, `missing_fields=[...]`.

### Insufficient context path (V5, context mismatch case)

```
Trigger 
  → PL_Validate_OR_Handoff
  → PL_Route_Valid[_valid="true"]
  → PL_Extract_Planning_Input
  → PL_Load_Execution_Context (returns NULL or mismatched row)
  → PL_Verify_Context_Match (sets _verified="false")
  → PL_Load_Module_Registry
  → PL_Build_Planner_Input (detects _verified="false", fail-closes)
  → PL_Route_Context_Ready[_context_ready="false"]
  → PL_Return_Error
```

Expected oracle: `status_kind=failed`, `error.code=CONTEXT_MISMATCH`, `missing_fields=['execution_context']` or matching keys.

### Insufficient planning context path (V5, true planning context defect)

```
Trigger 
  → PL_Validate_OR_Handoff
  → PL_Route_Valid[_valid="true"]
  → PL_Extract_Planning_Input
  → PL_Load_Execution_Context (succeeds)
  → PL_Verify_Context_Match (passes, _verified="true")
  → PL_Load_Module_Registry
  → PL_Build_Planner_Input (passes verify, but planner_context.goal empty AND requested_actions empty AND primary_intent unmappable)
  → PL_Route_Context_Ready[_context_ready="false"]
  → PL_Return_Error
```

Expected oracle: `status_kind=failed`, `error.code=INSUFFICIENT_PLANNING_CONTEXT`, `missing_fields=['planner_context.goal or planner_context.user_message_text']` or similar.

---

## Test harness binding

- **Off-node harness**: `tests/test_families.py` — 13 families × 50 tests = 650 total.
- **Fixture harness**: `sql/10_fixtures_create.sql` + `sql/11_fixtures_cleanup.sql`.
- **Probes**: `sql/20_read_path_probe.sql` (read-path verification after V1/V4/V5 execution).

---

## Live runtime proof (closure evidence)

All three entry-point types confirmed operational in live closure cycle:

- **Manual trigger** — used for V1/V2/V4/V5 vectoring
- **Chat trigger** — used for V1 (exec 712), V4 (exec 713), V5 (exec 714) final closure proofs
- **Exit point** — `PL_Return_Result` confirmed in V1 (exec 712); `PL_Return_Error` confirmed in V4 (exec 713), V5 (exec 714)

All three error exit codes confirmed:
- `INVALID_HANDOFF_INPUT` — V2 path (exec 708 from Cycle 2)
- `CONTEXT_MISMATCH` — V4 path (exec 713), V5 path (exec 714)
- `INSUFFICIENT_PLANNING_CONTEXT` — not documented in live closure evidence; relied on script-level pass for test family coverage
- `PLAN_BUILD_FAILED` — not documented in live closure evidence; relied on script-level pass for test family coverage
