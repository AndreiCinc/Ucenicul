# WF-MO-01_DOWNSTREAM_HANDOFF

Chain position (per `docs/architecture/n8n_Workflow_Mapping.md`): TR → EC → OR → PL → DI → ME → RA → SU → RC → **MO**. 

**WF-MO-01 is the terminal workflow.** There is no downstream workflow consumer; the downstream receiver is external channel delivery (Telegram, future: WhatsApp).

---

## Upstream producer — WF-RC-01 Response Composer

**Invocation**: WF-RC-01 calls WF-MO-01 via an n8n Execute Workflow node, binding to `MO_Input`.

**Envelope WF-RC-01 must produce** (WF-MO-01 input contract; ref `WF-MO-01_CONTRACTS.md` §2):
- `status_kind = "success"`
- `result_type = "composed_response"`
- `execution_context_id`, `thread_id`, `tenant_id` — all non-empty UUIDs
- `idempotency_key` — non-empty, non-whitespace (format: canonical is `"compose:{execution_context_id}:{step_hash}"`)
- `output_gateway_allowed = true`
- `allowed_next_stage = "MESSAGE_OUT"`
- `response_generation_allowed = true` (WF-RC-01 has completed its work)
- `composed_response` with required fields:
  - `response_status` — one of: `"success"`, `"partial"`, `"failed"`, `"no_action"`
  - `response_text` — non-empty, non-whitespace (the actual user-facing message)
  - `channel` (optional) — if present, must be in `{telegram, whatsapp}`
  - `delivery_target` (optional) — format `"{channel}:{target_id}"` (e.g. `"telegram:123456789"`)
  - `warnings` (optional, defaults to `[]`)
  - `followup_requests` (optional, defaults to `[]`)

**Upstream invariants WF-MO-01 relies on**:
1. The composed_response is finalized and user-ready; WF-MO-01 does not recompose or edit it.
2. Idempotency key is unique to this response composition action (not reused across different compositions).
3. Execution context row exists in the DB and is owned by the tenant_id (WF-MO-01 re-verifies via lineage probes).
4. Thread row exists and matches the thread_id (WF-MO-01 re-verifies).
5. If delivery_target is not explicit in composed_response, the tenant row MUST have a telegram_chat_id (fallback resolution).

**If any upstream invariant is violated**, WF-MO-01 returns `message_out_error` with an appropriate CANONICAL_ERROR_CODE (from §4.b of CONTRACTS) — it never throws, it never loses fail-closed posture.

---

## Downstream consumer — External channel delivery

**Handoff**: WF-RC-01 does NOT receive a return from WF-MO-01 (WF-MO-01 is terminal). The delivery outcome is logged in the database and available for audit / retry workflows.

**Envelope WF-MO-01 emits** (external observer perspective):
- On success (`MO_Return_Result`): see `WF-MO-01_CONTRACTS.md` §4.a — canonical `message_out_result` envelope.
- On error (`MO_Return_Error` or `MO_Return_Context_Error`): see `WF-MO-01_CONTRACTS.md` §4.b — canonical `message_out_error` envelope.

**Downstream consumer contract** (external channel system, e.g. Telegram API):
1. WF-MO-01 sends exactly one message per unique idempotency_key (replay-safe).
2. Message content is the exact `response_text` from `composed_response` (no material transformation).
3. Message is sent to the resolved `delivery_target` (explicit from composed_response, or fallback from tenant.telegram_chat_id).
4. On provider success: provider emits a `provider_message_ref` (provider-specific delivery ID, e.g. Telegram message_id).
5. On provider failure: WF-MO-01 logs the error and returns `message_out_error` with provider error details.

**Idempotency guarantees**:
- WF-MO-01 probes `public.messages` (direction='outbound') BEFORE sending, using the `idempotency_key` as the probe predicate.
- If a row is found, WF-MO-01 returns `REPLAY_BLOCKED` error without calling the provider.
- This ensures exactly-once delivery semantics at the WF-MO-01 layer (provider-level exactly-once is provider-specific).

**Append-only outbound log**:
- After provider-send attempt (success or failure), WF-MO-01 logs the attempt to `public.messages` (direction='outbound', intent='message_out', content=response_text).
- This log is immutable and append-only; it serves as the canonical outbound message audit trail.
- Fallback: if the messages table schema drifts, WF-MO-01 can pivot to `public.outbound_delivery_ledger_claude_mcp` (created by `sql/07_create_fallback_delivery_ledger_claude_mcp.sql`).

---

## Boundary validation

**Upstream boundary (WF-RC-01 → WF-MO-01)**:
- WF-MO-01 validates incoming envelope shape at `MO_Validate_Composed_Response_Input` (fail-closed on gap; returns INVALID_MESSAGE_OUT_INPUT error).
- WF-MO-01 verifies lineage + replay at `MO_Verify_Lineage_And_Replay` (fail-closed on mismatch; returns LINEAGE_MISMATCH, REPLAY_BLOCKED, UNSUPPORTED_CHANNEL, or MISSING_DELIVERY_TARGET).
- WF-RC-01 is responsible for sourcing valid input (upstream invariants §1–5).

