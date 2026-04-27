# TASK_CORRIDORS_PHASE1 Execution Log

> **Mission:** `PROJECT-E2E-RICH-TEST-MATRIX-TASK-CORRIDORS-PHASE1`
> **Doc status:** mission-local working log. Subordinate to
> `docs/architecture/Architecture_Spec_v3_Ucenicul.md`,
> `docs/architecture/n8n_Workflow_Mapping.md`,
> `docs/architecture/e2e/PROJECT_E2E_CORRIDOR_INVENTORY.md`.

## 1. Run identity

| Field | Value |
|---|---|
| Start timestamp (session) | 2026-04-25 |
| Repo root (host) | `C:\Users\andre\Projects\Ucenicul` |
| Repo root (sandbox) | `/sessions/clever-magical-wozniak/mnt/Ucenicul` |
| Mission predecessor | `TASK-MODULE-LIVE-EXECUTION-USER-READY` (closed earlier today; verdict `READY_FOR_E2E = TRUE`) |

## 2. Live workflow versions (canonical chain)

Captured via SELECT-only `mcp__postgres__execute_sql` on
`public.workflow_entity`:

| Workflow | id | versionId | nodes | active |
|---|---|---|---|---|
| WF-TR-01 Thread Resolver | `wI8hpSROxQI0zC9f` | `89b783f8-510a-4275-999e-4853490c580a` | 24 | ✅ |
| WF-EC-01 | `v9jih4jqeXpOJOiH` | `78569035-997d-4514-bdfe-6c6679b78795` | 11 | ✅ |
| WF-OR-01 | `KhGmNpi0ZDmrnz8W` | `2d37a1f3-e30a-4279-a952-2e4b1c7297fa` | 13 | ✅ |
| WF-PL-01 | `RwToPLa1ErHl2tUi` | `898fa273-68d3-4443-b6f9-9990d1739bb2` | 16 | ✅ |
| WF-DI-01 | `abqYINcXr3JAhGGk` | `8b10a865-39c4-4aa6-bee0-4ec75468ebed` | 16 | ✅ |
| WF-ME-01 Module Execution | `uq26nh1grIpnHju0` | `3804ec0e-cc32-417d-9054-253ed14dcd73` | 59 | ✅ |
| WF-RA-01 Result Aggregator | `5RcNLtxNjAHJsZPE` | `4a2be8b4-08d1-43b4-9adf-376b6c30c18a` | 16 | ✅ |
| WF-SU-01 State / Persistence Updater | `ENiYNfL3ul8AmmCB` | `4e7bc0d1-65fa-4f62-b96a-7035a99d4308` | 18 | ✅ |
| WF-RC-01 Response Composer | `TClXgmO8H8zsSwMb` | `6d3f5208-c963-4a02-811d-5a0d12d7ac6a` | 18 | ✅ |
| WF-MO-01 Output Gateway | `OooZdC0DgsDR6gm0` | `4e0163b2-e176-40ad-ac33-a8438d7c2147` | 18 | ✅ |

## 3. task_module baseline (post predecessor mission)

- `WF-ME-01` carries 5 task action lanes (`Create / List / Update / Complete / Delete`),
  each lane = `Prep (Code) → DB (Postgres parameterized) → Result (Code)` per
  `docs/architecture/task_module/live_execution/TASK_MODULE_DESIGN_FREEZE.md`.
- `WF-PL-01.PL_Build_Planner_Input` rewrites `create_reminder` → `create_task`
  in both `intentMap` and `actionToModule`, plus a late-binding rewrite for
  upstream `requested_actions` carrying the legacy `create_reminder` action.
- `extractInputsForAction` strips Romanian/English verb prefixes, trailing
  temporal phrases, and `taskul/reminderul` qualifiers before producing a
  `title_match` for update / complete / delete.
- DB schema unchanged. `public.tasks` has `(id, tenant_id, business_id,
  entity_id, title, description, priority, due_type, due_date, due_at,
  status, source, metadata, created_at, updated_at, completed_at)` with
  enums `task_priority_enum`, `due_type_enum`, `task_status_enum`.
- `public.reminders` is invariant: count = 1 pre-mission row, last_updated
  `2026-04-13T20:17:13Z`, untouched.

## 4. Layer-0 docs read (predecessor closeout pack)

- `TASK_MODULE_CLOSEOUT.md` (verdict + diff surface + closeout)
- `TASK_MODULE_E2E_BRIDGE_RESULTS.md` (initial smoke bridge)
- `TASK_MODULE_RUNTIME_RESULTS.md` (13 live executions across 10 groups)
- `TASK_MODULE_SQL_INVARIANTS.md` (50/50 GREEN)
- `PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` (existing reconciliation; the
  `task_module` half of F13 is documented as closed)

## 5. Layer-1 docs read

- `PROJECT_E2E_CORRIDOR_INVENTORY.md` — corridor C1..C12 contracts;
  C6/C10/C11/C12 are the load-bearing four for this mission, plus a
  reminder-like task lane that maps to C6/L4 phrasings.
