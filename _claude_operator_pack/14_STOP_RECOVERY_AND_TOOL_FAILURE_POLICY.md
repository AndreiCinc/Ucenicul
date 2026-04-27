# 14_STOP_RECOVERY_AND_TOOL_FAILURE_POLICY

## Global hard stop conditions
Stop the whole batch only if:
- mission root cannot be identified
- filesystem is not writable for output artifacts
- tooling corruption threatens multiple workflows
- package generation would leak secrets and cannot be prevented

## Local workflow stop conditions
Local workflow stops and gets quarantined if:
- canonical truth cannot be identified
- live workflow cannot be read and patch is necessary
- false-success write cannot be recovered safely
- contradictory evidence remains unresolved after max passes

## Recovery behaviors
### false-success live write
- treat as failed
- re-read independently
- restore or re-patch if safe
- quarantine if invariant recovery fails

### stale macro manifests
- do not collapse contradiction
- reconcile from stronger workflow truth only

### archive pollution
- mark as historical/supporting
- exclude from package unless explicitly needed for recovery proof

### subprocess conflict
- coordinator wins
- serialize merge
- rerun verification for touched workflow
