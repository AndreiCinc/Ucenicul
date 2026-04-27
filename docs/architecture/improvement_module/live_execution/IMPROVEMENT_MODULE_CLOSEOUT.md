# improvement_module — Live Execution Closeout

## Verdict

`IMPROVEMENT_MODULE_LIVE_EXECUTION_READY_FOR_E2E = TRUE`

## Summary

Replaced the stub `ME_Improvement_Capture_Result` with a real Prep + DB +
Result chain that writes to `public.improvement_requests`. PL gained a
small alias for `log_improvement_request` and a `user_message` passthrough
for `capture_feedback`. 11 sequential probes through the canonical
TR→…→MO chain proved all 10 user-ready acceptance criteria. No Memory V2
reopen, no task_module change, no schema mutation.

## Files modified

| File | Modification |
|---|---|
| `WF-ME-01.ME_Improvement_Capture_Prep` | NEW node (Code v2) — input validation, content normalization, category heuristic. |
| `WF-ME-01.ME_Improvement_Capture_DB` | NEW node (Postgres v2.4) — parameterized SELECT-before-INSERT CTE; tenant-scoped; org_id derived via JOIN with `public.tenants`. |
| `WF-ME-01.ME_Improvement_Capture_Result` | REWRITTEN in place — consumes DB row + Prep ctx; emits canonical envelope with `domain_writes_performed=true` on insert / `false` on idempotent replay; user-safe summary "Am notat sugestia / problema pentru îmbunătățire." |
| `WF-PL-01.PL_Build_Planner_Input` | jsCode v2.1 → v2.2 — adds `intentMap.log_improvement_request='capture_feedback'` alias, `user_message` passthrough for `capture_feedback` extraction, late-binding rewrite for upstream `log_improvement_request` action name. |
| `docs/architecture/improvement_module/live_execution/*` | NEW closeout (this file) + `artifacts/build_improvement_patch.py` + `artifacts/WF-{ME,PL}-01.{pre,next}.json`. |
| `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` | compact addendum (separate edit). |
| `docs/architecture/Module_Registry_Ucenicul.md` | not modified — `improvement_module` capabilities unchanged; the registry already listed `capture_feedback`. |

## Workflows modified

| Workflow | id | versionId before | versionId after | nodes | connections | active |
|---|---|---|---|---|---|---|
| WF-ME-01 | `uq26nh1grIpnHju0` | `3804ec0e-…` | `161a612d-603a-49a7-9580-a256e1c69be5` | 59 → 61 | 77 → 79 | ✅ |
| WF-PL-01 | `RwToPLa1ErHl2tUi` | `c4d9796d-…` | `dce0febe-1bc0-42e3-a44a-a41e6737e1e7` | 16 (unchanged) | 16 (unchanged) | ✅ |

All other 8 canonical workflows preserve their pre-mission `versionId`. Apply channel: V2-028 canonical local `n8n-patch.mjs replace`. No Path 5. No `mcp__n8n__patch_workflow_nodes` write. No duplicate workflows.

## SQL surface

`public.improvement_requests` schema (NOT mutated):
- `id` uuid PK; `organization_id` uuid NOT NULL FK; `tenant_id` uuid NOT NULL FK; `requested_feature` text NOT NULL; `user_message` text; `status` text DEFAULT 'pending' CHECK (`pending|planned|done|rejected`); `created_at` timestamptz DEFAULT now().

ME_Improvement_Capture_DB query (parameterized):

```sql
WITH lookup AS (
  SELECT id, organization_id, tenant_id, requested_feature, user_message, status, created_at
    FROM public.improvement_requests
   WHERE tenant_id = $1::uuid AND user_message = $3::text
   ORDER BY created_at DESC LIMIT 1
),
ins AS (
  INSERT INTO public.improvement_requests (organization_id, tenant_id, requested_feature, user_message, status)
  SELECT t.organization_id, $1::uuid, $2::text, $3::text, 'pending'::text
    FROM public.tenants t
   WHERE t.id = $1::uuid AND NOT EXISTS (SELECT 1 FROM lookup)
  RETURNING …, TRUE AS inserted
)
SELECT … FROM ins
UNION ALL
SELECT … , FALSE AS inserted FROM lookup l WHERE NOT EXISTS (SELECT 1 FROM ins)
LIMIT 1;
```

Slots `[tenant_id, requested_feature, user_message]`. `organization_id` is derived via JOIN; the chain doesn't have to carry it.

## Acceptance criteria — all met

### #1 — `capture_feedback` writes a real tenant-scoped row
✅ 7 rows written across 7 distinct probes. Tenant scoping enforced by `WHERE t.id = $1::uuid` in the INSERT subquery and by the FK + filtered SELECT.

### #2 — `log_improvement_request` alias OR proven unreachable
✅ Aliased. PL v2.2 adds `intentMap.log_improvement_request: 'capture_feedback'` and a late-binding pass that rewrites any upstream `requested_actions[i].action='log_improvement_request'` → `capture_feedback` before dispatch.

