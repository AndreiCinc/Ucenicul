# RESTRUCTURE_DECISIONS.md

This document records the classification rules applied during this restructuring pass, the edge cases encountered, and the specific placement decisions for ambiguous files.

## 1. Classification rules applied

Every source file was classified into exactly one of four placement classes:

1. **`common`** — governs the whole architecture or all workflows.
2. **`workflow_specific`** — clearly tied to one workflow stage (`WF-XX-YY`).
3. **`archive`** — historical, superseded, duplicate, or closure-snapshot content.
4. **`unresolved`** — genuinely ambiguous placement.

Classification heuristics (in order of precedence):

- **Explicit workflow code in filename or path** (`WF-XX-YY`) → `workflows/WF-XX-YY/`.
- **Explicit workflow stage-number prefix inside the handoff directory** (e.g. `06_STAGE_WF-EC-01.md`, `07_STAGE_WF-PL-01.md`, `08_STAGE_WF-DI-01.md`, `09_STAGE_WF-ME-01.md`) → `workflows/WF-XX-YY/docs/`.
- **Architecture + migration authority docs** under `docs/` → `common/architecture/`.
- **Module-spec contracts + repo-level CLAUDE.md + cross-cutting playbooks** (handoff files 01–08, 11–13, 16, 17-template) → `common/contracts/`.
- **Runtime / module / execution-context / response-composer contract docs** (handoff files 18–21) → `common/runtime/`.
- **Stage template + report templates + documentation checklist** → `common/shared_reports/`.
- **Cross-workflow test utilities + fixture registry** → `common/shared_test_utils/`.
- **Original READMEs + file scorecard + unsuffixed root ROUTE_MAP** → `common/historical_reference/`.
- **Closure snapshots** (`docs/ucenicul_claude_handoff_hardened/archive/WF-XX-YY_closure_snapshot/`) → `archive/historical_snapshots/WF-XX-YY_closure_snapshot/`.
- **Nested duplicate source packs** → `archive/superseded_packs/…`.
- **Root-level unsuffixed active-stage pointers** → `archive/historical_snapshots/root_generic_active_stage_pointers/` (see §3 for rationale).

## 2. Workflow-folder internal shape

Each `workflows/WF-XX-YY/` has the same shape:

- `docs/` — stage doc, route-map, stage-lock, connection map, node map, import patch plan, test matrix (if any), MCP technical sheet, handoff docs.
- `workflow/` — n8n blueprint JSONs.
- `sql/` — workflow-specific SQL.
- `scripts/` — workflow-specific Python logic (plus `__pycache__/` preserved).
- `tests/` — `test_families.py` and `results/` (plus `__pycache__/` where it exists in source).
- `reports/` — AUDIT / BUILD / CLOSURE / CURRENT_STAGE / FIX_LOG / STATE per workflow, plus post-import audits and remediation / test reports.
- `assets/` — reserved; empty this pass.

## 3. Edge cases and ambiguous placement decisions

### 3.1 Root-level generic active-stage pointers

The following files exist at `docs/ucenicul_claude_handoff_hardened/` **unsuffixed** and also exist with `__WF-XX-YY` suffixes for each closed workflow:

- `AUDIT_REPORT.md`
- `BUILD_REPORT.md`
- `CLOSURE_REPORT.md`
- `CURRENT_STAGE.md`
- `FIX_LOG.md`
- `STATE.json`

The unsuffixed files are the "currently active" generic pointers. `STATE.json.current_stage = "WF-ME-01"` says those generics correspond to WF-ME-01. The task instruction:

> "All active-stage generic files … place copies in the workflow folder they currently belong to if clearly attributable, and also document their original root-level role in inventory notes."

**Conflict:** `workflows/WF-ME-01/reports/` already contains the fully suffixed counterparts (`AUDIT_REPORT__WF-ME-01.md`, …). Placing the unsuffixed versions there would create filename ambiguity that the safety rules explicitly forbid resolving by renaming or merging.

**Decision:** placed the unsuffixed generics in `archive/historical_snapshots/root_generic_active_stage_pointers/`. This preserves every byte, avoids collision, and records the original root-level role in `RESTRUCTURE_INVENTORY.md`. A reviewer may promote them into `workflows/WF-ME-01/reports/` under a new filename convention.

### 3.2 Cross-workflow handoff

`workflows/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md` closes the WF-TR-01 reply-linkage gap *and* kicks off WF-EC-01. Its content references both workflows heavily (see the first H1 — "WF-TR-01 Close-out + WF-EC-01 Execution Context Init Kickoff").

**Decision:** copied to **both** workflows.

- Primary: `workflows/WF-TR-01/docs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md`.
- Cross-copy: `workflows/WF-EC-01/docs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16__cross_copy.md`.

Both files are byte-for-byte identical to the source. The `__cross_copy` suffix only appears in the target placement filename to flag the duplication to reviewers.

### 3.3 `WF-TR-01_PATCHED_switch_fix.json` vs `WF-TR-01_Thread_Resolver.json`

Both live at the top of `workflows/` in the source. The `_PATCHED_` suffix suggests a remediation variant. Without running the blueprints, it is not safe to declare one canonical.

**Decision:** both placed in `workflows/WF-TR-01/workflow/`. A reviewer selects canonical; `archive/` reserved for the loser.

### 3.4 Nested duplicate OR-01 pack

`docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/` is an entire nested duplicate of an OR-01 source pack (with `or_logic.py`, SQL, tests, WF-OR-01 JSONs, etc.). The top-level `workflows/` folder has its own OR-01 copies.

**Decision:** nested pack → `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/`, under the assumption that the top-level `workflows/` copies are canonical (confirmed by the fact that OR-01 has its own closure snapshot at `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/`). Reviewer confirmation recommended.

