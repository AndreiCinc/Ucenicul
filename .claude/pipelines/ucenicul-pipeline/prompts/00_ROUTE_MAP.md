# Route Map

This is the staged execution route.  
Claude must advance one stage at a time.  
No stage may be skipped.  
No stage may be considered complete before 10/10 closure.

## Stage progression

1. `WF-TR-01` — Thread Resolver  
   Status: CLOSED

2. `WF-EC-01` — Execution Context Init  
   Status: ACTIVE NOW

3. `WF-OR-01` — Orchestrator Input Handoff  
   Status: PLANNED NEXT

4. `WF-PL-01` — Plan Generation  
   Status: PLANNED

5. `WF-DI-01` — Dispatcher  
   Status: PLANNED

6. `WF-RA-01` — Result Aggregator  
   Status: PLANNED

7. `WF-RC-01` — Response Composer Handoff  
   Status: PLANNED

## Route rule

Claude must only work on the ACTIVE stage.

To activate the next stage:
- current stage must be closed at 10/10
- `CURRENT_STAGE.md` must be updated
- `STATE.json` must be updated
- a new stage file must exist

## Runtime Target Chain
Message In
- Thread Resolver
- Execution Context
- Orchestrator
- Plan
- Dispatcher
- Modules
- Result Aggregator
- Response Composer
- Message Out

## Notes

The downstream stage names above are planning anchors.  
They are not permission to begin future implementation early.
