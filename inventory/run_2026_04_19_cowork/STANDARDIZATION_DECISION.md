# STANDARDIZATION_DECISION

workflow_in_scope:
  - WF-DI-01_Dispatcher
  - WF-EC-01_Execution_Context
  - WF-ME-01_Module_Execution
  - WF-OR-01_Orchestrator
  - WF-PL-01_Plan_Generation
  - WF-RA-01_Result_Aggregator
  - WF-SU-01_State_Persistence_Updater
  - WF-TR-01_Thread_Resolver
  - _ARCHIVED_Executor_Closer_stub

mode:
  full_autonomous_batch (per RUN_MISSION.md)
  effective execution mode for this pass: review_only with forced local quarantine, per 06_FAILSAFE_DECISION_TREE Case 11 and 14_STOP_RECOVERY local-stop clauses.

tier:
  hints from inventory/WORKFLOW_COVERAGE_AUDIT.md and WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md:
    - WF-DI-01, WF-EC-01, WF-ME-01, WF-OR-01, WF-PL-01, WF-RA-01, WF-SU-01, WF-TR-01: STANDARD (target), currently scaffold
    - _ARCHIVED_Executor_Closer_stub: reduced/archived template (see WORKFLOW_STANDARDIZATION_PLAN.md §E)
  tier cannot be re-verified in this pass because folder contents are unreachable (see ENVIRONMENTAL_BLOCKER.md).

objective:
  Produce a dated run record per workflow, identify standardization gaps against `WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md`, and either remediate or quarantine. No live patching. No packaging.

canonical_rule:
  - `WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` (Active) wins on folder shape, README content, tier minima.
  - `WORKFLOW_STANDARDIZATION_PLAN.md` is SUPERSEDED as standard; kept as migration roadmap only (§D skill sketches, §F names, §G staging list).
  - `FINAL_CANONICAL_BASELINE.md` anchors the baseline acceptance verdict (2026-04-19 ACCEPTED).
  - `WORKFLOW_COVERAGE_AUDIT.md` anchors the live-vs-repo gap statement.

keep_rules:
  - All existing root canonical docs preserved (not touched).
  - All existing inventory/ evidence preserved (not touched).
  - All existing workflows/ content preserved (cannot be touched in this mount).
  - All existing archive/ content preserved (cannot be touched in this mount).

exclude_rules:
  - Sensitive classes per `_claude_operator_pack/12_SENSITIVE_FILES_AND_PACKAGE_POLICY.md`: `.env`, credentials, tokens, secrets. None encountered in readable surface.
  - Tooling folders (`_claude_operator_pack/`): read-only input; no semantic repurposing.
  - `inventory/.trash`, `inventory/ambiguous_holding`: classified, not promoted.

output_requested:
  - STANDARDIZATION_DECISION.md (this file)
  - INVENTORY_CLASSIFICATION.md
  - CANONICALITY_DECISION.md
  - RUN_QUEUE.md
  - WORKFLOW_RUN_RECORD__<WF>.md × 9
  - QUARANTINE_NOTE__<WF>.md × 9
  - GLOBAL_RUN_SUMMARY.md
  - ENVIRONMENTAL_BLOCKER.md (non-template, required to justify verdicts)

allowed_writes:
  - `/inventory/run_2026_04_19_cowork/**` — verified writable
  - (negative-verified) repo root `/*.md` — writable but deliberately not used for run artifacts to avoid polluting canonical root

forbidden_writes:
  - `workflows/**` — ENOENT/EPERM on write
  - `docs/**` — ENOENT on write
  - `db/**`, `src/**`, `testing/**` — ENOENT on write
  - `archive/**` — EPERM on write
  - `_claude_operator_pack/**` — EPERM on write
  - any mutation of existing `inventory/*.md` or `inventory/*.json` — policy (write boundaries §manifests + current truth already stable)

patching_allowed:
  no (no live n8n access requested in this session; patch gates per 10_N8N_PATCH_AND_ROUNDTRIP_POLICY.md cannot be satisfied)

packaging_requested:
  no

---

> Generated run artifact. 2026-04-19.