- `Module_Registry_Ucenicul.md` — `task_module` entry post-predecessor
  refresh; reminder_module deferred entry confirms ADR-REMINDER-AS-TASK-LAYER.
- `decisions/ADR-REMINDER-AS-TASK-LAYER.md` — current-stage canonical
  source: reminder phrasings are tasks with due fields, not reminders rows.
- `n8n_Workflow_Mapping.md` §5 (Postgres query policy) — parameterized SQL
  is canonical; tenant scope mandatory; soft-cancel for delete.
- `Architecture_Spec_v3_Ucenicul.md` — system-level ground truth (read on
  access only; nothing in this mission requires structural change to it).

## 6. Harness inspected

- `docs/architecture/e2e/harness/tr_envelope.mjs` — flat-shape
  `ThreadResolutionRequest` builder; tenant lanes (DEFAULT/A/B); deterministic
  message_id / thread_id / idempotency_key.
- `docs/architecture/e2e/harness/n8n_client.mjs` — REST + chat-webhook
  client; reads `.env` from the n8n-patch tool dir.
- `docs/architecture/e2e/harness/seed_fixtures.mjs` — idempotent batch SQL
  for tenants/threads/messages with `intent` pre-set.
- `docs/architecture/e2e/harness/intent_mapping.mjs` — corridor-default
  → system-intent map (`create_task`, `create_reminder`, etc.); messages
  carry intent before TR fires (Option A).
- `docs/architecture/e2e/harness/walk_chain.mjs` — chain digest walker
  used post-fire for chain trace.
- `docs/architecture/e2e/harness/e2e_oracle.mjs` — recognises
  `MISSING_DELIVERY_TARGET` as KNOWN_FIXTURE_LIMITATION (per pack rule 5).
- `docs/architecture/e2e/harness/e2e_sql_invariants.mjs` — invariant
  generator scoping by tenant + thread + idempotency_key.
- `docs/architecture/task_module/live_execution/artifacts/runtime_batch.mjs`
  (predecessor mission) — task-specific seed-and-fire batch builder; we
  reuse this pattern for envelope shaping.

The harness used in this mission is the **existing E2E harness** plus a
small task-corridor-specific seed/fire wrapper (see
`TASK_CORRIDORS_PHASE1_HARNESS_NOTES.md`). No new MCPs. No workflow
mutation.

## 7. Decisions

1. **Run sequentially, not in parallel** (per pack §"Required harness rules" #1).
2. **Scope SQL invariants by `tenant_id + thread_id + fire_iso`** (per pack §rule 2). I record `fire_iso` per case from the timestamp of the first execute_workflow return.
3. **Ignore upstream `idempotency_key` propagation** — we use the metadata
   marker stamped by `ME_Task_Create_Prep` on each row (per pack §rule 3/4).
4. **MO `MISSING_DELIVERY_TARGET` is treated as KNOWN_FIXTURE_LIMITATION**
   (pack §rule 5). Task module success is asserted at SU/RA boundaries +
   DB invariants, not at MO send.
5. **Target case count: 56–64 live executions** (the pack minimum: 12 C6 +
   12 C10 + 12 C11 + 12 C12 + 8 reminder-like = 56). I will not run the
   90-case ceiling unless these 56 produce ambiguous results that demand
   more cases. Natural cardinality is justified in
   `TASK_CORRIDORS_PHASE1_CASE_MATRIX.md`.
6. **Run-tag** `tcp1-2026-04-25` for this mission's fixture / idempotency
   namespace.

## 8. Current blocker hypothesis

None. The predecessor mission proved the chain end-to-end for tasks; the
remaining unknowns are corridor-specific (large-composition coherence,
cross-tenant isolation invariant under bursty load, replay guardrails).

## 9. No-duplicate-workflow / no-mutation declaration

This mission is **read-only against workflows by default**. No
`n8n-patch.mjs replace` will run unless a real task-path regression is
proven. If a regression is found, the patch will be applied via the same
V2-028 canonical channel and documented in `TASK_CORRIDORS_PHASE1_HARNESS_NOTES.md`.
No duplicate workflows. No Path 5. No MCP `patch_workflow_nodes` writes.

## 10. Phase plan

1. Layer 0 + Layer 1 read — DONE (above).
2. Scope freeze + case matrix.
3. Fixture seeding (single idempotent batch).
4. Sequential C6 fires.
5. Sequential C10 fires.
6. Sequential C11 fires (with deliberate replays).
7. Sequential C12 fires.
8. Sequential reminder-like fires.
9. SQL invariants pass scoped by tenant+thread+fire_iso, plus global
   reminder-table-unchanged probe and idempotency uniqueness probe.
10. Compact writeback + final report.

Verdict candidate: `E2E_TASK_CORRIDORS_PHASE1_READY = TRUE` — to be
emitted only if every P0 stop condition stays GREEN.
