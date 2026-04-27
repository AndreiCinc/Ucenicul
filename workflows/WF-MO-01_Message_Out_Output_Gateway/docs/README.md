# docs/

## Purpose

Prose, topology, test-matrix, and handoff-bundle for WF-MO-01 Message Out / Output Gateway.

## Contents (docs/ top-level)

- `WF-MO-01_CONNECTION_MAP.md` — connection mapping.
- `WF-MO-01_NODE_MAP.md` — node-by-node map.
- `WF-MO-01_IMPORT_PATCH_PLAN.md` — import patch plan.
- `WF-MO-01_TEST_MATRIX.md` — canonical test matrix.
- `ucenicul_claude_handoff_hardened/` — handoff bundle (see bundle README / contents).

## Handoff bundle contents

The `ucenicul_claude_handoff_hardened/` subfolder holds the canonical handoff-bundle — this is an accepted packaging per `inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §3. It contains:

- `AUDIT_REPORT__WF-MO-01.md`
- `BUILD_REPORT__WF-MO-01.md`
- `CLOSURE_REPORT__WF-MO-01.md`
- `CURRENT_STAGE__WF-MO-01.md`
- `FIX_LOG__WF-MO-01.md`
- `STATE__WF-MO-01.json` — handoff-bundle STATE (parallel to canonical `../../state/STATE__WF-MO-01.json`).
- `UPSTREAM_TRUTH__WF-RC-01.md`
- `00_ROUTE_MAP__WF-MO-01_ACTIVATED.md`
- `13_STAGE_WF-MO-01.md`
- `17_ACTIVE_STAGE_LOCK__WF-MO-01.md`

## Canonicality

- `WF-MO-01_TEST_MATRIX.md` (here) is canonical for test coverage.
- Handoff bundle is canonical within its bundle role — individual report files inside the bundle are canonical at their point-in-time but are NOT the repo-level status; see `../state/STATE__WF-MO-01.json`.
- Connection/node maps are supporting views; the `connections` block of `../workflow/WF-MO-01_Message_Out.json` is authoritative.

## Not source of truth

- Implementation (`../workflow/WF-MO-01_Message_Out.json`).
- Status (`../state/STATE__WF-MO-01.json`).

## Missing (tracked gaps)

- `WF-MO-01_CONTRACTS.md` — no contract file on disk.
