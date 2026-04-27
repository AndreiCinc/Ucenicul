# workflows/WF-PL-01/ — Plan Generation

**Status (based on existing source docs): closed.** Full source pack (including handoff docs, scripts, sql, tests, workflow JSONs) is also preserved at `archive/superseded_packs/wf-pl-01_full_source_pack/` as shipped.

## Contents
- `workflow/` — `WF-PL-01_Plan_Generation.json`, `WF-PL-01_blueprint.json`.
- `docs/` — connection map, import patch plan, node map, `07_STAGE_WF-PL-01.md`, `00_ROUTE_MAP__WF-PL-01_ACTIVATED.md`, `17_ACTIVE_STAGE_LOCK__WF-PL-01.md`.
- `sql/` — PL SQL from `workflows/sql/pl/`.
- `scripts/` — `pl_logic.py` (+ pyc).
- `tests/` — `test_families.py`, `results/`.
- `reports/` — AUDIT / BUILD / CLOSURE / CURRENT_STAGE / FIX_LOG / STATE for WF-PL-01.