### #3 — `list_improvements` implemented or blocker documented
**Blocker documented (not implemented in this mission).** Schema supports it; route requires adding a sub-action switch (`ME_Route_Improvement_Action`) in `WF-ME-01` since the current improvement_module surface has only one ME branch. Implementing list would add one switch + one Prep + one DB + one Result = 4 nodes plus 5 edges. That structural change is outside the surgical surface chosen for this mission. Tracked as follow-up `IMPROVEMENT_MODULE_LIST_FOLLOWUP` — recommended scope: add ME sub-router + list handler chain (read-only), and add `intentMap.list_improvements: 'list_improvements'` + `actionToModule.list_improvements: 'improvement_module'` to PL. Estimated patch: WF-ME-01 +4 nodes / +5 edges, WF-PL-01 1 jsCode rewrite.

### #4 — RC output natural and safe
✅ ME Result emits `summary: "Am notat sugestia / problema pentru îmbunătățire."` (Romanian, clear, no false promise that the improvement was implemented). RC composes the user-facing reply from this summary plus `actions_executed.details`. Verified empirically: 14 hits for the natural summary string across the chain's `execution_data` for the 8 capture probes; 0 hits for the internal table name `improvement_requests` in MO output (i.e. no internal table name leaks). 0 raw module envelopes appear in MO's output payload.

### #5 — Improvement capture must NOT write to memory_items / tasks / reminders
✅ Verified empirically:
- `count(*) FROM public.tasks WHERE created_at >= probe_window AND title NOT IN regression set` = 0 (only the 1 explicit regression-probe task).
- `count(*) FROM public.memory_items WHERE created_at >= probe_window AND content NOT IN regression set` = 0 (only the 1 explicit regression-probe memory).
- `count(*) FROM public.reminders WHERE updated_at >= probe_window` = 0.
- `reminders.count = 1, last_updated = 2026-04-13T20:17:13Z` unchanged from baseline.

### #6 — Idempotent under replay
✅ The bug_ro envelope was fired twice (executions 8632 + 8744). Result: exactly **1 row** in `public.improvement_requests` for that user_message. The SELECT-before-INSERT CTE (`WHERE NOT EXISTS (SELECT 1 FROM lookup)`) returned the existing row on the replay with `inserted=FALSE`; the Result node emits a different summary ("Sugestia a fost deja notată anterior (replay idempotent).") and `domain_writes_performed=false` on replay so downstream telemetry is honest.

### #7 — Wrong-tenant read/write fails closed
✅ Tenant scope enforced at the SQL layer via `WHERE t.id = $1::uuid` and the FK on `tenant_id`. Cross-tenant probes:
- tenant A marker `marker_isolation_A` in tenant B: `count = 0`.
- tenant B marker `marker_isolation_B` in tenant A: `count = 0`.
The chain's `tenant_id` is set upstream (TR/EC) from the inbound message; the dispatcher's envelope carries it; ME_Validate_Dispatcher_Result enforces it. ME's Prep emits `__db.tenant_id = env.tenant_id`. There is no path through which a caller can override the tenant scope from outside its own envelope.

### #8 — Ambiguous/empty feedback creates no low-quality rows
✅ Probe `imp:empty_neg` with content `"..."` produced `_error: AMBIGUOUS_OR_EMPTY_FEEDBACK` from `ME_Improvement_Capture_Prep`. The DB node never fired (the `_error: true` short-circuits the queryReplacement to all-nulls and the `WHERE t.id = $1::uuid` evaluates against a NULL → 0 candidates → 0 inserts). Result: `count(*) FROM public.improvement_requests WHERE user_message = '...' OR requested_feature = '...'` = **0**.

### #9 — Runtime test matrix
✅ Ran 12 sequential live executions through WF-TR-01 (run-tag `imp-2026-04-25`):

| # | type | execution_id | outcome |
|---|---|---|---|
| 1 | bug report (RO) | 8632 | row written |
| 2 | feature request (RO) | 8646 | row written |
| 3 | feature request (EN) | 8660 | row written |
| 4 | UX feedback (RO) | 8674 | row written |
| 5 | automation request (RO) | 8688 | row written |
| 6 | empty / ambiguous (negative) | 8702 | `AMBIGUOUS_OR_EMPTY_FEEDBACK`; **no row** |
| 7 | tenant A isolation | 8716 | row written in **A only** |
| 8 | tenant B isolation | 8730 | row written in **B only** |
| 9 | replay (bug report v2) | 8744 | **0 new rows** (idempotency held) |
| 10 | regression: store_memory | 8747 | memory_items row written |
| 11 | regression: create_task | 8761 | tasks row written |
| 12 | regression: create_reminder→task | 8775 | tasks row written, 0 reminders write |

