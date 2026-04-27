# inventory/

The audit trail for the 2026-04-19 dual-root reconciliation. Everything in this folder is generated — regenerating requires the `scripts/scan_sources.py` and `scripts/classify.py` scripts (kept in the session scratch).

| File | What it holds |
|---|---|
| `source_root_a_inventory.json` | Every file under PRODUCT_ROOT with sha256, size, mtime |
| `source_root_b_inventory.json` | Every file under CLAUDE_PIPELINE_ROOT |
| `unified_inventory.json` | Both roots + per-file classification |
| `workflow_manifest.json` | Files grouped by detected workflow |
| `claude_pipeline_manifest.json` | All pipeline assets |
| `root_files_manifest.json` | Files that go at REBUILT root |
| `duplicate_candidates.json` | SHA-256 duplicate groups + canonical choice |
| `ambiguous_files.json` | Files the classifier couldn't place confidently |
| `move_plan.json` | old_path → new_path with provenance, role, confidence, reason |
| `relocation_log.json` | Actual copy results (hash-before, hash-after, status) |
| `final_reorganization_report.md` | Human-readable final report (section A–K) |
