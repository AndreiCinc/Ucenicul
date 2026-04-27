# Phase 3 · WF-RD-01 Patch Log

## Operation timeline

| # | Op | Description | versionId after |
|---|---|---|---|
| 1 | `get` | Snapshot pre (`artifacts/WF-RD-01_phase3_pre.json`). Confirmed `RD_Live_Send_PLACEHOLDER.type='n8n-nodes-base.noOp'`, active=false, 11/14, versionId `9744e3a6-…`. | (read-only) |
| 2 | `replace` | False-sent guard rewrite of `RD_Live_Mark_Sent.parameters.options.queryReplacement`. The IIFE now derives `delivery_status='sent'` only when `provider_message_ref` is truthy; otherwise `'failed'` with `last_error='no_provider_message_id'`. Single-node patch via V2-028 local CLI. **Node delta 0 / connection delta 0.** | **`5bd37075-c99d-4790-a2a6-0625d656aacb`** |
| 3 | manual exec (TR exec **10805**) | Dry-run probe via MCP. Default mode `dry_run_audit`, candidate_limit=50. Result: `RD_Load_Candidates` returned 0 candidates (the candidate query's NOT-IN clause excluded all 26 historical ledger rows; tenant default has no NEW past-due tasks since the aggregator-fix verify). Chain stopped at `RD_Load_Candidates`. | (no workflow change) |

## Final state

- versionId: **`5bd37075-c99d-4790-a2a6-0625d656aacb`**
- nodes / connections: **11 / 14** (unchanged)
- `active`: **false** (unchanged)
- `availableInMCP`: true (unchanged)
- `RD_Live_Send_PLACEHOLDER.type`: `n8n-nodes-base.noOp` (unchanged)
- `RD_Live_Mark_Sent.parameters.options.queryReplacement`: rewritten with the false-sent guard IIFE (see `WF_RD_AGGREGATE_AND_SENT_GUARD_FIX_PLAN.md` for the diff).
- `RD_Aggregate_Result.parameters.jsCode`: still v1.1 (the cosmetic counts fix from `aggregate_counts_fix/`; not touched in this mission).

## VersionId lineage (cumulative across the Reminder Delivery Layer)

```
Phase 1 import        2a8a003a-…  (initial; pre availableInMCP)
Phase 1 + MCP setting 894ad514-7ce7-4b35-90d4-6c5190f01408  (Phase 1 baseline)
Phase 2 patch         4687b3fb-46fa-4349-9596-3257f03d5136  (Telegram attached + RD_Set_Mode override)
Phase 2 fix iters     (intermediate)
Phase 2 restore       e8215217-80d0-4388-a276-07f437601a84  (NoOp restored)
Aggregate fix         9744e3a6-6824-42fd-867c-91622b4722b4  (RD_Aggregate_Result v1.1)
Phase 3 false-sent    5bd37075-c99d-4790-a2a6-0625d656aacb  (RD_Live_Mark_Sent guarded)
```

## Cross-checks

`mcp__n8n__verify_workflow` for WF-PL-01, WF-ME-01, WF-MO-01 confirms
byte-identical versionIds pre and post — no non-WF-RD workflow
mutation occurred this mission.

## SQL invariants post-patch

| Bucket | Pre | Post | Notes |
|---|---|---|---|
| `public.reminders` count | 1 | **1** | byte-identical ✅ |
| `public.reminders` max(created_at) | 2026-04-13 20:17:13.620582+00 | **same** | byte-identical ✅ |
| `outbound_delivery_ledger_claude_mcp` count | 0 | 0 | unchanged ✅ |
| `task_reminder_deliveries` count | 26 | 26 | unchanged ✅ |
| `task_reminder_deliveries` distinct (tenant_id, task_id, due_occurrence_iso) | 26 | 26 | UNIQUE holds ✅ |
| `task_reminder_deliveries.delivery_status='sent'` count | 1 | 1 | unchanged ✅ |
| Tenant B `telegram_chat_id` | NULL | NULL | unchanged ✅ |
| Tenants with `telegram_chat_id` (any) | 0 | 0 | unchanged ✅ |

## Audit trail

- V2-028 CLI `replace` invocation recorded in `.audit.jsonl`.
- Pre-snapshot kept at `artifacts/WF-RD-01_phase3_pre.json`.
- Post-snapshot kept at `artifacts/WF-RD-01_phase3_post.json`.
