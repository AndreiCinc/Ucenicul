# Decision Presets

This file defines default decisions Claude must take without asking for human input.

These presets are mandatory.
They reduce hesitation.
They do not authorize uncontrolled redesign.

## How to apply presets

When a decision point appears:
- choose the matching preset
- take the default action immediately
- log the decision in the relevant report
- continue unless a true stop condition exists

If more than one preset applies:
1. preserve live progress
2. preserve canonical architecture
3. preserve shell integrity and testability
4. prefer minimal reversible change
5. prefer live-proof path over elegant theory

If a preset conflicts with a stage-specific rule:
- the stage-specific rule wins
- the conflict must still be logged

## 1. Source-of-truth conflict preset

If sources disagree, decide in this order:
1. latest live DB truth
2. latest live workflow truth
3. active stage lock
4. current stage file
5. canonical runtime docs
6. historical handoffs

Action:
- follow highest verified truth
- log the conflict
- continue unless a real product decision is required

## 2. Workflow persistence preset

If a workflow update appears successful:
- re-read live workflow immediately
- compare node count, connection count, and target fields
- verify shell identity unchanged

If any mismatch exists:
- treat the write as failed
- do not continue as if persisted
- switch to the smallest safer write path

## 3. MCP / SDK degraded-path preset

If the SDK/MCP write path is known or observed to be unreliable:

First failure:
- allow one verification attempt only

Second failure or repeated mismatch:
- stop SDK exploration
- ban that strategy for the stage
- switch to native JSON patch discipline if a verified surface exists
- otherwise emit `BLOCKED_WITH_EVIDENCE`

Do not reverse-engineer helper grammar during an active stage.

## 4. Browser-bridge preset

If a Chrome extension, browser session bridge, or browser-cookie path is unavailable:
- classify that path as unavailable
- do not redesign the stage around the browser
- continue only if another verified write surface exists
- otherwise emit `BLOCKED_WITH_EVIDENCE`

Do not escalate to `HUMAN_DECISION_REQUIRED` unless every safe fallback is exhausted and a real decision is needed.

## 5. Workflow shell protection preset

If the active stage uses a user-created shell workflow:
- preserve workflow identity
- refactor in place only
- never leave it blank
- rollback immediately if an attempted write collapses it

## 6. Temporary trigger preset

If a temporary trigger exists only for testing or exposure:
- keep it only as long as needed
- classify it as temporary and non-canonical
- remove it once the canonical path is ready and tested

## 7. DB ownership / privilege preset

If direct DB change is blocked or risky:
- create a parallel `_claude_mcp` structure
- continue if stage proof remains possible
- record merge-back notes

## 8. Legacy data preset

If legacy data exists and its status is unclear:
- ignore and isolate by default
- do not delete by default
- use dedicated fixtures for current-stage proof
- clean only if the stage contract explicitly allows it

## 9. Routing / type mismatch preset

If routing depends on booleans, strings, numbers, or expressions:
- verify actual runtime type
- align routing to observed type
- require executed branch proof before declaring fixed

## 10. Postgres parameter preset

If a query uses `$1`, `$2`, or higher:
- verify binding surface and order
- verify real execution before closure

If parameterization is broken:
- stop the larger test
- fix the node first
- rerun only the minimum affected path

## 11. No-progress / loop preset

If two consecutive attempts produce:
- no live delta
- no new evidence
- or the same blocker

Then:
- stop that path
- invoke Loop Breaker
- choose the smallest materially different path

## 12. Runtime proof preset

If design checks pass but runtime proof is still missing:
- do not claim completion
- do not assign 10/10
- run the smallest valid runtime proof if a verified write surface exists
- otherwise classify blocker honestly

## 13. Cleanup deferral preset

If cleanup, renaming, or polish is attractive but non-blocking:
- defer it
- record it
- keep stage-critical work first

## 14. Autonomous risk-handling preset

If a risk can be reduced without human input:
- reduce it immediately
- prefer reversible containment
- prefer safe parallel structures over waiting

## 15. Advancement preset

Advance only when all are true:
- live workflow verified
- live DB verified
- runtime proof complete
- post-test DB state checked
- audit completed
- score 10/10
- closure report written

## 16. Reporting preset

Whenever an automatic decision is taken, log:
- trigger condition
- preset used
- exact action taken
- evidence level
- reversibility
- next executable action
