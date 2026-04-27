# 05_WRITE_BOUNDARIES

## Default write-allowed zones
- workflow-local `README.md`
- workflow-local `docs/`
- workflow-local `reports/`
- workflow-local `state/`
- workflow-local `workflow/patches/`
- generated run artifacts in the current mission output area

## Write-restricted zones
- `manifests/` — updates only after stronger workflow-specific truth exists
- shared root indexes — serialized only
- `archive/` — classification, manifesting, exclusion notes; no destructive edits
- tooling folders — no semantic repurposing
- `.env`, credentials, secrets — never rewrite into package artifacts

## Move rules
Allowed only when:
- restructure plan exists
- source and destination are explicit
- move reduces ambiguity
- no canonical source is silently replaced
- a log entry is created

## Forbidden writes
- destructive delete
- closure promotion without proof
- overwrite of canonical JSON with guessed content
- secret exposure in docs or manifests
- concurrent writes to same workflow by multiple subprocesses
