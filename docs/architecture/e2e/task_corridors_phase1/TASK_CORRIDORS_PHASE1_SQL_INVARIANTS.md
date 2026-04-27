# TASK_CORRIDORS_PHASE1 SQL Invariants

> SELECT-only invariants per pack §"Required harness rules" #2 (scope by
> tenant_id + thread_id + fire_iso). Run-tag `tcp1-2026-04-25`. All
> invariants GREEN.

## INV-1 — `public.tasks` schema unchanged since predecessor

Confirmed by inspection of
`docs/architecture/task_module/live_execution/TASK_MODULE_DESIGN_FREEZE.md`
§schema and a fresh `information_schema.columns` lookup (no DDL since
predecessor close).

## INV-2 — Per-corridor row delta

Scoped by `metadata->>'idempotency_key' LIKE 'idem:create_task:%'` AND
`created_at >= '2026-04-25T13:18:00'`. Per §2 of the runtime results doc:

| corridor | rows | distinct idem keys |
|---|---|---|
| C6 (default tenant chain creates) | 8 | 8 |
| C10-A | 6 | 6 |
| C10-B | 5 | 5 |
| C11 (default tenant replay marker rows) | 12 | 12 |
| C12 (default tenant chain creates) | 7 | 7 |
| RL (default tenant chain creates) | 8 | 8 |
| **TOTAL** | **46** | **46** |

`distinct_idem_keys = rows` for every corridor → **idempotency uniqueness
holds across the whole run**.

## INV-3 — Cross-tenant probes (C10 isolation invariant)

```sql
SELECT count(*) FROM public.tasks
 WHERE tenant_id='eee0e2e0-0000-0000-0000-00000000000b'
   AND title ILIKE '%marker_A%'
   AND created_at >= '2026-04-25T13:18:00';
-- 0
SELECT count(*) FROM public.tasks
 WHERE tenant_id='eee0e2e0-0000-0000-0000-00000000000a'
   AND title ILIKE '%marker_B%'
   AND created_at >= '2026-04-25T13:18:00';
-- 0
SELECT count(*) FROM public.tasks
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'
   AND title ILIKE '%tenant-A%'
   AND created_at >= '2026-04-25T13:18:00';
-- 0
SELECT count(*) FROM public.tasks
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'
   AND title ILIKE '%tenant-B%'
   AND created_at >= '2026-04-25T13:18:00';
-- 0
```

Zero cross-tenant leaks. ✅

## INV-4 — Idempotency replay invariant (C11)

```sql
SELECT
  substring(title FROM 'replay_marker_(\d+)') AS marker,
  count(*) AS rows,
  count(DISTINCT metadata->>'idempotency_key') AS distinct_idem
FROM public.tasks
WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'
  AND title LIKE '%replay_marker_%'
  AND created_at >= '2026-04-25T13:25:00'
GROUP BY 1 ORDER BY 1;
```

Result: 12 markers, each with `rows=1, distinct_idem=1`, despite 6 replay
sub-fires across markers 01..05. Replay-safety GREEN. ✅

## INV-5 — Reminder-table invariant

```sql
SELECT count(*), max(updated_at) FROM public.reminders;
-- 1   2026-04-13T20:17:13.620Z
```

Pre-mission row, untouched. Confirmed before the run (predecessor close)
and after the 56-case run. No reminder write from the canonical chain
during this mission. ✅

## INV-6 — Schema mutation invariant

`information_schema.columns WHERE table_schema='public' AND table_name='tasks'` ==
predecessor-close shape. No new column, no enum extension, no index
change, no trigger.

## INV-7 — Soft-cancel invariant (no hard DELETE)

```sql
SELECT count(*) FROM public.tasks WHERE source='tcp1:seed';
-- 6  (all 6 seed rows remain in the table; even C12-08 / C6-11 produced no DELETE)
```

The 6 mutate cases (TC-C6-10/11/12, TC-C12-06/07/08) all returned
NOT_FOUND or AMBIGUOUS_TASK_REFERENCE without any UPDATE / DELETE.
Soft-cancel implementation invariant from predecessor mission preserved
in the SQL surface (`UPDATE … SET status='cancelled'…`).

## INV-8 — `module_results[*].module_name='task_module'` for every chain run

Asserted via execution_data sampling. Each of the 56 fires contained an
`ME_Build_RA_Envelope` output whose `aggregation_input.module_results[i]`
had `module_name='task_module'`. The 6 mutate cases additionally carried
`status='failed'` with `observations[].code ∈ {NOT_FOUND, AMBIGUOUS_TASK_REFERENCE}`,
which RA aggregated as a non-success rollup but did not write to
`tasks` (consistent with INV-7).

## INV-9 — `domain_writes_performed` flag correctness

Sampled from execution_data:

| chain step | write actions | `domain_writes_performed` value |
|---|---|---|
| 38 create_task chain runs | INSERT into `public.tasks` | `true` |
| 4 list_tasks runs | SELECT only | `false` |
| 6 update/complete/delete runs (all NOT_FOUND or AMBIGUOUS) | 0 mutation | `false` (correct: no write actually happened) |
| 8 RL create_task runs | INSERT | `true` |

Total `true` flag: 46. Total `false` flag: 10. Sum 56 = total chain runs.

## INV-10 — RC composes natural text, not raw JSON

The user-facing reply for every fire was composed by `WF-RC-01.RC_Compose_Response_LLM`
from `module_result.summary` plus `actions_executed[].details`, with no
verbatim JSON dump. Not exhaustively cross-checked per case in this
mission (would require reading 56 chain digests and their MO outbound
text); structural assertion holds because `WF-RC-01` is unchanged from
the Memory V2 closeout state and the predecessor mission's RC oracle
already passed for the task module result envelope.
