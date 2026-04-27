# Phase 2 · Rollback and Restore

## Status this run

**No restore needed — no patch was applied.** Phase 1 baseline holds.

## When the probe runs in a future authorised mission

### After successful probe (verdict GREEN)

1. **Restore NoOp** (reversible patch):
   ```bash
   node n8n-patch.mjs replace nc7rTC3hjO9QqbXs artifacts/WF-RD-01_phase2_post_restore.json
   ```
   Where `WF-RD-01_phase2_post_restore.json` re-instates
   `RD_Live_Send_PLACEHOLDER.type='n8n-nodes-base.noOp'` (a copy of the
   Phase 1 baseline workflow).
2. **Verify** via `mcp__n8n__verify_workflow`:
   - active=false ✓
   - 11 nodes / 14 connections ✓
   - `RD_Live_Send_PLACEHOLDER.type='n8n-nodes-base.noOp'` ✓
3. **Remove sandbox `telegram_chat_id`**:
   ```sql
   UPDATE public.tenants
      SET metadata = metadata - 'telegram_chat_id'
    WHERE id = 'eee0e2e0-0000-0000-0000-00000000000b'::uuid;
   ```
4. **Soft-cancel the fixture task**:
   ```sql
   UPDATE public.tasks
      SET status='cancelled', completed_at=now(), updated_at=now()
    WHERE source='rd-phase2-sandbox-probe'
      AND tenant_id='eee0e2e0-0000-0000-0000-00000000000b'::uuid;
   ```
5. **Verify**:
   - `public.reminders` count=1, max=2026-04-13 unchanged.
   - `public.task_reminder_deliveries` shows the fixture's row with
     `delivery_status='sent'`, `sent_at` populated — leave for audit.
   - `public.outbound_delivery_ledger_claude_mcp` count=0 unchanged.

### After failed probe (verdict PARTIAL_SEND_ATTEMPT_FAILED_SAFELY)

1. Verify the ledger row marked `failed`, NOT `sent`.
2. Verify Telegram chat received nothing (or received an error
   acknowledgement only — confirm the bot did not actually post).
3. Restore NoOp.
4. Remove sandbox `telegram_chat_id`.
5. Soft-cancel the fixture.
6. Investigate the failure (likely Telegram credentials or chat id
   ambiguity).
7. Schedule a follow-up `Phase 2 v1.1` mission with the fix.

### Schema rollback (only if Phase 1 itself needs to be unwound)

NOT a Phase 2 concern. Phase 1 schema (`public.task_reminder_deliveries`)
remains in place. Use `db/migrations/20260427_add_task_reminder_deliveries.down.sql`
only if a separate rollback decision is made.

## Worst-case bail-out (P0 fired during probe)

If any P0 stop condition fires during the probe:

1. **Immediately deactivate WF-RD-01** (workflow is already
   `active=false`; this is just a sanity check).
2. **Delete the Telegram credentials** if a credential mistake is
   suspected.
3. **Restore NoOp**.
4. **Remove sandbox target**.
5. **Cancel the fixture**.
6. **Take a DB snapshot** of `public.task_reminder_deliveries` for
   forensic review.
7. **Document the incident** in this folder under `INCIDENT_LOG.md`.
8. **Do not retry** until the root cause is identified and a follow-up
   mission is opened.
