# Phase 2 Authorised · Replay Probe Results

## Replay TR exec 10801

Same input as live probe (`mode='live'`, `live_allowed=true`,
`candidate_limit=1`). Fired ~25 s after the first probe.

`RD_Set_Mode` produced the same envelope.

`RD_Load_Candidates` returned **0 rows** — the candidate query's
`NOT IN ('sent','failed_terminal','skipped_missing_target','skipped_backlog')`
clause excluded the fixture's now-`sent` ledger row.

The chain stopped after `RD_Load_Candidates` because n8n short-
circuits when an upstream node emits 0 items. **No Code node, no
Postgres upsert, and no Telegram node ran.**

## DB evidence (post-replay)

```sql
SELECT id, delivery_status, attempts, sent_at, provider_message_ref
FROM public.task_reminder_deliveries
WHERE task_id='9d39ae1a-9354-42ca-ba78-66bc6d2a6b78'::uuid;

-- id                   = 3503894c-7213-4e52-9cf8-27a75248d883
-- delivery_status      = sent       (unchanged from live probe)
-- attempts             = 1          (NOT incremented; no UPSERT-DO-UPDATE fired)
-- sent_at              = 2026-04-27 12:23:04.122+00 (unchanged)
-- provider_message_ref = 546       (unchanged)
```

```sql
SELECT count(*)::int AS trd_total,
       count(DISTINCT (tenant_id, task_id, due_occurrence_iso))::int AS trd_distinct
FROM public.task_reminder_deliveries;
-- trd_total    = 25
-- trd_distinct = 25
```

## Replay invariants (canonical proof)

- `count_for_fixture` = 1 (no new ledger row).
- `attempts` did NOT increment (UPSERT-DO-UPDATE did not fire because
  the upstream candidate query returned 0 rows).
- `sent_at` did NOT change.
- `provider_message_ref` did NOT change.
- 0 Telegram API calls during the replay tick.
- 0 messages delivered to chat 5101664726 (or anywhere) during the
  replay tick.
- Total ledger rows: 25 / 25 distinct ⇒ UNIQUE holds.

## Cumulative ledger summary post-replay

| Bucket | Count |
|---|---|
| Phase 1 dry-run rows (all `skipped_missing_target`) | 24 |
| Phase 2 fixture row (`sent`) | 1 |
| **Total** | **25** |
| Distinct (tenant_id, task_id, due_occurrence_iso) | **25** |
| Phase 2 duplicates | **0** |
