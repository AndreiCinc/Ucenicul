# 12_STAGE_WF-RC-01 — Response Composer

## Stage identity
- Stage code: WF-RC-01
- Stage name: Response Composer
- Upstream stage: WF-SU-01
- Downstream stage: Message Out / Output Gateway
- Status: PRE_LIVE_SOURCE_PACK
- Score cap before live proof: 8.8 / 10

## Mission
Compose one and only one final user-facing response from the canonical `state_update_result`
envelope emitted by WF-SU-01, without performing business writes and without inventing success.

## Strict stage scope
WF-RC-01 must:
1. accept canonical downstream envelopes from WF-SU-01
2. validate response-composition eligibility and lineage
3. render success / partial / failed / no_action honestly
4. preserve warnings, blocked operations, and follow-up requests
5. produce exactly one canonical `composed_response` envelope
6. fail closed on malformed input or lineage mismatch

WF-RC-01 must NOT:
- perform business writes
- perform execution-state writes
- re-run planning
- dispatch modules
- bypass tenant isolation
- produce multiple final responses
- suppress warnings or blocked operations

## Canonical input contract
Top-level required fields:
- `status_kind = success`
- `result_type = state_update_result`
- `execution_context_id`
- `thread_id`
- `tenant_id`
- `state_update_result`
- `allowed_next_stage = WF-RC-01`
- `response_generation_allowed = true`

`state_update_result` required fields:
- `status` in `success | partial | failed | no_action`
- `summary`

Optional rendering fields:
- `applied_write_classes`
- `blocked_write_classes`
- `warnings`
- `followup_requests`
- `actions_acknowledged`
- `user_visible_facts`
- `channel`
- `locale`

## Canonical output contract
Success:
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

Error:
- `status_kind = error`
- `result_type = composition_error`
- canonical error object

## Ownership rule
WF-RC-01 is the SOLE producer of final user-facing response text.

## Required DB reads
- execution_contexts by `execution_context_id + tenant_id`
- threads by `thread_id + tenant_id`

## Required DB writes
None in WF-RC-01.

## V1–V6 target
- V1 shell integrity
- V2 invalid SU envelope
- V3 happy path success / partial
- V4 warnings + follow-up rendering
- V5 lineage mismatch fail-closed
- V6 DB drift verification (read-only)

## Acceptance posture
This pack is pre-live only.
Closure requires live import, live runtime proof, and post-test DB drift verification.
