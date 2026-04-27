# WF-MO-01_TEST_MATRIX

## Off-node deterministic suite
- total families: 13
- tests per family: 50
- total tests: 650

## Families
1. `input_validation`
2. `happy_path_delivery`
3. `partial_delivery`
4. `provider_error_fail_closed`
5. `lineage_validation`
6. `replay_guard`
7. `output_gateway_contract`
8. `channel_routing`
9. `delivery_target_resolution`
10. `outbound_log_contract`
11. `wf_rc_to_mo_handoff`
12. `terminal_payload_shape`
13. `reporting_and_tooling_contract`

## Live V-mapping
- V1 = shell integrity
- V2 = invalid composed_response envelope
- V3 = happy path outbound delivery
- V4 = unsupported or forbidden channel
- V5 = lineage mismatch / fail-closed
- V6 = replay block / duplicate-send prevention
- V7 = DB drift / append-only discipline

## Closure minimum
No 10 / 10 closure before:
- real provider-send proof
- append-only outbound-log proof
- replay block proof
- post-test drift proof

## Oracle types per vector

| V | Oracle type(s) | Authoritative observation |
|---|---|---|
| V1 | Schema / shape match | Node/edge counts in workflow JSON; `MO_Input` + `MO_Manual_Test_Trigger` both converge on `MO_Validate_Output_Envelope` |
| V2 | Exact error code match | `error.code == "INVALID_MESSAGE_OUT_INPUT"` |
| V3 | Schema match + DB side-effect | `outbound_message_log` row inserted exactly once; response envelope preserves `channel_name`, `delivery_target`, `execution_context_id` |
| V4 | Exact error code match | `error.code == "UNSUPPORTED_CHANNEL"` OR `"MISSING_DELIVERY_TARGET"` depending on cause |
| V5 | Exact error code match + routing invariant | `error.code == "LINEAGE_MISMATCH"` AND routed via `MO_Return_Context_Error` |
| V6 | Exact error code match + DB no-side-effect | `error.code == "REPLAY_BLOCKED"` AND zero new row in `outbound_message_log` for duplicate key |
| V7 | DB side-effect assertion (append-only) | Row-count delta monotonically non-negative on `outbound_message_log`; no UPDATE or DELETE observed during test window |

Off-node harness: 13 families × 50 tests = 650 deterministic tests. Each family uses exact output match against fixture envelopes; routing invariants checked by switch branch probes.
