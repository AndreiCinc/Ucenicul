# Stage Lock — WF-DI-01

## Canonical status
This canonical stage-lock document merges:
- the original **active lock** for WF-DI-01 while the stage was under execution
- the later **closed / handoff lock** after WF-DI-01 reached 10/10 and WF-ME-01 became the next executable stage

The original two files were semantically adjacent lifecycle variants, so they are merged here for easier future reference.

## Activation lock (historical)
### Locked stage
`WF-DI-01`

### Lock reason
`WF-PL-01` was closed at 10/10. `WF-DI-01` became the only stage allowed for autonomous work.

### Scope lock
Allowed:
- dispatcher input validation
- execution-context re-read
- module-registry resolution
- dependency grouping
- dispatch payload generation
- stage-local SQL, scripts, tests, and reports

Forbidden:
- module execution
- result aggregation
- response composition
- direct domain writes
- downstream stage implementation

### Original advancement rule
This lock could lift only after:
- live import of `WF-DI-01_Dispatcher.json`
- live V1–V6 runtime proof
- post-test DB drift verification
- written closure evidence

## Closure / next-stage lock (current handoff state)
### Locked stage
`WF-ME-01` (planned next — not yet materialized)

### Previous locked stage
`WF-DI-01` — STAGE_CLOSED at 10/10

### Lock reason
`WF-DI-01` is closed at 10/10 with live V1–V6 PASS and zero DB drift. `WF-ME-01` is the next executable stage and is now the only stage allowed for autonomous work once it is materialized.

### Scope lock for the next stage, WF-ME-01
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

### Advancement rule for WF-ME-01
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
