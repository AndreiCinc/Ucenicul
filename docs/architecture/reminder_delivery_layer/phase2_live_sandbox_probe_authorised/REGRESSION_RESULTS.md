# Phase 2 Authorised · Regression Results

All regression invariants GREEN.

| # | Probe | Result |
|---|---|---|
| R-1 | `create_reminder → task` writes a `tasks` row with `due_at` | ✅ — PL v2.6 + WF-ME-01 d2197ed5 byte-identical |
| R-2 | `create_task` writes | ✅ task_module unchanged |
| R-3 | `list_tasks` read-only | ✅ task_module unchanged |
| R-4 | `complete_task` works | ✅ task_module unchanged |
| R-5 | `store_memory` writes | ✅ memory_module unchanged |
| R-6 | `recall_memory` / `search_memory` read-only | ✅ memory_module unchanged |
| R-7 | `capture_feedback` writes | ✅ improvement_module unchanged |
| R-8 | `list_improvements` read-only | ✅ improvement_module unchanged |
| R-9 | `response_module.respond_only` no-write | ✅ unchanged |
| R-10 | `public.reminders` byte-identical | ✅ count=1, max=2026-04-13 20:17:13.620582+00 |
| R-11 | `public.outbound_delivery_ledger_claude_mcp` byte-identical | ✅ count=0 |
| R-12 | `public.task_reminder_deliveries` ledger UNIQUE preserved | ✅ 25/25 |
| R-13 | No duplicate WF-RD-* workflow | ✅ exactly one WF-RD-01 (id `nc7rTC3hjO9QqbXs`) |
| R-14 | No Path 5 invocation | ✅ |
| R-15 | No unauthorised MCP workflow write | ✅ (V2-028 local CLI used for all `replace`s) |
| R-16 | WF-RD-01 active=false post-mission | ✅ |
| R-17 | `RD_Live_Send_PLACEHOLDER` restored to NoOp | ✅ |
| R-18 | Sandbox chat_id removed from tenant B | ✅ |

## Workflow versionId table (pre/post)

| Workflow | Pre | Post |
|---|---|---|
| WF-TR-01 | `88d2d45b…` | unchanged |
| WF-EC-01 | `d25e4316…` | unchanged |
| WF-OR-01 | `f4925ede…` | unchanged |
| WF-PL-01 | `d97af7ff-54c3-4625-9f09-1fbddf7cdc03` | unchanged |
| WF-DI-01 | `a1f9eaa2…` | unchanged |
| WF-ME-01 | `d2197ed5-5f2d-454e-a540-fd464f526d2e` | unchanged |
| WF-RA-01 | `4a2be8b4…` | unchanged |
| WF-SU-01 | `4e7bc0d1…` | unchanged |
| WF-RC-01 | `6d3f5208…` | unchanged |
| WF-MO-01 | `4e0163b2-e176-40ad-ac33-a8438d7c2147` | unchanged |
| WF-RD-01 | `894ad514-7ce7-4b35-90d4-6c5190f01408` | **`e8215217-80d0-4388-a276-07f437601a84`** (byte-identical content; only the n8n versionId hash moved due to the patch+restore round-trip) |

## DB delta summary

| Table | Pre | Post | Δ | Notes |
|---|---|---|---|---|
| `public.reminders` | 1 / max 2026-04-13 | 1 / max 2026-04-13 | 0 | byte-identical ✅ |
| `public.outbound_delivery_ledger_claude_mcp` | 0 | 0 | 0 | byte-identical ✅ |
| `public.tasks` | 98 + 9 fixtures = 107 (post Phase 0) | +1 (probe fixture, status=cancelled post-restore) | +1 | only the probe fixture (cancelled) |
| `public.task_reminder_deliveries` | 24 | 25 | +1 | the fixture's `sent` audit row |
| `public.tenants` | row count unchanged | unchanged | 0 | tenant B `telegram_chat_id` set then removed |

## External-side-effect tally

- Telegram messages sent: **1** (to chat 5101664726).
- Telegram messages sent to non-sandbox chats: **0**.
- Other external API calls: **0**.
