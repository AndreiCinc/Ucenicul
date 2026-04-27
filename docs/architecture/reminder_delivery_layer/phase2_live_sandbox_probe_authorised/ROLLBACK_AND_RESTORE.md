# Phase 2 Authorised · Rollback and Restore

## Sequence executed

1. **Remove sandbox chat_id** from tenant B:
   ```sql
   UPDATE public.tenants
      SET metadata = metadata - 'telegram_chat_id'
    WHERE id = 'eee0e2e0-0000-0000-0000-00000000000b'::uuid
   RETURNING (metadata->>'telegram_chat_id') AS tgt_post_remove;
   ```
   Result: `tgt_post_remove = NULL` ✅

2. **Soft-cancel fixture task**:
   ```sql
   UPDATE public.tasks
      SET status='cancelled', completed_at=now(), updated_at=now()
    WHERE id='9d39ae1a-9354-42ca-ba78-66bc6d2a6b78'::uuid
   RETURNING id, status, completed_at;
   ```
   Result: `id=9d39ae1a-…, status=cancelled, completed_at=2026-04-27 12:23:55.03487+00` ✅

3. **Restore WF-RD-01 to byte-identical pre-patch state**:
   ```bash
   node n8n-patch.mjs replace nc7rTC3hjO9QqbXs artifacts/WF-RD-01_phase2_authorised_post_restore.json
   ```
   Where the restore file is a copy of the pre-snapshot. After:
   - versionId moved to `e8215217-80d0-4388-a276-07f437601a84`
   - 11 nodes / 14 connections (unchanged)
   - active=false (unchanged)
   - `RD_Live_Send_PLACEHOLDER.type = 'n8n-nodes-base.noOp'` ✅
   - `RD_Set_Mode` jsCode: v1.0 default-dry_run ✅
   - `RD_Live_Build_Body` jsCode: v1.0 ✅
   - `RD_Live_Mark_Sent.queryReplacement`: v1.0 ✅

4. **Verify** via `mcp__n8n__verify_workflow`: all checks pass.

## Live evidence post-restore

| Check | Result |
|---|---|
| Tenant B `telegram_chat_id` | NULL ✅ |
| Fixture task status | cancelled ✅ |
| WF-RD-01 active | false ✅ |
| WF-RD-01 nodes / connections | 11 / 14 ✅ |
| `RD_Live_Send_PLACEHOLDER.type` | `n8n-nodes-base.noOp` ✅ |
| `public.reminders` count / max | 1 / 2026-04-13 20:17:13.620582+00 ✅ |
| `public.outbound_delivery_ledger_claude_mcp` count | 0 ✅ |
| Total `task_reminder_deliveries` rows | 25 (24 from Phase 1 + 1 fixture `sent` audit row) ✅ |
| Other workflows | byte-identical ✅ |

## What is preserved post-mission

- The fixture's ledger row (`3503894c-…`) stays in
  `public.task_reminder_deliveries` as `delivery_status='sent'` —
  this is the canonical audit record of the live probe and is
  intentionally kept.
- The cancelled fixture task in `public.tasks` (status=cancelled).
  Soft-cancel preserves audit trail per task_module convention.

## What is reverted

- Sandbox chat id (NULL on tenant B).
- Workflow placeholder (NoOp).
- All Phase 2 jsCode tweaks (RD_Set_Mode, RD_Live_Build_Body,
  RD_Live_Mark_Sent) returned to v1.0 byte-identical.

## Risk envelope (post-restore)

- Without a `telegram_chat_id` on any tenant, future scheduler runs
  classify all candidates as `skipped_missing_target` (Phase 1
  baseline behaviour).
- WF-RD-01 stays `active=false`; the schedule trigger does not fire
  on its own.
- The Telegram credential `Z0ovMbkHwXEC8ZtF` is not attached to any
  node in WF-RD-01 anymore; only WF-MO-01 references it.
- Re-enabling live sends in a future mission requires:
  (a) re-attaching the Telegram node + credential, and
  (b) re-setting `tenants.metadata.telegram_chat_id` on the chosen
  tenant. Both are documented in `WORKFLOW_PATCH_PLAN.md` of the
  prior `phase2_live_sandbox_probe/` folder.
