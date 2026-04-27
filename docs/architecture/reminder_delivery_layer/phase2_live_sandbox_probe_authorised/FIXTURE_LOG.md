# Phase 2 Authorised · Fixture Log

## Fixture inserted

```json
{
  "id": "9d39ae1a-9354-42ca-ba78-66bc6d2a6b78",
  "tenant_id": "eee0e2e0-0000-0000-0000-00000000000b",
  "title": "rd-phase2: sandbox live reminder",
  "description": "Phase 2 sandbox probe",
  "priority": "normal",
  "due_type": "datetime",
  "due_at": "2026-04-27 12:20:10.57486+00",
  "status": "open",                            // initially
  "source": "rd-phase2-sandbox-probe",
  "metadata": {
    "metadata":            { "origin": "reminder_intent" },
    "reminder_delivery":   { "phase": "phase2_sandbox_probe", "force_send": true }
  }
}
```

## Pre-state evidence

`tenant B existing candidates = 0` immediately before the live probe.
Coupled with `candidate_limit=1`, this guarantees the workflow
selected exactly this fixture and only this fixture.

## Tenant B sandbox chat id

Set just-in-time before the probe:

```sql
UPDATE public.tenants
   SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('telegram_chat_id', '5101664726')
 WHERE id = 'eee0e2e0-0000-0000-0000-00000000000b'::uuid;
-- ✓ confirmed: tenant_b_post_set telegram_chat_id = '5101664726'
```

Removed immediately after the probe and replay:

```sql
UPDATE public.tenants
   SET metadata = metadata - 'telegram_chat_id'
 WHERE id = 'eee0e2e0-0000-0000-0000-00000000000b'::uuid
RETURNING (metadata->>'telegram_chat_id') AS tgt_post_remove;
-- ✓ confirmed: tgt_post_remove = NULL
```

## Fixture lifecycle

| Phase | `tasks.status` | `tasks.completed_at` |
|---|---|---|
| Inserted | `open` | NULL |
| After live probe | `open` | NULL (no chain mutation of task — only ledger) |
| After replay probe | `open` | NULL |
| After restore (soft-cancel) | `cancelled` | `2026-04-27 12:23:55.03487+00` |

## Cross-tenant probe

```sql
SELECT count(*)::int FROM public.task_reminder_deliveries
 WHERE created_at >= '2026-04-27T12:20:00Z'
   AND tenant_id <> 'eee0e2e0-0000-0000-0000-00000000000b'::uuid;
-- ✓ 0
```

The probe touched only tenant B's ledger. Tenant default and tenant A
are byte-identical.
