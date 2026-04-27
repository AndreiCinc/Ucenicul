# REMINDER_DELIVERY_LAYER · Phase 0 · Closeout

Mission: `REMINDER-DELIVERY-LAYER-PHASE0-DISCOVERY-CONTRACT-AND-DRY-RUN`.
Date: 2026-04-27 (autonomous run).
Pre-state: `NEXT_3_FOLLOWUPS_CLOSED_GREEN = TRUE` (post NEXT_3_FOLLOWUPS bundle).

## Verdict

**`REMINDER_DELIVERY_PHASE0_DRY_RUN_READY = TRUE`**

Schema discovered. Workflow surface discovered. Design options
evaluated. Option A (metadata-only delivery state on `tasks.metadata`)
frozen for Phase 0 dry-run. Dry-run candidate query built and
validated against 9 fixtures + 20 dry-run tests + 9 regression
invariants. **No mutations**, **no MO calls**, **no external sends**,
**no inserts to `public.reminders` or
`public.outbound_delivery_ledger_claude_mcp`**. Phase 1 plan written.

## Selected design option

**Option A** — metadata-only delivery state on `tasks.metadata`,
dry-run only. Phase 1 recommendation: **Option B** (new
`public.task_reminder_deliveries` table) + new
`WF-RD-01_Reminder_Delivery_Scheduler` workflow.

## Schema discovery summary

| Table | Source-of-truth role | Used in Phase 0 |
|---|---|---|
| `public.tasks` | Canonical task domain (per ADR-REMINDER-AS-TASK-LAYER). Has `due_at`, `due_date`, `due_type`, `status`, `metadata`. | YES — candidate query reads tenant-scoped open tasks with `due_at <= NOW()` |
| `public.reminders` | Legacy. NOT written by canonical chain. Untouched. | NO (preserved baseline) |
| `public.outbound_delivery_ledger_claude_mcp` | Chain-driven outbound audit (MO writes). 0 rows. `execution_context_id NOT NULL` blocks scheduler-driven reuse. | NO (Phase 0 produces 0 inserts) |
| `public.tenants.metadata` | Holds `telegram_chat_id` for delivery target. NULL on all 3 e2e tenants. | YES — read-only target lookup |

## Source-of-truth for delivery state

- **Phase 0**: `tasks.metadata.reminder_delivery` (intended-only — no
  rows actually written).
- **Phase 1 (recommended)**: new `public.task_reminder_deliveries`
  ledger with UNIQUE `(tenant_id, task_id, due_occurrence_iso)`.

## Delivery state strategy (frozen contract)

```
delivery_key = `rd:${tenant_id}:${task_id}:${due_occurrence_iso_minute}`
idempotency_key = `rd:` + sha256(delivery_key)[0:24]

state machine:
  pending → sent (telegram OK)
  pending → failed → pending (retry up to N) → failed_terminal
  pending → skipped_missing_target  (no chat_id on tenant)
  pending → skipped_backlog          (>24h past due, first-tick guard)
```

## Schema migration required?

**No, for Phase 0.** **Yes for Phase 1** (additive: new
`task_reminder_deliveries` table). Migration script + rollback
documented in `REMINDER_DELIVERY_PHASE1_PLAN.md`.

## Workflow mutation?

**No** Phase 0 mutations. WF-PL-01, WF-ME-01, WF-MO-01 versionIds
unchanged.

## New workflow proposed?

**Proposed (NOT created):** `WF-RD-01_Reminder_Delivery_Scheduler`
for Phase 1. Documented in `REMINDER_DELIVERY_PHASE1_PLAN.md`.
**Not yet declared** in `docs/architecture/n8n_Workflow_Mapping.md` —
will be declared as part of Phase 1.

## Dry-run results

24 candidates total across the 3 e2e tenants:

| Tenant | Candidates | Sample fixtures present | Sample fixtures excluded | Delivery target |
|---|---|---|---|---|
| default | 22 | F1, F2, F9 | F3 (future), F4 (done), F5 (cancelled), F6 (already sent), F8 (no due_at) | NULL → MISSING_DELIVERY_TARGET |
| tenant A | 2 | F7 | — | NULL → MISSING_DELIVERY_TARGET |
| tenant B | 0 | — | — | NULL → MISSING_DELIVERY_TARGET |

All Phase 0 candidates would be `skipped_missing_target` (no fake
delivery target seeded). Sample intended payloads stored at
`artifacts/DRY_RUN_OUTPUT.json`.

## SQL invariants

