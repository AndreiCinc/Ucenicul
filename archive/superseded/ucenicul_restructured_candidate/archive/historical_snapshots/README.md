# archive/historical_snapshots/

Closure snapshots and generic root-level active-stage pointers preserved as historical reference.

- `WF-EC-01_closure_snapshot/` — copy of `docs/ucenicul_claude_handoff_hardened/archive/WF-EC-01_closure_snapshot/`.
- `WF-OR-01_closure_snapshot/` — copy of `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/`.
- `root_generic_active_stage_pointers/` — unsuffixed `AUDIT_REPORT.md`, `BUILD_REPORT.md`, `CLOSURE_REPORT.md`, `CURRENT_STAGE.md`, `FIX_LOG.md`, `STATE.json` from `docs/ucenicul_claude_handoff_hardened/`. Per the on-disk `STATE.json.current_stage = "WF-ME-01"`, these correspond to the WF-ME-01 active-stage generic pointers at restructure time; they are not placed directly into `workflows/WF-ME-01/reports/` to avoid filename collision with the suffixed ME-01 report set that already sits there. Inventory notes record the original root-level role.
