# WF-MO-01_TEST_ENTRY_EXIT_POINTS

Derived from `docs/WF-MO-01_NODE_MAP.md` and `docs/WF-MO-01_CONNECTION_MAP.md`.

## Entry points (inputs)

| Node | Purpose | Used in tests? |
|---|---|---|
| `MO_Input` | Canonical Execute Workflow entrypoint from WF-RC-01. Primary test entry. | YES — V1/V2/V3/V4/V5/V6 shell path |
| `MO_Manual_Test_Trigger` | Manual-trigger shell path for local authoring and unit verification. Same downstream path as MO_Input. | YES — unit/authoring/offline |

Both entry points converge on `MO_Validate_Composed_Response_Input` (CONNECTION_MAP edges 1, 2). Tests MAY exercise either entry point; oracles are identical.

---

## Exit points (outputs)

| Node | Emits | Oracle type |
|---|---|---|
| `MO_Return_Result` | Canonical `message_out_result` success envelope (§4.a of CONTRACTS) | Schema match + exact-field assertions + `terminal_stage=true` |
| `MO_Return_Error` | Canonical `message_out_error` envelope (§4.b of CONTRACTS) | Schema match + exact `error.code` assertion |
| `MO_Return_Context_Error` | Canonical `message_out_error` envelope with lineage/replay details | Schema match + `error.code` in {LINEAGE_MISMATCH, REPLAY_BLOCKED, UNSUPPORTED_CHANNEL, MISSING_DELIVERY_TARGET} |

### Output reachability map

**`MO_Return_Error`** (CONNECTION_MAP edges 5, 15):
- `MO_Route_Valid` output 1 (invalid) → INVALID_MESSAGE_OUT_INPUT / (missing required fields in composed_response)
- `MO_Route_Channel` output 1 (unsupported) → UNSUPPORTED_CHANNEL / MISSING_DELIVERY_TARGET

**`MO_Return_Context_Error`** (CONNECTION_MAP edge 12):
- `MO_Route_Context_Ready` output 1 (context_error) → LINEAGE_MISMATCH / REPLAY_BLOCKED / UNSUPPORTED_CHANNEL / MISSING_DELIVERY_TARGET

**`MO_Return_Result`** (CONNECTION_MAP edge 18):
- `MO_Build_Delivery_Result` → canonical success envelope, `terminal_stage=true`, status="success" or "partial" depending on provider + log write states

---

## Decision-point taps (intermediate observation points for routing oracles)

| Node | Emits | Observe | Test harness tap |
|---|---|---|---|
| `MO_Validate_Composed_Response_Input` | Dict with `_valid: bool` flag | True/false validity | V1/V2 gate |
| `MO_Route_Valid` | Two outputs: valid vs invalid | Output index (0=valid, 1=invalid) | V1/V2 routing |
| `MO_Load_Execution_Context` | execution_context row or null | Row match vs miss | V5 setup |
| `MO_Load_Thread_Context` | thread row or null | Row match vs miss | V5 setup |
| `MO_Load_Channel_Delivery_Context` | channel + delivery_target resolution | Explicit vs fallback | V4/V9 routing |
| `MO_Replay_Guard_Probe` | Past message row or null | Replay detected vs clear | V6 tap |
| `MO_Verify_Lineage_And_Replay` | Dict with `_context_ready: bool` flag | True/false readiness | V5/V6 gate |
| `MO_Route_Context_Ready` | Two outputs: ready vs context_error | Output index | V5/V6 routing |
| `MO_Build_Delivery_Request` | Delivery request payload | Schema shape | V3 tap |
| `MO_Route_Channel` | Multiple outputs: telegram / unsupported | Output index | V3/V4 routing |
| `MO_Send_Channel_PLACEHOLDER` | provider_result dict (or real Telegram response in live) | Success/failure, provider_message_ref | V3 tap |
| `MO_Log_Outbound_Message` | log_result dict (INSERT result or error) | Success/failure, row ID | V3/V7 tap |
| `MO_Build_Delivery_Result` | message_out_result payload | Status field, applied/blocked arrays | V3/V8 assertion |

---

## Test harness binding

**Off-node unit harness**: `tests/test_families.py`
- 13 test families × 50 tests per family = 650 total
- Imports `mo_logic.py` functions directly, no n8n runtime required
- All 650 tests PASS per `docs/ucenicul_claude_handoff_hardened/BUILD_REPORT__WF-MO-01.md`

**Fixture harness**: `sql/10_fixtures_create.sql` + `sql/11_fixtures_cleanup.sql`
- Seeds minimal test data into execution_contexts, threads, tenants tables
- Used when live workflow import is run (V1–V7 at n8n runtime)

**Live runtime probes** (after import):
- `sql/20_read_path_probe.sql` — verify all read nodes can execute successfully (V1/V6 coverage)
- No write-path probe in core pack; append-only logging verified through message delivery flow (V3/V7)

---

## V-mapping (Verification stages per closure spec)

| Stage | What | Trigger | Oracle |
|---|---|---|---|
| V1 | Shell integrity (node/edge count, trigger binding) | Import WF-MO-01_Message_Out.json | Node count ≥18, edges ≥18, both triggers connected |
| V2 | Invalid RC envelope handling | Pass missing/malformed composed_response | error.code = INVALID_MESSAGE_OUT_INPUT |
| V3 | Happy path outbound delivery | Valid RC envelope + successful provider send + successful log write | message_out_result, status="success", applied=[provider_delivery, outbound_message_log] |
| V4 | Unsupported/forbidden channel | channel not in {telegram}, or delivery_target unresolvable | error.code = UNSUPPORTED_CHANNEL / MISSING_DELIVERY_TARGET |
| V5 | Lineage fail-closed | Mismatched tenant_id / thread_id / execution_context_id, or context row missing | error.code = LINEAGE_MISMATCH |
| V6 | Replay block / duplicate-send prevention | Idempotency key matches a past outbound message | error.code = REPLAY_BLOCKED |
| V7 | DB drift / append-only discipline | After successful delivery, messages table has exactly one new row, no business table mutations | Row count in messages unchanged except +1 for outbound; no other tables mutated |

---

## Notes on live closure

- V1–V6 can be tested with fixtures (off-disk, ephemeral)
- V7 requires real Postgres state inspection post-test, with teardown via `11_fixtures_cleanup.sql`
- `MO_Send_Channel_PLACEHOLDER` MUST be replaced with real provider-send node before V3 can pass with `provider_delivery_succeeded=true`
- Off-node test suite (650 tests) is a pre-closure sanity gate; live closure requires V1–V7 pass at n8n runtime
