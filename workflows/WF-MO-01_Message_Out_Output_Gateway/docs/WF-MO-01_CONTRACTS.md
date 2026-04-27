# WF-MO-01_CONTRACTS

Derived-from-evidence contract surface for WF-MO-01 Message Out / Output Gateway.

Sources (all on-disk, no fabrication):
- `workflow/WF-MO-01_Message_Out.json` (18 nodes)
- `docs/WF-MO-01_NODE_MAP.md`
- `docs/WF-MO-01_CONNECTION_MAP.md` (18 edges)
- `scripts/mo_logic.py`
- `docs/ucenicul_claude_handoff_hardened/CLOSURE_REPORT__WF-MO-01.md`
- `docs/ucenicul_claude_handoff_hardened/UPSTREAM_TRUTH__WF-RC-01.md`
- `sql/01..20` (10 files)

---

## 1. Identity

- **Workflow code**: WF-MO-01
- **Role**: Message Out / Output Gateway — terminal delivery stage. Consumes `composed_response` envelope from WF-RC-01, delivers to configured channel, returns canonical `message_out_result` or canonical `message_out_error`.
- **Version**: `wf-mo-01-source-pack-v1.0-terminal`
- **Tier**: CRITICAL (terminal stage, user-facing delivery)
- **Upstream caller**: WF-RC-01 Response Composer (via Execute Workflow node `MO_Input`)
- **Downstream consumer**: External channel delivery (Telegram, future: WhatsApp). No internal downstream workflow — WF-MO-01 is terminal.

---

## 2. Input contract (RC envelope)

Required top-level fields on input payload (ref `mo_logic.validate_input`, lines 51–109):

| Field | Type | Required value |
|---|---|---|
| `status_kind` | string | must equal `"success"` |
| `result_type` | string | must equal `"composed_response"` |
| `execution_context_id` | string | non-empty UUID |
| `thread_id` | string | non-empty UUID |
| `tenant_id` | string | non-empty UUID |
| `composed_response` | object | see §2.a |
| `output_gateway_allowed` | bool | must equal `true` |
| `allowed_next_stage` | string | must equal `"MESSAGE_OUT"` |
| `response_generation_allowed` | bool | must equal `true` |
| `idempotency_key` | string | non-empty, non-whitespace |

### 2.a `composed_response` nested schema

| Field | Type | Required state |
|---|---|---|
| `response_status` | string | must be one of: `"success"`, `"partial"`, `"failed"`, `"no_action"` |
| `response_text` | string | must be non-empty and non-whitespace |
| `channel` | string | optional; if present, must be in `{telegram, whatsapp}` |
| `delivery_target` | string | optional; format: `"{channel}:{target_id}"` (e.g. `"telegram:123456789"`) |
| `warnings` | array | optional, defaults to `[]` |
| `followup_requests` | array | optional, defaults to `[]` |

---

## 3. Lineage & context verification contract

Before delivery, WF-MO-01 must verify (ref `verify_lineage_and_replay`, lines 112–225):

1. **Execution context row exists** — SELECT from `public.execution_contexts` WHERE `id = $1::uuid AND tenant_id = $2::uuid`
   - Error if missing: `LINEAGE_MISMATCH`
   - Row must have matching `tenant_id` and `thread_id` (fail-closed if not)

2. **Thread row exists** — SELECT from `public.threads` (or inferred from execution_context row) WHERE `id = $1::uuid AND tenant_id = $2::uuid`
   - Error if missing: `LINEAGE_MISMATCH`
   - Row must have matching `tenant_id` (fail-closed if not)

3. **Replay guard probe** — SELECT from `public.messages` WHERE `direction='outbound' AND tenant_id=$1::uuid AND content=$2`
   - If a row is found: error `REPLAY_BLOCKED` (idempotency_key in details)
   - This prevents duplicate sends for the same idempotency_key

4. **Channel delivery context** — SELECT from `public.tenants` WHERE `id = $1::uuid` to resolve `telegram_chat_id`
   - Optional if `delivery_target` is explicit in composed_response
   - Used as fallback delivery target if composed_response does not provide one

5. **Channel support** — after resolution, `channel` must be in `SUPPORTED_CHANNELS = {"telegram"}`
   - Error if `channel in {whatsapp, ...}`: `UNSUPPORTED_CHANNEL`

6. **Delivery target resolution** — after context loads, delivery_target must be non-empty (either from composed_response or from channel context)
   - Error if missing: `MISSING_DELIVERY_TARGET`

---

## 4. Output contracts

### 4.a Success envelope (`message_out_result`)

Returned by `MO_Return_Result` (ref `build_delivery_result`, lines 281–332):

```json
{
  "status_kind": "success",
  "result_type": "message_out_result",
  "execution_context_id": "<uuid>",
  "thread_id": "<uuid>",
  "tenant_id": "<uuid>",
  "message_out_result": {
    "status": "success" | "partial",
    "channel": "telegram",
    "delivery_target": "telegram:123456789",
    "provider_message_ref": "provider:deliver:...",
    "applied_write_classes": ["provider_delivery", "outbound_message_log"],
    "blocked_write_classes": [],
    "warning_count": 0,
    "warnings": [],
    "followup_count": 0,
    "followup_requests": [],
    "response_status": "success" | "partial" | "failed" | "no_action",
    "response_text_hash": "<16-char SHA256 prefix>"
  },
  "terminal_stage": true,
  "message_out_completed": true,
  "provider_delivery_attempted": true,
  "idempotency_key": "compose:33333333:abcd1234"
}
```

**Status key**:
- `status="success"`: provider sent AND outbound log written
- `status="partial"`: one of provider/log succeeded, one failed or not attempted

**applied_write_classes**: array of completed writes (e.g. `["provider_delivery", "outbound_message_log"]`)

