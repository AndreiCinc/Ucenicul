# Tool Failure Matrix

This file defines required fallback behavior when tools fail, degrade, or produce ambiguous outcomes.

Use it together with:
- `04_N8N_MCP_PLAYBOOK.md`
- `05_DB_AUTONOMY_PLAYBOOK.md`
- `07_IMPEDIMENTS_AND_GUARDRAILS.md`
- `11_DECISION_PRESETS.md`
- `16_AUTONOMOUS_STOP_AND_RECOVERY.md`

## Universal tool-failure rules

For any failing path:
- classify failure quickly
- allow at most one immediate verification retry unless this file says otherwise
- prefer the smallest path that can produce live evidence
- log the failure and chosen fallback
- do not keep exploring a failed path with no new evidence

A tool path is degraded if any is true:
- it reports success but live re-read disproves it
- it returns incomplete data and stage proof depends on the missing part
- it repeats the same failure twice
- it risks workflow shell loss or false progress
- it depends on an unavailable browser bridge
- it requires guessing an undocumented grammar

## Failure classes

### F1 — hard failure
Examples:
- request error
- auth error
- permission denied
- invalid payload rejected

Default:
- retry once if plausibly transient
- otherwise switch path immediately

### F2 — false success
Examples:
- write claims success but live state unchanged
- validator says valid but node graph not real
- active workflow did not update

Default:
- distrust the path
- classify degraded
- switch to independent verification and alternate write path

### F3 — partial read
Examples:
- incomplete workflow details
- incomplete DB introspection
- missing execution metadata

Default:
- run one alternate read path
- if still partial and blocking, stop the path and emit blocker classification

### F4 — dangerous outcome
Examples:
- blank workflow risk
- destructive DB change without proof
- ambiguous overwrite of canonical state

Default:
- stop immediately
- preserve known good state
- use safe reversible path only

## n8n read matrix

### If live workflow read succeeds
Action:
- use it as current truth
- capture snapshot if writes may follow

### If workflow read fails once
Action:
- retry once

### If workflow read fails twice
Action:
- classify read path degraded
- if no alternate verified read surface exists, emit `BLOCKED_WITH_EVIDENCE`

## n8n write matrix

### If write reports success
Mandatory:
- re-read live workflow
- verify node count
- verify connection count
- verify patched fields
- verify shell identity

### If write reports success but live state mismatches
Action:
- classify as `F2`
- mark current write strategy degraded
- do not continue as if persisted
- switch to native JSON patch discipline if verified
- otherwise emit `BLOCKED_WITH_EVIDENCE`

### If write collapses workflow shell
Action:
- rollback immediately
- mark strategy `unsafe_for_current_stage`
- ban retry of that strategy

## Browser-bridge matrix

### If browser extension/session bridge is available and verified
Action:
- it may be used as a convenience path
- it still requires full read -> patch -> verify discipline

### If browser bridge is unavailable
Action:
- classify browser path as unavailable
- do not wait on it by default
- continue only if another verified path exists
- otherwise emit `BLOCKED_WITH_EVIDENCE`

Browser availability does not upgrade a stage to closure by itself.

## DB introspection matrix

### If schema read succeeds
Action:
- verify columns, constraints, ownership, and stage SQL
- continue

### If schema read is partial
Action:
- run a second verified read path
- if still partial and blocking, stop

### If schema read is impossible
Action:
- emit `BLOCKED_WITH_EVIDENCE`
- do not guess schema

## No schema inference rule

Never infer schema from:
- validator errors
- ORM exceptions
- tool payload rejections
- stale memory
- guessed naming

## DB write / DDL matrix

### If canonical DDL succeeds safely
Action:
- verify actual created structure
- continue

### If canonical DDL is blocked or risky
Action:
- create `_claude_mcp` fallback structure
- continue if the stage remains provable
- record merge-back notes

## Runtime test matrix

### If runtime test passes
Action:
- verify post-test DB state
- update score

### If runtime test fails clearly
Action:
- fix the smallest affected area
- rerun only the minimum impacted checks first

### If runtime result is inconclusive
Action:
- classify as unknown
- do not claim pass

## Loop-detection matrix

### If two attempts produce the same blocker with no new evidence
Action:
- stop that path
- invoke Loop Breaker
- choose a materially different path

### If alternate path also fails with no new evidence
Action:
- emit `BLOCKED_WITH_EVIDENCE`

### Three-attempt ceiling
Any single strategy may be attempted at most three times total in one stage.
On the third failure without new evidence:
- ban that strategy for the stage
- switch path or classify blocker

## Output labels

Use only:
- `healthy`
- `degraded`
- `unsafe_for_current_stage`
- `blocked`

No vague labels.
