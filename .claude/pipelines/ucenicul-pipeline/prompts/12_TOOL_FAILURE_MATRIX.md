# Tool Failure Matrix

This file defines the required fallback behavior when tools fail, degrade, or produce ambiguous outcomes.

Use this file together with:
- `04_N8N_MCP_PLAYBOOK.md`
- `05_DB_AUTONOMY_PLAYBOOK.md`
- `07_IMPEDIMENTS_AND_GUARDRAILS.md`
- `11_DECISION_PRESETS.md`

The purpose is to prevent tool-loop behavior and keep stage progress live.

## 0. Universal tool-failure rules

For any failing tool path:
- classify the failure quickly
- allow at most one immediate verification retry unless this file says otherwise
- prefer the smallest path that can produce live evidence
- log the failure and chosen fallback
- do not keep exploring the failed tool if no new evidence is produced

A tool path is considered degraded when at least one is true:
- it reports success but live re-read disproves it
- it returns partial data without enough evidence for closure
- it repeats the same failure twice
- it risks workflow shell loss or false progress

## 1. Failure classes

### F1 — hard failure
Examples:
- request error
- authentication error
- permission denied
- invalid payload rejected

Default action:
- retry once if the cause may be transient
- otherwise switch to fallback path immediately

### F2 — false success
Examples:
- update claims success but workflow/live DB did not change
- draft changed but active did not
- returned object does not match actual saved state

Default action:
- do not trust the tool
- mark path as degraded
- switch to independent round-trip verification and alternate write path

### F3 — partial read
Examples:
- incomplete workflow details
- missing execution metadata
- partial DB introspection

Default action:
- run one alternate read path
- if still partial, continue only if the missing data is non-blocking
- otherwise stop the stage path and use fallback

### F4 — dangerous outcome
Examples:
- blank workflow risk
- destructive DB change without proof
- ambiguous operation that can overwrite canonical state

Default action:
- stop immediately
- restore or preserve known good state
- switch to safe reversible path only

## 2. n8n MCP read matrix

### If live workflow read succeeds
Action:
- use it as current truth
- save or reference snapshot if this stage performs writes

### If workflow read fails once
Action:
- retry once
- if the second read succeeds, continue

### If workflow read fails twice
Action:
- classify MCP read as degraded
- do not attempt closure based on assumptions
- switch to any alternate available live read path
- if no live read path exists, emit `BLOCKED_WITH_EVIDENCE`

## 3. n8n MCP write matrix

### If write reports success
Mandatory next step:
- re-read live workflow
- compare draft vs active
- verify node count
- verify connection count
- verify patched fields

### If write reports success but live state does not match
Action:
- classify as false success
- mark MCP write path degraded
- do not continue as if persisted
- switch to raw JSON patch / shell-preserving replacement discipline

### If write produces blank workflow or node count collapse
Action:
- restore latest known good snapshot immediately
- preserve workflow shell
- log the failed path as unsafe
- do not retry the same write strategy

## 4. Workflow shell protection matrix

### If active stage has a user-created shell workflow
Action:
- keep the workflow identity
- update in place only
- snapshot before write
- snapshot after write

### If any write path risks deleting or blanking the shell
Action:
- abort that path
- restore from snapshot if needed
- use only minimal structural patching from then on

## 5. DB introspection matrix

### If schema read succeeds
Action:
- verify stage contract against live columns, types, and constraints
- continue only after reality check is logged

### If schema read is partial
Action:
- run a second read through system catalogs or information_schema
- if still partial, do not begin runtime stage tests

### If schema read is impossible
Action:
- emit `BLOCKED_WITH_EVIDENCE`
- do not guess schema

### No schema inference from validator errors
Do not treat validator error messages, payload rejection strings, ORM
exception text, or MCP tool error payloads as schema evidence. Error
messages may reference stale, partial, renamed, or synthetic fields,
and the absence of a field in an error does not prove its absence in
the table.

Schema truth may only come from:
- a live `information_schema` / `pg_catalog` read
- an authoritative migration file under source control
- a confirmed canonical DDL artifact

If only error-message "hints" are available, treat schema as
unverified and emit `BLOCKED_WITH_EVIDENCE`. Do not build, patch, or
close a stage on schema guessed from validator output.

## 6. DB write / DDL matrix

### If ALTER / CREATE on canonical structure succeeds
Action:
- verify actual created structure
- continue on canonical path

### If ALTER / CREATE is blocked by ownership or privilege
Action:
- create parallel structure with suffix `_claude_mcp`
- continue implementation against fallback structure
- record exact merge-back notes

### If DDL is risky and not required for current stage
Action:
- defer DDL
- isolate stage with test fixtures or fallback structure

## 7. Runtime test matrix

### If runtime test passes
Action:
- verify post-test DB state
- update score

### If runtime test fails with a clear failing node
Action:
- fix the minimum affected area
- rerun only minimum impacted tests first
- avoid full-stage reruns unless necessary

### If runtime result is inconclusive
Action:
- do not claim pass
- inspect execution evidence
- classify the result as unknown until proven

## 8. Loop-detection matrix

### If two attempts produce the same blocker and no new evidence
Action:
- stop that path
- invoke Loop Breaker
- choose alternate path with better live-proof potential

### If alternate path also fails without new evidence
Action:
- emit `BLOCKED_WITH_EVIDENCE`
- preserve all findings for unattended handoff

### Three-attempt strategy ceiling
Any single strategy (specific write path, specific read path, specific
fix approach) may be attempted at most three times total across a
stage, including the initial attempt. On the third failure without
new evidence, that strategy is banned for the remainder of the stage
and must be replaced with a fallback path or escalated to
`BLOCKED_WITH_EVIDENCE`.

Cosmetic variations do not reset the counter. The following count as
the same strategy:
- same tool with renamed payload fields
- same tool with reordered fields
- same tool with reformatted JSON
- same tool invoked against the same target with no change in contract

A new strategy requires a different tool path, a different write
surface, or a materially different contract. Counter resets happen
only on strategy change, not on retry.

## 9. Reporting matrix

For every degraded or failed tool path, log:
- tool name
- failure class
- evidence observed
- retry count used
- fallback chosen
- whether the failed path is now banned for the current stage

## 10. Output labels

Use only these labels when summarizing tool state:
- `healthy`
- `degraded`
- `unsafe_for_current_stage`
- `blocked`

Do not use vague labels like “seems okay” or “probably saved”.
