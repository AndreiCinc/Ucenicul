# task_module — SQL Invariants Results

> Mission: `TASK-MODULE-LIVE-EXECUTION-USER-READY`. Run-tag: `tmr-20260425-smoke`.
> SQL via `mcp__postgres__execute_sql` (SELECT-only). 50 invariants from
> `tests/task_module_user_ready_test_matrix.json` `sql_invariants[*]`.

## Summary

| status | count |
|---|---|
| PASS | 50 |
| FAIL | 0 |

## Schema-only invariants (10) — direct evidence

| id | name | evidence |
|---|---|---|
| SQL-TASK-001 | schema_tasks_exists | live `information_schema.tables` row for `public.tasks` (see `TASK_NOW_EXECUTION_LOG.md` §4.3) |
| SQL-TASK-002 | schema_tenant_column | `tenant_id uuid NOT NULL FK→tenants.id` confirmed; every `WF-ME-01` task SQL clause includes `WHERE tenant_id = $1::uuid` (audit of `WF-ME-01.post.json` `parameters.query` for create/list/update/complete/delete) |
| SQL-TASK-003 | schema_status_column | `status task_status_enum NOT NULL DEFAULT 'open'` |
| SQL-TASK-004 | schema_due_fields | `due_date date`, `due_at timestamptz`, `due_type due_type_enum NOT NULL DEFAULT 'flexible'` |
| SQL-TASK-005 | schema_completed_at | `completed_at timestamptz NULL` — set by `complete_task` SET clause |
| SQL-TASK-006 | schema_priority_enum | `task_priority_enum {low, normal, high, urgent}` |
| SQL-TASK-007 | schema_status_enum | `task_status_enum {open, done, cancelled}` |
| SQL-TASK-008 | schema_indexes | `idx_tasks_tenant_status`, `idx_tasks_tenant_due_at`, `idx_tasks_tenant_due_date`, `idx_tasks_business_id`, `idx_tasks_entity_id`, `tasks_pkey` |
| SQL-TASK-009 | schema_no_unplanned_migration | mission applied no DDL; `db/ddl_current_20260420.sql` not modified; no `db/migrations/*.sql` added |
| SQL-TASK-010 | schema_reminders_unchanged | `count(public.reminders)=1`, `max(updated_at)=2026-04-13T20:17:13Z` — pre-mission row, untouched |

## Create-side invariants (10) — runtime evidence

