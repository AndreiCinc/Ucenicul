# Phase 2 · Sandbox Target Policy

## Hard rule

**No live Telegram send happens until an operator explicitly authorises a sandbox `telegram_chat_id`.**

The mission brief states this twice:
- "nu faci send Telegram real decât într-un sandbox controlat, cu chat id autorizat explicit"
- "Ai nevoie de un sandbox Telegram chat id autorizat explicit de operator. Dacă NU există sandbox target autorizat, STOP după Mission 1 și creează doar un plan Phase 2, fără patch și fără send."

## Recommended tenant

**Tenant B** (`eee0e2e0-0000-0000-0000-00000000000b`) — chosen because:

- Tenant B currently has 0 candidates in `public.task_reminder_deliveries` (Phase 1 dry-run produced 0 rows for it; the 22+2 split was 22 default + 2 tenant A + 0 tenant B).
- Tenant B's only `tasks` rows are e2e fixtures (no human-owned data).
- Setting `tenants.metadata.telegram_chat_id` on tenant B does not affect any other lane today.

Alternative: a dedicated sandbox tenant created specifically for Phase 2.
That is even safer but requires an additional onboarding step.

## Policy when authorised (future Phase 2 run)

1. **Operator provides** the sandbox chat id in writing in the next mission's prompt (e.g. `SANDBOX_CHAT_ID=-1001234567890`).
2. **Verify isolation** — chat is owned by the operator, ideally a dedicated test bot in a private group; the chat id is documented as sandbox-only.
3. **Apply temporarily**:
   ```sql
   UPDATE public.tenants
      SET metadata = metadata || jsonb_build_object('telegram_chat_id', '<SANDBOX_CHAT_ID>')
    WHERE id = 'eee0e2e0-0000-0000-0000-00000000000b'::uuid;
   ```
4. **One fixture only**:
   ```sql
   INSERT INTO public.tasks
     (id, tenant_id, title, description, priority, due_type, due_at, status, source, metadata)
   VALUES
     (gen_random_uuid(),
      'eee0e2e0-0000-0000-0000-00000000000b'::uuid,
      'rd-phase2: sandbox live reminder',
      'Phase 2 sandbox probe',
      'normal', 'datetime',
      NOW() - INTERVAL '1 minute', 'open', 'rd-phase2-sandbox-probe',
      jsonb_build_object(
        'metadata', jsonb_build_object('origin','reminder_intent'),
        'reminder_delivery', jsonb_build_object(
          'phase', 'phase2_sandbox_probe',
          'force_send', true
        )
      ));
   ```
   Force-send is set so the candidate is not filtered by the backlog
   throttle even if any clock drift makes it look > 24h old.

## Policy when **not** authorised (this run)

- **Do not seed** any `telegram_chat_id`.
- **Do not patch** WF-RD-01 (placeholder stays NoOp, no Telegram node installed).
- **Do not insert** any fixture task with delivery target.
- Mission halts with verdict `REMINDER_DELIVERY_LAYER_PHASE2_BLOCKED_BY_MISSING_SANDBOX_TELEGRAM_TARGET`.
- Phase 1 remains current truth.

## Restore protocol after the probe (when run)

1. UPDATE `tenants.metadata` to remove the chat id.
2. UPDATE the fixture task to `status='cancelled'` (soft-cancel; no
   hard DELETE per task_module convention) OR delete via SQL if the
   fixture was clearly throwaway.
3. Restore `RD_Live_Send_PLACEHOLDER` to `n8n-nodes-base.noOp` (if a
   reversible patch was used).
4. Verify WF-RD-01 `active=false` after restore.
5. Verify `public.reminders` byte-identical: count=1, max=2026-04-13.
