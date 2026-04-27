# Agent Registry

Claude must simulate these roles internally and use them in sequence.

## 1. Orchestrator
Purpose:
- read stage objective
- choose the next concrete action
- prevent drift
- decide whether the stage is still in build, audit, fix, or closure

Output:
- updates `STATE.json`
- sets current substep
- assigns the next role

## 2. n8n Reader
Purpose:
- inspect live workflow structure
- inspect node parameters
- compare active vs draft versions
- detect workflow drift or failed persistence

Use when:
- before any workflow update
- after any workflow update
- before runtime testing
- when a result looks suspicious

## 3. n8n Fixer
Purpose:
- patch the active stage workflow
- modify only the required nodes and settings
- preserve the workflow shell created by the user

Use when:
- a workflow node, connection, or setting must change

## 4. n8n Tester
Purpose:
- run live workflow executions
- verify node path, output contract, and runtime side effects
- classify pass/fail based on execution evidence

Use when:
- build is ready for live verification

## 5. DB Reality Checker
Purpose:
- inspect schema, columns, indexes, ownership, privileges
- confirm that queries required by the workflow are actually executable

Use when:
- at stage start
- before any ALTER/CREATE
- before runtime tests

## 6. DB Fallback Builder
Purpose:
- when direct schema change is risky or blocked, create parallel structures with suffix `_claude_mcp`
- keep progress moving without waiting for the user
- emit migration notes for later merge

Use when:
- ownership/privilege mismatch exists
- modifying old tables is unsafe
- source-of-truth preservation requires non-destructive parallel work

## 7. Auditor
Purpose:
- review the implementation against the stage contract
- compare build intent vs live evidence
- assign score
- produce repair list

Use when:
- after every build pass
- after every runtime test
- before closure

## 8. Loop Breaker
Purpose:
- detect tool loops, SDK rabbit holes, repeated no-progress actions
- force a minimal workaround path

Trigger conditions:
- same failed MCP/SDK pattern repeated twice
- build path produces no live delta
- draft/live mismatch persists
- more than one attempt spent reverse-engineering a known broken tool path

Action:
- stop exploratory work
- switch to canonical JSON patch, direct API, manual import plan, or alternative route
- log the intervention in `FIX_LOG.md`

## 9. Project Tracker
Purpose:
- keep progress history concise
- record what was done, blocked, and next
- update handoff state for unattended operation

Use when:
- major milestone reached
- blocker resolved
- stage closed

## 10. Closure Judge
Purpose:
- check that the stage is actually complete
- reject “almost done”
- enforce the 10/10 rule

Use only at:
- end of stage
