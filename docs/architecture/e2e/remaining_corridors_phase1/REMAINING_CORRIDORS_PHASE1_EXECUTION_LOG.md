# REMAINING CORRIDORS PHASE 1 · Execution Log

> **Mission:** `PROJECT-E2E-RICH-TEST-MATRIX-REMAINING-CORRIDORS-PHASE1`
> **Run-tag:** `rcp1-2026-04-25`
> Subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md`,
> `docs/architecture/n8n_Workflow_Mapping.md`,
> `docs/architecture/e2e/PROJECT_E2E_CORRIDOR_INVENTORY.md`,
> `docs/architecture/Module_Registry_Ucenicul.md`.

## 1. Run identity

| Field | Value |
|---|---|
| Start | 2026-04-25 |
| Repo root (host) | `C:\Users\andre\Projects\Ucenicul` |
| Repo root (sandbox) | `/sessions/clever-magical-wozniak/mnt/Ucenicul` |
| Mission predecessor | `IMPROVEMENT-MODULE-LIVE-EXECUTION-USER-READY` (closed; verdict READY_FOR_E2E) |

## 2. Live workflow versions (pre-mission)

| Workflow | id | versionId | nodes | active |
|---|---|---|---|---|
| WF-TR-01 | `wI8hpSROxQI0zC9f` | `89b783f8…` | 24 | ✅ |
| WF-EC-01 | `v9jih4jqeXpOJOiH` | `78569035…` | 11 | ✅ |
| WF-OR-01 | `KhGmNpi0ZDmrnz8W` | `2d37a1f3…` | 13 | ✅ |
| WF-PL-01 | `RwToPLa1ErHl2tUi` | **`dce0febe-1bc0-42e3-a44a-a41e6737e1e7`** (post-improvement) | 16 | ✅ |
| WF-DI-01 | `abqYINcXr3JAhGGk` | `8b10a865…` | 16 | ✅ |
| WF-ME-01 | `uq26nh1grIpnHju0` | **`161a612d-603a-49a7-9580-a256e1c69be5`** (post-improvement) | 61 | ✅ |
| WF-RA-01 | `5RcNLtxNjAHJsZPE` | `4a2be8b4…` | 16 | ✅ |
| WF-SU-01 | `ENiYNfL3ul8AmmCB` | `4e7bc0d1…` | 18 | ✅ |
| WF-RC-01 | `TClXgmO8H8zsSwMb` | `6d3f5208…` | 18 | ✅ |
| WF-MO-01 | `OooZdC0DgsDR6gm0` | `4e0163b2…` | 18 | ✅ |

DB baselines (default tenant unless noted):

- `tasks`: 52 rows
- `memory_items`: 2 rows
- `improvement_requests`: 5 rows (default) + 1 (A) + 1 (B) = 7 total system-wide
- `reminders`: 1 row, `last_updated=2026-04-13T20:17:13Z` (pre-mission, untouched)

## 3. Layer-0 docs read

- `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` — current truth + all closed predecessor missions.
- `docs/architecture/improvement_module/live_execution/IMPROVEMENT_MODULE_CLOSEOUT.md`.
- `docs/architecture/pl/f14_store_memory_intentmap/F14_STORE_MEMORY_CLOSEOUT.md`.
- `docs/architecture/e2e/task_corridors_phase1/TASK_CORRIDORS_PHASE1_CLOSEOUT.md`.
- `docs/architecture/task_module/live_execution/TASK_MODULE_CLOSEOUT.md`.

## 4. Layer-1 docs read

- `docs/architecture/e2e/PROJECT_E2E_CORRIDOR_INVENTORY.md` (corridor C1..C12 contracts).
- `docs/architecture/Module_Registry_Ucenicul.md`.
- `docs/architecture/n8n_Workflow_Mapping.md`.
- `WF-PL-01` live jsCode (PL_Build_Planner_Input v2.2) — captured.
- `WF-ME-01` live JSON — Memory V2 + task + improvement chains all real DB-backed; capture handlers byte-frozen except for the F14/improvement additions.

## 5. PL/ME memory route audit findings

| Capability | PL.intentMap entry | actionToModule entry | ME handler real? |
|---|---|---|---|
| `store_memory` | ✅ `'store_memory'` (F14) | ✅ `'memory_module'` (F14) | ✅ Memory V2 |
| `search_memory` | ✅ `'search_memory'` | ✅ `'memory_module'` | ✅ Memory V2 |
| `recall_memory` | ❌ missing | (would be `'memory_module'`) | ✅ ME has it (Memory V2 `ME_Memory_Recall_*`); not invoked by canonical chain |
| `supersede_memory` | ❌ missing | (would be `'memory_module'`) | ✅ ME has it (Memory V2 `ME_Memory_Supersede_*`); not invoked by canonical chain |
| `promote_memory` | ❌ missing | (would be `'memory_module'`) | ✅ ME has it; not invoked by canonical chain |

**Implication for C4 (memory update / supersede):** The PL chain cannot
currently route a `supersede_memory` intent to the ME handler. C4 cases
that emit `messages.intent='supersede_memory'` will be deflected by PL
with `INSUFFICIENT_PLANNING_CONTEXT`. Per the mission spec C4 expectation
("if route is not exposed through PL, document as blocker/follow-up"),
C4 will be documented with empirical evidence of the PL deflection and
deferred as `MEMORY_SUPERSEDE_PL_INTENTMAP_FOLLOWUP`. No supersede SQL
side-effect is asserted from this mission.

**Implication for C9:** Cross-thread durable recall is exercised via
`search_memory` (which IS routed). The current PL chain treats "what do
you know about X" as a search query, returning rows the user previously
stored. This is sufficient evidence for the C9 corridor.

## 6. Case matrix decision

Target: 90 cases. Tool/turn budget makes 90 expensive. Adopting the pack
minimum — **57 unique cases + 1 explicit replay = 58 live fires** — with
natural-cardinality justification per corridor in
`REMAINING_CORRIDORS_PHASE1_CASE_MATRIX.md`. Every corridor is
represented:

| Corridor | Cases | Note |
|---|---|---|
| C1 | 5 | response-only / simple Q&A; RO + EN |
| C2 | 8 + 1 replay = 9 | store_memory across default + A + B; replay + content variants |
| C3 | 7 | search_memory recall against pre-seeded memories; cross-tenant probe |
| C4 | 3 | supersede_memory deflection probes (route blocked) |
| C5 | 5 | social / filler / acknowledgement |
| C7 | 7 | ambiguous task / memory / improvement |
| C8 | 6 | thread continuity (3 messages × 2 threads) |
| C9 | 7 | cross-thread durable recall + session-only-no-durable |
| Regression | 8 | mandatory per spec — task / reminder→task / improvement / log_improvement_request alias / store_memory / search_memory / list_tasks / reminders unchanged |
| **TOTAL** | **57 + 1 replay = 58 fires** | ≥ pack minimum 56 |

## 7. Fixture strategy

- Tenants: e2e-default, e2e-tenant-a, e2e-tenant-b — already seeded in DB.
- Threads: deterministic uuids per case + 1 shared thread for C8 continuity (3 messages reuse the same thread_id).
- Messages: pre-seeded with `intent` set per
  `docs/architecture/e2e/harness/intent_mapping.mjs` conventions.
- Memory seed rows: 4 pre-seeded `memory_items` rows for C3 / C9 with
  marker text and known `source_thread_id` (one in tenant A, one in
  tenant B for cross-tenant isolation, two in default tenant for
  cross-thread recall).

Run-tag `rcp1-2026-04-25` appears in `messages.source_message_ref`,
`threads.title`, and seed `memory_items.metadata.rcp1_seed=true`.

## 8. SQL invariant strategy

Per pack rule #2, scope by tenant_id + thread_id + (source_thread_id /
source_message_id where available) + fire_iso + marker text. Specific
invariants:

- Per-corridor row delta probes (additive for C2 store / regression
  writes; zero-delta for C1/C3/C5/C7 read-only / no-write expected).
- Cross-tenant memory isolation: tenant A markers absent from tenant B
  reads, and vice versa.
- Idempotency uniqueness: replay of same message_id produces no duplicate
  in any domain table.
- Reminder-table invariant: `count(public.reminders) = 1`,
  `last_updated = 2026-04-13T20:17:13Z` unchanged.
- RC-no-raw-JSON: spot-check execution_data of MO outputs for absence of
  internal JSON envelopes / table names.

## 9. Patch policy / declarations

- **No workflow mutation** in this mission (the matrix runs against the
  current chain). If a real safety bug is found, the mission stops on
  P0 and the patch is escalated as a separate small mission.
- **No Path 5.** No duplicate workflows. No unauthorized MCP write.
- **No schema migration.**
- **No Memory V2 reopen** — Memory V2 closure preserved.
- **Task module + improvement module byte-frozen** — they are exercised
  only via the regression pack to confirm no regression.
- **No fake Telegram delivery target** — MO `MISSING_DELIVERY_TARGET`
  classified as `KNOWN_FIXTURE_LIMITATION`.

## 10. Phase plan

1. Discovery + execution log (this file) ← DONE.
2. SCOPE_FREEZE + CASE_MATRIX + FIXTURES design.
3. Idempotent seed batches (tenants exist; threads + messages + memory seeds).
4. Sequential corridor fires: C1, C5, C2, C3, C4 (deflection probes), C7, C8, C9.
5. Regression pack.
6. SQL invariants pass.
7. Mission-local closeouts + compact reconciliation update.

Verdict candidate: `E2E_REMAINING_CORRIDORS_PHASE1_READY = TRUE` if every
corridor produces ≥1 GREEN run AND no P0 stop fires AND C4 is documented
as deferred per spec.
