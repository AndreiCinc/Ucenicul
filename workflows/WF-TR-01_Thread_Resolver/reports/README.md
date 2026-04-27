# reports/

## Purpose

Point-in-time narratives about WF-TR-01 Thread Resolver: what was audited, what was fixed, what tests yielded. NOT a source of truth for current status (that lives in `../state/STATE__WF-TR-01.json`).

## Contents

- `REMEDIATION_REPORT_WF-TR-01.md` — remediation narrative for Thread Resolver fixes.
- `TEST_REPORT_WF-TR-01.md` — test-run summary for the post-remediation state.

## Canonicality

- Each report is canonical within its narrative category at the dated point-in-time it describes.
- None of these reports is the source of truth for current status. Current status lives in `../state/STATE__WF-TR-01.json`.

## Not source of truth

- Implementation (`../workflow/WF-TR-01_Thread_Resolver.json`).
- Contracts (`../docs/contracts/ThreadResolutionContracts.md`).

## Missing (tracked gaps)

- `CLOSURE_REPORT__WF-TR-01.md` — no canonical closure on disk.
- `FIX_LOG__WF-TR-01.md` — no append-only fix log on disk.
- `LIVE_EXECUTIONS__WF-TR-01.md` — no live run proof log on disk.

These gaps are enumerated in `../state/STATE__WF-TR-01.json` → `missing`.
