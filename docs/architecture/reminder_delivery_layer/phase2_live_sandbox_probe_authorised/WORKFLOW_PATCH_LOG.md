# Phase 2 Authorised · Workflow Patch Log

All workflow operations were performed via the V2-028 canonical local
CLI (`.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs`).
Snapshots captured pre- and post-each step under `artifacts/`.

## Operation timeline

| # | Op | Description | versionId after |
|---|---|---|---|
| 1 | `get` | Snapshot pre-patch (`WF-RD-01_phase2_authorised_pre.json`). Confirmed `RD_Live_Send_PLACEHOLDER.type='n8n-nodes-base.noOp'`, active=false, 11/14. | (read-only — versionId stayed at `894ad514-7ce7-4b35-90d4-6c5190f01408`) |
| 2 | `replace` | Patched `RD_Live_Send_PLACEHOLDER` from NoOp → `n8n-nodes-base.telegram` typeVersion 1.2 with `chatId={{ $json.live_payload.chat_id }}`, `text={{ $json.live_payload.text }}`, credentials `Z0ovMbkHwXEC8ZtF`. | **`4687b3fb-46fa-4349-9596-3257f03d5136`** |
| 3 | `replace` | (Override) Patched `RD_Set_Mode` jsCode to default `mode='live'`, `live_allowed=true`, `candidate_limit=1` so the manualTrigger MCP execution (which can't pass per-run inputs) hits the live branch. | (versionId moved; intermediate state) |
| 4 | First live execute | TR exec **10799** failed at `RD_Live_Build_Body` because the Code node was reading `$json.reminder.delivery_target` after `RD_Upsert_Delivery_Row` overwrote `$json` with its RETURNING result. **Chain stopped before any Telegram call** (NoOp-equivalent safety). Partial `pending` ledger row `2b4481cc-…` was created and immediately deleted via SQL to keep replay deterministic. | (versionId moved; intermediate) |
| 5 | `replace` | Bug fix: changed `RD_Live_Build_Body` jsCode to read `$('RD_Classify_And_Build').item.json` (so it sees `reminder` + `__db`); changed `RD_Live_Mark_Sent.queryReplacement` to fetch `__db.{tenant_id, task_id, due_occurrence_iso}` from the same upstream node and to extract the Telegram message_id from `$json.result.message_id` for `provider_message_ref`. | (versionId moved) |
| 6 | Second live execute | TR exec **10800** GREEN: Telegram message_id 546 delivered to chat 5101664726, ledger row `3503894c-…` marked `delivery_status='sent'`, `provider_message_ref='546'`, `attempts=1`. | (no workflow change) |
| 7 | Replay execute | TR exec **10801** GREEN: 0 candidates loaded (NOT IN exclusion), 0 new ledger rows, 0 duplicate Telegram sends. | (no workflow change) |
| 8 | `replace` | **Restore** to byte-identical pre-patch state: re-applied the captured pre-snapshot. `RD_Live_Send_PLACEHOLDER` back to NoOp, `RD_Set_Mode` back to v1.0 default-dry_run. | **`e8215217-80d0-4388-a276-07f437601a84`** |

## VersionId lineage (canonical)

```
PRE   894ad514-7ce7-4b35-90d4-6c5190f01408   (Phase 1 baseline; NoOp)
PATCH 4687b3fb-46fa-4349-9596-3257f03d5136   (Telegram node + cred)
…     (intermediate replaces during fix iteration — not user-visible)
RESTORE e8215217-80d0-4388-a276-07f437601a84 (NoOp restored; nodes/connections byte-identical to PRE)
```

## Structural deltas

| Bucket | Pre | After patch | After restore |
|---|---|---|---|
| nodeCount | 11 | 11 | 11 |
| connectionCount | 14 | 14 | 14 |
| active | false | false | false |
| availableInMCP | true | true | true |
| `RD_Live_Send_PLACEHOLDER.type` | `noOp` | `telegram` | `noOp` |
| `RD_Set_Mode` jsCode | v1.0 (defaults dry_run_audit) | live-override | v1.0 |
| `RD_Live_Build_Body` jsCode | v1.0 | v1.1 (read upstream) | v1.0 |
| `RD_Live_Mark_Sent.queryReplacement` | v1.0 | v1.1 (read upstream + provider_ref) | v1.0 |

The **restore is byte-identical** to the pre-patch snapshot — the
`replace` of step 8 used the captured pre-JSON file directly.

## Cross-checks of upstream workflows

`mcp__n8n__verify_workflow` for WF-PL-01, WF-ME-01, WF-MO-01 all
confirm byte-identical versionIds pre- and post-mission. No
non-WF-RD-01 mutation occurred.

## Audit trail

The CLI's `.audit.jsonl` file under
`.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/` recorded
each `get`/`replace` operation with timestamps and snapshot
fingerprints. Snapshots are stored in the artifacts/ folder of this
mission for forensic reference.
