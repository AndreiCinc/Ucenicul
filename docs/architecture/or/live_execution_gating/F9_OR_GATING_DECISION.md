# F9 — OR Live Execution Gating · Decision

## Decision

**Doc-only reclassification.** No workflow patch.

## Reasoning

Two independent lines of evidence converge on the same classification:

1. **Static audit** (`F9_OR_GATING_DISCOVERY.md` §1–§6): the four OR-side
   flags are produced exclusively by `OR_Build_Handoff_Payload` and read
   nowhere downstream. The single downstream node that even names
   `orchestrator_input` (`PL_Validate_OR_Handoff`) checks only that the
   key exists in the payload and passes the entire object through
   unchanged. No PL / DI / ME / RA / SU / RC / MO node references the
   four sub-fields.

2. **Live probes** (`F9_OR_GATING_PROBE_RESULTS.md` §2–§5): six probes
   covering all six intent classes ran successfully through the
   canonical chain. `create_task` and `create_reminder→task` produced
   real `tasks` rows under OR's `domain_writes_allowed=false`. No
   regression on memory or reminders.

`F9 = F9_TELEMETRY_ONLY_MISMATCH` is now empirically and structurally
proven.

## Evaluation against the patch policy

The pack's patch policy permits a workflow patch only if **all** of the
following hold:

- repo docs authorize the write path,
- contract is clear,
- patch is small,
- task path is unaffected,
- rollback is available.

A workflow patch could theoretically:

- Remove the four telemetry fields from `OR_Build_Handoff_Payload`
  payload to reduce envelope noise.
- Or set them to truthful values (`module_execution_allowed=true`,
  `domain_writes_allowed=true`) so the payload doesn't read as
  contradictory.
- Or add a comment block explaining they are telemetry only.

The first two require updating `WF-OR-01_CONTRACTS.md` §4 and the
downstream contract docs that mention them, **AND** require justifying
the change against the existing "OR does not plan / dispatch / respond /
write" semantics of the OR stage (which is correct — OR really does NOT
do those things; the flags accurately describe OR's stage role).

The third (in-code comment) is harmless but does not change behavior; it
is a doc patch that happens to live inside a code node. By the pack's
own out-of-scope rule ("no broad OR rewrite"), even this minimal
in-code-doc patch is unnecessary and risks forcing a workflow versionId
churn that the operator otherwise does not need.

**Verdict:** patching `WF-OR-01` is unjustified. The mission resolves at
the documentation layer.

## Doc-only changes applied

1. `docs/architecture/or/live_execution_gating/F9_OR_GATING_DISCOVERY.md`
   — full discovery report.
2. `docs/architecture/or/live_execution_gating/F9_OR_GATING_PROBE_RESULTS.md`
   — six-probe regression results.
3. `docs/architecture/or/live_execution_gating/F9_OR_GATING_DECISION.md`
   — this file.
4. `docs/architecture/or/live_execution_gating/F9_OR_GATING_CLOSEOUT.md`
   — verdict and follow-up frontiers.
5. Compact update to
   `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md`
   reclassifying F9 as telemetry-only.

No `F9_OR_GATING_PATCH_EVIDENCE.md` is produced because no patch is
applied.

## Stop conditions — none triggered

- No product decision required for live execution default (the chain
  ALREADY runs in live execution; OR's flags don't gate it).
- No broad OR rewrite needed.
- No Memory V2 changes.
- No cross-tenant risk.
- No task regression.
- No workflow duplication.
- No schema migration.

## Recommendation for the OR contract doc

A future small documentation pass on
`workflows/WF-OR-01_Orchestrator/docs/WF-OR-01_CONTRACTS.md` §4 should
mark the four flags as **descriptive, not gating** — explicitly noting
that downstream stages do not consume them. This is **not blocking** any
mission; it is hygiene and may be done in a follow-up doc-only mission.

## Workflow mutation count

**0.**

## Schema mutation count

**0.**