### 3.5 WF-PL-01 full source pack

`workflows/wf-pl-01_full_source_pack/` is the shipped pack (has its own `README_APPLY_FIRST.md`). It overlaps with top-level `workflows/` PL-01 files.

**Decision:** full pack → `archive/superseded_packs/wf-pl-01_full_source_pack/`. The top-level `workflows/` PL-01 files remain the primary PL-01 copy under `workflows/WF-PL-01/`. Reviewer confirmation recommended.

### 3.6 db/README.md + db/schema/README.md

The repo root has a `db/` directory with only two README files. Per `CLAUDE.md`, these are the source of truth for "DB schema (implemented)". Since the restructure model does not have a `common/db/` folder in its default scaffold, these were placed under `common/architecture/` with disambiguating filenames:

- `db/README.md` → `common/architecture/db_README.md`
- `db/schema/README.md` → `common/architecture/db_schema_README.md`

This is the only place filenames were changed. The rename exists purely to preserve placement clarity (two files named `README.md` at the same target level would collide). The file contents are unchanged.

### 3.7 Repo-root README.md + handoff hardened README.md

To avoid collisions with folder-level `README.md` files in the target tree:

- Repo root `README.md` → `common/historical_reference/repo_root_README.md`.
- `docs/ucenicul_claude_handoff_hardened/README.md` → `common/historical_reference/handoff_hardened_README.md`.

Again, content is unchanged; only the target filename differs.

### 3.8 `00_ROUTE_MAP.md` (generic root)

Unsuffixed ROUTE_MAP at `docs/ucenicul_claude_handoff_hardened/`. Not the same file as any workflow-specific activated / closed variant.

**Decision:** `common/historical_reference/00_ROUTE_MAP__generic_root.md` (renamed only for placement clarity).

### 3.9 `__pycache__/*.pyc` files

Compiled Python artifacts. Preserved verbatim in each matching target `scripts/__pycache__/` or `tests/__pycache__/` location. Not separately archived, not stripped.

### 3.10 `workflows/fixtures/setup_test_data.sql`

Generic test-data setup SQL, not tied to a single workflow stage. Some TR-01 test-case fixtures sit next to it, but `setup_test_data.sql` covers shared test setup.

**Decision:** `common/shared_test_utils/setup_test_data.sql`. The TR-01 `TC-01.json` … `TC-16.json` fixtures are instead placed with the TR-01 workflow (see §3.11).

### 3.11 TC-01 … TC-16 fixture JSONs

Named `TC-01_Explicit_thread_reference.json`, `TC-02_Direct_reply_linkage.json`, etc. All describe Thread-Resolution test cases.

**Decision:** `workflows/WF-TR-01/tests/`. These are TR-01-specific.

### 3.12 `workflows/scripts/test_all.sh`, `generate_fixtures.js`, `lint_workflow.js`, `validate_contract.js`, `validate_scoring.js`, `verify_replay.js`

Generic cross-workflow scripts.

**Decision:** `common/shared_test_utils/`.

## 4. Files intentionally sent to `unresolved/`

**None.** Every source file could be classified with reasonable confidence. The `unresolved/` scaffold is retained for reviewer use if any of the decisions above are rejected.

## 5. Files intentionally sent to `archive/`

- All contents of `docs/ucenicul_claude_handoff_hardened/archive/WF-EC-01_closure_snapshot/` → `archive/historical_snapshots/WF-EC-01_closure_snapshot/`.
- All contents of `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/` → `archive/historical_snapshots/WF-OR-01_closure_snapshot/`.
- All contents of `docs/ucenicul_claude_handoff_hardened/ucenicul_claude_handoff_hardened/` → `archive/superseded_packs/wf-or-01_handoff_nested_source_pack/`.
- All contents of `workflows/wf-pl-01_full_source_pack/` → `archive/superseded_packs/wf-pl-01_full_source_pack/`.
- Root-level generic active-stage pointers (see §3.1) → `archive/historical_snapshots/root_generic_active_stage_pointers/`.

## 6. Files intentionally sent to `common/`

Listed fully in each `common/<subfolder>/README.md`. Summary:

- `architecture/`: 6 architecture docs + 2 renamed db READMEs.
- `contracts/`: 15 files (repo-root `CLAUDE.md`, 5 module specs, thread-resolution contracts, plus handoff files 01–08, 11–13, 16, 17-template).
- `runtime/`: 4 handoff files (18–21).
- `shared_reports/`: 3 files (doc-verification checklist, stage template, report template).
- `shared_test_utils/`: 8 files (test-fixture registry + 6 scripts + `setup_test_data.sql`).
- `historical_reference/`: 4 files (repo root README, handoff README, file scorecard, generic ROUTE_MAP).

## 7. Names changed (for placement clarity only)

These are the only target-side filename changes. All target contents are byte-for-byte identical to source contents.

| Original path | Target filename |
|---|---|
| `db/README.md` | `common/architecture/db_README.md` |
| `db/schema/README.md` | `common/architecture/db_schema_README.md` |
| `README.md` (repo root) | `common/historical_reference/repo_root_README.md` |
| `docs/ucenicul_claude_handoff_hardened/README.md` | `common/historical_reference/handoff_hardened_README.md` |
| `docs/ucenicul_claude_handoff_hardened/00_ROUTE_MAP.md` | `common/historical_reference/00_ROUTE_MAP__generic_root.md` |
| `workflows/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16.md` (cross-copy) | `workflows/WF-EC-01/docs/HANDOFF_WF-TR-02_EC_Init_Kickoff_2026-04-16__cross_copy.md` |
