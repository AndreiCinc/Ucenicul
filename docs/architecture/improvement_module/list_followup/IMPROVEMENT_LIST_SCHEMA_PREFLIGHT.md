# IMPROVEMENT_MODULE_LIST_FOLLOWUP · Schema Preflight

Date: 2026-04-27.

## `public.improvement_requests` columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NOT NULL | gen_random_uuid() |
| organization_id | uuid | NOT NULL | — |
| tenant_id | uuid | NOT NULL | — |
| requested_feature | text | NOT NULL | — |
| user_message | text | nullable | — |
| status | text | nullable | `'pending'` |
| created_at | timestamptz | nullable | now() |

## Verdict

**Schema supports a read-only tenant-scoped list lane:**
- `tenant_id` (NOT NULL) → safe `WHERE tenant_id = $1` filter.
- `status` → optional `status_filter` parameter; supports `include_closed`
  shorthand by `status <> 'closed'` clause.
- `created_at` → safe `ORDER BY created_at DESC` + optional `since`
  filter (`created_at >= $4`).
- No `category` or `severity` column → mission's optional filters
  `category` / `severity` are **documented as unsupported** in this
  iteration. Adding them would require schema migration (out of scope
  per `WRITEBACK_AND_CLOSEOUT_POLICY.md`).

**No schema migration required.** All filters used by the new lane map to
existing columns. The list lane is read-only (SELECT only).

## Pre-state row counts

| Tenant | improvement_requests rows |
|---|---|
| default (`eee0…0001`) | 12 |
| tenant A (`eee0…000a`) | 1 |
| tenant B (`eee0…000b`) | 1 |
| All `status` distinct | `{pending}` |

(All current rows happen to be `pending`; the lane will still distinguish
filters once non-pending rows accumulate.)
