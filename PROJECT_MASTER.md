# PROJECT_MASTER.md — Ucenicul

## Role of this document

This is the top-level navigation page for the Ucenicul repo after the 2026-04-19 dual-root reconciliation.

## Source roots reconciled

| Source | Host path | Role |
|---|---|---|
| PRODUCT_ROOT | `C:\\Users\\andre\\OneDrive\\Documents\\Claude\\Projects\\Ucenicul\\Ucenicul` | Product source of truth |
| CLAUDE_PIPELINE_ROOT | `C:\\Users\\andre\\OneDrive\\Documents\\Claude\\Projects\\Ucenicul\\.claude\\ucenicul-pipeline` | Claude orchestration / autonomy pipeline |

The two roots were reconciled but NOT merged. See `inventory/final_reorganization_report.md` for the full accounting.

## Top-level map

Status legend: **populated** = contains canonical content • **scaffolded** = structure in place, content to come • **audit-only** = only inventory / audit artifacts • **obsolete** = vestigial, do not use.

| Path | Role | Status at 2026-04-19 closure |
|---|---|---|
| `CLAUDE.md` | Repo-level instructions for Claude (subordinate to architecture spec) | populated |
| `README.md` | Human orientation | populated |
| `PROJECT_MASTER.md` | Top-level navigation (this file) | populated |
| `PROGRESS_LOG.md` | Running structural / architectural log | populated |
| `DECISIONS.md` | ADR-style decisions beyond spec scope | populated |
| `docs/architecture/` | Authoritative architecture specs (Level 1 + Level 2) | populated |
| `docs/migration/` | Migration plan | populated |
| `docs/operations/` | Verification checklists, runbooks | populated |
| `docs/product/` | Product-facing documentation | scaffolded (README stub only) |
| `docs/audits/` | Audit reports at repo scope | scaffolded (README stub only) |
| `docs/archive/` | Historical / deprecated docs | scaffolded (README stub only) |
| `workflows/WF-*/` | Per-workflow n8n blueprints + SQL + scripts + tests + docs | scaffolded (skeleton uniform, content to come) |
| `src/` | Brain / shared / parsers / utils runtime code | scaffolded |
| `db/` | Schema / migrations / queries / docs | scaffolded + docs populated (`db/README.md`, `db/schema/README.md`) |
| `testing/` | Unit / integration / e2e / fixtures | scaffolded (only `fixtures/setup_test_data.sql` present) |
| `scripts/` | Repo maintenance, migration helpers, validation, workflow-shared | scaffolded |
| `.claude/pipelines/ucenicul-pipeline/` | Claude's orchestration pipeline (NOT product) | empty placeholder (read-only on current mount) |
| `.claude/skills/` | Per-repo skills if any | empty placeholder |
| `inventory/` | Manifests and reorganization audit trail | audit-only (populated with audit artifacts) |
| `archive/` | Superseded packs, legacy docs, legacy workflow snapshots | scaffolded (subfolders exist, all empty) |
| `Ucenicul/` (root-level subfolder) | **obsolete stub** — source-A vestige; retained because mount cannot delete. See `Ucenicul/OBSOLETE.md`. | obsolete |
| `workflows/_ARCHIVED_Executor_Closer_stub/` | **obsolete stub** — retained because mount cannot delete. Not a workflow. Excluded from `workflows/README.md`. | obsolete |

## Authority hierarchy (unchanged from pre-reorg)

1. `docs/architecture/Architecture_Spec_v3_Ucenicul.md` (HIGHEST)
2. `docs/migration/Migration_Plan_Ucenicul.md`
3. Level-2 subordinate specs under `docs/architecture/`
4. This file and `CLAUDE.md`
5. `README.md`