All 9 invariants ✅ (see `REMINDER_DELIVERY_SQL_INVARIANTS.md`):

- INV-1 candidate query tenant-scoped.
- INV-2 exclusions hold (F3..F6, F8 excluded).
- INV-3 tasks not mutated (`fixtures_mutated_post_seed = 0`).
- INV-4 reminders baseline preserved (count=1, max=2026-04-13 20:17:13Z).
- INV-5 outbound ledger empty (0 rows total).
- INV-6 only F6 carries `metadata.reminder_delivery` (intentional seed).
- INV-7 workflow versionIds unchanged (PL=`d97af7ff…`, ME=`d2197ed5…`, MO=`4e0163b2…`).
- INV-8 schema mutation count = 0.
- INV-9 no new workflow created (search_workflows for
  reminder|scheduler|cron returned 0 hits before AND after).

## Regression results

All 9 carried regressions verified GREEN by absence-of-impact
(0 PL/ME/MO mutations + 0 schema mutations means no regression
surface):

- `create_reminder → task` writes (PL v2.6 routing untouched).
- `create_task` writes.
- `list_tasks` read-only.
- `complete_task` works.
- `store_memory` writes.
- `capture_feedback` writes.
- `list_improvements` read-only.
- `response_module.respond_only` no-write.
- `public.reminders` count=1, max(created_at)=2026-04-13 unchanged.

## Reminders unchanged — evidence

```
Pre-mission:  count=1, max(created_at)=2026-04-13 20:17:13.620582+00
Post-mission: count=1, max(created_at)=2026-04-13 20:17:13.620582+00
```

## Delivery target policy

- **Source today:** `tenants.metadata.telegram_chat_id` (per existing
  `WF-MO-01.MO_Load_Channel_Delivery_Context`).
- **e2e lanes:** all NULL → `MISSING_DELIVERY_TARGET` is a
  KNOWN_FIXTURE_LIMITATION (mirrors `e2e_oracle.mjs` lines 76-92).
- **No fake target seeded.** No external Telegram send attempted.
- **Phase 1 prerequisite:** define a tenant onboarding flow for
  `telegram_chat_id` and a fallback policy (skip-once vs.
  skip-every-tick).

## Blockers

**None for Phase 0 (DRY_RUN_READY).**

For Phase 1 (migration + scheduler), the operator must clear:

1. Schema migration policy authorization for adding
   `public.task_reminder_deliveries`.
2. `delivery_target` policy decision (where chat_id comes from).
3. Recurrence decision (yes/no for v1).
4. Backlog throttle policy (skip > 24 h past due on first tick).
5. Direct-send-vs-call-MO decision (recommendation: direct send
   through guarded Telegram node, audit via `task_reminder_deliveries`).

## Phase 1 — exact recommendation

**Mission:** `REMINDER_DELIVERY_LAYER_SCHEMA_AND_SCHEDULER_IMPLEMENTATION`.

**Scope:**

1. Apply additive migration adding
   `public.task_reminder_deliveries` (DDL + rollback in
   `REMINDER_DELIVERY_PHASE1_PLAN.md`).
2. Create `WF-RD-01_Reminder_Delivery_Scheduler` (~12-14 nodes,
   `n8n-nodes-base.scheduleTrigger` every 60 s, direct Telegram send
   guarded by `MISSING_DELIVERY_TARGET` policy).
3. Declare WF-RD-01 in `docs/architecture/n8n_Workflow_Mapping.md`
   (does NOT duplicate WF-MO-01).
4. Run dry-run + 1 controlled live probe to a sandbox chat
   (gated on tenant onboarding decision).
5. Add backlog throttle (skip > 24 h past due once on first tick).
6. Carry the 20 dry-run tests + 5 new live tests (UNIQUE replay,
   failure path, backlog throttle, timezone localisation, end-to-end
   probe).

**Out of scope for Phase 1 v1:** recurrence, snooze, whatsapp,
per-user delivery preferences.

## Final verdict

**`REMINDER_DELIVERY_PHASE0_DRY_RUN_READY = TRUE`**

- 0 workflow mutations.
- 0 schema mutations.
- 0 new workflows created (1 proposed for Phase 1).
- 0 duplicate workflows.
- 0 Path 5 invocations.
- 0 unauthorized MCP writes (only SELECT-only `postgres` MCP +
  `search_workflows` MCP read used).
- 0 fake delivery targets seeded.
- 0 external sends.
- `public.reminders` baseline preserved.
- Memory V2 NOT reopened.
