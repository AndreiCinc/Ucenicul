# UPSTREAM_TRUTH — WF-RC-01

WF-RC-01 is treated as closed upstream truth for WF-MO-01.

## Canonical upstream facts
- WF-RC-01 is closed at 10 / 10.
- WF-RC-01 is the sole owner of final user-facing response composition.
- WF-RC-01 emits:
  - `status_kind = success`
  - `result_type = composed_response`
  - `output_gateway_allowed = true`
  - `allowed_next_stage = MESSAGE_OUT`
  - `response_generation_allowed = true`
  - `idempotency_key`

## What WF-MO-01 must preserve
- do not rewrite the response text materially
- do not recompose success / warning / follow-up semantics
- do not bypass tenant / thread / execution_context lineage
- do not deliver twice for the same idempotency key

## What WF-MO-01 may add
- delivery target resolution
- provider-send result
- outbound log result
- terminal-stage metadata