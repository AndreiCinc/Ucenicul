# ACTIVE STAGE LOCK

## Locked stage
`WF-DI-01`

## Lock reason
`WF-PL-01` is closed at 10/10. `WF-DI-01` is the next executable stage and is now the only stage allowed for autonomous work.

## Scope lock
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

## Advancement rule
This lock may lift only after:
- live import of `WF-DI-01_Dispatcher.json`
- live V1–V6 runtime proof
- post-test DB drift verification
- written closure evidence
