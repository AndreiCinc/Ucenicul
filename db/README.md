# Database Documentation — Ucenicul

> **Document status: LEVEL 3 — SUBORDINATE OPERATIONAL**
> Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md`.
> This document covers the implemented schema (current state) and the schema delta required by the target architecture.

---

## A. Implemented Schema Now

The current PostgreSQL database includes the following tables that are operational in the MVP monolith:

### messages

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant isolation |
| channel | VARCHAR | Source channel (telegram, etc.) |
| direction | VARCHAR | inbound / outbound |
| author_type | VARCHAR | user / system / bot |
| content | TEXT | **Legacy single content field** — stores raw message content |
| intent | VARCHAR | **Legacy** — classified intent |
| timestamp | TIMESTAMPTZ | When message was received |
| source_message_ref | VARCHAR | External message reference |
| status | VARCHAR | Processing status |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Record creation |

### tasks

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant isolation |
| description | TEXT | Task description |
| status | VARCHAR | pending / in_progress / completed / cancelled |
| priority | VARCHAR | low / medium / high / urgent |
| due_date | DATE | Optional due date |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Last update |

### reminders

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant isolation |
| description | TEXT | Reminder description |
| due_date | DATE | When reminder fires |
| time | TIME | Specific time |
| status | VARCHAR | active / snoozed / completed / cancelled |
| recurrence | JSONB | Recurrence pattern |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Last update |

### memory_items (pgvector-enabled)

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant isolation |
| content | TEXT | Memory content |
| embedding | vector | pgvector embedding for semantic search |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMPTZ | Record creation |

> **Note:** The current memory_items schema is minimal. It does not yet include the full field set required by the target architecture (memory_type, category, confidence, importance, durability, source_message_id, source_thread_id, etc.).

---

## B. Target Schema Delta Required by Target Architecture

The following tables and columns are required by the target architecture but are NOT YET IMPLEMENTED:

### messages table — required additions

| Column | Type | Purpose | Status |
|---|---|---|---|
| raw_content | TEXT | Original payload, may contain PII | NOT YET IMPLEMENTED |
| normalized_content | TEXT | Structurally normalized content | NOT YET IMPLEMENTED |
| llm_safe_content | TEXT | Content safe for LLM (NO-OP = normalized in MVP) | NOT YET IMPLEMENTED |
| rag_safe_content | TEXT | Content safe for RAG (NO-OP = normalized in MVP) | NOT YET IMPLEMENTED |
| thread_id | UUID FK | Link to thread | NOT YET IMPLEMENTED |
| author_entity_id | UUID FK | Link to entity | NOT YET IMPLEMENTED |
| privacy_transform_version | VARCHAR | Version of privacy transform applied | NOT YET IMPLEMENTED |

> **Migration note:** The current `content` column maps to `raw_content`. The four-field content model replaces the single `content` column.

### threads (NEW TABLE)

| Column | Type | Purpose |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID | Tenant isolation |
| title | VARCHAR | Thread title |
| thread_type | VARCHAR | Type classification |
| status | VARCHAR | new/active/waiting/blocked/completed/latent/abandoned |
| summary | TEXT | Thread summary |
| last_activity_at | TIMESTAMPTZ | |
| primary_entity_id | UUID FK | Optional link to primary entity |
| related_entity_ids | UUID[] | Array of related entities |
| goal | TEXT | Thread goal |
| source_channels | VARCHAR[] | Channels this thread spans |
| closure_reason | TEXT | Why thread was closed |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### entities (NEW TABLE)

| Column | Type | Purpose |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID | Tenant isolation |
| entity_type | VARCHAR | person/organization/project/etc. |
| display_name | VARCHAR | Display name |
| canonical_name | VARCHAR | Canonical form |
| aliases | VARCHAR[] | Alternative names |
| contact_mappings | JSONB | Contact information |
| profile_summary | TEXT | Profile summary |
| labels | VARCHAR[] | Tags/labels |
| status | VARCHAR | active/merged/archived |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### execution_contexts (NEW TABLE)

| Column | Type | Purpose |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID | Tenant isolation |
| thread_id | UUID FK | Link to thread |
| trigger_message_id | UUID FK | Message that triggered this execution |
| status | VARCHAR | created/planned/dispatching/in_progress/aggregating/completed/failed/expired |
| current_goal | TEXT | |
| current_plan_ref | UUID FK | Link to plan |
| pending_steps | JSONB | Steps not yet completed |
| completed_steps | JSONB | Steps completed |
| module_results | JSONB | Collected module results |
| working_notes | JSONB | Transient notes |
| shared_artifacts | JSONB | Shared artifacts |
| error_state | JSONB | Error details |
| retry_state | JSONB | Retry tracking |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### plans (NEW TABLE — optional, may be embedded in execution_contexts)

| Column | Type | Purpose |
|---|---|---|
| plan_id | UUID PK | |
| execution_context_id | UUID FK | |
| thread_id | UUID FK | |
| goal | TEXT | |
| primary_intent | VARCHAR | |
| steps | JSONB | Array of Plan Step objects |
| status | VARCHAR | |
| reasoning_summary | TEXT | |
| version | INTEGER | Plan version (incremented on replan) |
| created_at | TIMESTAMPTZ | |

### memory_items — required additions

| Column | Type | Purpose | Status |
|---|---|---|---|
| memory_type | VARCHAR | fact/observation/pattern/inference/preference/constraint | NOT YET IMPLEMENTED |
| category | VARCHAR | Domain category | NOT YET IMPLEMENTED |
| confidence | FLOAT | Confidence score 0.0-1.0 | NOT YET IMPLEMENTED |
| importance | FLOAT | Importance score | NOT YET IMPLEMENTED |
| durability | VARCHAR | working/recent/long_term | NOT YET IMPLEMENTED |
| source_message_id | UUID FK | Origin message | NOT YET IMPLEMENTED |
| source_thread_id | UUID FK | Origin thread | NOT YET IMPLEMENTED |
| entity_id | UUID FK | Related entity | NOT YET IMPLEMENTED |
| evidence_refs | JSONB | Supporting evidence | NOT YET IMPLEMENTED |
| status | VARCHAR | active/superseded | NOT YET IMPLEMENTED |
| supersedes_memory_id | UUID FK | Memory item this replaces | NOT YET IMPLEMENTED |

---

## C. Phase 2 Readiness Placeholders

The following are NOT IMPLEMENTED and NOT REQUIRED for MVP. They are documented here as architectural placeholders for Phase 2.

### privacy_audit_records (Phase 2)

| Column | Type | Purpose |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID | |
| event_type | VARCHAR | detokenization/token_lookup/identity_access |
| token | VARCHAR | Token involved |
| context | TEXT | Why the access occurred |
| requester | VARCHAR | Component that requested access |
| timestamp | TIMESTAMPTZ | |

### secure_identity_mapping (Phase 2)

| Column | Type | Purpose |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID | |
| entity_id | UUID FK | Link to entities table |
| token | VARCHAR | Stable token for this entity |
| real_identity_ref | TEXT | Reference to real identity (encrypted/restricted) |
| created_at | TIMESTAMPTZ | |

> **CRITICAL:** The secure_identity_mapping store MUST be a **separate persistence boundary** from the main operational tables. In production Phase 2, this may be a separate schema, separate database, or separate service with restricted access controls.

> **Phase 2 privacy is NOT implemented in MVP.** This section exists as an architectural placeholder only. Do not treat these tables as existing or functional.

---

## D. Separation of Operational DB vs Secure Mapping Store

| Store | Contains | Access |
|---|---|---|
| Operational DB (PostgreSQL) | messages, threads, entities, tasks, reminders, execution_contexts, memory_items, improvement_requests | Normal application access |
| Secure Identity Mapping Store | Token-to-identity mappings, privacy audit records | Restricted access, audit-logged, Phase 2 only |

The operational DB may reference entity IDs. The mapping from entity_id to real identity is stored ONLY in the Secure Identity Mapping Store in Phase 2.

---

## E. Content Class Implications for Modules/Watchers

| Module | Reads from DB | Content class consumed | Notes |
|---|---|---|---|
| task_module | tasks_db, threads, entities | normalized_content (MVP) / llm_safe_content (target) | |
| reminder_module | reminders_db, threads, entities | normalized_content (MVP) / llm_safe_content (target) | |
| memory_module | memory_store, threads, entities | normalized_content (MVP) / llm_safe_content + rag_safe_content (target) | |
| improvement_module | improvements_db, threads | normalized_content (MVP) / llm_safe_content (target) | |
| watcher_module_basic | threads, recent_memory, entities | normalized_content (MVP) / llm_safe_content (target) | |
| response_module | aggregated_results, threads | Module results (aggregated) | Detokenization at outbound boundary in Phase 2 |

---

> **Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md`.** Last updated: 2026-04-15
