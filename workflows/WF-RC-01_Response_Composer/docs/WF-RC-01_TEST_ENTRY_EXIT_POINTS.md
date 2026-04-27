# WF-RC-01_TEST_ENTRY_EXIT_POINTS

Derived from `docs/WF-RC-01_NODE_MAP.md` and `docs/WF-RC-01_CONNECTION_MAP.md`.

---

## Entry points (inputs)

| Node | Type | Purpose | Used in tests? |
|---|---|---|---|
| `RC_Input` | executeWorkflowTrigger | Canonical Execute Workflow entrypoint from WF-SU-01. Primary test entry. | YES — V1/V2/V3/V4/V5 shell path |
| `RC_Manual_Test_Trigger` | manualTrigger | Manual-trigger shell path for local authoring and ad-hoc validation. Same downstream path as RC_Input. | YES — unit/authoring |

Both entry points converge on `RC_Validate_State_Update_Input` (edges 1, 2 in CONNECTION_MAP). Tests MAY exercise either entry point; oracles are identical.

---

## Exit points (outputs)

| Node | Type | Emits | Oracle type |
|---|---|---|---|
| `RC_Return_Result` | code | Canonical `composed_response` success envelope (§3.a of CONTRACTS) | Schema match + exact `result_type`, `allowed_next_stage`, `output_gateway_allowed` assertions |
| `RC_Return_Error` | code | Canonical `composition_error` envelope on invalid input (§3.b of CONTRACTS) | Schema match + exact `error.code` assertion |
| `RC_Return_Context_Error` | code | Canonical `composition_error` envelope on lineage mismatch (§3.b of CONTRACTS) | Schema match + exact `error.code` assertion (LINEAGE_MISMATCH) |

---

## Exit point reachability

### RC_Return_Result
Reachable via single path:
- `RC_Build_Output_Envelope` → `RC_Return_Result` (edge 15 in CONNECTION_MAP)

Payload: canonical `composed_response` envelope with `result_type="composed_response"`, `allowed_next_stage="MESSAGE_OUT"`, `output_gateway_allowed=true`.

Test vectors: V3 (success), V3b (partial), V4 (warnings + followups).

### RC_Return_Error
Reachable from:
- `RC_Route_Valid` (fallback, invalid input) → `RC_Return_Error` (edge 5)

Payload: `composition_error` envelope with `error.code ∈ {INVALID_RESPONSE_COMPOSITION_INPUT, COMPOSITION_NOT_ALLOWED}`.

Test vectors: V2 (invalid envelope).

### RC_Return_Context_Error
Reachable from:
- `RC_Route_Context_Ready` (fallback, context load/lineage failure) → `RC_Return_Context_Error` (edge 10)

Payload: `composition_error` envelope with `error.code = LINEAGE_MISMATCH`.

Test vectors: V5 (lineage mismatch), V6 (read-only DB drift probe).

---

## Decision-point taps (intermediate observation points for routing oracles)

| Node | Type | Emits | Observe |
|---|---|---|---|
| `RC_Route_Valid` | switch | Valid vs invalid envelope | Output index taken (0 = valid, 1 = invalid/fallback) |
| `RC_Route_Context_Ready` | switch | Context-ready vs context-error | Output index taken (0 = ready, 1 = error/fallback) |

---

## Off-node harness binding

- **Test harness location**: `tests/test_families.py` (341 lines, 13 test families × 50 tests per family = 650 total).
- **Test families** (ref rc_logic function names):
  1. `family_input_validation()` — V2
  2. `family_happy_path_success()` — V3
  3. `family_happy_path_partial()` — V3b
  4. `family_failure_rendering()` — V3 partial/failed/no_action
  5. `family_followup_warnings()` — V4
  6. `family_locale_ro()` — V3 locale=ro rendering
  7. `family_locale_en()` — V3 locale=en rendering
  8. `family_channel_variants()` — V3 channel ∈ {telegram, whatsapp, web}
  9. `family_lineage_execution_context_missing()` — V5
  10. `family_lineage_tenant_mismatch()` — V5
  11. `family_lineage_thread_mismatch()` — V5
  12. `family_write_class_labels()` — V4 i18n
  13. `family_response_status_fields()` — V3 envelope structure

