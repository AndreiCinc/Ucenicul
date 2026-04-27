# Testing Scope — Canonical 10 Workflows

This file freezes the autonomous testing mission to exactly these workflows:

1. WF-TR-01 — Thread Resolver
2. WF-EC-01 — Execution Context
3. WF-OR-01 — Orchestrator
4. WF-PL-01 — Plan Builder
5. WF-DI-01 — Dispatcher
6. WF-ME-01 — Module Execution
7. WF-RA-01 — Result Aggregator
8. WF-RC-01 — Response Composer
9. WF-MO-01 — Message Out / Output Gateway
10. WF-SU-01 — State Persistence Updater

## Explicit exclusions

- WF-TR-02 is out of scope.
- Any other n8n workflow present in the instance is out of scope unless needed as a dependency reference only.
- Presence in n8n live does not expand scope.
- Presence in archive or duplicate folders does not expand scope.

## Scope rule

The operator must not drift into generic instance-wide testing.  
The mission is to make **these 10 workflows** individually correct and canonically connected.
