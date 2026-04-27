# Pipeline folder — structural layout

> **Note:** This file describes the *structural layout* of `.claude/pipelines/ucenicul-pipeline/` after the 2026-04-19 reorg.
> For the pipeline's *operating contract* (required read order, autonomy rules) see the canonical `README.md` in this directory.

## Why this file exists

When the 2026-04-19 dual-root reorganization completed, the pipeline source directory had its own `README.md` (the operating contract for Claude's autonomy pipeline) AND the builder auto-generated a structural `README.md` describing the reorg layout. Both files are kept — the canonical `README.md` is the operating contract; this `LAYOUT.md` holds the structural description.

## Folder map

| Subfolder | Content |
|---|---|
| `prompts/` | Numbered playbooks (`01_..21_*.md`), route map, sub-agent prompts (`n8n-reader.md`, `n8n-fixer.md`, `n8n-tester.md`) |
| `manifests/` | Active-stage state pointers — `STATE.json`, `CURRENT_STAGE.md`, and the generic `AUDIT_REPORT.md` / `BUILD_REPORT.md` / `CLOSURE_REPORT.md` / `FIX_LOG.md` |
| `notes/<WF-XX-01>/` | Per-workflow analyses, audits, reports, and stage docs produced by Claude while working on each workflow |
| `archive/` | Pipeline-scoped snapshots, pipeline-scoped workflow scratch, and internal runtime captures (NOT product artifacts) |

## Separation rule

Pipeline assets do **not** cross over into the product repo. When a file in the pipeline root is actually a canonical product artifact (e.g. a live n8n blueprint JSON or a full workflow source pack), it was **promoted** during the 2026-04-19 reconciliation — see `../../../inventory/move_plan.json` for every promotion, and `../../../inventory/unified_inventory.json#manual_adjustments` for the per-file decisions.

## Source provenance

All non-promoted files in this subtree originate byte-for-byte from the `.claude/ucenicul-pipeline/` source root on the host filesystem. Provenance (source_root, original_path, sha256) is recorded per file in `../../../inventory/unified_inventory.json`.
