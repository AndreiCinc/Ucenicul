# Module Spec: task_module

> **Canonicality: LEVEL 2 — CANONICAL SUBORDINATE**
> Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md` and `docs/Module_Registry_Ucenicul.md`.

---

## Purpose

The task_module creates, updates, lists, and closes operational tasks. It is the sole owner of task persistence within the modular architecture.

## Scope

- CRUD operations on tasks
- Task duplicate detection
- Task status transitions

## Input Contract (Module Request)

The task_module receives a standard Module Request with these domain-specific inputs:

| Input field | Type | Required | Description |
|---|---|---|---|
| `action` | enum | yes | `create_task`, `list_tasks`, `update_task_status`, `detect_task_duplicates` |
| `description` | string | for create | Task description |
| `due_date` | date | optional | When the task is due |
| `priority` | enum | optional | `low`, `medium`, `high`, `urgent` |
| `task_id` | string | for update | ID of task to update |
| `new_status` | enum | for update | `pending`, `in_progress`, `completed`, `cancelled` |
| `filter` | object | for list | Filter criteria for listing tasks |

Standard Module Request fields are always required: `execution_context_id`, `thread_id`, `step_id`, `module_name`, `purpose`, `inputs`, `idempotency_key`.

## Output Contract (Module Result)

| Output field | Type | Description |
|---|---|---|
| `task_id` | string | Created or affected task ID |
| `task_summary` | string | Human-readable summary of what happened |
| `task_conflict_signal` | object/null | If duplicate detected, details of conflict |

Standard Module Result fields are always included: `module_name`, `step_id`, `result_type`, `status`, `summary`, `observations`, `proposals`, `actions_executed`, `artifacts`, `confidence`, `needs_followup`, `followup_requests`.

## Read Scope

- `execution_context` (current execution state)
- `threads` (thread context for the task)
- `tasks_db` (existing tasks for duplicate detection, listing)
- `entities` (entity references for task ownership)
- `recent_memory` (recent context for disambiguation)

## Write Scope

- `tasks_db` ONLY

The task_module MUST NOT write to: memory_store, reminders_db, threads, messages, or any other persistence target.

## Idempotency

- Idempotency key: `execution_context_id + step_id`
- If a create_task request with the same idempotency key already produced a task, return the existing task_id without creating a duplicate
- Update operations are naturally idempotent (same status transition applied twice has no additional effect)

## Privacy Profile

| Field | MVP | Target |
|---|---|---|
| Consumed content class | `normalized_content` | `llm_safe_content` |
| Produces PII artifacts | No | No |
| Privacy mode support | Not active | Module Request `privacy_mode` field respected |

## Error Handling

- If task creation fails due to DB error: return Module Result with status `failed`, include error details
- If duplicate detected: return Module Result with status `partial`, include `task_conflict_signal`
- Retry is safe due to idempotency key protection

## Transitional Notes

- Current task CRUD logic in n8n branches can be wrapped behind this module contract during migration
- SQL queries currently used for task operations are preserved but accessed only through the module interface
- Direct DB access from other nodes/branches to the tasks table is prohibited in target architecture

---

## Document Canonicality Footer

> **This document is Level 2 — Canonical Subordinate.**
> Version: 1.0 | Last updated: 2026-04-15
