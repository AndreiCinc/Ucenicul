# Claude Autonomous Master Prompt — Next 3 Follow-ups

You are the autonomous executor for Ucenicul.

## Mission bundle

Execute these three missions in order:

1. `C11_REPLAY_GROUPING_TARGETED_RERUN`
2. `MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP`
3. `IMPROVEMENT_MODULE_LIST_FOLLOWUP`

The operator will not be available for step-by-step confirmation. Proceed autonomously until all three are closed or until a real P0/product-decision blocker appears.

## Current baseline

Treat this as current truth unless repo evidence directly contradicts it:

- `TASK_MODULE_LIVE_EXECUTION_READY_FOR_E2E = TRUE`
- `F14_STORE_MEMORY_INTENTMAP_READY = TRUE`
- `IMPROVEMENT_MODULE_LIVE_EXECUTION_READY_FOR_E2E = TRUE`
- `AMBIGUOUS_CONTENT_GUARDS_READY = TRUE`
- `MEMORY_SUPERSEDE_PL_INTENTMAP_READY = TRUE`
- `OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_READY = TRUE`
- `MEMORY_V2_SUPERSEDE_EMBED_DEFENSIVE_GUARD_READY = TRUE`
- `PL_BRIEFING_RESPOND_ONLY_READY = TRUE`
- `PROJECT_E2E_RICH_TEST_MATRIX_FULL_240_GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS`
- `FULL_240_VARIANT_SWEEP_GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS`

Known caveats:
- Variant sweep was risk-weighted, not exhaustive 240/240.
- C11 V2/V3/V4 replay grouping remains a targeted fixture rerun.
- `MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP` is lower priority but small.
- `IMPROVEMENT_MODULE_LIST_FOLLOWUP` is deferred read-only list lane.
- MO `MISSING_DELIVERY_TARGET` is known fixture limitation.
- Reminder delivery is future work.

## Required reading

### Layer 0
Read first:
- `docs/architecture/e2e/full_240_variant_sweep/FULL_240_VARIANT_SWEEP_CLOSEOUT.md`
- `docs/architecture/e2e/full_240_variant_sweep/FULL_240_VARIANT_SWEEP_FAILURE_CLASSIFICATION.md`
- `docs/architecture/e2e/full_240_variant_sweep/FULL_240_VARIANT_SWEEP_SAFE_FIXES.md`
- `docs/architecture/e2e/full_240_rerun/FULL_240_RERUN_CLOSEOUT.md`
- `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md`

### Layer 1
Then:
- `docs/architecture/e2e/harness/tr_envelope.mjs`
- `docs/architecture/e2e/harness/intent_mapping.mjs`
- `docs/architecture/e2e/harness/e2e_runner.mjs`
- `docs/architecture/Module_Registry_Ucenicul.md`
- `docs/architecture/Architecture_Spec_v3_Ucenicul.md`
- `docs/architecture/n8n_Workflow_Mapping.md`
- current workflow docs/snapshots for PL, DI, ME, RA, SU, RC, MO

### Layer 2
Only if contradiction:
- task module closeout;
- F14 closeout;
- improvement module closeout;
- memory supersede closeouts;
- PL_BRIEFING closeout;
- old E2E results.

### Layer 3
Only lineage/contradiction audit.

Do not read the repo haotically.

## Execution sequence

### Mission 1
Run `C11_REPLAY_GROUPING_TARGETED_RERUN`. If GREEN or GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS, continue.

### Mission 2
Run `MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP`. If it requires only a small PL mapping or alias and tests are green, continue. If it requires broad Memory V2 changes, stop and report.

### Mission 3
Run `IMPROVEMENT_MODULE_LIST_FOLLOWUP`. Implement a read-only tenant-scoped list lane if schema and routing support it. If this requires schema migration or broad ME rewrite, stop and report partial.

## Global P0 stop conditions

Stop immediately if:
- cross-tenant leak;
- wrong-tenant write/update/supersede/list;
- idempotency replay creates duplicate side effect where replay should dedupe;
- ambiguous input writes a domain row;
- response-only/social writes domain data;
- session-only data becomes durable memory;
- reminder-like writes to `public.reminders`;
- raw JSON leaks to user-facing output;
- schema migration required without explicit authorization;
- duplicate workflow;
- Path 5;
- unauthorized MCP workflow write.

## Apply policy

- Use the repo-current canonical workflow apply channel.
- No Path 5.
- No duplicate workflows.
- No schema migration unless specifically authorized by current repo policy and documented.
- Pre/next/post workflow snapshots required for any workflow mutation.
- Rollback params required for any workflow mutation.
- No fake Telegram target.

## Documentation policy

For each mission, create the mission-local folder and closeout files described in the mission document.

After all missions, update compactly:
- `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md`
- `docs/architecture/Module_Registry_Ucenicul.md` only if capability status or module contract changes.

Do not update Memory V2 historical docs unless there is a real contradiction.

## Final bundle verdict

Return exactly one:
- `NEXT_3_FOLLOWUPS_CLOSED_GREEN = TRUE`
- `NEXT_3_FOLLOWUPS_GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS`
- `NEXT_3_FOLLOWUPS_PARTIAL_WITH_BLOCKERS`
- `NEXT_3_FOLLOWUPS_STOPPED_ON_P0`

Final report must include:
- result of each mission;
- workflow versions before/after;
- node/connection delta;
- schema mutation count;
- P0 invariant summary;
- side-effect summary;
- docs written;
- remaining follow-ups;
- next recommended frontier.
