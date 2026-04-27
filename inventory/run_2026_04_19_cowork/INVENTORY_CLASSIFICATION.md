# INVENTORY_CLASSIFICATION

Scope: what this session can actually read from the Ucenicul mount. See `ENVIRONMENTAL_BLOCKER.md` for the read/write surface map.

## Files (reachable surface only)

file | role | classification | confidence | notes
---|---|---|---|---
`README.md` (root) | root README | canonical | high | baseline-accepted entrypoint
`CLAUDE.md` | agent guidance | canonical | high | stable pointer to architecture + operating posture
`PROJECT_MASTER.md` | project master | canonical | high | adds status column per F-03 fix
`FINAL_CANONICAL_BASELINE.md` | baseline verdict | canonical | high | ACCEPTED 2026-04-19
`HOT_CONTEXT_FILES.md` | AI context routing | canonical | high | hot set
`COLD_CONTEXT_FILES.md` | AI context routing | canonical | high | cold set
`CANONICAL_ENTRYPOINTS.md` | AI context routing | canonical | high | entrypoint catalog
`AI_CONTEXT_LOADING_RULES.md` | AI context routing | canonical | high | traversal rules
`DECISIONS.md` | design decisions log | canonical | high | append-only
`PROGRESS_LOG.md` | progress log | canonical | high | append-only
`archive/README.md` | archive tour | canonical-local | medium | only visible archive anchor in this session
`inventory/README.md` | inventory tour | canonical-local | high | stable
`inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` | workflow standard | canonical | high | Active; supersedes plan doc
`inventory/WORKFLOW_STANDARDIZATION_PLAN.md` | plan (roadmap only) | historical / supporting | high | SUPERSEDED as standard; kept as roadmap
`inventory/WORKFLOW_COVERAGE_AUDIT.md` | coverage audit | supporting | high | dated 2026-04-19 n8n fetch
`inventory/N8N_DOCUMENTATION_ALIGNMENT_AUDIT.md` | n8n alignment audit | supporting | high | feeds coverage audit
`inventory/LEGACY_RC_MO_DISCOVERY_AUDIT.md` | legacy discovery | supporting | high | RC/MO evidence trail
`inventory/LEGACY_RC_MO_PROMOTION_PLAN.md` | legacy promotion plan | supporting | high | proposal only
`inventory/LEGACY_WF_E2E_01_DISCOVERY.md` | E2E halt audit | supporting | high | concludes "no state to resume"
`inventory/UPLOADED_FILES_EVALUATION.md` | evaluation log | supporting | high | spec provenance
`inventory/ABSOLUTE_CLOSEOUT_REPORT.md` | closeout report | supporting | high | matches `RECONCILIATION_STATE_FINAL.json`
`inventory/DOCUMENT_STRUCTURE_DOUBLE_CHECK.md` | structural audit | historical | high | pre-fix 9/9/10
`inventory/DOCUMENT_STRUCTURE_DOUBLE_CHECK_POST_FIX.md` | structural audit | supporting | high | post-fix 9.5/9.5/10
`inventory/DOCUMENT_STRUCTURE_FIXES_DELTA.md` | structural fix delta | historical | high | F-01..F-08 all CLOSED
`inventory/DOCS_LEGEND.md` | docs legend | supporting | high | classification legend
`inventory/FINAL_CLOSURE_DELTA.md` | closure delta | historical | high | prior closure
`inventory/FINAL_POLISH_DELTA.md` | polish delta | historical | high | prior polish pass
`inventory/RECONCILIATION_STATE.json` | prior reconciliation state | historical / mount-locked | high | read via sidecar
`inventory/RECONCILIATION_STATE_FINAL.json` | final reconciliation sidecar | canonical (3 fields) | high | closeout fields only
`inventory/final_reorganization_report.md` | reorganization report | supporting | high | prior reorg
`inventory/workflow_manifest.json` | workflow manifest | supporting / possibly stale | low-medium | content not readable in this session (stat works, open fails)
`inventory/*.json` (other) | inventories / diffs / manifests | supporting | medium | per-file semantics not re-examined this pass
`inventory/_test_write.tmp`, `.write_probe_tmp`, `.writetest_123`, `_probe_test.md`, `.probe_cowork`, `.trash/`, `ambiguous_holding/` | write-probe vestiges | generated_run_artifact | high | non-authoritative
`_claude_operator_pack/**` | operator pack | tooling (read-only) | high | not a workflow; semantic repurposing forbidden

## Files that could not be inventoried

Any path under the following paths: `workflows/**`, `workflows/README.md`, `docs/**`, `db/**`, `src/**`, `testing/**`, `archive/legacy_workflows/**`, `archive/snapshots/**`, `archive/superseded/**`, `archive/deprecated/**`, `archive/pipeline_legacy/**`, `archive/legacy_docs/**`, `archive/unresolved/**`, `archive/pycache/**`.

These are cloud-only placeholders in this Cowork mount (see `ENVIRONMENTAL_BLOCKER.md`). Their *existence* is known from `FINAL_CANONICAL_BASELINE.md` §6 and `WORKFLOW_COVERAGE_AUDIT.md` §C, but their **contents** are opaque.

## Missing Artifacts

Against `WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §7.2 required minima, and using the prior-pass audit as evidence:

- `workflows/WF-*/workflow/WF-*.json` — all 8 scaffolds missing the canonical workflow JSON (per `WORKFLOW_COVERAGE_AUDIT.md` §C). Cannot be remediated in this pass.
- `workflows/WF-*/state/STATE__WF-*.json` — absent across scaffolds (same source).
- `workflows/WF-*/docs/WF-*_CONTRACTS.md`, `WF-*_TEST_MATRIX.md` — absent across scaffolds (same source).
- `workflows/WF-RC-01_Response_Composer/` — entire folder missing.
- `workflows/WF-MO-01_Message_Out/` — entire folder missing.
- `workflows/WF-00_Morning_Briefing/` — entire folder missing.
- `docs/archive/brain_main_monolith_orientation.md` — absent.
- `testing/e2e/` — empty directory; scenarios not authored.

All of the above are documented gaps known before this run; the re-audit adds no new information because the mount hides the exact surface that would confirm or invalidate them.

## Conflicts

- No new conflicts detected in the reachable surface.
- Pre-existing conflict: `workflows/WF-SU-01_Sub_Workflow/` vs baseline-labeled `WF-SU-01_State_Persistence_Updater/`. The baseline doc §6 uses the corrected name; `WORKFLOW_COVERAGE_AUDIT.md` §F.2 stages the rename. Unverifiable in this pass.

## Canonical Candidates (per category)

- Implementation truth: `workflows/WF-XX-01_<Name>/workflow/WF-XX-01_<Name>.json` (target; absent today, live in n8n).
- Contract truth: `workflows/WF-XX-01_<Name>/docs/WF-XX-01_CONTRACTS.md` (target; absent today).
- Runtime truth: live n8n (out of scope in this session).
- Status truth: `workflows/WF-XX-01_<Name>/state/STATE__WF-XX-01.json` + README status card (target; absent today).

---

> Generated run artifact. 2026-04-19. Reflects the reachable surface of the Cowork mount only.
