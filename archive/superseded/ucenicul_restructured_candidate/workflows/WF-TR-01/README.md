# workflows/WF-TR-01/ — Thread Resolver

**Status (based on existing source docs): active / remediated.** The original repo contains a full remediation report, audit addendum, and test report.

## Contents
- `workflow/` — n8n blueprint JSONs (`WF-TR-01_Thread_Resolver.json`, `WF-TR-01_PATCHED_switch_fix.json`).
- `docs/` — MCP technical sheet, import doc, and the `HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md` that closes out TR-01 and kicks off EC-01.
- `sql/` — `MIGRATION_messages_for_WF-TR-01.sql`.
- `tests/` — TC-01…TC-16 fixture JSONs (from `workflows/fixtures/`).
- `reports/` — audit, audit addendum, remediation, test-after-import, test report.
- `scripts/`, `assets/` — empty here; populated in other workflows.

## Warning
This folder is a reorganized copy. It is NOT a new source of truth. The canonical thread-resolution authority remains `common/architecture/Thread_Resolution_Spec.md` + `common/contracts/ThreadResolutionContracts.md`.
