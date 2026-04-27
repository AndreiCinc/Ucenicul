# TASK_CORRIDORS_PHASE1 Scope Freeze

> Frozen at preflight exit. Implementation must match this freeze. Any
> deviation requires a freeze update with reason recorded in
> `TASK_CORRIDORS_PHASE1_EXECUTION_LOG.md`.

## In scope

- Build a **task-focused** subset of the E2E rich matrix covering corridors
  C6 (planning/composition), C10 (tenant isolation), C11 (idempotency/retry),
  C12 (large composition), plus an explicit reminder-like-task lane.
- Run the cases sequentially through `WF-TR-01` via `mcp__f2e8be41-…__execute_workflow`
  with a JSON `chatInput` containing the canonical TR envelope.
- Pre-seed `public.tenants` / `public.threads` / `public.messages` with
  `intent` set, per the `seed_fixtures.mjs` idempotent pattern.
- Run SELECT-only SQL invariants per case scoped by `tenant_id +
  thread_id + fire_iso`, plus global probes for tenant isolation,
  idempotency uniqueness, and the reminders-table invariant.
- Treat `MISSING_DELIVERY_TARGET` at MO as KNOWN_FIXTURE_LIMITATION rather
  than a task-module failure (the e2e tenants do not have a real Telegram
  channel target wired in, by design).
- Patch the harness only if a real harness defect is discovered. This
  mission does not modify `WF-ME-01` or `WF-PL-01` unless a real task-path
  regression is proven; the predecessor mission left those green.
- Write mission-local closeout under
  `docs/architecture/e2e/task_corridors_phase1/`.

## Out of scope

- The **full 240-case** rich matrix — explicitly deferred per pack §Scope.
- Memory V2 work — closed (`MEMORY_100_FOR_CURRENT_STAGE = TRUE`).
- `improvement_module` implementation — out of scope (separate F13 frontier).
- `reminder_module` CRUD — deferred per ADR-REMINDER-AS-TASK-LAYER.
- F14 `store_memory` PL.intentMap fix — out of scope per pack.
- Broad OR rewrite (F9 hardcoded gates) — separate frontier.
- Workflow mutation absent a proven regression on the task path.
- Path 5; duplicate workflows; unauthorized MCP workflow writes; fake
  Telegram delivery targets.

## Tenant lanes

| Lane | tenant_id | Used for |
|---|---|---|
| DEFAULT | `eee0e2e0-0000-0000-0000-000000000001` | C6, C11, C12, reminder-like |
| A       | `eee0e2e0-0000-0000-0000-00000000000a` | C10 (write side) |
| B       | `eee0e2e0-0000-0000-0000-00000000000b` | C10 (cross-leak probe) |

Tenants are pre-seeded by the predecessor mission and verified live; no
new tenants are created.

## Run-tag

`tcp1-2026-04-25` — appears in:
- `messages.source_message_ref` as `tcp1:{case_id}:{idempotency_key}`
- `tasks.metadata->>'idempotency_key'` as `idem:create_task:{exec_ctx_id}:{step_id}`
  (set by ME_Task_Create_Prep — already proven idempotent)
- TR envelope `idempotency_key` as `tmr:tcp1:{case_id}` (used for replay
  cases only; does NOT propagate to the task row's idempotency marker —
  that is generated downstream from the dispatcher envelope, per pack
  §rule 3).

## Cardinality target

Pack §"Case matrix target":

| Corridor | Target | Minimum |
|---|---|---|
| C6 | 20 | **12** |
| C10 | 20 | **12** |
| C11 | 20 | **12** |
| C12 | 20 | **12** |
| reminder-like | 10 | **8** |
| **Total** | **90** | **56** |

This mission **runs the minimum 56** cases on the rationale below
(documented per pack §"Document natural-cardinality if you run fewer
than 90"):

- C6 collapses onto the same `task_module.create_task` chain path with
  input variations. 12 carefully-chosen cases cover Romanian/English,
  with/without due fields, with/without entity, with/without priority —
  exhausting the distinct chain branches.
- C10 reduces to one binary invariant ("no cross-tenant leak") tested
  with 6 tenant-A writes + 6 tenant-B writes + cross-tenant reads on top.
- C11 reduces to "first-write-wins on replay"; 4 base cases × 3 replay
  patterns = 12.
- C12 large composition has limited natural variation that doesn't reduce
  to C6+C2+C4: we run 12 messages with progressively complex shapes.
- reminder-like is the simplest lane (one chain path); 8 RO/EN
  date-temporal phrasings exhaust the extractor.

If any P0 stop condition fires, this mission stops. If any case produces
ambiguous results, additional cases (toward the 90-case ceiling) are run.

## P0 stop conditions

(Verbatim from pack §"P0 stop conditions")

Stop and report if any of:

- cross-tenant task write or read happens;
- replay creates duplicate task rows;
- wrong-tenant update/complete/delete succeeds;
- reminder-like writes to `public.reminders`;
- ambiguous task target mutates DB;
- delete hard-deletes instead of soft-cancel;
- task result leaks raw JSON to final response;
- Memory routes are changed;
- duplicate workflow is created;
- Path 5 is used;
- unauthorized MCP workflow write is used.

## Verdict ladder

- `E2E_TASK_CORRIDORS_PHASE1_READY = TRUE` — issued only if every P0
  invariant stays GREEN AND ≥56 cases ran AND every corridor produced
  ≥1 GREEN run.
- `E2E_TASK_CORRIDORS_PHASE1_PARTIAL_WITH_BLOCKERS` — issued if a
  recoverable harness/oracle/fixture issue blocked some cases but no P0
  fired.
- `E2E_TASK_CORRIDORS_PHASE1_STOPPED_ON_P0` — issued if a P0 stop
  condition fired.
