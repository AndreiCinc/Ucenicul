# Task Module Design Freeze

> **Mission:** `TASK-MODULE-LIVE-EXECUTION-USER-READY`
> **Status:** FROZEN at preflight exit. Implementation must match this freeze byte-for-byte;
> any deviation requires a freeze update with reason.

This freeze defines the workflow surface, the SQL surface, and the test surface for the
user-ready task module. The schema preflight that backs every assumption here is captured
in `TASK_NOW_EXECUTION_LOG.md` §4.3–§4.4.

---

## 1. Scope

In scope:
- WF-PL-01 `PL_Build_Planner_Input` — reminder-like → task rewrite + due field extraction.
- WF-ME-01 task surface — replace 5 stub Result nodes with a real Prep → DB → Result chain
  that writes to `public.tasks`.

Out of scope (per pack `02_BASELINE_AND_SCOPE_LOCK.md`):
- memory routing changes (including F14 `store_memory` intent-map gap),
- reminder_module CRUD or scheduler / delivery,
- DB schema migration,
- duplicate workflows,
- broad planner rewrite.

## 2. Action contract — frozen

### 2.1 `create_task`

Required input: `description` OR `title`. Tenant scope from `dispatcher_input.tenant_id`
through `ME_Validate_Dispatcher_Result.env.tenant_id`.

Optional input: `priority` ∈ {`low`,`normal`,`high`,`urgent`}, `due_type` ∈
{`flexible`,`date`,`datetime`}, `due_date` (ISO date), `due_at` (ISO datetime),
`business_id`, `entity_id`, `source`, `metadata`.

Defaults: `priority='normal'`, `due_type='flexible'`, `status='open'`. If `due_at` is set
but `due_type` is missing, `due_type` is normalized to `'datetime'`. If `due_date` is set
but `due_type` is missing, `due_type` is normalized to `'date'`.

Idempotency key: `idem:create_task:${env.execution_context_id}:${env.step.step_id}` —
stored at `metadata->>'idempotency_key'`. SELECT-before-INSERT CTE pattern; on replay the
existing row is returned with `inserted=false`.

Side effects: exactly one `tasks` row per call. Zero `reminders` rows.
`domain_writes_performed=true` on success.

### 2.2 `list_tasks`

Read-only. Filterable by `status` (default `open`), `due` window (optional ISO range),
`priority`, `entity_id`. Default limit `20`, max `100`. Tenant-scoped. Result returns up
to `limit` rows. `domain_writes_performed=false`.

Empty state: `module_result.summary` = "No matching tasks." with `actions_executed[0].details.tasks=[]`.

### 2.3 `update_task`

Required input: `task_id` (uuid) OR `title_match` (substring matched against `title`+`description`).
At least one mutable field in {`title`,`description`,`priority`,`due_type`,`due_date`,`due_at`,`status`,
`entity_id`,`source`}.

Resolution rule (frozen ambiguity policy — pack 06):
- 0 candidates → `_error: NOT_FOUND`, no DB mutation.
- 1 candidate → UPDATE that row scoped by `tenant_id`.
- ≥2 candidates → `_error: AMBIGUOUS_TASK_REFERENCE`, no DB mutation, payload lists
  candidate `task_id`+truncated title for clarification.

Replay safety: SELECT-then-UPDATE in a single CTE; second replay produces an UPDATE that
sets `updated_at=now()` and possibly identical other fields — DB row converges. Test
matrix asserts no row count change on replay.

`domain_writes_performed=true` on actual UPDATE; `false` if NOT_FOUND or AMBIGUOUS.

### 2.4 `complete_task`

Required input: `task_id` OR `title_match`. Same resolution policy as `update_task`.
Setting status: `status = 'done'`, `completed_at = now()`, `updated_at = now()`. UPDATE
predicate also restricts `status NOT IN ('done','cancelled')` to keep replay idempotent
(re-completing a `done` task is a no-op success).

`domain_writes_performed=true` on transition; `false` if already `done` (replay) or
NOT_FOUND or AMBIGUOUS.

### 2.5 `delete_task` / cancel

**Soft cancel** is the canonical default (pack 04). UPDATE sets `status='cancelled'`,
`updated_at=now()`. Predicate restricts `status NOT IN ('done','cancelled')`. No hard
DELETE. `domain_writes_performed=true` on transition; `false` on already-cancelled
replays / NOT_FOUND / AMBIGUOUS.

### 2.6 `create_reminder` / reminder-like

