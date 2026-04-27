# NEXT_3_FOLLOWUPS_CLOSEOUT

Bundle: `ucenicul_next_3_followups_pack` (operator-supplied 2026-04-27).
Date: 2026-04-27 (autonomous run).
Pre-state baseline: `FULL_240_VARIANT_SWEEP_GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS`.

## Bundle verdict

**`NEXT_3_FOLLOWUPS_CLOSED_GREEN = TRUE`**

All 3 missions closed GREEN. No P0 stop conditions triggered. No
schema migrations. No duplicate workflows. No Path 5. No unauthorized
MCP write. Memory V2 NOT reopened.

## Per-mission verdicts

| # | Mission | Verdict | Mission-local closeout |
|---|---|---|---|
| 1 | `C11_REPLAY_GROUPING_TARGETED_RERUN` | **`C11_REPLAY_GROUPING_TARGETED_RERUN_READY = TRUE`** | `docs/architecture/e2e/c11_replay_grouping_targeted_rerun/C11_REPLAY_GROUPING_CLOSEOUT.md` |
| 2 | `MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP` | **`MEMORY_RECALL_PL_INTENTMAP_READY = TRUE`** | `docs/architecture/pl/memory_recall_intentmap/MEMORY_RECALL_CLOSEOUT.md` |
| 3 | `IMPROVEMENT_MODULE_LIST_FOLLOWUP` | **`IMPROVEMENT_MODULE_LIST_READY = TRUE`** | `docs/architecture/improvement_module/list_followup/IMPROVEMENT_LIST_CLOSEOUT.md` |

## Workflow version lineage (cumulative across this bundle)

| Workflow | Pre-bundle | Post-mission-1 | Post-mission-2 | Post-mission-3 | Net Δ |
|---|---|---|---|---|---|
| WF-TR-01 | `88d2d45b…` | unchanged | unchanged | unchanged | byte-identical |
| WF-EC-01 | `d25e4316…` | unchanged | unchanged | unchanged | byte-identical |
| WF-OR-01 | `f4925ede…` | unchanged | unchanged | unchanged | byte-identical |
| WF-PL-01 | `839b1750-2fb2-40ab-aeb2-88508d0a01c7` (16/16) | unchanged (no patch) | `4e0406c3-9813-4374-9178-581409c6bdc4` (16/16, jsCode v2.4 → v2.5) | `d97af7ff-54c3-4625-9f09-1fbddf7cdc03` (16/16, jsCode v2.5 → v2.6) | jsCode rewritten twice; 0 node delta, 0 connection delta |
| WF-DI-01 | `a1f9eaa2…` | unchanged | unchanged | unchanged | byte-identical |
| WF-ME-01 | `328b2b81-58e6-4003-8966-4159d695cfda` (62/81) | unchanged | unchanged | `d2197ed5-5f2d-454e-a540-fd464f526d2e` (66/88) | **+4 nodes / +7 connections** (sub-action router + list lane) |
| WF-RA-01 | `4a2be8b4…` | unchanged | unchanged | unchanged | byte-identical |
| WF-SU-01 | `4e7bc0d1…` | unchanged | unchanged | unchanged | byte-identical |
| WF-RC-01 | `6d3f5208…` | unchanged | unchanged | unchanged | byte-identical |
| WF-MO-01 | `4e0163b2…` | unchanged | unchanged | unchanged | byte-identical |

## Node / connection delta summary

| Bucket | Bundle Δ |
|---|---|
| Node delta (cumulative) | **+4** (WF-ME-01 only) |
| Connection delta (cumulative) | **+7** (WF-ME-01 only) |
| Schema mutations | **0** |
| Duplicate workflows | **0** |
| Path 5 invocations | **0** |
| Unauthorized MCP writes | **0** |
| Memory V2 reopen | **NO** |

## Side-effect summary

