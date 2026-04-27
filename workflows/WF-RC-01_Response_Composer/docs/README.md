# docs/

## Purpose

Prose, topology, and test-matrix for WF-RC-01 Response Composer.

**NOTE — misfile warning**: this folder currently also contains report files and a state JSON that are canonically supposed to live in `../reports/` and `../state/`. They are preserved in-place in this pass; see "Misfiled content" below.

## Contents (canonical to docs/)

- `WF-RC-01_CONNECTION_MAP.md` — connection mapping.
- `WF-RC-01_NODE_MAP.md` — node-by-node map.
- `WF-RC-01_IMPORT_PATCH_PLAN.md` — import patch plan.
- `WF-RC-01_TEST_MATRIX.md` — canonical test matrix.
- `00_ROUTE_MAP__WF-RC-01_ACTIVATED.md` — route map.
- `12_STAGE_WF-RC-01.md` — stage-12 reference.
- `17_ACTIVE_STAGE_LOCK__WF-RC-01.md` — active stage lock.

## Misfiled content (belongs elsewhere)

These files live here but are canonical elsewhere. Recorded in `../state/STATE__WF-RC-01.json` → `canonicality_drift`:

- `AUDIT_REPORT__WF-RC-01.md` — canonical location: `../reports/`.
- `BUILD_REPORT__WF-RC-01.md` — canonical location: `../reports/`.
- `CLOSURE_REPORT__WF-RC-01.md` — canonical location: `../reports/`.
- `CURRENT_STAGE__WF-RC-01.md` — canonical location: `../reports/`.
- `FIX_LOG__WF-RC-01.md` — canonical location: `../reports/`.
- `STATE__WF-RC-01.json` — canonical location: `../state/`. The canonical status file is now `../state/STATE__WF-RC-01.json`; this legacy file is preserved read-only.

## Canonicality

- `WF-RC-01_TEST_MATRIX.md` (here) is canonical for test coverage.
- Maps in docs/ are supporting views; the `connections` block of `../workflow/WF-RC-01_Response_Composer.json` is authoritative.

## Not source of truth

- Implementation (`../workflow/WF-RC-01_Response_Composer.json`).
- Status (`../state/STATE__WF-RC-01.json`).

## Missing (tracked gaps)

- `WF-RC-01_CONTRACTS.md` — no contract file on disk.
