# RESTRUCTURE_MANIFEST.md

## Goal

Create a NEW parallel repository structure for the Ucenicul project, intended only for cleanup, inventory, and clearer separation of workflow ownership. Strictly non-destructive. No refactor. No content rewrite.

## Safety rules followed

- No existing file was deleted.
- No original file was renamed in place.
- No original file was moved in place.
- No file contents were modified.
- No markdown / JSON / SQL / Python was rewritten, reformatted, or "improved."
- No versions were updated. No typos fixed. No files merged, split, or deduplicated by editing.
- Secrets were not touched. No invented content was added.
- Git history was not mutated.
- All new content exists **only** in the target tree under `ucenicul_restructured_candidate/`.

## Counts

| Metric | Value |
|---|---|
| Total folders created in target | **110** |
| Total files in target tree | **308** |
| Byte-for-byte copies of source files | **279** (278 source files; `HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md` copied to both WF-TR-01 and WF-EC-01) |
| New README files authored | **24** |
| New root manifest / inventory / decisions / copy-log files authored | **5** (`README.md`, `RESTRUCTURE_MANIFEST.md`, `RESTRUCTURE_INVENTORY.md`, `RESTRUCTURE_DECISIONS.md`, `RESTRUCTURE_COPY_LOG.md`) |
| Source files classified | **278 / 278** (100 % covered, 0 unresolved) |
| Files sent to `common/` | **46** (39 copied + 7 new READMEs) |
| Files sent to `workflows/` | **168** (160 copied + 8 new workflow READMEs) |
| Files sent to `archive/` | **78** (73 copied + 5 new READMEs) |
| Files sent to `unresolved/` | **4** (all new READMEs; zero source files classified unresolved) |
| Collisions handled | **1** (root-level generic active-stage pointers vs. WF-ME-01 suffixed copies) |
| Skipped files | **0** |

Unique source content hashes: **245**. All 245 unique hashes are present in the target tree. Some source files have identical content to each other (e.g. test-results snapshots that also exist inside the PL-01 full source pack); in those cases every original file path is still recorded and preserved on disk.

## Source-untouched confirmation

Source path checked: `/sessions/lucid-sharp-gates/mnt/Ucenicul/` (excluding the newly created `ucenicul_restructured_candidate/` subfolder).

The source contains **278 files in 58 directories** (unchanged). A spot-check of four canonical source files matched expected MD5 hashes after the restructure completed:

| Source file | MD5 after restructure |
|---|---|
| `README.md` | `4f810f33ab446339f7a4d786c8d10f5d` |
| `CLAUDE.md` | `da7b0a308d8e90d01840480a7369d727` |
| `docs/Architecture_Spec_v3_Ucenicul.md` | `36d29c86174ba8fe390a23b083234f08` |
| `docs/ucenicul_claude_handoff_hardened/STATE.json` | `59bec270293e0fbab1bc2486d59e6819` |

No source write or delete operations were performed. The entire target tree is created inside the workspace **as a new top-level subfolder** named `ucenicul_restructured_candidate/`. No pre-existing repo file paths were touched.

## Workflow-by-workflow summary

| Workflow | Target file count | Status per existing source docs |
|---|---|---|
| `WF-TR-01` (Thread Resolver) | 30 | Active / remediated. Remediation + audit addendum + test report on disk. |
| `WF-EC-01` (Execution Context Init) | 20 | Closed. Closure snapshot preserved in `archive/historical_snapshots/WF-EC-01_closure_snapshot/`. |
| `WF-OR-01` (Orchestrator Input Handoff) | 27 | Closed. Closure snapshot preserved in `archive/historical_snapshots/WF-OR-01_closure_snapshot/`. Duplicate OR-01 pack preserved in `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/`. |
| `WF-PL-01` (Plan Generation) | 27 | Closed. Full original source pack also preserved byte-for-byte in `archive/superseded_packs/wf-pl-01_full_source_pack/`. |
| `WF-DI-01` (Dispatcher) | 29 | Closed. Both ACTIVATED and CLOSED route-map / stage-lock variants retained. |
| `WF-ME-01` (Module Execution Adapter) | 33 | Most-recently-closed. `STATE__WF-ME-01.json` reports 10/10 closure on v1.3 cross-tenant-guard. |
| `WF-RA-01` (Result Aggregator) | 1 | Planned. Scaffolded empty; only the folder README was authored. `STATE__WF-ME-01.json.next_path_label = wf_ra_01_candidate_active`. |
| `WF-RC-01` (Response Composer) | 1 | Planned. Scaffolded empty; only the folder README was authored. Referenced in `21_RESPONSE_COMPOSER_CONTRACT.md`. |