Routed to `task_module.create_task` at PL. Due fields:
- if extraction yielded only a date → `due_type='date'`, `due_date=…`, `due_at=NULL`
- if extraction yielded a datetime → `due_type='datetime'`, `due_at=…`, `due_date=NULL`
- if neither → `due_type='flexible'`, both NULL

`metadata.origin = 'reminder_intent'` is set by PL so RC/MO can phrase the response
naturally. **No write to `public.reminders`.**

## 3. Module Result envelope — frozen

Every `ME_Task_*_Result` returns:

```jsonc
{
  "status_kind": "success" | "error",
  "result_type": "module_result",
  "execution_context_id": "<from env>",
  "thread_id": "<from env>",
  "tenant_id": "<from env>",
  "module_result": {
    "module_name": "task_module",
    "step_id": "<step.step_id>",
    "result_type": "execution" | "analysis",  // analysis only for list_tasks
    "status": "success" | "error",
    "summary": "<short user-safe sentence>",
    "observations": [],
    "proposals": [],
    "actions_executed": [{
      "action": "create_task" | "list_tasks" | "update_task" | "complete_task" | "delete_task",
      "details": { "...action-specific..." }
    }],
    "artifacts": [...],         // task_id list, NEVER raw JSON
    "confidence": 1.0,
    "needs_followup": <bool>,
    "followup_requests": [...]
  },
  "module_execution_started": true,
  "domain_writes_performed": <bool>,
  "response_generation_allowed": false
}
```

Error envelope (validation failure, NOT_FOUND, AMBIGUOUS, DB error):

```jsonc
{
  "_error": true,
  "error_code": "MISSING_REQUIRED_FIELDS" | "NOT_FOUND" | "AMBIGUOUS_TASK_REFERENCE" | "DB_WRITE_FAILED",
  "error_message": "<user-safe>",
  "missing_fields": [...],
  "candidates": [...]    // only for AMBIGUOUS_TASK_REFERENCE
}
```

`ME_Return_Result` already wraps both shapes correctly; we keep it as-is.

## 4. WF-ME-01 patch surface

### 4.1 New nodes (10)

For each action `<A> ∈ {Create, List, Update, Complete, Delete}`:

- `ME_Task_<A>_Prep` — `n8n-nodes-base.code` v2 — pure JS that:
  1. Reads `env = $('ME_Validate_Dispatcher_Result').first().json`.
  2. Validates required inputs; returns `{_error:true, error_code:'MISSING_REQUIRED_FIELDS', missing_fields:[…]}` on failure.
  3. Normalizes inputs (priority/due_type/due_date/due_at coerced; idempotency_key built).
  4. Builds `__db: {…parameter slots…}` consumed by the matching DB node's `queryReplacement` array.
- `ME_Task_<A>_DB` — `n8n-nodes-base.postgres` v2.4 — `executeQuery` against credential
  `Postgres account 2` (id `z9nKgToNWvIW7P8f`) with parameterized SQL (`$1..$N`) and
  `queryReplacement = $json._error ? [null,null,…] : [$json.__db.field1, …]`.
  `continueOnFail=true`, `alwaysOutputData=true`.

### 4.2 Existing nodes (rewritten in place)

- `ME_Task_Create_Result`, `ME_Task_List_Result`, `ME_Task_Update_Result`,
  `ME_Task_Complete_Result`, `ME_Task_Delete_Result` — `parameters.jsCode` rewritten
  to merge `prep` (via `$('ME_Task_<A>_Prep').first().json`) with `db` (via
  `$json` from the DB node) and emit the canonical envelope.

### 4.3 Connection rewiring (10 connection deltas)

- For each action `<A>`:
  - **REMOVE** `ME_Route_Task_Action[<i>] → ME_Task_<A>_Result`.
  - **ADD** `ME_Route_Task_Action[<i>] → ME_Task_<A>_Prep`.
  - **ADD** `ME_Task_<A>_Prep → ME_Task_<A>_DB`.
  - **ADD** `ME_Task_<A>_DB → ME_Task_<A>_Result`.
- `ME_Task_<A>_Result → ME_Return_Result` connections are kept unchanged.

### 4.4 Final node / connection counts

| Surface | Before | After | Delta |
|---|---|---|---|
| nodes | 49 | 59 | +10 |
| connections | 67 | 77 | +10 |

The `ME_Route_Task_Action` switch and its 6th fallback output → `ME_Return_Error` are
unchanged. Memory / reminder / improvement / watcher / context / dispatch nodes are
**byte-identical** post-patch.

