# Database Schema Reference — Ucenicul

> **Document status: LEVEL 3 — SUBORDINATE OPERATIONAL**
> Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md` and `db/README.md`.
> This file provides quick schema reference. For full details, see `db/README.md`.

---

## Current Implemented Tables

| Table | Status | Notes |
|---|---|---|
| `messages` | Implemented (partial) | Missing privacy content fields and thread/entity FKs |
| `tasks` | Implemented | Operational; needs alignment check with task_module contract |
| `reminders` | Implemented | Operational; needs alignment check with reminder_module contract |
| `memory_items` | Implemented (partial) | Has basic content + embedding; missing memory_type, confidence, durability, source refs |

## Target Tables (Not Yet Implemented)

| Table | Required by | Priority |
|---|---|---|
| `threads` | Thread Resolver, all modules | Phase 2 (new core) |
| `entities` | Entity resolution, thread context | Phase 2 (new core) |
| `execution_contexts` | Execution Context Manager | Phase 2 (new core) |
| `plans` | Orchestrator Planner (optional — may be JSONB in execution_contexts) | Phase 2 (new core) |
| `privacy_audit_records` | Privacy Gate (Phase 2 only) | Phase 6 |
| `secure_identity_mapping` | Privacy Gate (Phase 2 only) | Phase 6 |

## Schema Migration Priority

1. Add `threads` table
2. Add `entities` table
3. Add `execution_contexts` table
4. Extend `messages` with content class fields (raw_content, normalized_content, llm_safe_content, rag_safe_content) and thread_id FK
5. Extend `memory_items` with full target fields (memory_type, confidence, durability, etc.)
6. (Phase 2) Add `privacy_audit_records` and `secure_identity_mapping`

## Schema Naming Conventions

- Table names: plural snake_case (e.g., `threads`, `execution_contexts`)
- Column names: snake_case (e.g., `tenant_id`, `last_activity_at`)
- Primary keys: `id` (UUID)
- Foreign keys: `{referenced_table_singular}_id` (e.g., `thread_id`, `entity_id`)
- Timestamps: TIMESTAMPTZ, suffixed with `_at` (e.g., `created_at`, `updated_at`)
- JSONB columns: for flexible/nested data (e.g., `steps`, `metadata`, `module_results`)

---

> **Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md`.** Last updated: 2026-04-15
