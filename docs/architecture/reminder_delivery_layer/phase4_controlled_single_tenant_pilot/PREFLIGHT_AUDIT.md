# Phase 4 · Preflight Audit

## Workflow preflight (verified 2026-04-27 ~13:35 UTC)

| Bucket | Expected | Got |
|---|---|---|
| id | `nc7rTC3hjO9QqbXs` | ✅ |
| versionId | `5bd37075-c99d-4790-a2a6-0625d656aacb` | ✅ |
| nodes | 11 | 11 ✅ |
| connections | 14 | 14 ✅ |
| active | false | false ✅ |
| `RD_Live_Send_PLACEHOLDER.type` | `n8n-nodes-base.noOp` | ✅ |
| `availableInMCP` | true | ✅ |
| Phase 3 false-sent guard on `RD_Live_Mark_Sent` | present | ✅ (queryReplacement IIFE installed) |
| Aggregator counts fix on `RD_Aggregate_Result` | present | ✅ (v1.1 — `$('RD_Classify_And_Build').all()` iter) |

Snapshot saved: `artifacts/WF-RD-01_phase4_pre.json`.

## DB preflight (read-only)

| Bucket | Expected | Got |
|---|---|---|
| `public.reminders` count | 1 | 1 ✅ |
| `public.reminders` max(created_at) | 2026-04-13 20:17:13.620582+00 | ✅ |
| `outbound_delivery_ledger_claude_mcp` count | 0 | 0 ✅ |
| Tenants with `telegram_chat_id` | 0 | 0 ✅ |
| `task_reminder_deliveries` total / distinct | 26 / 26 | ✅ |
| Tenant B due tasks | 0 | 0 ✅ (clean slate; fixture inserted later) |
| Tenant B candidates surviving the NOT-IN clause | 0 | 0 ✅ |
| Tenant B existing `rd-phase…` fixtures | 1 (Phase 2 cancelled) | ✅ |

## Telegram credential preflight

| Bucket | Expected | Got |
|---|---|---|
| credential id | `Z0ovMbkHwXEC8ZtF` | ✅ |
| credential name | `Telegram account` | ✅ |
| Bot identity | `Ucenicul_bot` (id 8631804832) | ✅ (confirmed by Phase 2 send response) |
| Other Telegram credentials in n8n | 0 | 0 ✅ |

No ambiguity. Phase 3 policy authorised this credential. Mission
proceeded without raising `BLOCKED_BY_TELEGRAM_CREDENTIALS`.

## Conclusion

All preflight invariants ✅. Mission cleared to proceed with the
single-node patch envelope (Telegram + RD_Set_Mode override) and
chat_id seeding on tenant B only.
