# Test Strategy and P0 Invariants

## Overall posture

These are follow-up missions, not frontier-scale rewrites.

Use natural cardinality:
- C11: targeted rerun, around 5-8 live fires.
- recall_memory: small PL mapping, around 8-12 live probes.
- improvement list: read-only module lane, around 10-15 live probes plus SQL invariants.

Do not inflate to 50 unless workflow surface unexpectedly expands.

## Shared P0 invariants

- no cross-tenant leak;
- no wrong-tenant write/read;
- no duplicate side effect on replay where replay should dedupe;
- no ambiguous input row;
- no writes to `public.reminders`;
- no raw JSON to user-facing output;
- no schema mutation unless explicitly authorized;
- no duplicate workflow;
- no Path 5;
- no unauthorized MCP workflow write.

## Regression pack after any workflow patch

After Mission 2 or Mission 3 workflow patch, rerun:
1. `create_task` writes.
2. `list_tasks` read-only.
3. `create_reminder→task` writes task, not reminder.
4. `store_memory` writes.
5. `search_memory` read-only.
6. `supersede_memory` positive if fixtures are ready.
7. `capture_feedback` writes improvement.
8. ambiguous task no-write.
9. ambiguous memory no-write.
10. `response_module.respond_only` no-write.
11. `public.reminders` unchanged.

## SQL scoping

Use:
- tenant_id;
- thread_id;
- source_thread_id/source_message_id where supported;
- fire_iso;
- deterministic case marker.

Never rely solely on request-level idempotency key unless the harness/chain proves it is propagated.
