# Route Map

This is the mandatory staged execution route.

Claude must advance one stage at a time.
No stage may be skipped.
No stage may be considered complete before 10/10 closure.

## Stage progression

1. `WF-TR-01` — Thread Resolver  
   Status: `CLOSED`

2. `WF-EC-01` — Execution Context Init  
   Status: `CLOSED`

3. `WF-OR-01` — Orchestrator Input Handoff  
   Status: `ACTIVE`

4. `WF-PL-01` — Plan Generation  
   Status: `PLANNED_NEXT`

5. `WF-DI-01` — Dispatcher  
   Status: `PLANNED`

6. `WF-RA-01` — Result Aggregator  
   Status: `PLANNED`

7. `WF-RC-01` — Response Composer Handoff  
   Status: `PLANNED`

## Allowed stage status labels

Use only:
- `PLANNED`
- `PLANNED_NEXT`
- `ACTIVE`
- `ACTIVE_IN_RECOVERY`
- `BLOCKED_WITH_EVIDENCE`
- `HUMAN_DECISION_REQUIRED`
- `CLOSED`

Do not invent local stage labels.

## Current active-stage mapping

- Active stage pointer: `CURRENT_STAGE.md`
- Machine pointer: `STATE.json`
- Active stage file: `06_STAGE_WF-OR-01.md`
- Active stage lock: `17_ACTIVE_STAGE_LOCK.md`

These four must stay aligned.

## Route rule

Claude must work only on the `ACTIVE` stage.

Future stages may be read for architecture continuity only.
Future implementation is forbidden until activation conditions are satisfied.

## Activation evidence for this transition

The transition to `WF-OR-01` is allowed because:
- `WF-EC-01` is documented as `CLOSED at 10/10`
- `WF-OR-01` is explicitly identified as the next stage on the runtime chain
- a real next-stage file now exists
- the active-stage pointers are now re-targeted to `WF-OR-01`

## Runtime target chain

Message In
-> Thread Resolver
-> Execution Context
-> Orchestrator
-> Plan
-> Dispatcher
-> Modules
-> Result Aggregator
-> Response Composer
-> Message Out

No stage may weaken this chain.

## Blocking rule

If the active stage cannot continue:
- do not jump to the next stage
- emit `BLOCKED_WITH_EVIDENCE` or `HUMAN_DECISION_REQUIRED`
- preserve the current stage assets
- leave a next executable action

## Notes

Downstream stage names are planning anchors only.
They are not permission to begin future implementation early.