- **Fixture harness**: none (rc_logic.py is deterministic, requires no DB fixtures).
- **DB probes**: `rc_verify_read_only.sql` (read-only V6 drift assertion).

---

## Input validation chain (per CONNECTION_MAP)

```
RC_Input (edge 1) ──┐
RC_Manual_Test_Trigger (edge 2) ─┤
                                  ├──→ RC_Validate_State_Update_Input (edge 3)
                                  │    ↓
                                  │    RC_Route_Valid (edge 4)
                                  │    ├─ (valid) ──→ RC_Load_Execution_Context (edge 6)
                                  │    └─ (invalid) → RC_Return_Error (edge 5)
```

---

## Context load chain (per CONNECTION_MAP)

```
RC_Load_Execution_Context (edge 6)
                          ↓
                 RC_Load_Thread_Context (edge 7)
                          ↓
                  RC_Verify_Lineage (edge 8)
                          ↓
                 RC_Route_Context_Ready (edge 9)
                 ├─ (ready) ──→ RC_Build_Composition_Input (edge 11)
                 └─ (error) → RC_Return_Context_Error (edge 10)
```

---

## Composition chain (per CONNECTION_MAP)

```
RC_Build_Composition_Input (edge 11)
                           ↓
                 RC_Compose_Response (edge 12)
                           ↓
                RC_Build_Output_Envelope (edge 13)
                           ↓
                  RC_Return_Result (edge 15)
```

---

## Test matrix mapping

| V | Goal | Entry | Exit | Decision tap |
|---|---|---|---|---|
| V1 | Shell integrity | RC_Input | RC_Return_Result | RC_Route_Valid, RC_Route_Context_Ready |
| V2 | Invalid SU envelope | RC_Input | RC_Return_Error | RC_Route_Valid → fallback |
| V3 | Happy path success | RC_Input | RC_Return_Result | RC_Route_Valid → valid, RC_Route_Context_Ready → ready |
| V3b | Happy path partial | RC_Input | RC_Return_Result | (same as V3, different input status) |
| V4 | Followup/warning rendering | RC_Input | RC_Return_Result | (same as V3, populated warnings/followups) |
| V5 | Lineage mismatch | RC_Input | RC_Return_Context_Error | RC_Route_Context_Ready → error/fallback |
| V6 | Read-only DB drift | RC_Input | RC_Return_Result | (probes DB state before/after) |

---

## Entry-point signature (all three converge to same validation)

Input payload shape (ref WF-RC-01_CONTRACTS §2):
```json
{
  "status_kind": "success",
  "result_type": "state_update_result",
  "execution_context_id": "<uuid>",
  "thread_id": "<uuid>",
  "tenant_id": "<uuid>",
  "state_update_result": {
    "status": "success|partial|failed|no_action",
    "summary": "<non-empty string>",
    "applied_write_classes": [],
    "blocked_write_classes": [],
    "warnings": [],
    "followup_requests": [],
    "actions_acknowledged": [],
    "user_visible_facts": []
  },
  "allowed_next_stage": "WF-RC-01",
  "response_generation_allowed": true,
  "channel": "telegram|whatsapp|web" [optional, defaults to "telegram"],
  "locale": "ro|en" [optional, defaults to "ro"]
}
```

---

## Notes on decision points

- **RC_Route_Valid**: switch node with fallback output. If `_valid == true`, routes to normal path; otherwise routes to RC_Return_Error.
- **RC_Route_Context_Ready**: switch node with fallback output. If `_context_ready == true`, routes to composition; otherwise routes to RC_Return_Context_Error.
- Both switches MUST preserve fallback branches per WF-RC-01_IMPORT_PATCH_PLAN.md line 12.