## 5. SQL — frozen

Credentials: `Postgres account 2` / id `z9nKgToNWvIW7P8f`.

### 5.1 create_task (parameter slots 1..12)

```sql
WITH lookup AS (
  SELECT id FROM public.tasks
   WHERE tenant_id = $1::uuid
     AND metadata->>'idempotency_key' = $12::text
   LIMIT 1
),
ins AS (
  INSERT INTO public.tasks (
    tenant_id, business_id, entity_id, title, description,
    priority, due_type, due_date, due_at, status, source, metadata
  )
  SELECT $1::uuid, $2::uuid, $3::uuid, $4::text, $5::text,
         $6::task_priority_enum, $7::due_type_enum, $8::date, $9::timestamptz,
         'open'::task_status_enum, $10::text,
         COALESCE($11::jsonb, '{}'::jsonb) || jsonb_build_object('idempotency_key', $12::text)
  WHERE NOT EXISTS (SELECT 1 FROM lookup)
  RETURNING *, TRUE AS inserted
)
SELECT * FROM ins
UNION ALL
SELECT t.*, FALSE AS inserted
  FROM public.tasks t
 WHERE t.id = (SELECT id FROM lookup)
   AND NOT EXISTS (SELECT 1 FROM ins)
LIMIT 1;
```

Slots: `[tenant_id, business_id, entity_id, title, description, priority, due_type, due_date, due_at, source, metadata, idempotency_key]`.

Conventions for nullable slots: empty string `''` is **never** sent — Prep emits literal `null`
for unset uuids/dates/datetimes/text, and the DB cast `null::uuid` etc. is honored.

### 5.2 list_tasks (parameter slots 1..5)

```sql
SELECT id, tenant_id, business_id, entity_id, title, description,
       priority, due_type, due_date, due_at, status, source, metadata,
       created_at, updated_at, completed_at
  FROM public.tasks
 WHERE tenant_id = $1::uuid
   AND ($2::task_status_enum IS NULL OR status = $2::task_status_enum)
   AND ($3::uuid IS NULL OR entity_id = $3::uuid)
   AND ($4::task_priority_enum IS NULL OR priority = $4::task_priority_enum)
 ORDER BY (due_at IS NULL), due_at ASC, created_at DESC
 LIMIT GREATEST(1, LEAST(100, COALESCE($5::int, 20)));
```

Slots: `[tenant_id, status_filter, entity_id_filter, priority_filter, limit]`.

### 5.3 update_task / complete_task / delete_task (CTE resolve+mutate)

The same shape is reused for all three; only the SET clause differs.

```sql
WITH candidates AS (
  SELECT id, title FROM public.tasks
   WHERE tenant_id = $1::uuid
     AND status NOT IN ('done','cancelled')  -- only for complete/delete
     AND (
       ($2::uuid IS NOT NULL AND id = $2::uuid)
       OR ($2::uuid IS NULL AND $3::text IS NOT NULL AND $3::text <> ''
           AND (title ILIKE '%' || $3 || '%' OR description ILIKE '%' || $3 || '%'))
     )
   LIMIT 3
),
match_count AS (SELECT count(*)::int AS c FROM candidates),
target AS (
  SELECT id FROM candidates LIMIT 1
),
mutated AS (
  UPDATE public.tasks t
     SET <SET clause varies>,
         updated_at = now()
   WHERE t.tenant_id = $1::uuid
     AND t.id = (SELECT id FROM target)
     AND (SELECT c FROM match_count) = 1
   RETURNING t.*
)
SELECT 'updated' AS outcome, m.* FROM mutated m
UNION ALL
SELECT CASE WHEN (SELECT c FROM match_count) = 0 THEN 'not_found' ELSE 'ambiguous' END AS outcome,
       NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::text,
       NULL::task_priority_enum, NULL::due_type_enum, NULL::date, NULL::timestamptz,
       NULL::task_status_enum, NULL::text, NULL::jsonb,
       NULL::timestamptz, NULL::timestamptz, NULL::timestamptz
 WHERE NOT EXISTS (SELECT 1 FROM mutated);
```

SET clauses:

- `update_task`: `title=COALESCE($4,t.title), description=COALESCE($5,t.description),
   priority=COALESCE($6::task_priority_enum,t.priority), due_type=COALESCE($7::due_type_enum,t.due_type),
   due_date=COALESCE($8::date,t.due_date), due_at=COALESCE($9::timestamptz,t.due_at),
   status=COALESCE($10::task_status_enum,t.status), entity_id=COALESCE($11::uuid,t.entity_id),
   source=COALESCE($12::text,t.source)`
   — and the candidates filter drops the `status NOT IN ('done','cancelled')` guard so
     re-opening a done/cancelled task via explicit `task_id` is allowed.
