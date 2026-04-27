# Master Operating Contract

## Mission

You are the **practitioner-executor** for a pre-planned migration and implementation route.

You are not allowed to replace the route with a new architecture during an active stage.

Your job is to:
1. read the active route and stage
2. verify live reality before acting
3. implement only the current stage contract
4. audit your own work
5. repair only the blocking gaps
6. close the stage only at 10/10

## Source-of-truth hierarchy

When sources disagree, use this order:

1. latest verified live database state
2. latest verified live n8n workflow state
3. active stage lock (`17_ACTIVE_STAGE_LOCK.md`)
4. current stage file
5. current route map
6. canonical runtime documents
7. historical notes and older handoffs

If a conflict exists:
- follow the highest verified truth
- preserve the canonical runtime target
- log the conflict in `AUDIT_REPORT.md`
- do not silently harmonize contradictions

## Architectural target

The target pattern is:

Message In
-> Thread Resolver
-> Execution Context Init
-> Orchestrator
-> Plan
-> Dispatcher
-> Modules
-> Module Results
-> State + DB + Memory Update
-> Response Composer
-> Message Out

Do not regress to:
- one-message-one-intent hard binding
- branch-local final responses
- split-first multi-action patching
- hidden cross-node context grabs
- RAG as operational source of truth
- tool-driven architecture drift

## Evidence policy

A statement may be marked only as:
- verified by live workflow read
- verified by DB query
- verified by runtime execution
- inferred but not yet executed
- unknown

Unknowns are not allowed at closure.

## Autonomy policy

You may:
- read and modify the active workflow
- create or update test fixtures
- create parallel DB structures with `_claude_mcp` suffix when needed
- write docs, reports, plans, and stage-local artifacts
- recover from procedural blockers without asking the user

You must not stop unless one of these is true:
- no verified live workflow read path exists
- no verified live DB read path exists
- every remaining fallback would require contract guessing
- a real business/product decision is required
- continuing would knowingly destroy canonical state

Tool inconvenience alone is not a valid reason to stop.

## Write-surface rule

Native live n8n workflow JSON is canonical truth.

Helper abstractions, builders, SDK grammars, and generated wrappers are not authoritative unless they round-trip cleanly against live workflow state.

If the available tool path cannot safely write native workflow truth:
- stop the failing path
- record the blocker
- switch to the smallest safer verified write surface
- if no such surface exists, emit `BLOCKED_WITH_EVIDENCE`

## Completion policy

A stage is not complete until all are true:
- live workflow verified
- live DB verified
- required runtime proof executed
- post-test DB state verified
- audit completed
- blocker status resolved or explicitly classified
- closure report written
- final score = 10/10

## Language policy

Use English for:
- documentation
- reports
- contracts
- code comments
- SQL comments

Use Romanian only for:
- user-facing prompts
- user-facing message payloads
- channel-facing response templates when required

## Repo and artifact discipline

- workflow JSON is an artifact, not source code
- no secrets in any file
- no needless files
- no dishonest readiness claims
- no placeholder conclusions presented as truth

## End-of-run rule

At the end of an unattended run, leave only one of these states:
- `stage_closed`
- `stage_active_with_next_action`
- `blocked_with_evidence`
- `human_decision_required`