| Bucket | Pre-bundle | Post-bundle | Δ |
|---|---|---|---|
| `public.reminders` count / max(created_at) | 1 / 2026-04-13 20:17:13Z | 1 / 2026-04-13 20:17:13Z | **0** |
| `public.tenants` (e2e lanes) | 3 | 3 | 0 |
| `public.threads` (e2e M1 / M2 / M3) | 0 | 16 | +16 (idempotent seed) |
| `public.messages` (e2e M1 / M2 / M3) | 0 | 16 | +16 (idempotent seed) |
| `public.execution_contexts` for the 16 e2e threads | 0 | 16 | +16 (1 per thread; 4 replay-group fires of M1 share 1 EC) |
| `public.memory_items` (default tenant) | 44 | +3 (M1 fresh control, M1 replay-group 1, M2 R-1 store, M3 IL-R-store ⇒ 4 wait, see below) | +3 |
| `public.memory_items` (tenant A) | 5 | 5 | 0 |
| `public.memory_items` (tenant B) | 2 | 2 | 0 |
| `public.tasks` (default tenant) | 71 | +2 (M2 R-2 task, M3 IL-R-task) | +2 |
| `public.improvement_requests` (default tenant) | 11 (citing per FULL_240_VARIANT_SWEEP_CLOSEOUT.md; current actual = 12 due to one cross-mission addition) | +1 (M3 IL-005) | +1 |

**Net memory_items in default tenant (this bundle):**
- M1 RG-001 first delivery: +1
- M1 RG-005 fresh control: +1
- M2 R-1 store regression: +1
- M3 IL-R-store regression: +1
**Total: +4** memory rows (intentional regressions only — list/recall/replay-dedupe probes wrote 0).

## P0 invariant summary

| Condition | Triggered? | Notes |
|---|---|---|
| Cross-tenant data leak | **NO** | M1 tenant A/B for replay/fresh threads = 0; M2 IL-004 EC in tenant B only; M3 IL-004 EC in tenant B only; no cross-tenant rows surfaced anywhere |
| Wrong-tenant write/update/supersede | **NO** | All writes confined to envelope tenant |
| Retry duplicate side-effect on canonical replay | **NO** | M1 replay group: 4 fires → 1 memory row (dedupe at OR via execution_contexts uniqueness on (tenant, message_id)) |
| Ambiguous input writes domain row | **NO** | No ambiguous probes triggered (existing ACG guards untouched) |
| Response-only/social writes domain data | **NO** | Recall/list lanes are explicitly read-only (`domain_writes_performed=false`) |
| Session-only data becomes durable memory | **NO** | All durable writes were intentional `store_memory` regressions |
| Reminder-like writes to `public.reminders` | **NO** | reminders.count=1, max(created_at)=2026-04-13 20:17:13Z **unchanged** post-bundle |
| Raw JSON in user-facing output | **NO** | All ME result envelopes are structured (Romanian summary, no raw SQL leak) |
| Schema migration required without authorization | **NO** | 0 DDL applied; all filters fit existing columns |
| Duplicate workflow created | **NO** | 0 |
| Path 5 needed | **NO** | 0 |
| Unauthorized MCP workflow write | **NO** | All mutations via canonical V2-028 local CLI (`n8n-patch.mjs`); MCP only used for read (`get_workflow`, `verify_workflow`) and `execute_workflow` (live fires) |

## Documents written

### Mission 1 (`docs/architecture/e2e/c11_replay_grouping_targeted_rerun/`)

- `C11_REPLAY_GROUPING_SCOPE_FREEZE.md`
- `C11_REPLAY_GROUPING_FIXTURES.md`
- `C11_REPLAY_GROUPING_RUNTIME_RESULTS.md`
- `C11_REPLAY_GROUPING_SQL_INVARIANTS.md`
- `C11_REPLAY_GROUPING_FAILURE_CLASSIFICATION.md`
- `C11_REPLAY_GROUPING_EXECUTION_LOG.md`
- `C11_REPLAY_GROUPING_CLOSEOUT.md`
- `artifacts/build_c11_rg_runtimes.mjs` + `seed.sql` + 5 envelope JSON files + 1 runtime summary

