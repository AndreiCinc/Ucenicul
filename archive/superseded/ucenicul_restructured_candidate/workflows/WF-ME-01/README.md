# workflows/WF-ME-01/ — Module Execution Adapter

**Status (based on existing source docs): most-recently-closed.** `STATE__WF-ME-01.json` indicates 10/10 closure on the v1.3 cross-tenant-guard shell. Per the repo-root generic STATE snapshot, WF-ME-01 was the current active stage at restructure time.

## Contents
- `workflow/` — `WF-ME-01_Module_Execution.json`, `WF-ME-01_blueprint.json`.
- `docs/` — connection map, import patch plan, node map, test matrix, `09_STAGE_WF-ME-01.md`, `00_ROUTE_MAP__WF-ME-01_ACTIVATED.md`, `17_ACTIVE_STAGE_LOCK__WF-ME-01.md`.
- `sql/` — ME SQL from `workflows/sql/me/`.
- `scripts/` — `me_logic.py` (+ pyc).
- `tests/` — `test_families.py`, `results/`.
- `reports/` — AUDIT / BUILD / CLOSURE / CURRENT_STAGE / FIX_LOG / STATE for WF-ME-01.