Cardinality is at the user-ready bar: bug + feature×2 (RO+EN) + UX + automation + replay + tenant isolation + ambiguous-negative + 3 cross-corridor regressions = 12 probes. List/read-only is **not** implemented (see #3).

### #10 — Final marker

`IMPROVEMENT_MODULE_LIVE_EXECUTION_READY_FOR_E2E = TRUE`

## Cross-corridor regression results

- **store_memory** (Memory V2): 1 new `memory_items` row written from the regression probe (probe 10), tenant-scoped, idempotency_key correctly built. ✅
- **create_task** (task_module): 1 new `tasks` row written from probe 11. ✅
- **create_reminder→task**: 1 new `tasks` row written with `due_type=datetime`, `due_at=2026-04-26T16:00:00Z`, `metadata.origin='reminder_intent'`. 0 `reminders` writes. ✅

The predecessor verdicts `TASK_MODULE_LIVE_EXECUTION_READY_FOR_E2E = TRUE`, `E2E_TASK_CORRIDORS_PHASE1_READY = TRUE`, `F14_STORE_MEMORY_INTENTMAP_READY = TRUE` continue to hold.

## P0 invariants — all GREEN

| Invariant | Result |
|---|---|
| capture_feedback writes a real `improvement_requests` row | ✅ 7 rows / 7 probes |
| log_improvement_request alias works (or unreachable) | ✅ aliased |
| RC output is natural Romanian, no raw JSON, no internal table names, no false promise | ✅ "Am notat sugestia / problema pentru îmbunătățire." propagated; 0 hits for `improvement_requests` in MO output |
| Zero writes to `memory_items` / `tasks` / `reminders` from improvement-only probes | ✅ |
| Idempotent under replay | ✅ 1 row across 2 fires |
| Wrong-tenant fails closed | ✅ 0/0 cross-tenant leaks |
| Ambiguous/empty produces no low-quality rows | ✅ 0 rows for `"..."` |
| No Memory V2 reopen | ✅ Memory V2 nodes byte-identical |
| No task_module regression | ✅ probe 11 GREEN |
| No duplicate workflow | ✅ patches in place |

## Workflow mutation count

**2** (`WF-ME-01` + `WF-PL-01`).

## Schema mutation count

**0.**

## No Memory V2 reopen confirmation

Confirmed. Zero changes to any `WF-ME-01.ME_Memory_*` node, to `public.memory_items` schema, to Memory V2 design freeze docs, phase gates, write-fence, or decision ledger. Memory V2 closure (`MEMORY_100_FOR_CURRENT_STAGE = TRUE`) preserved.

## No duplicate workflow confirmation

Confirmed. Only `WF-ME-01` (`uq26nh1grIpnHju0`) and `WF-PL-01` (`RwToPLa1ErHl2tUi`) were patched in place via the V2-028 canonical local CLI. No `WF-ME-01-fixed` / `WF-PL-01-improvement` / `v2_copy`. No Path 5. No unauthorized MCP write.

## Known limitations (non-P0)

1. **Idempotency uses `(tenant_id, user_message)` natural key.** The schema lacks a dedicated `idempotency_key` column. Replay safety holds for same-message replays. Two distinct genuine submissions with verbatim-identical text from the same tenant would collapse to a single row — accepted limitation; documented here. Adding `idempotency_key` would require a schema migration outside this mission's scope.
2. **`list_improvements` not implemented** — see acceptance #3 above. Tracked as `IMPROVEMENT_MODULE_LIST_FOLLOWUP`.
3. **Category heuristic is best-effort and not stored.** The schema has no `category` column on `improvement_requests`; the Prep node computes a 4-class telemetry tag (`bug | feature | ux | automation | other`) and surfaces it in `module_result.actions_executed[0].details.category` for telemetry only. Adding a column for it is a future schema-migration mission.
4. **status field is left at `'pending'`.** Workflow does not set advanced statuses (`planned`, `done`, `rejected`); those are operator-driven status transitions outside this mission's scope.

## Next recommended frontier

Choose from these (small, contract-backed):

1. **`IMPROVEMENT_MODULE_LIST_FOLLOWUP`** — add `ME_Route_Improvement_Action` sub-router + list_improvements handler chain (read-only). Closes acceptance #3 fully.
2. **Resume `PROJECT-E2E-RICH-TEST-MATRIX` for the remaining corridor batch** — C1 / C5 / C7 / C9 / and the memory-side C2 / C3 / C4 batches. With task / memory / improvement / reminder-as-task all live, the chain has full domain-write coverage for the canonical user actions.
3. **Optional** doc-only hygiene pass on `workflows/WF-OR-01_Orchestrator/docs/WF-OR-01_CONTRACTS.md` §4 to mark the four telemetry-only flags as descriptive (deferred from F9 closeout).

Memory V2 stays closed. Task module stays untouched.

`IMPROVEMENT_MODULE_LIVE_EXECUTION_READY_FOR_E2E = TRUE`
