# QUARANTINE_NOTE__WF-PL-01

reason:
  Cowork mount exposes `workflows/WF-PL-01_Plan_Generation/` as a cloud-only placeholder; contents cannot be read or written. Standard audit loop cannot execute.

dominant_blockers:
  - environmental: mount virtualization (see ENVIRONMENTAL_BLOCKER.md)
  - canonical workflow JSON absent in repo (audit §C)

evidence_summary:
  - live n8n: id `RwToPLa1ErHl2tUi`, active=yes, updatedAt 2026-04-18 12:20, 1 trigger (WORKFLOW_COVERAGE_AUDIT.md §B row 7)
  - repo state: scaffold only

writes_attempted: 0

safe_next_step:
  Re-run from a filesystem where the `workflows/WF-PL-01_Plan_Generation/` tree is materialised; then audit per STANDARD tier.
