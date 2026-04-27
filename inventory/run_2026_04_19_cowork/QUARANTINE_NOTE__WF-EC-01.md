# QUARANTINE_NOTE__WF-EC-01

reason:
  Cowork mount exposes `workflows/WF-EC-01_Execution_Context/` as a cloud-only placeholder; contents cannot be read or written. Standard audit loop cannot execute.

dominant_blockers:
  - environmental: mount virtualization (see ENVIRONMENTAL_BLOCKER.md)
  - canonical workflow JSON absent in repo (audit §C)

evidence_summary:
  - live n8n: id `v9jih4jqeXpOJOiH`, active=yes, updatedAt 2026-04-18 21:08, 0 triggers (WORKFLOW_COVERAGE_AUDIT.md §B row 5)
  - known n8n meta.description drift ("adauga timestamp") — to be fixed n8n-side, not in repo
  - repo state: scaffold only

writes_attempted: 0

safe_next_step:
  Re-run from a filesystem where the `workflows/WF-EC-01_Execution_Context/` tree is materialised; then audit per `WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §2.2 STANDARD tier.
