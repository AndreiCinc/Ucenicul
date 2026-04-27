# WF-DI-01_TEST_ENTRY_EXIT_POINTS

Derived from `docs/WF-DI-01_NODE_MAP.md` and `docs/WF-DI-01_CONNECTION_MAP.md`.

---

## Entry points (inputs)

| Node | Purpose | Trigger type | Used in tests? |
|---|---|---|---|
| `When clicking 'Execute workflow'` | Manual trigger for deterministic testing and local authoring. | Manual (UI button in n8n) | YES — V1–V6 live runtime proof; script harness can mock this entry |
| `When chat message received` | Chat-trigger path for MCP / conversational runtime proof. | Chat (MCP webhook or n8n chat trigger) | YES — V1 (exec 716) and V6 live runtime proof |

Both entry points converge immediately on `DI_Validate_Plan_Result` (edges from both triggers in CONNECTION_MAP). Tests MAY exercise either entry point; oracles and downstream behavior are identical.

**Chat-input adapter** (ref `DI_Validate_Plan_Result.jsCode`): preamble unwraps chat-wrapped payload before validation:

```javascript
if (typeof input.chatInput === 'string' && !input.payload) {
  candidate = JSON.parse(input.chatInput);
} else {
  candidate = input.payload || input;
}
```

---

## Exit points (outputs)

| Node | Emits | Oracle type | Reachable from |
|---|---|---|---|
| `DI_Return_Result` | Canonical `dispatch` success envelope (ref WF-DI-01_CONTRACTS.md §3.a) | Schema match + exact-field assertions (status_kind, result_type, allowed_next_stage, dispatch_guard, ready_groups structure) | `DI_Build_Dispatch_Payload` success path |
| `DI_Return_Error` | Canonical `error` envelope (ref WF-DI-01_CONTRACTS.md §3.b) | Schema match + exact `error.code` assertion | Four error sources (below) |

### Error exit reachability

`DI_Return_Error` is reachable from 3 sources (ref CONNECTION_MAP edges):

1. **`DI_Route_Valid.invalid`** — Input fails envelope validation
   - Error codes: `INVALID_HANDOFF_INPUT`, `INVALID_PLAN`
   - Trigger: malformed envelope, missing required fields, dispatcher_input gate flags incorrect, bad step contract

2. **`DI_Route_Context_Ready.blocked`** — Context verification fails or dependency resolution fails
   - Error codes: `CONTEXT_MISMATCH`, `UNKNOWN_MODULE`, `INVALID_PLAN`
   - Trigger: execution context row mismatch, module not in registry, circular dependencies, missing step_ids in depends_on

### Success exit reachability

`DI_Return_Result` is reachable from 1 source:

- **`DI_Build_Dispatch_Payload` success path** — All verifications passed
  - Terminal condition: `_context_ready == "true"` and all ready_groups constructed
  - Output: dispatch envelope with `allowed_next_stage: "WF-ME-01"`, dispatch_guard flags correct, ready_groups emitted

---

## Decision-point taps (intermediate observation points for routing oracles)

| Node | Emits | Observe | Used in tests? |
|---|---|---|---|
| `DI_Validate_Plan_Result` | Normalized plan or error | Validation result object (valid/code/message/missing_fields/normalized) | YES — V1/V2/V3 test families |
| `DI_Route_Valid` | Two outputs: valid vs invalid | Routing key `_valid` (true/false) | YES — V1/V2 routing oracle |
| `DI_Extract_Dispatch_Input` | Extracted dispatcher input | Field extraction completeness | YES — V1 happy path proof |
| `DI_Load_Execution_Context` | DB result row (possibly empty) | Context row match (execution_id, tenant_id, thread_id, status) | YES — V5 cross-tenant isolation proof |
| `DI_Verify_Context_Match` | Context verification result | Boolean match decision (ok/code/message) | YES — V5 CONTEXT_MISMATCH oracle |
| `DI_Load_Module_Registry` | Static MODULE_REGISTRY | Registry structure and module_name enumeration | YES — script family `module_registry_resolution` |
| `DI_Build_Ready_Steps` | Ready-steps result or error | Ready-groups structure (group_id, execution_mode, step_ids, module_requests) | YES — V1 happy path ready_groups oracle; script family `parallel_dispatch_eligibility` |
| `DI_Route_Context_Ready` | Two outputs: ready vs blocked | Routing key `_context_ready` (true/false) | YES — V3/V5 error routing oracle |
| `DI_Build_Dispatch_Payload` | Dispatch envelope or error | Full dispatch payload structure | YES — V1 dispatch_id determinism oracle (V4 replay) |

