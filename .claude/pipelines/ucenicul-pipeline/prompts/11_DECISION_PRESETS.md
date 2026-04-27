# Decision Presets

This file defines the default decisions Claude must take without asking for human input.

Use this file when:
- more than one valid action exists
- a known risk reappears
- a tool path is unreliable
- a source-of-truth conflict exists
- progress may stall because of hesitation

These presets are mandatory.
They reduce human dependency.
They do not override the target architecture.
They do not permit uncontrolled redesign.

## 0. How to apply presets

When a decision point appears:
- choose the matching preset
- take the default action immediately
- log the decision in the required report
- continue unless a true stop condition exists

If more than one preset applies:
- first use **Decision priority**
- then choose the option that preserves live progress with the smallest reversible change

If a preset conflicts with a stage-specific rule:
- the stage-specific rule wins
- but the conflict must be logged

## 1. Decision priority

When multiple valid actions exist, choose in this order:

1. preserve live progress
2. preserve canonical architecture
3. preserve workflow shell and testability
4. prefer minimal reversible change
5. prefer live-proof path over elegant theory
6. prefer non-destructive DB fallback over waiting
7. defer cleanup if it does not block the stage

## 2. Source-of-truth conflict preset

If sources disagree, decide in this order:

1. latest live DB state
2. latest live workflow state
3. current stage file
4. migration spec and canonical docs
5. historical handoffs

Action:
- follow the highest live truth
- log the conflict in `AUDIT_REPORT.md`
- continue unless the conflict creates a real product decision

## 3. n8n workflow persistence preset

If a workflow update appears successful, Claude must not trust it yet.

Mandatory decision:
- re-read live workflow immediately
- compare draft vs active
- verify node count
- verify connection count
- verify exact patched fields

If any mismatch exists:
- treat the update as failed
- do not continue as if persisted
- switch to the smallest safer write path available

## 4. MCP / SDK degraded-path preset

If MCP or SDK write behavior is known or observed to be unreliable:

First failure:
- allow one verification attempt only

Second failure or repeated mismatch:
- stop exploring SDK behavior
- switch to canonical JSON patch strategy
- preserve workflow shell
- use read -> patch -> verify discipline only
- invoke Loop Breaker behavior

Claude must not reverse-engineer helper abstractions during an active stage.

## 5. Workflow shell protection preset

If the user created a shell workflow for the active stage:
- preserve the workflow record
- preserve its identity, name, and existence
- refactor that workflow in place
- do not create a replacement workflow unless the stage file explicitly requires it
- never leave it blank

If an attempted update creates a blank or partial workflow:
- restore from the latest known good snapshot immediately
- mark the prior update path as unsafe in `FIX_LOG.md`

## 6. Temporary trigger preset

If a temporary trigger exists only for testing or MCP exposure:
- keep it only while it is required for runtime testing
- classify it as `temporary`, `removable`, and `non-canonical`
- do not treat it as architecture truth
- remove it when the canonical entry path is ready and tested

## 7. DB ownership / privilege preset

If direct ALTER, CREATE, DROP, or constraint work is blocked by ownership or privilege:
- do not block waiting for the user
- create a parallel structure with suffix `_claude_mcp`
- continue implementation using the parallel structure
- log merge-back notes for later human migration

Default naming:
- table: `<base_name>_claude_mcp`
- view: `<base_name>_v_claude_mcp`
- function: `<base_name>_claude_mcp_fn`
- index: `idx_<base_name>_claude_mcp_<purpose>`

## 8. Legacy data preset

If legacy data exists and its status is unclear:
- do not delete by default
- do not treat it as stage truth by default
- isolate stage testing with dedicated fixtures
- classify legacy data as one of:
  - preserved
  - ignored
  - migrated later
  - safe to clean

If no explicit need exists, prefer `ignored for current stage`.

## 9. Routing / type mismatch preset

If routing nodes depend on booleans, strings, numbers, or expressions:
- verify runtime type from upstream node output
- align the routing node to the produced type
- do not assume static config correctness
- require executed branch proof before declaring the path fixed

If uncertain, prefer the type proven in runtime output over the type suggested by the UI.

## 10. Postgres parameter preset

If a Postgres query uses `$1`, `$2`, or higher parameters:
- verify query parameter binding before full runtime tests
- verify order
- verify real execution

If parameterization is broken and cannot be safely repaired through the current node path:
- stop the larger test
- fix the node first
- rerun only the minimum affected path

## 11. No-progress / loop preset

If two consecutive attempts produce no live delta, no new evidence, or the same blocker:
- stop the current exploratory path
- invoke Loop Breaker logic
- choose the smallest alternative path with a higher chance of live proof
- record the abandoned path in `FIX_LOG.md`

Claude must prefer forward progress over tool curiosity.

## 12. Runtime proof preset

If design checks pass but runtime proof is still missing:
- do not claim completion
- do not assign 10/10
- do not advance the stage

Default decision:
- run the smallest valid runtime test that proves the stage contract

## 13. Cleanup deferral preset

If cleanup, refactor, renaming, or documentation polishing is attractive but not blocking:
- defer it
- record it in the appropriate report
- continue stage-critical work first

No opportunistic cleanup may block stage closure.

## 14. Autonomous risk-handling preset

If a risk appears and it can be reduced without human input:
- reduce it immediately
- prefer non-destructive containment
- prefer reversible changes
- do not stop just because the first path became unsafe

If the old structure is risky and direct modification is unsafe:
- create a parallel safe structure
- keep moving

## 15. Advancement preset

Claude may advance only when all are true:
- live workflow verified
- live DB verified
- runtime proof complete
- post-test DB state checked
- audit completed
- score is 10/10
- closure report written

If any item is missing:
- do not advance
- continue the fix loop

## 16. Reporting preset

When an automatic decision is taken:
- log the decision in the most relevant report file
- state the trigger condition
- state the preset used
- state the exact action taken
- state the evidence level
- state whether the decision is reversible

Do not leave automatic decisions implicit.
