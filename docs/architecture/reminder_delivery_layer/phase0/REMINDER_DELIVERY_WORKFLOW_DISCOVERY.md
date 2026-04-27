# REMINDER_DELIVERY_LAYER · Phase 0 · Workflow Discovery

## n8n inventory probes (via MCP `search_workflows`)

| Query | Hits |
|---|---|
| `reminder` | 0 |
| `scheduler` | 0 |
| `cron` | 0 |

**No reminder/scheduler/cron workflow exists in n8n.** Confirms the ADR:
the REMINDER-DELIVERY-LAYER frontier is unbuilt.

## WF-MO-01 contract relevant for reminder delivery

Source: `artifacts/WF-MO-01_pre.json` (versionId
`4e0163b2-e176-40ad-ac33-a8438d7c2147`, 18 nodes, active).

### Trigger node

`MO_Input` is `n8n-nodes-base.executeWorkflowTrigger`. **MO is callable
as a sub-workflow** — a future scheduler can invoke MO, in principle.

### Required input fields (from `MO_Validate_Composed_Response_Input`)

```
status_kind, result_type, execution_context_id, thread_id, tenant_id,
composed_response, output_gateway_allowed, allowed_next_stage,
response_generation_allowed, idempotency_key
```

`composed_response.response_status` ∈ `{success, partial, failed,
no_action}`. `composed_response.response_text` non-empty.
`composed_response.channel ∈ {telegram, whatsapp}` if set.
`allowed_next_stage = 'MESSAGE_OUT'`.

### Delivery target resolution (`MO_Load_Channel_Delivery_Context`)

```sql
SELECT id AS tenant_id,
       'telegram'::text AS channel,
       (metadata->>'telegram_chat_id')::text AS delivery_target
FROM public.tenants
WHERE id = $1::uuid;
```

**The only place a delivery target lives today is
`tenants.metadata.telegram_chat_id`.** For e2e tenants this is
`NULL` → MO terminates `MISSING_DELIVERY_TARGET`. **No fake targets
are to be seeded** (per mission constraints + ADR + `e2e_oracle.mjs`).

### Replay / outbound audit (`MO_Replay_Guard_Probe` +
`MO_Log_Outbound_Message`)

Audit row in `public.outbound_delivery_ledger_claude_mcp` is keyed on
`(tenant_id, idempotency_key)`. Replay guard checks for an existing
row with the same `idempotency_key` and short-circuits if found
(unique idempotency).

### External send (`MO_Send_Channel_PLACEHOLDER`)

Type: `n8n-nodes-base.telegram`. Real Telegram API call to
`delivery_target`. **Phase 0 must NOT route through this node.** Even a
controlled probe is unsafe without a confirmed test chat id.

## Gap analysis: scheduler → MO handoff

For a scheduler to call MO directly, it must produce a payload with:

- `execution_context_id` — but EC is keyed on `(tenant_id,
  trigger_message_id)` and is created by EC for chain-driven trigger
  messages. A scheduler fire has no inbound trigger message.
  Options: synthesise a synthetic trigger message + EC at fire-time
  (extra writes, mirrors the canonical chain), or change MO to accept
  a `delivery_origin='scheduler'` and a synthetic EC ref. **Both are
  out of Phase 0 scope.**
- `thread_id` — known (the task's `thread_id` if recorded; current
  schema has `tasks.business_id/entity_id` but no `thread_id` column;
  `metadata.metadata.thread_id` may be present from PL extraction).
- `composed_response.response_text` — must be a clean Romanian
  reminder string (e.g. "Reminder: <task.title> — scadent: <due_at>").
  No raw JSON.
- `idempotency_key` — derive from `(tenant_id, task_id,
  due_occurrence_iso)` to ensure replay safety.
- `delivery_target` — must already be present on
  `tenants.metadata.telegram_chat_id` AND be a real chat id. Out of
  scope for Phase 0.

## Other workflows considered

- **WF-RA-01 / WF-SU-01 / WF-RC-01** (RA, SU, RC) sit upstream of MO in
  the canonical chain. A scheduler-driven reminder shouldn't traverse
  them — RC composes responses to user inputs, not to scheduled
  events. Reminder text composition is short and templated; better to
  handle in the new scheduler workflow itself.
- **WF-PL-01** (PL) — already maps `intent='create_reminder'` →
  `task_module.create_task` per ADR. No PL change needed for
  scheduler-side delivery.
- **WF-ME-01.task_module** — already supports `create_task`,
  `list_tasks`, `update_task`, `complete_task`, `delete_task`. A
  scheduler-driven `mark_reminder_delivered` would write to
  `tasks.metadata.reminder_delivery` (Option A) or to a new ledger
  (Option B); both are scheduler-internal and don't need ME changes
  for Phase 0.

## Conclusion

A new canonical workflow `WF-RD-01_Reminder_Delivery_Scheduler` is the
right Phase 1 home for the scheduler. It must:

- Use `n8n-nodes-base.scheduleTrigger` (cron/interval) — not webhook.
- Run a tenant-loop SELECT against the candidate query.
- Build the intended MO payload per task (synthesise EC if/when
  approved; otherwise call a thin MO-side variant or write through a
  new dedicated ledger).
- Update `tasks.metadata.reminder_delivery.{status,sent_at,…}` (Option
  A) or insert into `task_reminder_deliveries` (Option B).
- Emit a clean Romanian reminder text (no raw JSON).
- Honour `MISSING_DELIVERY_TARGET` as a no-send classified outcome
  (matches the e2e oracle convention).

**Creating this new workflow is NOT done in Phase 0.** Phase 0 produces
docs + a dry-run script that runs locally (node) against a temporary
candidate-query view. Phase 1 will create the workflow once schema +
target-policy decisions are taken.