## Highest-risk ambiguous placements (for human review)

These placements were made by best-effort classification and are the most likely to merit reviewer attention:

1. **Root-level generic active-stage pointers** (unsuffixed `AUDIT_REPORT.md`, `BUILD_REPORT.md`, `CLOSURE_REPORT.md`, `CURRENT_STAGE.md`, `FIX_LOG.md`, `STATE.json` under `docs/ucenicul_claude_handoff_hardened/`). The task's special rule asks these to be placed in the workflow folder they currently belong to "if clearly attributable." `STATE.json.current_stage` reports `"WF-ME-01"`, but the handoff directory already contains a full set of `__WF-ME-01`-suffixed counterparts. To avoid filename collisions without merging or deduplicating, the generics were placed in `archive/historical_snapshots/root_generic_active_stage_pointers/` with inventory notes recording their original root-level role. **Reviewer decision needed** on whether to promote these into `workflows/WF-ME-01/reports/` with an explicit renaming convention.

2. **`HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md`** spans two workflows (closes WF-TR-01 reply-linkage gap; kicks off WF-EC-01). It was copied twice: primary copy in `workflows/WF-TR-01/docs/`, cross-copy in `workflows/WF-EC-01/docs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16__cross_copy.md`. **Reviewer decision needed** on which one should be considered primary if the two are ever reunified.

3. **`WF-TR-01_PATCHED_switch_fix.json`** is a patched variant of the main TR-01 blueprint. It is filed alongside the main blueprint in `workflows/WF-TR-01/workflow/`. **Reviewer decision needed** on which JSON is canonical and whether the patched one should move to `archive/`.

4. **Nested duplicate OR-01 source pack** under `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/` was classified `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/`. This classification assumes the top-level `workflows/WF-OR-01/` material supersedes it. **Reviewer decision needed** if the nested pack is in fact newer.

5. **WF-PL-01 full source pack** at `workflows/wf-pl-01_full_source_pack/` was classified `archive/superseded_packs/wf-pl-01_full_source_pack/` on the assumption the top-level `workflows/` files supersede it. Given PL-01 is closed, this is probably correct; **reviewer confirmation recommended.**

6. **`common/` placement of cross-cutting handoff docs** (`01_MASTER_OPERATING_CONTRACT.md`, `02_AGENT_REGISTRY.md`, `03_EXECUTION_LOOP.md`, `04_N8N_MCP_PLAYBOOK.md`, etc.) is based on their cross-workflow scope. All live under `common/contracts/`. A reviewer may prefer `common/runtime/` for some of them (specifically those describing execution loop / playbook semantics). No substantive harm either way — content is preserved verbatim.

## Status

- Source repo untouched: **confirmed**.
- Target tree fully populated: **confirmed**.
- Unresolved items: **0**.
- Skipped files: **0**.
- Silent omissions: **none** (every unique source MD5 is present in the target; every source relative path is recorded in `RESTRUCTURE_INVENTORY.md`).
- Ready for human review: **yes**.

> This folder is **candidate restructuring**, not an adopted migration. The original repo continues to operate from its original paths. Adoption of this layout is a separate human decision.
