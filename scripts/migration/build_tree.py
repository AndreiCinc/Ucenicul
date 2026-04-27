#!/usr/bin/env python3
"""Phase 3 builder — create canonical Ucenicul_REBUILT tree with READMEs."""
from __future__ import annotations

import json
from pathlib import Path

REBUILT = Path("/sessions/elegant-great-volta/mnt/Projects--Ucenicul/Ucenicul_REBUILT")
INV_DIR = Path("/sessions/elegant-great-volta/inventory")

WORKFLOWS = json.loads((INV_DIR / "workflow_manifest.json").read_text())["workflows"]


def ensure(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def write(path: Path, text: str) -> None:
    ensure(path.parent)
    path.write_text(text, encoding="utf-8")


def main() -> None:
    # Top-level folders
    top_dirs = [
        ".claude",
        ".claude/pipelines",
        ".claude/pipelines/ucenicul-pipeline",
        ".claude/pipelines/ucenicul-pipeline/prompts",
        ".claude/pipelines/ucenicul-pipeline/manifests",
        ".claude/pipelines/ucenicul-pipeline/notes",
        ".claude/pipelines/ucenicul-pipeline/archive",
        ".claude/skills",
        "docs",
        "docs/architecture",
        "docs/migration",
        "docs/product",
        "docs/operations",
        "docs/audits",
        "docs/archive",
        "workflows",
        "src",
        "src/brain",
        "src/shared",
        "src/parsers",
        "src/utils",
        "db",
        "db/schema",
        "db/migrations",
        "db/queries",
        "db/docs",
        "testing",
        "testing/unit",
        "testing/integration",
        "testing/e2e",
        "testing/fixtures",
        "scripts",
        "scripts/repo_maintenance",
        "scripts/migration",
        "scripts/validation",
        "scripts/workflow_shared",
        "inventory",
        "inventory/ambiguous_holding",
        "archive",
        "archive/deprecated",
        "archive/superseded",
        "archive/legacy_docs",
        "archive/legacy_workflows",
        "archive/pipeline_legacy",
        "archive/pycache",
    ]
    for d in top_dirs:
        ensure(REBUILT / d)

    # Workflow folders per manifest
    for wf_code, meta in WORKFLOWS.items():
        folder = meta["folder"]
        base = REBUILT / "workflows" / folder
        for sub in ("workflow", "docs", "sql", "tests", "assets", "reports", "scripts"):
            ensure(base / sub)

    # ---------- Root-level files ----------
    write(
        REBUILT / "PROJECT_MASTER.md",
        """# PROJECT_MASTER.md — Ucenicul

## Role of this document

This is the top-level navigation page for the Ucenicul repo after the 2026-04-19 dual-root reconciliation.

## Source roots reconciled

| Source | Host path | Role |
|---|---|---|
| PRODUCT_ROOT | `C:\\\\Users\\\\andre\\\\OneDrive\\\\Documents\\\\Claude\\\\Projects\\\\Ucenicul\\\\Ucenicul` | Product source of truth |
| CLAUDE_PIPELINE_ROOT | `C:\\\\Users\\\\andre\\\\OneDrive\\\\Documents\\\\Claude\\\\Projects\\\\Ucenicul\\\\.claude\\\\ucenicul-pipeline` | Claude orchestration / autonomy pipeline |

The two roots were reconciled but NOT merged. See `inventory/final_reorganization_report.md` for the full accounting.

## Top-level map

- `CLAUDE.md` — repo-level instructions for Claude (subordinate to architecture spec)
- `README.md` — human orientation
- `docs/architecture/` — authoritative architecture specs (Level 1 + Level 2)
- `docs/migration/` — migration plan
- `docs/operations/` — verification checklists, runbooks
- `docs/product/` — product-facing documentation
- `docs/audits/` — audit reports at repo scope
- `docs/archive/` — historical/deprecated docs
- `workflows/WF-*/` — per-workflow n8n blueprints + SQL + scripts + tests + docs
- `src/` — brain / shared / parsers / utils runtime code
- `db/` — schema / migrations / queries / docs
- `testing/` — unit / integration / e2e / fixtures
- `scripts/` — repo maintenance, migration helpers, validation, workflow-shared
- `.claude/pipelines/ucenicul-pipeline/` — Claude's orchestration pipeline (NOT product)
- `.claude/skills/` — per-repo skills if any
- `inventory/` — manifests and the reorganization audit trail
- `archive/` — superseded packs, legacy docs, legacy workflow snapshots

## Authority hierarchy (unchanged from pre-reorg)

1. `docs/architecture/Architecture_Spec_v3_Ucenicul.md` (HIGHEST)
2. `docs/migration/Migration_Plan_Ucenicul.md`
3. Level-2 subordinate specs under `docs/architecture/`
4. This file and `CLAUDE.md`
5. `README.md`
""",
    )

    write(
        REBUILT / "PROGRESS_LOG.md",
        """# PROGRESS_LOG.md

A human-readable running log of structural and architectural progress on the repo.

## 2026-04-19 — Dual-root reconciliation

- Sources: PRODUCT_ROOT (`Ucenicul\\Ucenicul`) + CLAUDE_PIPELINE_ROOT (`.claude\\ucenicul-pipeline`)
- Output: this `Ucenicul_REBUILT/` tree
- Manifests: `inventory/*.json`
- Report: `inventory/final_reorganization_report.md`

Summary: product source, pipeline source, and historical snapshots separated into their own top-level areas. No destructive deletes in this pass.
""",
    )

    write(
        REBUILT / "DECISIONS.md",
        """# DECISIONS.md

Records of architectural or structural decisions beyond what is captured in the specs.

## 2026-04-19 D-001 — Dual-root separation

Product root and Claude pipeline root are reconciled but NEVER merged. Pipeline assets stay under `.claude/pipelines/ucenicul-pipeline/` and only promote into `workflows/` or `docs/` when they are canonical product artifacts (e.g. live runtime n8n JSONs, RA-01/SU-01 source packs). Every promotion is logged in `inventory/move_plan.json` with a `reason`.

## 2026-04-19 D-002 — Canonical copy preference in duplicates

When a file exists in both roots (same sha256), the canonical copy is selected by role rank:
`workflow_owned < repo_root_owned < shared_technical < claude_pipeline_asset < ambiguous < archive`.
Non-canonical copies are routed to `archive/superseded/duplicates/` so no bytes are lost.

## 2026-04-19 D-003 — Previous restructure archived

`ucenicul_restructured_candidate/` (the prior single-root attempt) is archived in full under
`archive/superseded/ucenicul_restructured_candidate/` because it was built under a different assumption (one source, not two).
""",
    )

    # Copy the existing CLAUDE.md and README.md from product root at copy time (Phase 4 does the file copies).
    # Here we only create the structural README stubs below.

    # ---------- .claude/pipelines/ucenicul-pipeline README ----------
    write(
        REBUILT / ".claude" / "pipelines" / "ucenicul-pipeline" / "README.md",
        """# Ucenicul Pipeline (Claude autonomy pipeline)

This folder contains Claude's **execution and autonomy system** — distinct from the product source in `../../../`.

Source of these assets: `C:\\\\Users\\\\andre\\\\OneDrive\\\\Documents\\\\Claude\\\\Projects\\\\Ucenicul\\\\.claude\\\\ucenicul-pipeline`.

## Layout

| Subfolder | Content |
|---|---|
| `prompts/` | Numbered playbooks (`01_..21_*.md`), route map, sub-agent prompts (`n8n-reader.md`, `n8n-fixer.md`, `n8n-tester.md`) |
| `manifests/` | Active-stage state pointers — `STATE.json`, `CURRENT_STAGE.md`, and the generic `AUDIT_REPORT.md` / `BUILD_REPORT.md` / `CLOSURE_REPORT.md` / `FIX_LOG.md` |
| `notes/<WF-XX-01>/` | Per-workflow analyses, audits, reports, and stage docs produced by Claude while working on each workflow |
| `archive/` | Pipeline-scoped snapshots, pipeline-scoped workflow scratch, and internal runtime captures (NOT product artifacts) |

## Rule

Pipeline assets do NOT cross over into the product repo. When a file in the pipeline root is actually a canonical product artifact (e.g. a live n8n blueprint JSON or a full workflow source pack), it was **promoted** during the 2026-04-19 reconciliation — see `move_plan.json` for every promotion.
""",
    )

    write(
        REBUILT / ".claude" / "pipelines" / "ucenicul-pipeline" / "archive" / "README.md",
        "# Pipeline archive\n\nHolds pipeline-internal snapshots and pipeline-scoped workflow scratch. Not product artifacts. Do not promote without review.\n",
    )
    write(
        REBUILT / ".claude" / "pipelines" / "ucenicul-pipeline" / "notes" / "README.md",
        "# Pipeline notes\n\nPer-workflow analyses and intermediate reports from Claude's autonomy loop. Grouped by `WF-<CODE>-01/` subfolder when attributable.\n",
    )
    write(
        REBUILT / ".claude" / "pipelines" / "ucenicul-pipeline" / "prompts" / "README.md",
        "# Pipeline prompts / playbooks\n\nThe numbered 00–21 playbooks plus sub-agent prompts (`n8n-reader.md`, `n8n-fixer.md`, `n8n-tester.md`) that drive Claude's execution loop.\n",
    )
    write(
        REBUILT / ".claude" / "pipelines" / "ucenicul-pipeline" / "manifests" / "README.md",
        "# Pipeline manifests\n\nActive-stage state pointers. `STATE.json` is authoritative for `current_stage`. Generic reports (`AUDIT_REPORT.md` etc.) track the active stage only.\n",
    )

    # ---------- docs/ README ----------
    write(
        REBUILT / "docs" / "README.md",
        """# docs/

| Subfolder | Purpose |
|---|---|
| `architecture/` | Level-1 architecture spec + Level-2 subordinate specs (module specs, registry, thread resolution, memory model, n8n mapping) |
| `migration/` | Migration plan and migration-specific notes |
| `product/` | Product-facing documentation (placeholders at this stage) |
| `operations/` | Verification checklists, runbooks, operational procedures |
| `audits/` | Repo-wide audit reports |
| `archive/` | Deprecated or superseded docs that are no longer authoritative |

Authority: `architecture/Architecture_Spec_v3_Ucenicul.md` > `migration/Migration_Plan_Ucenicul.md` > Level-2 specs > `CLAUDE.md` > `README.md`.
""",
    )

    # ---------- workflows/ README ----------
    wf_list = "\n".join(
        f"- [{wf}](./{meta['folder']}/) — {meta['file_count']} files" for wf, meta in sorted(WORKFLOWS.items())
    )
    write(
        REBUILT / "workflows" / "README.md",
        f"""# workflows/

One folder per workflow. Each `WF-<CODE>-01_<Name>/` contains:

| Subfolder | Content |
|---|---|
| `workflow/` | n8n blueprint JSONs (the canonical artifact) |
| `docs/` | node maps, connection maps, import patch plans, test matrices, stage docs, contracts, handoffs |
| `sql/` | workflow-specific SQL |
| `scripts/` | workflow-specific Python logic (plus `__pycache__/` if it was in the source; carried over for reproducibility) |
| `tests/` | test families + `results/` + fixtures (including TC-XX cases for WF-TR-01) |
| `reports/` | AUDIT / BUILD / CLOSURE / FIX_LOG / WORK_LOG / POST_IMPORT_AUDIT / REMEDIATION / TEST_REPORT / TEST_AFTER_IMPORT |
| `assets/` | reserved for UI assets, screenshots, other binaries |

Workflows present:

{wf_list}
""",
    )

    # ---------- Workflow per-folder READMEs ----------
    for wf_code, meta in WORKFLOWS.items():
        folder = meta["folder"]
        write(
            REBUILT / "workflows" / folder / "README.md",
            f"""# {folder}

Workflow code: **{wf_code}**

File count from 2026-04-19 reconciliation: {meta['file_count']}.

## Layout

- `workflow/` — n8n blueprint JSONs
- `docs/` — node maps, connection maps, stage docs, contracts, handoffs
- `sql/` — workflow-specific SQL
- `scripts/` — workflow-specific Python logic
- `tests/` — test families, fixtures, results
- `reports/` — AUDIT / BUILD / CLOSURE / FIX_LOG / WORK_LOG / POST_IMPORT_AUDIT / REMEDIATION / TEST_REPORT / TEST_AFTER_IMPORT
- `assets/` — reserved

## Provenance

Files in this folder came from the product root `workflows/` tree and — where applicable — from pipeline source packs or live runtime JSON captures. See `inventory/move_plan.json` for exact provenance per file.
""",
        )

    # ---------- src/ README ----------
    write(
        REBUILT / "src" / "README.md",
        """# src/

Runtime source code. Separated by concern:

- `brain/` — intent classification + field validation (governed by `brain_contract.json`)
- `shared/` — cross-module utilities and constants
- `parsers/` — message parsers
- `utils/` — low-level helpers

Note: at the 2026-04-19 reconciliation, no classified source files were attributed to `src/` yet. Subfolders exist as scaffolding for ongoing migration.
""",
    )

    # ---------- db/ README placeholder if missing ----------
    write(
        REBUILT / "db" / "docs" / "README.md",
        "# db/docs\n\nReserved for per-table documentation and ERDs. At reorg time the only db docs were top-level READMEs.\n",
    )
    write(
        REBUILT / "db" / "migrations" / "README.md",
        "# db/migrations\n\nReserved for schema migrations. At reorg time migrations were not yet colocated here (they live under the parent repo `migrations/` folder, outside PRODUCT_ROOT).\n",
    )
    write(
        REBUILT / "db" / "queries" / "README.md",
        "# db/queries\n\nReserved for canonical named queries. Empty at reorg time.\n",
    )

    # ---------- testing/ README ----------
    write(
        REBUILT / "testing" / "README.md",
        """# testing/

Repo-wide test scaffolding. Workflow-scoped tests live under `workflows/WF-*/tests/`.

- `unit/` — unit tests (placeholder)
- `integration/` — integration tests across modules (placeholder)
- `e2e/` — end-to-end scenarios (placeholder)
- `fixtures/` — shared fixtures. Currently holds `setup_test_data.sql` promoted from `workflows/fixtures/setup_test_data.sql` because it was cross-workflow rather than WF-specific.
""",
    )

    # ---------- scripts/ README ----------
    write(
        REBUILT / "scripts" / "README.md",
        """# scripts/

| Subfolder | Purpose |
|---|---|
| `repo_maintenance/` | Repo hygiene scripts |
| `migration/` | One-off migration helpers |
| `validation/` | Validation helpers |
| `workflow_shared/` | Shared workflow tooling: `generate_fixtures.js`, `lint_workflow.js`, `validate_contract.js`, `validate_scoring.js`, `verify_replay.js`, `test_all.sh` |

At the 2026-04-19 reorg, only `workflow_shared/` was populated (from `workflows/scripts/*.{js,sh}` in PRODUCT_ROOT).
""",
    )

    # ---------- inventory/ README ----------
    write(
        REBUILT / "inventory" / "README.md",
        """# inventory/

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
""",
    )

    # ---------- archive/ README ----------
    write(
        REBUILT / "archive" / "README.md",
        """# archive/

Historical material preserved during the 2026-04-19 reconciliation. **Nothing here is destructive** — every file can be traced back to its original path via `inventory/move_plan.json`.

| Subfolder | Content |
|---|---|
| `superseded/` | The previous single-root restructure attempt (`ucenicul_restructured_candidate/`) + byte-identical duplicate copies |
| `legacy_docs/` | `docs/ucenicul_claude_handoff_hardened/` snapshots |
| `legacy_workflows/` | Nested source packs inside `workflows/` (e.g. `wf-pl-01_full_source_pack/`) |
| `pipeline_legacy/` | Legacy material from pipeline root that is not canonical product |
| `pycache/` | `__pycache__/` trees carried over for reproducibility (not source) |
| `deprecated/` | Reserved |
""",
    )

    # Ambiguous holding README
    write(
        REBUILT / "inventory" / "ambiguous_holding" / "README.md",
        "# Ambiguous holding\n\nFiles that the classifier could not confidently place. Require human review. Each file is placed under its source-root subfolder.\n",
    )

    print("Tree created at", REBUILT)


if __name__ == "__main__":
    main()
