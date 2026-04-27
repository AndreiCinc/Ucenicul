# CANONICALITY_DECISION

Scope: decisions applicable to the Ucenicul repo batch as a whole. Per-WF canonicality defers to the per-WF `WORKFLOW_RUN_RECORD__<WF>.md` files.

## implementation_truth

Per `WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §4.B:

- Per workflow, the canonical implementation is `workflows/WF-XX-01_<Name>/workflow/WF-XX-01_<Name>.json` (the n8n export). In the current repo state this file **does not yet exist** for any of the 8 scaffolds (per `WORKFLOW_COVERAGE_AUDIT.md` §C). Live n8n carries the actual implementation.
- No prose document, manifest, or blueprint sidecar is promoted to implementation truth in this run. Promotion rules from `_claude_operator_pack/09_CANONICALITY_AND_EVIDENCE_POLICY.md` are not met because the target artifact is absent.

## contract_truth

- Target: `workflows/WF-XX-01_<Name>/docs/WF-XX-01_CONTRACTS.md`.
- Current: absent for all 8 scaffolds.
- Fallback hierarchy per `WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §4.C: (2) README §Inputs/§Outputs, (3) validator `jsCode` nodes inside the workflow JSON, (4) TEST_MATRIX.
- In this run, none of these can be inspected (see `ENVIRONMENTAL_BLOCKER.md`). No contract truth is declared.

## runtime_truth

- Target: `reports/LIVE_EXECUTIONS__WF-XX-01.md` + `CLOSURE_REPORT__WF-XX-01.md` (CRITICAL tier).
- Current: no CRITICAL-tier workflow in the repo. Live n8n reports 14 workflows active but no live execution proof is mirrored into `workflows/`.
- In this run: no runtime truth declared.

## status_truth

- Target: `state/STATE__WF-XX-01.json` + `README.md` status card.
- Current: not verifiable in this mount. `FINAL_CANONICAL_BASELINE.md` claims "Every `workflows/WF-*/` folder contains real workflow content (all are `scaffolded` at baseline)" is explicitly NOT a claim (the baseline denies it at line 33). Per `WORKFLOW_COVERAGE_AUDIT.md` §C, every WF folder is `scaffold`.
- Status truth for the run: all 8 WF folders classified as `scaffold` by prior evidence, unverifiable in this pass.

## promotions

None. No patch, blueprint, or prose is promoted to canonical status in this run. Promotion rules unmet (`09_CANONICALITY_AND_EVIDENCE_POLICY.md`).

## demotions

None newly applied in this run. Prior demotions already recorded:

- `inventory/WORKFLOW_STANDARDIZATION_PLAN.md` SUPERSEDED as standard (demoted to migration roadmap) by `WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` — recorded in the plan's front matter already.
- `workflows/_ARCHIVED_Executor_Closer_stub/` excluded from workflows index (per `FINAL_CANONICAL_BASELINE.md` §4) — already applied.

## open_conflicts

1. Baseline doc name says `WF-SU-01_State_Persistence_Updater/` (§6 inventory); `WORKFLOW_COVERAGE_AUDIT.md` §C still lists `WF-SU-01_Sub_Workflow/` with a naming-drift note and §F.2 proposes a rename. Actual folder name unverifiable in this pass.

   Resolution in this pass: defer. Rename requires write access into `workflows/`, which is blocked.

2. Coverage audit proposes adding `WF-RC-01_Response_Composer/`, `WF-MO-01_Message_Out/`, `WF-00_Morning_Briefing/`, and `docs/archive/brain_main_monolith_orientation.md` (§F.1, §F.4). None of these are present.

   Resolution in this pass: defer. Creation requires write access into `workflows/` and `docs/`, which is blocked.

---

> Generated run artifact. 2026-04-19. No silent truth merging performed.