### Mission 2 (`docs/architecture/pl/memory_recall_intentmap/`)

- `MEMORY_RECALL_DISCOVERY.md`
- `MEMORY_RECALL_DESIGN_FREEZE.md`
- `MEMORY_RECALL_PATCH_EVIDENCE.md`
- `MEMORY_RECALL_PROBE_RESULTS.md`
- `MEMORY_RECALL_SQL_INVARIANTS.md`
- `MEMORY_RECALL_EXECUTION_LOG.md`
- `MEMORY_RECALL_CLOSEOUT.md`
- `artifacts/PL_Build_Planner_Input_v2.4_pre.js` + `_v2.4.js` + `_v2.5.js` + `_v2.5.params.json` + 7 envelope JSON files + `seed.sql`

### Mission 3 (`docs/architecture/improvement_module/list_followup/`)

- `IMPROVEMENT_LIST_SCHEMA_PREFLIGHT.md`
- `IMPROVEMENT_LIST_DESIGN_FREEZE.md`
- `IMPROVEMENT_LIST_PATCH_EVIDENCE.md`
- `IMPROVEMENT_LIST_RUNTIME_RESULTS.md`
- `IMPROVEMENT_LIST_SQL_INVARIANTS.md`
- `IMPROVEMENT_LIST_EXECUTION_LOG.md`
- `IMPROVEMENT_LIST_CLOSEOUT.md`
- `artifacts/build_pl_v26.mjs` + `build_me_patch.mjs` + `WF-ME-01_pre.json` + `_post.json` + `PL_Build_Planner_Input_v2.6.js` + `_v2.6.params.json` + 7 envelope JSON files + `seed.sql`

### Bundle level

- `docs/architecture/e2e/next_3_followups/NEXT_3_FOLLOWUPS_CLOSEOUT.md` (this file).
- Compact addendum to
  `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md`.
- Update to `docs/architecture/Module_Registry_Ucenicul.md` marking
  `list_improvements` and `recall_memory` as user-ready / canonical.

## Remaining follow-ups (deferred non-blockers)

| Follow-up | State |
|---|---|
| FULL_240 syntactic siblings (L1-V3/V4 of remaining corridors + L2..L5 × V1..V4) | Deferred — same code path as proven L1 family samples |
| MO `MISSING_DELIVERY_TARGET` for e2e tenants | `KNOWN_FIXTURE_LIMITATION` — oracle-classified |
| `reminder_module.{list,update,cancel}` ME stubs | Out of stage per ADR-REMINDER-AS-TASK-LAYER; future `REMINDER-DELIVERY-LAYER` mission |
| improvement_requests `category` / `severity` columns | Out of scope — would require schema migration |
| Reminder delivery (scheduler + temporal) | Future `REMINDER-DELIVERY-LAYER` mission |

## Next recommended frontier

1. **`REMINDER-DELIVERY-LAYER`** — scheduler + temporal + actual MO
   delivery for reminder-like tasks (current routing per
   ADR-REMINDER-AS-TASK-LAYER goes through task_module). Highest
   business value remaining.
2. **`FULL_240_RERUN`** with the new `recall_memory` and
   `list_improvements` lanes in place — exhaustive 240/240 across all
   corridors, levels, and variants now that all chain corridors are
   GREEN. Mechanical sweep, no expected safe-fix.
3. **`improvement_module.update / close / categorize`** — write-side
   improvement actions if and when product opens that surface (would
   need a small schema migration to add `category` / `severity` /
   `closed_at` and a corresponding ME action set).

## Verdict line

**`NEXT_3_FOLLOWUPS_CLOSED_GREEN = TRUE`**