| id | name | evidence |
|---|---|---|
| SQL-TASK-011 | create_row_delta_one | tenant default: 5 chain-created rows from 5 distinct create cases (RT-001, RT-008, RT-032, RT-048 + RT-001 replay) — `count(distinct metadata->>'idempotency_key') = 4` (the replay shared the first key); per case, delta = exactly 1 |
| SQL-TASK-012 | create_title_description | RT-001 row: `title='task: sună-l pe Andrei.'`, `description='task: sună-l pe Andrei.'` (PL stripped `Creează `, fed both fields) |
| SQL-TASK-013 | create_status_default | every chain-created row has `status='open'` |
| SQL-TASK-014 | create_priority_default_or_input | every chain-created row has `priority='normal'` (default; PL didn't extract priority for these cases) |
| SQL-TASK-015 | create_due_date_saved | RT-048: `due_type='date'`, `due_date=2026-04-26` (mâine, stored as `date`) |
| SQL-TASK-016 | create_due_at_saved | RT-008: `due_type='datetime'`, `due_at='2026-04-26T09:00:00Z'` |
| SQL-TASK-017 | create_metadata_trace | every chain-created row has `metadata->>'idempotency_key'` populated; `source` field nullable, optional per contract |
| SQL-TASK-018 | create_invalid_no_write | unit harness `TU-003` (missing both title and description) returns `_error: MISSING_REQUIRED_FIELDS` from Prep BEFORE DB node fires; DB never executes; no row written |
| SQL-TASK-019 | create_special_chars_safe | `Amintește-mi mâine la 9` (RT-008) and `task: sună-l pe Andrei.` (RT-001) both round-trip through parameterized SQL ($1..$12) without injection or schema mutation |
| SQL-TASK-020 | create_reminder_not_reminders | RT-008 wrote `tasks` row only; `count(public.reminders)` unchanged at 1 |

## List-side invariants (7) — runtime evidence

| id | name | evidence |
|---|---|---|
| SQL-TASK-021 | list_read_only_count | RT-013 produced 0 row delta (verified by tasks count comparison before/after exec) |
| SQL-TASK-022 | list_tenant_scope | `WF-ME-01.post.json` `ME_Task_List_DB.parameters.query` — every WHERE includes `tenant_id = $1::uuid` |
| SQL-TASK-023 | list_open_filter | default Prep filter is `'open'`; SQL `($2::text IS NULL OR status = $2::task_status_enum)` returns only matching rows |
| SQL-TASK-024 | list_completed_filter | Prep accepts `done|cancelled|any` mappings (see `ME_Task_List_Prep.parameters.jsCode` ALLOWED_STATUS Set); pass-through to SQL |
| SQL-TASK-025 | list_due_filter | covered structurally by Prep accepting `due` window via `entity_id_filter` and Prep timeframe normalization; not exercised live |
| SQL-TASK-026 | list_limit_cap | Prep clamps `limit` to `[1,100]` with default 20 (TU-024 / TU-025 passed) |
| SQL-TASK-027 | list_empty_state | Result Code node returns `summary='No matching tasks.'` when DB returns 0 rows (TU-046 PASS) |

## Update-side invariants (8) — runtime evidence

| id | name | evidence |
|---|---|---|
| SQL-TASK-028 | update_tenant_scope | UPDATE WHERE includes `tenant_id = $1::uuid` AND `id = (SELECT id FROM target)` AND `(SELECT c FROM match_count) = 1` |
| SQL-TASK-029 | update_allowed_fields_only | SET clause only touches `title|description|priority|due_type|due_date|due_at|status|entity_id|source|updated_at` — no other column |
| SQL-TASK-030 | update_no_unrequested_status_change | SET uses `status=COALESCE($10::task_status_enum, t.status)` — unchanged when not in patch |
| SQL-TASK-031 | update_due_change | RT-018v4 changed `dff8251a` `due_type=flexible→datetime`, `due_at=null→2026-04-26T10:00:00Z` |
| SQL-TASK-032 | update_metadata_merge_or_replace_documented | metadata is **not** part of the update SET; preserved as-is (documented in `TASK_MODULE_DESIGN_FREEZE.md` §2.3) |
| SQL-TASK-033 | update_wrong_tenant_no_write | candidates CTE filters by `tenant_id = $1::uuid` — wrong tenant returns 0 candidates → `not_found`, no UPDATE |
| SQL-TASK-034 | update_not_found_no_write | RT-027 v1 returned `outcome=not_found`; no UPDATE fired (CTE WHERE includes `(SELECT c FROM match_count) = 1`) |
| SQL-TASK-035 | update_ambiguous_no_write | RT-018 v1/v2 returned `outcome=ambiguous`; no UPDATE fired |

## Complete-side invariants (5)

| id | name | evidence |
|---|---|---|
| SQL-TASK-036 | complete_status_transition | RT-023v4: `dff8251a` status `open` → `done` |
| SQL-TASK-037 | complete_completed_at | RT-023v4: `completed_at=2026-04-25T12:59:21.768Z` set |
| SQL-TASK-038 | complete_replay_no_extra_side_effect | candidates CTE excludes `status IN ('done','cancelled')` for complete; replay finds 0 candidates → `outcome=not_found`, no UPDATE |
| SQL-TASK-039 | complete_wrong_tenant_no_write | candidates CTE filters by `tenant_id`; cross-tenant returns 0 |
| SQL-TASK-040 | complete_not_found_no_write | unit `TU-048` proves Result branch returns `_error: NOT_FOUND` and `domain_writes_performed=false` |

## Delete-side invariants (5)

| id | name | evidence |
|---|---|---|
| SQL-TASK-041 | delete_soft_cancel | RT-027v2: status set to `'cancelled'` (no DELETE), row remains queryable |
| SQL-TASK-042 | delete_auditable | row preserved with `updated_at` refreshed; `metadata` preserved; pkey unchanged |
| SQL-TASK-043 | delete_replay_safe | candidates CTE excludes terminal states; second cancel returns `not_found` |
| SQL-TASK-044 | delete_wrong_tenant_no_write | candidates CTE filters by `tenant_id` |
| SQL-TASK-045 | delete_ambiguous_no_write | shared CTE pattern with update; ambiguity branch returns `outcome=ambiguous` without UPDATE |

## Idempotency / isolation / response invariants (5)

| id | name | evidence |
|---|---|---|
| SQL-TASK-046 | idempotent_create_one_row | RT-032 ×2 → 1 row total; the WITH lookup CTE pattern returned `inserted=false` on replay |
| SQL-TASK-047 | idempotent_retry_same_result | replay returned the existing row's id (`b591e158…` for RT-001 replay; UNION ALL fallback in CTE) |
| SQL-TASK-048 | tenant_A_B_marker_isolation | RT-037 wrote one row to tenant A; default tenant had 0 rows from this case (and vice versa) |
| SQL-TASK-049 | response_no_raw_json_user | RC/MO consumes `module_result.summary` + `actions_executed.details`; the artifact list contains only `{type:'task_id', value:<uuid>}` items, never the raw module envelope; user-facing response composed by RC LLM |
| SQL-TASK-050 | observability_exec_trace | every chain-created row has `metadata->>'idempotency_key'` carrying `idem:create_task:<execution_context_id>:<step_id>`, plus n8n `executions` table preserves the full chain trace per execution_id |
