# F9 — OR Live Execution Gating · Closeout

## Verdict

`F9_OR_LIVE_EXECUTION_GATING_DOC_ONLY_RECLASSIFIED`

## Is F9 a real gate or a telemetry mismatch?

**Telemetry mismatch.** The four hardcoded OR-side flags
(`planning_mode='plan_only'`, `module_execution_allowed=false`,
`response_generation_allowed=false`, `domain_writes_allowed=false`)
describe OR's own stage behavior and are emitted into
`payload.orchestrator_input` as descriptive metadata. They are **not
read** by any downstream workflow.

A live SQL grep across all 10 canonical workflows finds:

- 1 producer (`OR_Build_Handoff_Payload`).
- 1 downstream node that even names `orchestrator_input`
  (`PL_Validate_OR_Handoff`), which checks only that the key exists in
  the payload and passes the whole object through unchanged.
- 0 reads of any of the four sub-field names against the
  `orchestrator_input` envelope anywhere else in the chain.

The downstream `*_allowed` reads that look superficially related (in
DI / ME / RA / SU / RC / MO) target separately-emitted envelopes:
`dispatcher_input.response_generation_allowed`,
`aggregation_input.response_generation_allowed`,
`state_update_input.response_generation_allowed`. These are PL's / RA's /
SU's own contract flags, not OR's.

## Workflows modified

**None.** No `n8n-patch.mjs replace`. No `mcp__n8n__patch_workflow_nodes`.
No Postgres direct write to `public.workflow_entity`.

## VersionId lineage

| Workflow | versionId at start of mission | versionId at end | delta |
|---|---|---|---|
| WF-TR-01 | `89b783f8…` | `89b783f8…` | unchanged |
| WF-EC-01 | `78569035…` | `78569035…` | unchanged |
| WF-OR-01 | `2d37a1f3…` | `2d37a1f3…` | unchanged |
| WF-PL-01 | `898fa273…` | `898fa273…` | unchanged |
| WF-DI-01 | `8b10a865…` | `8b10a865…` | unchanged |
| WF-ME-01 | `3804ec0e…` | `3804ec0e…` | unchanged |
| WF-RA-01 | `4a2be8b4…` | `4a2be8b4…` | unchanged |
| WF-SU-01 | `4e7bc0d1…` | `4e7bc0d1…` | unchanged |
| WF-RC-01 | `6d3f5208…` | `6d3f5208…` | unchanged |
| WF-MO-01 | `4e0163b2…` | `4e0163b2…` | unchanged |

## Probe results

Six sequential probes through `WF-TR-01` (run-tag `f9probe-2026-04-25`):

| # | intent | execution_id | DB outcome | invariant |
|---|---|---|---|---|
| 1 | `create_task` | 8499 | 1 `tasks` row written | task path GREEN |
| 2 | `list_tasks` | 8513 | 0 row delta | read-only path GREEN |
| 3 | `briefing` | 8527 | 0 row delta | response-only path GREEN |
| 4 | `search_memory` | 8531 | 0 row delta, no `memory_items` write | memory read GREEN |
| 5 | `capture_feedback` (`save_suggestion`) | 8545 | 0 row delta — confirms `improvement_module` is still a stub by its own design, NOT because of F9 | scoped finding for separate mission |
| 6 | `create_reminder` → `task_module.create_task` | 8559 | 1 `tasks` row written, 0 `reminders` writes | reminder-as-task GREEN |

Aggregate probes-window invariants:

- `new_tasks_global = 2` (probes 1 + 6).
- `new_memory_global = 0`.
- `new_reminder_writes = 0` (`reminders.count = 1` baseline preserved,
  `last_updated = 2026-04-13T20:17:13Z` unchanged).

Detail in `F9_OR_GATING_PROBE_RESULTS.md`.

## Task regression result

**No regression.** The predecessor mission's verdict
`E2E_TASK_CORRIDORS_PHASE1_READY = TRUE` continues to hold. Task
corridors C6 / C10 / C11 / C12 + reminder-like-task lane remain GREEN.

## Memory regression result

**No regression.** `memory_items` count unchanged for the probe tenant
before and after.

## Impact on the full 240 E2E rich matrix

F9 is **not the blocker** for non-task corridors C1..C5, C7..C9. Removing
the F9 framing as a "gate" from the project reconciliation does not
change which corridors are runnable. The corridors that still cannot be
exercised end-to-end are blocked by other, separately-tracked issues:

- `improvement_module` ME handler is still a pure stub → corridors that
  depend on it (e.g. C2 memory-write through `save_suggestion`,
  C12 with feedback-capture clause) cannot persist a real domain row
  through that lane.
- F14: PL.intentMap missing `store_memory` → corridors that emit
  `store_memory` as upstream intent would fall through PL's
  intent-routing (memory writes through the chain remain limited to the
  paths Memory V2 already proved).
- MO `MISSING_DELIVERY_TARGET` for e2e tenants → known fixture
  limitation, not a chain bug; the oracle already classifies it as
  `KNOWN_FIXTURE_LIMITATION`.

None of these is F9.

## Doc-only changes summary

1. `F9_OR_LIVE_EXECUTION_GATING_EXECUTION_LOG.md` — mission log.
2. `F9_OR_GATING_DISCOVERY.md` — static audit + classification.
3. `F9_OR_GATING_PROBE_RESULTS.md` — 6 probe outcomes + invariants.
4. `F9_OR_GATING_DECISION.md` — patch policy evaluation; doc-only verdict.
5. `F9_OR_GATING_CLOSEOUT.md` — this file.
6. Compact update to
   `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md`
   (handled in §"Reconciliation update" below).

## Reconciliation update

Compact addendum is being applied to
`docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` to
reclassify F9 from "OR-side hardcoded gates blocker" to
`F9_TELEMETRY_ONLY_MISMATCH` — telemetry-only with zero gating effect on
the chain. Memory V2 historical closeouts and Memory V2 phase gates are
not touched.

## Next recommended frontier

Choose from these — all unblocked by this mission's findings, prioritised
by user-impact and effort:

1. **F14 — add `store_memory` to PL.intentMap.** Small, contract-backed
   PL patch (single jsCode rewrite, 0 node delta). Unblocks memory-write
   corridors C2 / C4 / C9 / C10 (write side) / C11 (write idempotency)
   through the canonical chain (Memory V2's direct-ME path is already
   GREEN).
2. **`improvement_module` live execution.** Same shape as
   `task_module` predecessor mission: replace the stub
   `ME_Improvement_Capture_Result` with a real Prep + DB + Result chain
   writing to `public.improvement_requests`. Unblocks corridors that
   require feedback capture as a domain side-effect.
3. **Resume `PROJECT-E2E-RICH-TEST-MATRIX` for the next corridor batch**
   (memory-side C2 / C3 / C4 / C9; non-memory C1 / C5; ambiguity-safe
   C7) once F14 lands.
4. **Optional doc-only hygiene pass** on
   `workflows/WF-OR-01_Orchestrator/docs/WF-OR-01_CONTRACTS.md` §4 to
   mark the four flags as "descriptive, not gating" with a forward
   pointer to this mission's discovery document. Non-blocking.

Memory V2 stays closed. Task module stays untouched.

`F9_OR_LIVE_EXECUTION_GATING_DOC_ONLY_RECLASSIFIED`
