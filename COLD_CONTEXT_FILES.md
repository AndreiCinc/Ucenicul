# COLD_CONTEXT_FILES.md — Ucenicul_REBUILT

> **Purpose.** Declares the set of files an AI agent (Claude or any other) should load **only on explicit demand**. These artifacts are essential when auditing history, verifying past work, or debugging structural decisions — but they are never loaded implicitly at task start.
>
> **Scope.** This document is a *routing contract*. It does not change the authority of any file; it only tells the loader when to reach for it.
>
> **Status.** Accepted as part of the canonical baseline on 2026-04-19.

---

## 1. Why COLD context exists

HOT context (`HOT_CONTEXT_FILES.md`) defines what an agent needs to reason correctly about the *current* state of Ucenicul. COLD context preserves the *provenance* of that state — every manifest, audit, delta, and closure narrative that got us here. Loading COLD files by default would (a) bury the agent in token-expensive history it does not need, and (b) risk the agent reasoning from snapshots that are already superseded.

COLD files are authoritative for the moment they describe, but they are **not** authoritative about what the repo looks like today. For "today", use HOT.

## 2. COLD — reorganization audit trail

Located under `inventory/`. Loaded only when investigating the 2026-04-19 dual-root reconciliation or an earlier audit pass.

| File | Role |
|---|---|
| `inventory/source_root_a_inventory.json` | Source-A snapshot (PRODUCT_ROOT) |
| `inventory/source_root_a_inventory_rescan.json` | Source-A rescan after staging |
| `inventory/source_root_b_inventory.json` | Source-B snapshot (CLAUDE_PIPELINE_ROOT) |
| `inventory/source_root_b_inventory_rescan.json` | Source-B rescan after staging |
| `inventory/unified_inventory.json` | Unified merged inventory |
| `inventory/duplicate_candidates.json` | Duplicate detection output |
| `inventory/ambiguous_files.json` | Files requiring human adjudication |
| `inventory/ambiguous_holding/` | Holding bucket for ambiguous items |
| `inventory/move_plan.json` | Planned relocations |
| `inventory/relocation_log.json` | Executed relocations |
| `inventory/rescan_diff.json` | Diff between pre- and post-reorg snapshots |
| `inventory/root_files_manifest.json` | Post-reorg root-file manifest |
| `inventory/workflow_manifest.json` | Post-reorg workflow manifest |
| `inventory/claude_pipeline_manifest.json` | Post-reorg pipeline manifest |
| `inventory/manifest_sync_diff.json` | Manifest drift check |
| `inventory/final_reorganization_report.md` | Narrative final report of the reorg |

## 3. COLD — verification artifacts

| File | Role |
|---|---|
| `inventory/verification_report.json` | Canonical post-reorg verification |
| `inventory/verification_report_pass1.json` | Early verification pass |
| `inventory/verification_report_pass2.json` | Second verification pass |
| `inventory/verification_report_pass3.json` | Final verification pass |
| `inventory/final_consistency_audit.json` | Pre-fix consistency audit |
| `inventory/final_consistency_audit_post.json` | Post-fix consistency audit |
| `inventory/final_cross_check_10pt.json` | 10-point cross-check scoreboard |

## 4. COLD — closure & structural audits

| File | Role |
|---|---|
| `inventory/DOCUMENT_STRUCTURE_DOUBLE_CHECK.md` | Initial strict structural audit |
| `inventory/DOCUMENT_STRUCTURE_DOUBLE_CHECK_POST_FIX.md` | Post-fix re-audit |
| `inventory/DOCUMENT_STRUCTURE_FIXES_DELTA.md` | F-01..F-08 + optional improvements change log |
| `inventory/FINAL_CLOSURE_DELTA.md` | Earlier closure delta |
| `inventory/FINAL_POLISH_DELTA.md` | Earlier polish-pass delta |
| `inventory/DOCS_LEGEND.md` | Disambiguation legend for the closure narrative docs |

## 5. COLD — baseline state

| File | Role |
|---|---|
| `inventory/RECONCILIATION_STATE.json` | Machine-readable reconciliation state |
| `inventory/RECONCILIATION_STATE_FINAL.json` | Final-state sidecar (canonical_baseline_status, ai_context_layer_status, absolute_closeout_status) |
| `inventory/ABSOLUTE_CLOSEOUT_REPORT.md` | Short executive closeout report |

## 6. COLD — historical / deprecated

| Path | Role |
|---|---|
| `archive/` | Superseded packs, legacy docs, legacy workflow snapshots (empty scaffolding at baseline) |
| `docs/archive/` | Historical / deprecated documentation (scaffolded, README stub only) |
| `docs/audits/` | Audit reports at repo scope (scaffolded, README stub only) |

## 7. COLD — environmental residue (informational only)

These files exist only because the mount cannot delete them. They are NOT authoritative and should be ignored by all task-planning agents. An auditor may load them to confirm the residue is labeled as such.

| Path | Reason kept |
|---|---|
| `Ucenicul/OBSOLETE.md` | Source-A root stub that mount cannot rmdir |
| `workflows/_ARCHIVED_Executor_Closer_stub/README.md` | Phase-3R naming-mismatch stub |
| `workflows/_ARCHIVED_Executor_Closer_stub/*/` | Accidental skeleton subfolders under the stub, mount-blocked |
| `.claude/_removed_test.txt` | Sandbox vestige from permission probing |
| `.claude/_sandbox_vestige_root.tmp` | Renamed probe file, mount-blocked for removal |
| `inventory/_test_write.tmp` | Write-probe vestige, mount-blocked for removal |

## 8. When a COLD file becomes HOT

A COLD file becomes HOT only through a deliberate promotion event, documented in `DECISIONS.md`. A promotion typically requires:

1. A superseding canonical replacement, OR
2. A new operational need that reads the file in every task.

Until such promotion is recorded, agents must treat the file as COLD regardless of how recent or large it is.

## 9. When a HOT file becomes COLD

A HOT file becomes COLD only when superseded by a new canonical replacement. The old file is moved under `docs/archive/` (or left in place with a status downgrade recorded in `PROJECT_MASTER.md`) and its entry is removed from `HOT_CONTEXT_FILES.md` in the same session.

## 10. Load-on-demand discipline

An agent loading a COLD file must:

1. Name it explicitly (no glob expansion).
2. Extract only the relevant section (not the whole file) when token pressure is high.
3. Not cite the COLD file as authoritative for current-state claims — cite a HOT file instead.

---

> **Subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md`.** Last updated: 2026-04-19.
