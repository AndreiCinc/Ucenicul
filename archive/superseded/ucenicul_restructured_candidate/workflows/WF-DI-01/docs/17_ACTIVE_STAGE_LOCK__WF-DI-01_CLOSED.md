# ACTIVE STAGE LOCK

## Locked stage
`WF-ME-01` (planned next — not yet materialized)

## Previous locked stage
`WF-DI-01` — STAGE_CLOSED at 10/10

## Lock reason
`WF-DI-01` is closed at 10/10 with live V1–V6 PASS and zero DB drift. `WF-ME-01` is the next executable stage and is now the only stage allowed for autonomous work once it is materialized.

## Scope lock (for the next stage, WF-ME-01)
Allowed:
- module execution against dispatcher-provided `ready_groups`
- per-module-request invocation respecting `execution_mode` (sequential / parallel)
- per-step result collection into a module-results envelope
- stage-local SQL, scripts, tests, and reports
- chat-input adapter preamble on the stage-entry validator (canonical from day one)

Forbidden:
- re-planning
- dispatch re-shaping
- result aggregation across the whole plan (that belongs to WF-RA-01)
- response composition
- direct domain writes (if/when any domain writes occur, they remain module-scoped and idempotency-guarded)
- downstream stage implementation

## Advancement rule
This lock may lift only after:
- live import of `WF-ME-01_ModuleExecution.json` into n8n (once created)
- live V1–V6 runtime proof
- post-test DB drift verification (scope: any tables that module execution may write must be documented and drift-audited explicitly)
- written closure evidence

## WF-DI-01 closure annotation
- Cycle 1: source pack + 650/650 script PASS
- Cycle 2: v1.0 live V1 failed with INVALID_HANDOFF_INPUT because chat-trigger wrapper reached validator unparsed; smallest-possible source patch applied to `DI_Validate_Plan_Result.jsCode`
- Cycle 3: v1.1 re-imported; live V1–V6 all PASS (execs 716–720); `public.execution_contexts` hash identical pre/post
- final score: 10 / 10
