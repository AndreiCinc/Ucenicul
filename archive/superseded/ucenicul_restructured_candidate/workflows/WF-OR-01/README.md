# workflows/WF-OR-01/ — Orchestrator Input Handoff

**Status (based on existing source docs): closed.** Per STATE snapshots, OR-01 reached closure prior to DI-01 / ME-01.

## Contents
- `workflow/` — `WF-OR-01_Orchestrator_Input_Handoff.json`, `WF-OR-01_blueprint.json`.
- `docs/` — connection map, import patch plan, node map, `06_STAGE_WF-OR-01.md`, `00_ROUTE_MAP__WF-OR-01_ACTIVATED.md`, `17_ACTIVE_STAGE_LOCK__WF-OR-01.md`.
- `sql/` — OR SQL from `workflows/sql/or/`.
- `scripts/` — `or_logic.py` (+ pyc).
- `tests/` — `test_families.py`, `results/`.
- `reports/` — AUDIT / BUILD / CLOSURE / CURRENT_STAGE / FIX_LOG / STATE reports for WF-OR-01.

A duplicate nested OR-01 source pack exists at `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/`.
