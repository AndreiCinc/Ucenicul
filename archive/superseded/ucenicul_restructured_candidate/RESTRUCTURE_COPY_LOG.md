# RESTRUCTURE_COPY_LOG.md

> Audit log of every folder and file created in `ucenicul_restructured_candidate/`.
>
> - Source repo: read-only. No source file was modified, renamed, moved, or deleted.
> - Target repo: write-only. All entries below sit under `ucenicul_restructured_candidate/`.
> - Every copied file is byte-for-byte identical to its source counterpart.

## Folders created (in target, top-down)

Total: 110

```
.   (root: ucenicul_restructured_candidate/)
archive
archive/deprecated_docs
archive/historical_snapshots
archive/historical_snapshots/WF-EC-01_closure_snapshot
archive/historical_snapshots/WF-OR-01_closure_snapshot
archive/historical_snapshots/root_generic_active_stage_pointers
archive/legacy_root
archive/superseded_packs
archive/superseded_packs/wf-or-01_handoff_nested_source_pack
archive/superseded_packs/wf-pl-01_full_source_pack
archive/superseded_packs/wf-pl-01_full_source_pack/docs
archive/superseded_packs/wf-pl-01_full_source_pack/docs/ucenicul_claude_handoff_hardened
archive/superseded_packs/wf-pl-01_full_source_pack/workflows
archive/superseded_packs/wf-pl-01_full_source_pack/workflows/scripts
archive/superseded_packs/wf-pl-01_full_source_pack/workflows/scripts/pl
archive/superseded_packs/wf-pl-01_full_source_pack/workflows/scripts/pl/__pycache__
archive/superseded_packs/wf-pl-01_full_source_pack/workflows/sql
archive/superseded_packs/wf-pl-01_full_source_pack/workflows/sql/pl
archive/superseded_packs/wf-pl-01_full_source_pack/workflows/tests
archive/superseded_packs/wf-pl-01_full_source_pack/workflows/tests/pl
archive/superseded_packs/wf-pl-01_full_source_pack/workflows/tests/pl/results
common
common/architecture
common/contracts
common/historical_reference
common/runtime
common/shared_reports
common/shared_test_utils
unresolved
unresolved/ambiguous_files
unresolved/manual_review_needed
unresolved/unknown_placement
workflows
workflows/WF-DI-01
workflows/WF-DI-01/assets
workflows/WF-DI-01/docs
workflows/WF-DI-01/reports
workflows/WF-DI-01/scripts
workflows/WF-DI-01/scripts/__pycache__
workflows/WF-DI-01/sql
workflows/WF-DI-01/tests
workflows/WF-DI-01/tests/results
workflows/WF-DI-01/workflow
workflows/WF-EC-01
workflows/WF-EC-01/assets
workflows/WF-EC-01/docs
workflows/WF-EC-01/reports
workflows/WF-EC-01/scripts
workflows/WF-EC-01/scripts/__pycache__
workflows/WF-EC-01/sql
workflows/WF-EC-01/tests
workflows/WF-EC-01/tests/results
workflows/WF-EC-01/workflow
workflows/WF-ME-01
workflows/WF-ME-01/assets
workflows/WF-ME-01/docs
workflows/WF-ME-01/reports
workflows/WF-ME-01/scripts
workflows/WF-ME-01/scripts/__pycache__
workflows/WF-ME-01/sql
workflows/WF-ME-01/tests
workflows/WF-ME-01/tests/results
workflows/WF-ME-01/workflow
workflows/WF-OR-01
workflows/WF-OR-01/assets
workflows/WF-OR-01/docs
workflows/WF-OR-01/reports
workflows/WF-OR-01/scripts
workflows/WF-OR-01/scripts/__pycache__
workflows/WF-OR-01/sql
workflows/WF-OR-01/tests
workflows/WF-OR-01/tests/__pycache__
workflows/WF-OR-01/tests/results
workflows/WF-OR-01/workflow
workflows/WF-PL-01
workflows/WF-PL-01/assets
workflows/WF-PL-01/docs
workflows/WF-PL-01/reports
workflows/WF-PL-01/scripts
workflows/WF-PL-01/scripts/__pycache__
workflows/WF-PL-01/sql
workflows/WF-PL-01/tests
workflows/WF-PL-01/tests/__pycache__
workflows/WF-PL-01/tests/results
workflows/WF-PL-01/workflow
workflows/WF-RA-01
workflows/WF-RA-01/assets
workflows/WF-RA-01/docs
workflows/WF-RA-01/reports
workflows/WF-RA-01/scripts
workflows/WF-RA-01/sql
workflows/WF-RA-01/tests
workflows/WF-RA-01/workflow
workflows/WF-RC-01
workflows/WF-RC-01/assets
workflows/WF-RC-01/docs
workflows/WF-RC-01/reports
workflows/WF-RC-01/scripts
workflows/WF-RC-01/sql
workflows/WF-RC-01/tests
workflows/WF-RC-01/workflow
workflows/WF-TR-01
workflows/WF-TR-01/assets
workflows/WF-TR-01/docs
workflows/WF-TR-01/reports
workflows/WF-TR-01/scripts
workflows/WF-TR-01/sql
workflows/WF-TR-01/tests
workflows/WF-TR-01/workflow
```

## Files copied (source relative → target relative)

Total source → target mappings recorded: 340

See `RESTRUCTURE_INVENTORY.md` for the full table with classifications. A condensed count per bucket is:

- archive/: 107
- common/: 46
- workflows/: 187

## Collisions handled

| # | Collision description | Resolution |
|---|---|---|
| 1 | Root-level generic active-stage pointers (`AUDIT_REPORT.md`, `BUILD_REPORT.md`, `CLOSURE_REPORT.md`, `CURRENT_STAGE.md`, `FIX_LOG.md`, `STATE.json`) would collide with the suffixed WF-ME-01 set if placed in `workflows/WF-ME-01/reports/`. | Placed into `archive/historical_snapshots/root_generic_active_stage_pointers/` (distinct path; no filename change). |
| 2 | Four files named `README.md` in the source repo would collide when placed under `common/` without disambiguation (`README.md` repo-root, `docs/ucenicul_claude_handoff_hardened/README.md`, `db/README.md`, `db/schema/README.md`). | Target filenames disambiguated (e.g. `repo_root_README.md`, `handoff_hardened_README.md`, `db_README.md`, `db_schema_README.md`). Source content unchanged. |
| 3 | Generic `00_ROUTE_MAP.md` at the handoff root would collide with the suffixed per-workflow route maps. | Placed in `common/historical_reference/` with target filename `00_ROUTE_MAP__generic_root.md`. |
| 4 | `HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md` spans two workflows. | Primary copy in `workflows/WF-TR-01/docs/`, cross-copy in `workflows/WF-EC-01/docs/` with `__cross_copy` suffix. Both copies are byte-for-byte identical to source. |

## Skipped files

**None.** Every source file was mirrored into the target tree. Zero skips.
