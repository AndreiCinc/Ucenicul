# Module Spec: reminder_module

> **Canonicality: LEVEL 2 — CANONICAL SUBORDINATE**
> Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md` and `docs/Module_Registry_Ucenicul.md`.

> **Current-stage status (2026-04-25):** This spec describes the long-term `reminder_module`
> contract. For the current implementation stage, **`reminder_module` is deferred** and
> reframed as a future `REMINDER-DELIVERY-LAYER` (scheduler + temporal trigger + MO
> delivery + sent/snooze/retry/audit). Reminder-like requests route to
> `task_module.create_task` with `due_at`/`due_date`. See
> `decisions/ADR-REMINDER-AS-TASK-LAYER.md`.

---

## Purpose

The reminder_module creates, updates, lists, and triggers time-based reminders. It is the sole owner of reminder persistence.

## Scope

- CRUD operations on reminders
- Reminder trigger logic (time-based activation)
- Reminder conflict/duplicate detection

## Input Contract (Module Request)

| Input field | Type | Required | Description |
|---|---|---|---|
| `action` | enum | yes | `create_reminder`, `list_reminders`, `update_reminder`, `trigger_reminder` |
| `description` | string | for create | Reminder description |
| `due_date` | date | for create | When the reminder fires |
| `time` | time | optional | Specific time of day |
| `recurrence` | object | optional | Recurrence pattern |
| `reminder_id` | string | for update/trigger | ID of reminder to operate on |
| `new_status` | enum | for update | `active`, `snoozed`, `completed`, `cancelled` |

Standard Module Request fields always required.

## Output Contract (Module Result)

| Output field | Type | Description |
|---|---|---|
| `reminder_id` | string | Created or affected reminder ID |
| `reminder_summary` | string | Human-readable summary |
| `reminder_conflict_signal` | object/null | If conflict detected |

Standard Module Result fields always included.

## Read Scope

- `execution_context`, `threads`, `reminders_db`, `entities`

## Write Scope

- `reminders_db` ONLY

## Idempotency

- Key: `execution_context_id + step_id`
- Duplicate create requests with same key return existing reminder_id

## Privacy Profile

| Field | MVP | Target |
|---|---|---|
| Consumed content class | `normalized_content` | `llm_safe_content` |
| Produces PII artifacts | No | No |

## Error Handling

- DB errors: return `failed` status
- Conflicts: return `partial` status with `reminder_conflict_signal`
- Retry safe via idempotency key

## Transitional Notes

- Current reminder CRUD SQL can be wrapped behind this contract during migration
- Direct DB access to reminders table from other nodes is prohibited in target architecture

---

> **Level 2 — Canonical Subordinate.** Version: 1.0 | Last updated: 2026-04-15
