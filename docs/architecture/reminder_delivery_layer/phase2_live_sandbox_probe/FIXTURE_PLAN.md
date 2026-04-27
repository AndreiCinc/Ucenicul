# Phase 2 · Fixture Plan (NOT YET APPLIED)

## Status

**No fixture inserted during this run.** Mission halted at the sandbox-target gate.

## Plan (when authorised)

Insert exactly one task in the sandbox tenant when an operator-
authorised `telegram_chat_id` is provided.

```sql
-- One-shot fixture for the Phase 2 sandbox probe.
INSERT INTO public.tasks
  (id, tenant_id, title, description, priority, due_type, due_at,
   status, source, metadata, created_at, updated_at)
VALUES
  (gen_random_uuid(),
   'eee0e2e0-0000-0000-0000-00000000000b'::uuid,        -- tenant B
   'rd-phase2: sandbox live reminder',
   'Phase 2 sandbox probe — single fixture. Restore after.',
   'normal', 'datetime',
   NOW() - INTERVAL '1 minute',                          -- due 1 min ago
   'open', 'rd-phase2-sandbox-probe',
   jsonb_build_object(
     'metadata', jsonb_build_object('origin','reminder_intent'),
     'reminder_delivery', jsonb_build_object(
       'phase', 'phase2_sandbox_probe',
       'force_send', true                                -- bypass backlog throttle
     )),
   NOW(), NOW())
RETURNING id;
```

## Why force_send=true?

The backlog throttle skips any task with `due_at > 24h` ago. With
`due_at = NOW() - 1 minute` the fixture should NOT be classified as
backlog, but `force_send=true` makes the test deterministic against
clock drift between the scheduler and the DB.

## Why exactly one task?

`candidate_limit=1` is the input passed to WF-RD-01. The candidate
query uses `LIMIT $1::int`. With one fixture and limit=1, the
scheduler will always pick this fixture and only this fixture for
the probe.

Defence-in-depth: if a stray candidate exists in tenant B for any
reason, the LIMIT 1 + ORDER BY due_at ASC means the test still sends
to only one task per probe, but the result envelope's
`per_outcome` will reveal it. Operator must verify only the fixture's
task_id appears in the probe result.

## Post-probe cleanup

```sql
-- Soft-cancel the fixture (preserve audit trail).
UPDATE public.tasks
   SET status='cancelled', completed_at=now(), updated_at=now()
 WHERE source='rd-phase2-sandbox-probe'
   AND tenant_id='eee0e2e0-0000-0000-0000-00000000000b'::uuid;

-- Verify the ledger row reflects 'sent' but is not deleted.
SELECT id, delivery_status, sent_at, provider_message_ref
  FROM public.task_reminder_deliveries
 WHERE task_id IN (
   SELECT id FROM public.tasks WHERE source='rd-phase2-sandbox-probe'
 );
```

The ledger row stays for audit trail. It does not need cleanup.