- `complete_task`: `status='done'::task_status_enum, completed_at=now()`
- `delete_task`: `status='cancelled'::task_status_enum`

Result rows expose `outcome ∈ {updated, not_found, ambiguous}` plus the (possibly NULL)
mutated row. The `_Result` Code node maps `outcome` → envelope status / error code.

### 5.4 Tenant-scope guarantee

Every WHERE clause includes `tenant_id = $1::uuid`. No write paths exist that omit it.
SQL invariants in the matrix verify this directly with crafted cross-tenant probes.

## 6. WF-PL-01 patch surface

`PL_Build_Planner_Input.parameters.jsCode` is the only mutation in PL. The diff:

- `intentMap`: `create_reminder: 'create_reminder'` → `create_reminder: 'create_task'`
  (memory routing entries unchanged).
- `actionToModule`: `create_reminder: 'reminder_module'` → `create_reminder: 'task_module'`
  (memory routing entries unchanged).
- `extractInputsForAction`:
  - `create_task`: detects reminder phrasing (`amintește`, `nu mă lăsa să uit`,
    `remind me`) AND/OR explicit relative day ("mâine"/"poimâine"/"azi") + optional
    `ora HH(:MM)?` and emits `due_type ∈ {date,datetime,flexible}` plus `due_date`/`due_at`
    accordingly. `metadata.origin='reminder_intent'` is set when a reminder marker is detected.
  - `update_task` / `complete_task` / `delete_task`: gain a heuristic `title_match`
    extracted from the goal text (`title_match = goal` minus a small Romanian leading
    verb prefix). `task_id` is preserved from upstream `inputs.task_id` when present.
  - `list_tasks`: gains optional `status_filter` (`open`, `done`, `cancelled`, `any`)
    extracted from common phrasings.
- Reminder list/update/cancel actions remain routed to `reminder_module` since pack 06
  does not require their re-routing for current stage; their stub Result nodes do not
  write to `reminders`, so the ADR invariant holds.

Net: 0 nodes added, 0 connections changed. Single `parameters.jsCode` byte rewrite.

## 7. Patch / apply policy

Single `replace` per workflow via the V2-028 canonical channel
(`.claude/pipelines/.../n8n-patch.mjs replace`). Pre-snapshot files are written under
`docs/architecture/task_module/live_execution/artifacts/` and the n8n-patch
`snapshots/` directory; rollback is `replace` with the saved pre-snapshot.

Quality gates:
1. Pre-snapshot saved.
2. `verify_workflow` (MCP) passes pre and post.
3. Active state preserved (`active=true` for both workflows).
4. Node / connection diff matches §4.4 / §6.
5. Memory / reminder / improvement / watcher / context / dispatch nodes byte-identical.
6. `.audit.jsonl` entry recorded by the CLI.

## 8. Test surface

- Unit (50): pack matrix `unit_cases[*]`. Run as a Node script that imports the
  Prep / Result jsCode out of the workflow JSON and exercises it with mocked
  `$('ME_Validate_Dispatcher_Result')` / `$('ME_Task_<A>_Prep')` / `$json` shapes.
- Diff-surface: per §4.4 / §6, inspected directly from the post-snapshot.
- SQL invariants (50): pack matrix `sql_invariants[*]`. Run via SELECT-only Postgres MCP.
- Runtime (50): pack matrix `runtime_cases[*]`. Driven by `mcp__f2e8be41-…__execute_workflow`
  on WF-TR-01 with synthetic chat messages. Each case oracle reads the resulting
  execution and the `tasks` table.
- Targeted E2E bridge: subset of corridors C6/C10/C11/C12 + reminder-like task case
  (pack 10 §Phase 6).

A failure of any P0 oracle aborts the mission and forces the
`PARTIAL_WITH_BLOCKERS` or `STOPPED_ON_P0` verdict per pack 13.

## 9. Stop conditions retained

Stop and surface a `PRODUCT_DECISION_REQUIRED` if:
- a unique-index migration becomes necessary for true concurrent-replay safety
  (current weak-concurrency fallback documented; tests will probe it);
- the apply channel returns 4xx after PUT body is valid (channel-side issue);
- any test surfaces cross-tenant leakage that cannot be closed without schema changes.
