# WF-ME-01_DOWNSTREAM_HANDOFF

Chain position (per `docs/architecture/n8n_Workflow_Mapping.md`): TR → EC → OR → PL → **DI → ME → RA** → SU → RC → MO.

## Upstream producer — WF-DI-01 Dispatcher

**Invocation**: WF-DI-01 calls WF-ME-01 via an n8n Execute Workflow node, binding to `ME_Input`.

**Envelope WF-DI-01 must produce (WF-ME-01 input contract; ref `WF-ME-01_CONTRACTS.md` §2)**:
- `status_kind = "success"`
- `result_type = "dispatch"`
- `execution_context_id`, `thread_id`, `tenant_id` — all non-empty
- `idempotency_key` — optional
- `dispatcher_input` with flags `dispatch_allowed=true`, `module_execution_started=false`, `response_generation_allowed=false`, `domain_writes_performed=false`, and a fully-populated `step` object

**Upstream invariants WF-ME-01 relies on**:
1. The dispatcher has already validated that `module_name` is a known module in the registry.
2. `step.inputs` contains the action-specific required fields (WF-ME-01 re-validates these anyway; fail-closed on gap).
3. The execution context row referenced by `execution_context_id` exists and is owned by `tenant_id` (WF-ME-01 re-asserts via `ME_Check_Context_Match`).

**If any upstream invariant is violated**, WF-ME-01 returns `module_error` with an appropriate CANONICAL_ERROR_CODE — it never throws; it never loses fail-closed posture.

## Downstream consumer — WF-RA-01 Result Aggregator

**Handoff**: the caller (WF-DI-01) receives the ME return envelope through the Execute Workflow response; WF-DI-01 then forwards the same envelope into WF-RA-01's input.

**Envelope WF-ME-01 emits (WF-RA-01 input contract)**:
- On success (`ME_Return_Result`): see `WF-ME-01_CONTRACTS.md` §3.a — canonical `module_result` envelope.
- On error (`ME_Return_Error`): see `WF-ME-01_CONTRACTS.md` §3.b — canonical `module_error` envelope.

**Downstream invariants preserved by WF-ME-01**:

| Invariant | Value at handoff | Rationale |
|---|---|---|
| `module_execution_started` | `true` on success / `false` on error path | Guards against WF-ME-01 being re-invoked for the same step |
| `domain_writes_performed` | `false` | WF-ME-01 never writes; writes belong to later stages |
| `response_generation_allowed` | `false` | Response composition is WF-RC-01's role, not ME |
| `execution_context_id` / `thread_id` / `tenant_id` | exact echo of input values | RA uses these to re-key the result against the plan |
| `module_result.step_id` | exact echo of input `step.step_id` | RA joins result → plan on step_id |

## Boundary validation

- WF-ME-01 validates incoming envelope shape at `ME_Validate_Dispatcher_Result` (fail-closed on gap).
- WF-ME-01 enforces tenant match at `ME_Check_Context_Match` (fail-closed on CONTEXT_MISMATCH).
- Downstream (WF-RA-01) is responsible for validating WF-ME-01's output shape on its side.

## Data lineage

| Field | Populated by | Preserved through | Consumed by |
|---|---|---|---|
| `execution_context_id` | WF-EC-01 | OR, PL, DI, ME, RA | RA join key |
| `thread_id` | WF-TR-01 (origin) | EC→OR→PL→DI→ME→RA | RA thread grouping |
| `tenant_id` | WF-TR-01 (origin) | all stages | ME cross-tenant guard, RA grouping |
| `step.step_id` | WF-PL-01 | DI→ME→RA | RA plan-join key |
| `module_result` | WF-ME-01 (new) | — | RA consumes |
| `error.code` | WF-ME-01 (new, on error) | — | RA / RC error-path handling |

## Version compatibility

- WF-ME-01 output envelope: locked at `wf-me-01-source-pack-v1.3-cross-tenant-guard`.
- A change to `CANONICAL_ERROR_CODES` or the `module_result` shape is a breaking change against WF-RA-01; requires coordinated version bump + contract update on both sides.
