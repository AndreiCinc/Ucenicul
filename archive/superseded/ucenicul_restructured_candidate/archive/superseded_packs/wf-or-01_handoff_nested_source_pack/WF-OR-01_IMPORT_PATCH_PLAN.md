# WF-OR-01 Import Patch Plan

## Goal
Import or patch `WF-OR-01` into the existing user-created shell while preserving shell identity.

## Canonical source artifact
- `workflows/WF-OR-01_Orchestrator_Input_Handoff.json`

## Shell-preserving rule
- preserve the workflow record identity
- replace internals only
- do not delete the shell
- do not trust write success without immediate live re-read

## Before-write checklist
1. read live `WF-OR-01`
2. capture before-snapshot
3. verify current node count and connection count
4. confirm trigger shape
5. identify the exact fields to patch

## Import strategy preference
1. verified native JSON shell-preserving import / replacement
2. verified alternate API path that round-trips native JSON truth
3. `BLOCKED_WITH_EVIDENCE`

## Required live verification after import
- workflow id unchanged
- workflow name unchanged
- node count matches expected range (~10)
- connections present (~9)
- triggers preserved
- `OR_Load_Execution_Context` still has `alwaysOutputData: true`
- `OR_Route_Valid` still uses `_valid` with branch proof

## Known carry-forward limitations
- `mcp__n8n__patch_workflow_nodes` is presumed unsafe until disproven by new live evidence
- manual-mode execution prefers the webhook-registered trigger
- dual-trigger pinData remains the known working pattern for manual-trigger intent tested programmatically
- chat trigger requires adapter-safe payload handling

## First runtime sequence after import
1. V1 shell integrity
2. V2 invalid input
3. V3 happy path
4. V4 replay stability
5. V5 cross-tenant mismatch rejection
6. V6 upstream smoke handoff using real or realistic `WF-EC-01` success payload
