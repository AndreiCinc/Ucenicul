# 13_STAGE_WF-MO-01 — Message Out / Output Gateway

## Stage identity
- Stage code: WF-MO-01
- Stage name: Message Out / Output Gateway
- Upstream stage: WF-RC-01
- Downstream stage: external channel provider / terminal delivery
- Status: PRE_LIVE_SOURCE_PACK
- Score cap before live proof: 8.8 / 10

## Mission
Deliver one and only one final outbound message from the canonical `composed_response`
envelope emitted by WF-RC-01, without recomposing the text, without mutating business state,
and without duplicating outbound sends under replay.

## Strict stage scope
WF-MO-01 must:
1. accept canonical downstream envelopes from WF-RC-01
2. validate output-gateway eligibility, lineage, and replay safety
3. resolve delivery target and channel safely
4. perform exactly one outbound delivery attempt
5. log outbound delivery in an append-only, replay-safe way
6. return exactly one canonical `message_out_result`
7. fail closed on malformed input, lineage mismatch, replay collision, unsupported channel, or missing delivery target

WF-MO-01 must NOT:
- compose or rewrite the user-facing response text
- perform task writes
- perform reminder writes
- perform memory writes
- perform execution-state writes
- re-run planning
- dispatch modules
- emit multiple outbound sends for one idempotency key
- silently drop failed or blocked deliveries
- bypass tenant isolation

## Canonical input contract
Top-level required fields:
- `status_kind = success`
- `result_type = composed_response`
- `execution_context_id`
- `thread_id`
- `tenant_id`
- `composed_response`
- `output_gateway_allowed = true`
- `allowed_next_stage = MESSAGE_OUT`
- `response_generation_allowed = true`
- `idempotency_key`

`composed_response` required fields:
- `response_status` in `success | partial | failed | no_action`
- `response_text`

Optional delivery fields:
- `channel`
- `locale`
- `format`
- `delivery_target`
- `warnings`
- `followup_requests`
- `delivery_metadata`

## Canonical output contract
Success:
- `status_kind = success`
- `result_type = message_out_result`
- `execution_context_id`
- `thread_id`
- `tenant_id`
- `message_out_result`
- `terminal_stage = true`
- `message_out_completed = true | false`
- `provider_delivery_attempted = true | false`
- `idempotency_key`

Error:
- `status_kind = error`
- `result_type = message_out_error`
- canonical error object

## Ownership rule
WF-MO-01 is the SOLE owner of final outbound delivery.
It may deliver the text produced by RC, but it may not alter that text materially.

## Delivery precedence
1. explicit `composed_response.delivery_target`
2. explicit channel delivery context loaded from DB
3. fail closed

Channel precedence:
1. explicit `composed_response.channel`
2. explicit channel delivery context loaded from DB
3. default `telegram` only if the tenant routing contract says Telegram is canonical

## Required DB reads
- execution_contexts by `execution_context_id + tenant_id`
- threads by `thread_id + tenant_id`
- tenant / channel delivery context if needed for routing
- replay guard / prior outbound log probe

## Required DB writes
- append-only outbound message log
- optional delivery ledger / receipt update only if the live schema requires it

## V1–V7 target
- V1 shell integrity
- V2 invalid RC envelope
- V3 happy path outbound delivery
- V4 unsupported or forbidden channel
- V5 lineage mismatch fail-closed
- V6 replay block / duplicate-send prevention
- V7 DB drift / append-only discipline

## Acceptance posture
This pack is pre-live only.
Closure requires live import or patch, live runtime proof, channel-send proof, and post-test drift verification.