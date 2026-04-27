# Agent Registry

Claude must simulate these roles internally and use them in sequence.

Each role has:
- a purpose
- allowed outputs
- when it must be used
- which files it may update directly

## Role order for a normal stage loop

1. Orchestrator
2. n8n Reader
3. DB Reality Checker
4. n8n Fixer and/or DB Fallback Builder
5. Auditor
6. n8n Tester
7. Auditor
8. Closure Judge
9. Project Tracker

If recovery is triggered:
- Loop Breaker runs before any renewed write attempt

## 1. Orchestrator

Purpose:
- read active stage identity
- choose the next concrete action
- keep stage phase aligned with evidence
- prevent drift into future-stage work

Primary outputs:
- `STATE.json`
- current substep
- role assignment for the next action

Must be used:
- at run start
- after every major evidence change
- before entering recovery mode
- before closure evaluation

## 2. n8n Reader

Purpose:
- inspect live workflow structure
- compare draft vs active
- detect write mismatches and shell risk
- confirm node, connection, and target-field truth

Primary outputs:
- workflow truth block in reports
- before/after snapshot details

Must be used:
- before any workflow write
- after any workflow write
- before runtime tests
- whenever a write result looks suspicious

## 3. n8n Fixer

Purpose:
- patch only the active workflow
- preserve the user-created shell
- apply minimal structural change
- never redesign beyond stage scope

Primary outputs:
- workflow patch
- exact changed fields
- verification-ready delta

Must be used:
- only when a live workflow change is required

## 4. n8n Tester

Purpose:
- run the minimum runtime proof
- verify execution path and side effects
- classify pass/fail/unknown

Primary outputs:
- runtime verification block
- failing-node evidence when applicable

Must be used:
- only after build and audit gates are satisfied

## 5. DB Reality Checker

Purpose:
- inspect schema, ownership, privileges, indexes, and constraint reality
- verify the exact SQL needed by the active stage
- prevent schema guessing

Primary outputs:
- DB truth block in reports
- schema-read evidence
- go/no-go for DB-backed stage work

Must be used:
- at stage start
- before any ALTER/CREATE
- before runtime tests

## 6. DB Fallback Builder

Purpose:
- create safe `_claude_mcp` structures when direct schema work is blocked or risky
- preserve progress without damaging canonical state
- emit merge-back notes

Primary outputs:
- fallback table/view/function/index creation notes
- merge-back instructions
- fallback classification in reports

Must be used:
- when ownership, privilege, or canonical-risk blockers appear

## 7. Auditor

Purpose:
- compare stage contract vs live evidence
- score the stage
- produce exact blocking gaps
- reject premature closure claims

Primary outputs:
- `AUDIT_REPORT.md`
- current score
- required fix list

Must be used:
- after each build pass
- after each runtime pass
- before closure

## 8. Loop Breaker

Purpose:
- stop repeated no-progress behavior
- ban a degraded strategy for the current stage
- force the smallest safer alternative path

Trigger conditions:
- same failed tool pattern twice
- same false-success path twice
- same blocker with no new evidence twice
- renewed SDK exploration after a documented SDK blocker

Primary outputs:
- banned-path note
- fallback decision
- recovery-mode entry

Must be used:
- immediately on repeated no-progress

## 9. Project Tracker

Purpose:
- keep the unattended handoff understandable
- summarize what changed, what blocked, and what is next
- maintain concise continuity

Primary outputs:
- stage progress summary
- next executable action
- handoff-ready status line

Must be used:
- after major milestones
- after blocker classification
- at stage pause or closure

## 10. Closure Judge

Purpose:
- enforce the 10/10 rule
- reject "almost done"
- verify that closure conditions are fully satisfied

Primary outputs:
- closure acceptance or rejection
- final score
- readiness for next stage

Must be used:
- only at end-of-stage evaluation

## File-update discipline by role

### Roles allowed to update `STATE.json`
- Orchestrator
- Loop Breaker
- Closure Judge

### Roles allowed to update reports
- Auditor
- Project Tracker
- Loop Breaker
- Closure Judge

### Roles allowed to modify workflow or DB
- n8n Fixer
- DB Fallback Builder

### Roles allowed to declare a stage closed
- Closure Judge only

No other role may imply closure.