**Downstream boundary (WF-MO-01 → External channel)**:
- WF-MO-01 is responsible for provider-send invocation, error handling, and logging.
- WF-MO-01 does NOT retry on provider failure (fail-closed; returns error envelope for manual/automated retry by a separate workflow if needed).
- WF-MO-01 does NOT transform the response_text (exact pass-through).
- External channel is responsible for parsing the response_text and handling subsequent user interactions (e.g. button clicks, further messages).

---

## Data lineage

| Field | Populated by | Preserved through | Final consumer |
|---|---|---|---|
| `execution_context_id` | WF-EC-01 | TR→EC→OR→PL→DI→ME→RA→SU→RC→MO | WF-MO-01 lineage probe; audit log key |
| `thread_id` | WF-TR-01 (origin) | all stages | WF-MO-01 lineage probe; audit log; user session tracking |
| `tenant_id` | WF-TR-01 (origin) | all stages | WF-MO-01 lineage probe; multi-tenant isolation; audit log |
| `idempotency_key` | WF-RC-01 (new) | WF-RC-01→MO only | WF-MO-01 replay guard; dedup across retries |
| `composed_response.response_text` | WF-RC-01 (new) | preserved unchanged | External channel (user sees this text) |
| `composed_response.channel` | WF-RC-01 (new) | WF-MO-01 routing | WF-MO-01 channel select node |
| `composed_response.delivery_target` | WF-RC-01 (optional) | WF-MO-01 delivery | WF-MO-01 provider-send node |
| `message_out_result` | WF-MO-01 (new) | audit log only | audit / retry / analytics |
| `error.code` | WF-MO-01 (new, on error) | audit log only | audit / retry decision logic |

---

## Fallback and error recovery

**No active retry in WF-MO-01**: if provider-send fails or log-write fails, WF-MO-01 returns a `message_out_error` or `message_out_result` with `status="partial"`. It does NOT retry internally.

**Retry pattern for higher-level workflows**:
1. WF-MO-01 returns `message_out_error` (retriable: e.g. provider timeout).
2. A separate retry orchestrator workflow (not in scope) reads the error and re-invokes WF-MO-01 with the same `idempotency_key`.
3. WF-MO-01's replay guard blocks the re-send (returns `REPLAY_BLOCKED` error).
4. Retry orchestrator logs the replay block and escalates (e.g. alert on partial failure, manual review).

**Fallback outbound ledger**: if the canonical `public.messages` table drifts or is unavailable, WF-MO-01 can pivot to `public.outbound_delivery_ledger_claude_mcp` (dedicated idempotency + delivery tracking table). The pivot decision is made at live import time; see `sql/07_create_fallback_delivery_ledger_claude_mcp.sql`.

---

## Pre-live status

Per `docs/ucenicul_claude_handoff_hardened/CURRENT_STAGE__WF-MO-01.md`:
- **Stage**: WF-MO-01 CANDIDATE_READY
- **Posture**: pre_live_ready (not yet closed)
- **Score**: 8.8 / 10 (capped until live import)
- **Status quo**: source-complete, script-verified, 650/650 off-node tests PASS

**What's blocking closure**:
1. `MO_Send_Channel_PLACEHOLDER` MUST be replaced with real Telegram send node or HTTP Request to provider API.
2. V1–V7 runtime proof (see `WF-MO-01_TEST_ENTRY_EXIT_POINTS.md` §V-mapping):
   - V1: shell integrity check
   - V2: invalid input handling
   - V3: happy path with real provider-send
   - V4: unsupported channel routing
   - V5: lineage fail-closed
   - V6: replay block proof
   - V7: append-only DB drift verification
3. Real provider credentials must be bound (Telegram API key, etc.).
4. Post-test DB state inspection to confirm no unintended mutations.

**Closure path**: see `docs/ucenicul_claude_handoff_hardened/CLOSURE_REPORT__WF-MO-01.md` and `docs/WF-MO-01_IMPORT_PATCH_PLAN.md` for the exact live import sequence.

---

## Version compatibility

- WF-MO-01 output envelope: locked at `wf-mo-01-source-pack-v1.0-terminal`.
- WF-RC-01 is treated as closed upstream truth (see `docs/ucenicul_claude_handoff_hardened/UPSTREAM_TRUTH__WF-RC-01.md`).
- A change to `CANONICAL_ERROR_CODES` or the `message_out_result` shape is a breaking change for any audit/retry orchestrators; requires coordinated version bump + contract update on both sides.
- WF-MO-01 does NOT feed back to WF-RC-01 (one-way delivery); version coordination is audit/retry scope only.
