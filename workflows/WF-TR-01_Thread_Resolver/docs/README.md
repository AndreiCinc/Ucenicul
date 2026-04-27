# docs/

## Purpose

Design-, interface-, and handoff-level documentation for WF-TR-01 Thread Resolver. Does NOT hold the workflow implementation (that lives in `../workflow/`) or the status (that lives in `../state/`).

## Contents

- `contracts/ThreadResolutionContracts.md` — canonical callable-interface contract for Thread Resolution. Source of truth for the WF-TR-01 public contract.
- `WF-TR-01_MCP_Technical_Sheet.md` — reference sheet for the MCP-compatible manual trigger node and the MCP exposure contract.
- `IMPORT_WF-TR-01.md` — historical import note (pre-live import).
- `TEST_AFTER_IMPORT_WF-TR-01.md` — historical post-import test note.
- `handoffs/HANDOFF_WF-TR-01_2026-04-16.md` — dated handoff record.
- `handoffs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md` — dated handoff toward the EC-01 init kickoff (also referenced under WF-EC-01's docs; retained here for provenance).
- `desktop.ini` — Windows/OneDrive OS metadata. Foreign; excluded from any package.

## Canonicality

- `contracts/ThreadResolutionContracts.md` is the source of truth for the WF-TR-01 callable interface.
- The MCP Technical Sheet is supporting reference, not the contract.
- Handoff files are historical records; do not read them as current status.

## Not source of truth

- Implementation (that is `../workflow/WF-TR-01_Thread_Resolver.json`).
- Test matrix — no `WF-TR-01_TEST_MATRIX.md` exists today; fixtures live in `../tests/fixtures/` and are the operational proxy.
- Status (that is `../state/STATE__WF-TR-01.json`).
