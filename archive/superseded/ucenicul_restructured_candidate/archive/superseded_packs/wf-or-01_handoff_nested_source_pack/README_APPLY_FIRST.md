# WF-OR-01 Full Source Pack

This pack mirrors repo-relative paths so you can copy-merge it into the existing project.

## Safe merge rule
Before overwriting generic active-stage files under `docs/ucenicul_claude_handoff_hardened/`, archive the final `WF-EC-01` closure snapshot.

## Files that will overwrite generic active-stage pointers/reports
- `docs/ucenicul_claude_handoff_hardened/00_ROUTE_MAP.md`
- `docs/ucenicul_claude_handoff_hardened/17_ACTIVE_STAGE_LOCK.md`
- `docs/ucenicul_claude_handoff_hardened/CURRENT_STAGE.md`
- `docs/ucenicul_claude_handoff_hardened/STATE.json`
- `docs/ucenicul_claude_handoff_hardened/BUILD_REPORT.md`
- `docs/ucenicul_claude_handoff_hardened/AUDIT_REPORT.md`
- `docs/ucenicul_claude_handoff_hardened/FIX_LOG.md`
- `docs/ucenicul_claude_handoff_hardened/CLOSURE_REPORT.md`

## Files that are new for this stage
- `docs/ucenicul_claude_handoff_hardened/06_STAGE_WF-OR-01.md`
- `workflows/WF-OR-01_Orchestrator_Input_Handoff.json`
- `workflows/WF-OR-01_blueprint.json`
- `workflows/WF-OR-01_NODE_MAP.md`
- `workflows/WF-OR-01_CONNECTION_MAP.md`
- `workflows/WF-OR-01_IMPORT_PATCH_PLAN.md`
- `workflows/sql/or/*`
- `workflows/scripts/or/or_logic.py`
- `workflows/tests/or/*`

## Recommended order
1. Archive the final `WF-EC-01` active-stage snapshot.
2. Copy `docs/ucenicul_claude_handoff_hardened/*` into the old folder.
3. Copy `workflows/*` into the old repo workflow tree.
4. Read `docs/ucenicul_claude_handoff_hardened/CURRENT_STAGE.md`.
5. Start the live reality check for `WF-OR-01`.
