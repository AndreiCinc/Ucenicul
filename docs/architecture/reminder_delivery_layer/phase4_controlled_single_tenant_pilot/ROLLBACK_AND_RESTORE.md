# Phase 4 · Rollback and Restore

## Variant A — applied as the operator instructed

Sequence applied at end of pilot window:

### 1. Deactivate WF-RD-01

```bash
node n8n-patch.mjs deactivate nc7rTC3hjO9QqbXs
```

Time: 2026-04-27 13:51:12Z. Effect: schedule trigger no longer fires.

### 2. Restore WF-RD-01 to byte-identical pre-pilot state

```bash
node n8n-patch.mjs replace nc7rTC3hjO9QqbXs \
  artifacts/WF-RD-01_phase4_pre.json
```

Time: 2026-04-27 13:51:13Z. Result versionId:
`ff38f3d3-67a5-46d7-b5cf-7dd4b6ec0706`. Content byte-identical to the
pre-pilot state (`5bd37075-…`); the n8n versionId hash advanced because
of the round-trip.

### 3. Remove sandbox `telegram_chat_id` from tenant B

```sql
UPDATE public.tenants
   SET metadata = metadata - 'telegram_chat_id'
 WHERE id='eee0e2e0-0000-0000-0000-00000000000b'::uuid
RETURNING (metadata->>'telegram_chat_id') AS tgt_post_remove;
-- → NULL ✓
```

### 4. Soft-cancel the pilot fixture task

```sql
UPDATE public.tasks
   SET status='cancelled', completed_at=now(), updated_at=now()
 WHERE id='d7bdb0ed-2bb6-40a0-859c-7ba0b2c60bde'::uuid
RETURNING id, status, completed_at;
-- → status='cancelled', completed_at=2026-04-27 13:51:15.442103+00 ✓
```

## Verification post-restore

| Check | Result |
|---|---|
| WF-RD-01 active | false ✓ |
| WF-RD-01 nodes / connections | 11 / 14 ✓ |
| `RD_Live_Send_PLACEHOLDER.type` | `n8n-nodes-base.noOp` ✓ |
| Tenants with `telegram_chat_id` | 0 ✓ |
| Pilot fixture status | cancelled ✓ |
| `public.reminders` count / max(created_at) | 1 / 2026-04-13 20:17:13.620582+00 ✓ |
| `public.outbound_delivery_ledger_claude_mcp` rows | 0 ✓ |
| `task_reminder_deliveries` total | 27 (pre 26 + 1 pilot fixture audit row) ✓ |
| `task_reminder_deliveries` `sent` rows | 2 (Phase 2 + Phase 4) ✓ |
| Other 10 canonical workflows | byte-identical ✓ |

## What is preserved post-restore

- The pilot's **canonical audit row** `298dfe75-…` in
  `task_reminder_deliveries` (`delivery_status='sent'`,
  `provider_message_ref='548'`, etc.). Kept as historical evidence of
  the pilot's GREEN outcome.
- The cancelled pilot fixture task (status=`cancelled`,
  `completed_at` set) — soft-cancel preserves the audit trail per
  task_module convention.

## What was NOT preserved (intentionally)

- The Phase 4 `RD_Set_Mode` override (live + candidate_limit=10) —
  reverted to v1.0 default (`dry_run_audit`).
- The Telegram node attached during the pilot — reverted to NoOp.
- The mid-window `RD_Live_Build_Body` v1.1 patch — reverted to v1.0
  baseline. **This is documented as the deferred follow-up
  `RD_LIVE_BUILD_BODY_UPSTREAM_READ_FIX_FOLLOWUP`** since the v1.0
  baseline contains the same bug that surfaced safely on tick 1.
- Sandbox `telegram_chat_id` on tenant B — removed.

## Rapid bail-out (was available but not needed)

Had any P0 fired during the pilot, the rapid bail-out sequence is
identical to Variant A above. The pre-snapshot guarantees a clean
restore at any moment.