---

## Test harness binding

- **Off-node harness**: `tests/test_families.py` — 13 families × 50 tests = 650 total script-level tests.
- **Fixture harness**: `sql/10_fixtures_create.sql` creates execution context rows and plan records; `sql/11_fixtures_cleanup.sql` removes them post-test.
- **Probes**: `sql/20_read_path_probe.sql` (V6 DB read verification, zero writes).
- **Live entry**: Manual trigger (n8n UI) or chat trigger (MCP webhook) in live n8n instance (workflowId `abqYINcXr3JAhGGk`).

---

## Node topology (from NODE_MAP)

```
Manual Trigger
Chat Trigger          → [DI_Validate_Plan_Result]
                          ↓
                      [DI_Route_Valid]
                          ├─ valid → [DI_Extract_Dispatch_Input] → [DI_Load_Execution_Context]
                          │                                              ↓
                          │                                       [DI_Verify_Context_Match]
                          │                                              ↓
                          │                                       [DI_Load_Module_Registry]
                          │                                              ↓
                          │                                       [DI_Build_Ready_Steps]
                          │                                              ↓
                          │                                       [DI_Route_Context_Ready]
                          │                                              ├─ ready → [DI_Build_Dispatch_Payload] → [DI_Return_Result]
                          │                                              └─ blocked → [DI_Return_Error]
                          └─ invalid → [DI_Return_Error]
```

---

## Test entry strategy

For V1–V6 live proof:
1. Invoke via manual trigger with payload: `{ payload: <good_plan> }`
2. Or invoke via chat trigger with payload: `{ chatInput: JSON.stringify(<good_plan>) }`
3. Both paths converge on `DI_Validate_Plan_Result` and follow identical downstream routing.

For script harness:
1. Import `di_logic` module.
2. Call `validate_plan_result()`, `extract_dispatch_input()`, `verify_context_match()`, `build_ready_steps()`, `build_dispatch_payload()`, `run_full_pipeline()` directly.
3. Assert on return values (valid, code, message, missing_fields, normalized, ready_groups, etc.).

---

## Test exit oracles

| Exit node | Assertion type | Example oracle |
|---|---|---|
| `DI_Return_Result` | Schema match | `result.status_kind == "success" && result.result_type == "dispatch" && result.payload.allowed_next_stage == "WF-ME-01"` |
| `DI_Return_Result` | Dispatch guard match | `result.payload.dispatch_guard.dispatch_allowed == true && result.payload.dispatch_guard.module_execution_started == false && result.payload.dispatch_guard.response_generation_allowed == false && result.payload.dispatch_guard.domain_writes_performed == false` |
| `DI_Return_Result` | Ready groups non-empty | `result.payload.ready_groups.length >= 1 && result.payload.ready_groups[0].step_ids.length >= 1` |
| `DI_Return_Error` | Exact error code | `result.error.code == "INVALID_HANDOFF_INPUT"` or `"INVALID_PLAN"` or `"CONTEXT_MISMATCH"` or `"UNKNOWN_MODULE"` |
| `DI_Return_Error` | Missing fields populated | `result.error.missing_fields.length > 0 && result.error.missing_fields.includes("<field_name>")` |
| `DI_Return_Error` | Error message clarity | `result.error.message.includes("<expected substring>")` |

---

## Known limitations / not documented in on-disk evidence

- Streaming or chunked input handling: not documented.
- Timeout behavior at each decision point: not documented.
- n8n execution metrics (CPU, memory, execution time per node): not documented.
