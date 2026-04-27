# RUN_MISSION

## Mission
Run a full autonomous workflow governance pass on the Ucenicul repository using the local operator pack.

This run is **discovery-first**.
The repository may be incomplete.
Do not assume all expected workflows are physically present.

## Primary Objective
Bring every workflow physically present and in scope as close as possible to pack compliance through:
- discovery
- audit
- canonicality resolution
- missing artifact creation
- minimal documentation remediation
- re-audit
- final verdict

Also explicitly record all expected workflows that are missing from the repository.

## Expected Workflow Targets
- WF-TR-01
- WF-EC-01
- WF-OR-01
- WF-PL-01
- WF-DI-01
- WF-ME-01
- WF-RA-01
- WF-SU-01

## Discovery Rule
Before queue creation:
- discover all workflow folders actually present under `workflows/`
- map them to the expected targets where possible
- produce a discovery classification:
  - PRESENT_IN_REPO
  - MISSING_FROM_REPO
  - PRESENT_BUT_NONSTANDARD_NAME
  - ARCHIVED_ONLY
  - UNCLEAR_MATCH

## In Scope
- all discovered workflows that can be matched to expected targets
- any directly related archived stub only if needed for canonicality or dependency interpretation

## Out of Scope
- unrelated experiments
- global architecture rewrites
- non-workflow product features
- broad monolith redesign outside workflow documentation/reconciliation

## Mode
`repo_reconcile`
`docs_standardization`
`package_final` only if a clean final package can be produced safely

## Live n8n
Allowed only if:
- live access is actually available
- the pack rules authorize it
- audit passes
- patch planning passes
- rollback awareness exists

Otherwise remain in repo-only audit/remediation mode.

## Patching
Default: minimal and evidence-backed only.

## Mandatory Preflight
Before discovery and queue creation, verify:
- real local file readability
- WF-local README readability where available
- JSON readability where available
- write/delete probe inside `inventory/`

If preflight fails:
- classify run as `ENVIRONMENT_BLOCKED`
- emit blocker report
- stop without per-workflow quarantine

## Write Boundaries
Allowed writes:
- `inventory/`
- discovered in-scope workflow local docs/readmes/state/reports as justified by evidence and pack rules
- package manifests
- missing minimal artifacts required by tier

Not allowed:
- fabricate truth
- broad renames outside proven need
- delete historical material by default
- mutate unrelated workflows
- rewrite closure claims without evidence

## Success Condition
Every expected workflow target ends in exactly one state:
- PASS
- PASS_WITH_EXPLICIT_GAPS
- QUARANTINED
- OUT_OF_SCOPE
- MISSING_FROM_REPO

A run is complete only when:
- discovery report exists
- global summary exists
- every expected workflow target has a recorded final verdict
- quarantined and missing cases have exact blockers and next action