**blocked_write_classes**: array of failed writes (empty on full success)

### 4.b Error envelope (`message_out_error`)

Returned by `MO_Return_Error` or `MO_Return_Context_Error` (ref `canonical_error`, lines 23–32):

```json
{
  "status_kind": "error",
  "result_type": "message_out_error",
  "error": {
    "code": "<one of CANONICAL_ERROR_CODES>",
    "message": "...",
    "details": {...}
  }
}
```

`CANONICAL_ERROR_CODES` (ref `mo_logic.py`:23–32 and test validation cases):
- `INVALID_MESSAGE_OUT_INPUT` — missing required fields, wrong status_kind/result_type, invalid composed_response shape
- `LINEAGE_MISMATCH` — execution_context or thread row missing/mismatched, or tenant_id mismatch
- `REPLAY_BLOCKED` — same idempotency_key has already been delivered
- `UNSUPPORTED_CHANNEL` — channel not in `{telegram}`
- `MISSING_DELIVERY_TARGET` — no delivery_target could be resolved from composed_response or channel context

Unknown codes default to `INVALID_MESSAGE_OUT_INPUT` per canonical_error() signature.

---

## 5. Delivery request schema (internal)

Built by `build_delivery_request` (lines 228–250):

```json
{
  "execution_context_id": "<uuid>",
  "thread_id": "<uuid>",
  "tenant_id": "<uuid>",
  "channel": "telegram",
  "delivery_target": "telegram:123456789",
  "response_text": "<original RC text>",
  "response_status": "success" | "partial" | "failed" | "no_action",
  "warnings": [],
  "followup_requests": [],
  "idempotency_key": "compose:33333333:abcd1234",
  "delivery_request_id": "deliver:<execution_context_id>:<12-char SHA256>"
}
```

**Invariant**: `response_text` MUST be an exact echo from `composed_response.response_text` — no material rewrite permitted.

---

## 6. Routing invariants

1. **Input validation** (`MO_Validate_Composed_Response_Input`) must confirm all §2 fields. Fail-closed on any gap → `MO_Route_Valid(invalid) → MO_Return_Error`.

2. **Context verification** (`MO_Verify_Lineage_And_Replay`) must succeed lineage + replay probes. Fail-closed on any mismatch → `MO_Route_Context_Ready(context_error) → MO_Return_Context_Error`.

3. **Channel routing** (`MO_Route_Channel`) routes on `channel` value:
   - `channel="telegram"` → `MO_Send_Channel_PLACEHOLDER` (live: real Telegram send)
   - anything else (including `whatsapp`) → `MO_Return_Error` with `UNSUPPORTED_CHANNEL`

4. **Provider delivery** (`MO_Send_Channel_PLACEHOLDER`): placeholder MUST be replaced in live import with real send node. On success, emits `provider_delivery_succeeded=true` and `provider_message_ref`. On failure, emits `provider_delivery_succeeded=false` and error code.

5. **Append-only logging** (`MO_Log_Outbound_Message`): INSERT into `public.messages` (direction='outbound', intent='message_out') after provider result known. Must succeed even if provider failed (fail-open to log, fail-closed to delivery).

6. **Terminal output** (`MO_Build_Delivery_Result`): composes `message_out_result` envelope with status ("success"/"partial") based on provider + log write states. Always returns non-error envelope on the success path (even if writes failed).

7. **No response text rewrite**: response text flows through unchanged from input to output. No material edits, concatenation, or transformation.

---

## 7. DB interactions (ref `sql/`)

Read paths (parameterized, execute-safe):
- `02_load_execution_context.sql` — parameterized SELECT, execution_context row load
- `03_load_thread_context.sql` — thread row load (if schema requires separate load)
- `04_load_channel_delivery_context.sql` — parameterized SELECT from `public.tenants` for channel delivery target
- `06_replay_guard_probe.sql` — parameterized SELECT from `public.messages`, direction='outbound' probe

Write paths (canonical n8n nodes in live workflow, not simulated in mo_logic.py):
- `05_insert_outbound_message_log.sql` — append-only INSERT into `public.messages` after provider-send
- `07_create_fallback_delivery_ledger_claude_mcp.sql` — CREATE TABLE + index for dedicated idempotency ledger (optional fallback if messages table schema drift)

Fixtures:
- `10_fixtures_create.sql`, `11_fixtures_cleanup.sql`

Probes:
- `20_read_path_probe.sql` — verify read-path contract at live time

---

## 8. Pre-live status

Per `docs/ucenicul_claude_handoff_hardened/CLOSURE_REPORT__WF-MO-01.md`:
- **Status**: NOT_CLOSED (pre_live_ready)
- **Score**: 8.8 / 10 (capped at pre-live; awaiting live import + channel-send proof)
- **Advance allowed**: false
- **Pack integrity**: 650/650 off-node tests PASS; shell/docs/SQL aligned

### Closure preconditions (not yet satisfied)
1. live workflow imported or patched
2. `MO_Send_Channel_PLACEHOLDER` replaced with real provider-send node
3. V1–V7 runtime proof (shell integrity, invalid input, happy path, unsupported channel, lineage fail-closed, replay block, DB drift verification)
4. append-only outbound log verification
5. replay-safe delivery proof
6. post-test DB drift proof

---

## 9. Known test families (from `WF-MO-01_TEST_MATRIX.md`)

13 families × 50 tests = 650 total (all PASS off-node):
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

---

## 10. Versioning

- Contract surface locked at `wf-mo-01-source-pack-v1.0-terminal`.
- Change control: any new error code or output field MUST update this file AND the test matrix AND downstream consumers (if any).
- WF-MO-01 is terminal; no downstream workflow consumer, but external channel consumers depend on output envelope shape.
