# QUARANTINE_NOTE__WF-SU-01

reason:
  Cowork mount exposes the folder (whether named `WF-SU-01_Sub_Workflow/` or `WF-SU-01_State_Persistence_Updater/`) as a cloud-only placeholder; contents cannot be read or written. Naming-drift cannot be confirmed or reconciled. Standard audit loop cannot execute.

dominant_blockers:
  - environmental: mount virtualization (see ENVIRONMENTAL_BLOCKER.md)
  - canonical workflow JSON absent in repo (audit §C)
  - naming-drift rename (per audit §F.2) not verifiable

evidence_summary:
  - live n8n: id `ENiYNfL3ul8AmmCB`, name "WF-SU-01 State / Persistence Updater", active=yes, updatedAt 2026-04-18 12:44, 0 triggers (WORKFLOW_COVERAGE_AUDIT.md §B row 11)
  - repo state: scaffold only; FINAL_CANONICAL_BASELINE.md §6 uses corrected name; coverage audit still shows older name + staged rename manifest under `inventory/staged_rename_su01/` (that subfolder not visible in this mount)
  - promotion candidate to CRITICAL tier (state mutations, replay-guarded operations) per WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md §2.3 example

writes_attempted: 0

safe_next_step:
  Re-run from a filesystem where the folder contents and the `inventory/staged_rename_su01/` subfolder are materialised. First action on resume: `ls workflows/WF-SU-01_*` to resolve which name is current, then execute the rename step (or confirm it's already applied), then audit per STANDARD or CRITICAL tier depending on state contents.
