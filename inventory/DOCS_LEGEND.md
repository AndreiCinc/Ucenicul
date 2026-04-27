# inventory/ DOCS LEGEND

> Quick-reference legend for the narrative / delta documents that live in `inventory/`.
> Created during the 2026-04-19 closure pass to satisfy optional improvement O-01 from `DOCUMENT_STRUCTURE_DOUBLE_CHECK.md`.

## Narrative / delta documents

| File | Role | When produced | Granularity |
|---|---|---|---|
| `final_reorganization_report.md` | **Full report** of the dual-root reconciliation — what moved, what was deduped, what was archived. | First produced at end of the reorganization pass. | Repo-wide, prose + tables. |
| `FINAL_CLOSURE_DELTA.md` | **Closure delta** after the initial reorganization — lists the final resolved state vs the reorganization plan. Think of it as the "what actually shipped vs the plan". | After the reorganization report, before the polish pass. | Repo-wide, delta-only. |
| `FINAL_POLISH_DELTA.md` | **Polish delta** recording cosmetic / navigation improvements applied after closure. Not a re-reorganization — a smaller round of README rewrites and cross-reference fixes. | After closure. | Local edits only. |
| `DOCUMENT_STRUCTURE_DOUBLE_CHECK.md` | **Structural audit** of the final tree — the "does the structure hold up?" pass. Identifies F-01..F-08 fixes. | After polish delta. | Structure-only, no content audit. |
| `DOCUMENT_STRUCTURE_DOUBLE_CHECK_POST_FIX.md` | **Re-audit** after F-01..F-08 were applied. States whether structure is canonical. | After F-01..F-08 fixes. | Structure-only. |
| `DOCUMENT_STRUCTURE_FIXES_DELTA.md` | **Change log** of F-01..F-08 fixes applied during the closure pass. | Alongside the post-fix audit. | Local edits only. |

## Machine-readable audit artifacts

These are consumed by scripts, not humans:

| File | Role |
|---|---|
| `source_root_a_inventory*.json` | Inventory of source-A root (initial and rescan). |
| `source_root_b_inventory*.json` | Inventory of source-B root (initial and rescan). |
| `unified_inventory.json` | Merged unified inventory. |
| `claude_pipeline_manifest.json` | Manifest for `.claude/pipelines/...` content. |
| `workflow_manifest.json` | Per-workflow manifest. |
| `root_files_manifest.json` | Repo-root file manifest. |
| `move_plan.json` | Planned file moves. |
| `relocation_log.json` | Actual file moves executed. |
| `manifest_sync_diff.json` | Diff between plan and execution. |
| `rescan_diff.json` | Diff between initial and rescan inventories. |
| `duplicate_candidates.json` | Duplicate detection output. |
| `ambiguous_files.json` | Files whose destination was ambiguous. |
| `verification_report*.json` | Multi-pass verification output. |
| `final_consistency_audit*.json` | Final consistency checks (pre / post polish). |
| `final_cross_check_10pt.json` | Final 10-point structural cross-check. |
| `RECONCILIATION_STATE.json` | Overall reconciliation state snapshot. |

## Guidance

- If you want the **story** of how the reorg happened, read `final_reorganization_report.md`.
- If you want the **what-actually-shipped**, read `FINAL_CLOSURE_DELTA.md`.
- If you want the **cosmetic polish deltas**, read `FINAL_POLISH_DELTA.md`.
- If you want **"is the current structure canonical?"**, read `DOCUMENT_STRUCTURE_DOUBLE_CHECK_POST_FIX.md`.
- If you want the **change log for the F-01..F-08 fixes**, read `DOCUMENT_STRUCTURE_FIXES_DELTA.md`.
- If you want raw inventories, use the `.json` artifacts above.

These narrative files do **not** contradict each other; they are **time-ordered views** of the same reorganization. Do not try to merge them — each is a checkpoint.
