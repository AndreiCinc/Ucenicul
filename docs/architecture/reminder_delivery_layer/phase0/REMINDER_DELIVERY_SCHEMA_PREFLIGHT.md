# REMINDER_DELIVERY_LAYER · Phase 0 · Schema Preflight

## `public.tasks` (16 columns)

| Column | Type | Nullable | Default | Used for delivery? |
|---|---|---|---|---|
| id | uuid | NOT NULL | gen_random_uuid() | task_id |
| tenant_id | uuid | NOT NULL | — | tenant filter (mandatory) |
| business_id | uuid | nullable | — | optional scope |
| entity_id | uuid | nullable | — | optional scope |
| title | text | NOT NULL | — | reminder text source |
| description | text | nullable | — | reminder text source |
| priority | task_priority_enum | NOT NULL | `'normal'` | optional ordering |
| due_type | due_type_enum | NOT NULL | `'flexible'` | filter (`'date'\|'datetime'` deliverable) |
| due_date | date | nullable | — | filter (date-only due) |
| due_at | timestamptz | nullable | — | **scheduler trigger** (timestamptz due) |
| status | task_status_enum | NOT NULL | `'open'` | filter (only `'open'` deliverable) |
| source | text | nullable | — | informational |
| metadata | jsonb | NOT NULL | `'{}'::jsonb` | **delivery state pocket (Option A)** |
| created_at | timestamptz | NOT NULL | now() | ordering |
| updated_at | timestamptz | NOT NULL | now() | mutation marker |
| completed_at | timestamptz | nullable | — | exclude when set |

Enums:

- `task_status_enum`: `{open, done, cancelled}`
- `task_priority_enum`: `{low, normal, high, urgent}`
- `due_type_enum`: `{flexible, date, datetime}`

Reminder-intent marker (set by PL):
`tasks.metadata.metadata.origin='reminder_intent'` (nested under
`metadata.metadata` because PL builds `inputs.metadata.origin` and ME
stores the entire inputs object under the row's `metadata` column).
Pre-state: 10 rows currently carry this marker.

## `public.reminders` (13 columns) — legacy, untouched by canonical chain

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NOT NULL | gen_random_uuid() |
| tenant_id | uuid | NOT NULL | — |
| business_id | uuid | nullable | — |
| entity_id | uuid | nullable | — |
| title | text | NOT NULL | — |
| description | text | nullable | — |
| remind_at | timestamptz | NOT NULL | — |
| status | reminder_status_enum | NOT NULL | `'pending'` |
| source | text | nullable | — |
| metadata | jsonb | NOT NULL | `'{}'::jsonb` |
| created_at | timestamptz | NOT NULL | now() |
| updated_at | timestamptz | NOT NULL | now() |
| sent_at | timestamptz | nullable | — |

Enum: `reminder_status_enum`: `{pending, sent, cancelled}`.

**Pre-state: 1 row, max(created_at)=2026-04-13 20:17:13Z. NOT used by
the canonical chain. The ADR keeps this table out-of-scope for the
current stage.**

## `public.outbound_delivery_ledger_claude_mcp` (11 columns)

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NOT NULL | gen_random_uuid() |
| tenant_id | uuid | **NOT NULL** | — |
| execution_context_id | uuid | **NOT NULL** | — |
| thread_id | uuid | **NOT NULL** | — |
| idempotency_key | text | **NOT NULL** | — |
| channel | text | **NOT NULL** | — |
| delivery_target | text | **NOT NULL** | — |
| response_text_hash | text | **NOT NULL** | — |
| provider_message_ref | text | nullable | — |
| delivery_status | text | **NOT NULL** | — |
| created_at | timestamptz | NOT NULL | now() |

Pre-state: 0 rows. Canonical MO outbound audit. **Required
`execution_context_id` is the gap for scheduler-driven sends** —
a scheduler has no natural EC.

## `public.tenants` (12 columns) — relevant for delivery target

| Column | Type | Notes |
|---|---|---|
| id | uuid | tenant key |
| metadata | jsonb | **`telegram_chat_id` lives here** (per WF-MO-01.MO_Load_Channel_Delivery_Context); e2e tenants have no chat id |
| timezone | text | tenant timezone (`'Europe/Bucharest'` default) — useful for due_date interpretation |

## Pre-state aggregate counts

| Bucket | Value |
|---|---|
| `tasks` total | 89 |
| `tasks` open with `due_at IS NOT NULL` | 22 |
| `tasks` carrying `reminder_delivery` metadata | 0 |
| `tasks` carrying reminder-intent origin marker | 10 |
| `reminders` count | 1 |
| `reminders` max(created_at) | 2026-04-13 20:17:13Z |
| `outbound_delivery_ledger_claude_mcp` total rows | 0 |

## Schema-side blockers / opportunities for Phase 1

- `outbound_delivery_ledger_claude_mcp.execution_context_id NOT NULL`
  prevents direct reuse for scheduler fires unless we also build a
  handoff that synthesises (or skips) an EC. Either:
  (a) make `execution_context_id` nullable for scheduler-origin rows
      (small migration), or
  (b) introduce a new `task_reminder_deliveries` table (Option B,
      preferred — clean FK to `tasks`, scheduler-friendly idempotency
      on `(tenant_id, task_id, due_occurrence_iso)`).
- `tenants.metadata.telegram_chat_id` is the only delivery target
  source today. Phase 1 must define a tenant onboarding step or
  fallback (e.g. `thread.source_channels` could carry a per-thread
  chat id) before any live reminder send is safe.

**Phase 0 conclusion: schema supports a metadata-only dry-run today
without migration.** Live delivery must wait for Phase 1 schema +
target-policy authorization.
