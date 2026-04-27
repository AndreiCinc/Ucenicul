# Phase 4 · Workflow Patch Log

All operations through V2-028 canonical local CLI. WF-RD-01 only.
No other workflow touched.

## Operation timeline

| # | Op | Time | Description | versionId after |
|---|---|---|---|---|
| 1 | `get` | 13:36:33Z | Snapshot pre (`artifacts/WF-RD-01_phase4_pre.json`). 11/14, active=false, NoOp, false-sent guard, aggregator counts v1.1. | (read-only — `5bd37075-…`) |
| 2 | `replace` | 13:36:33Z | **Phase 4 entry patch.** Two single-node changes in one envelope: (a) `RD_Live_Send_PLACEHOLDER` NoOp → `n8n-nodes-base.telegram` typeVersion 1.2 with cred `Z0ovMbkHwXEC8ZtF`. (b) `RD_Set_Mode.parameters.jsCode` overridden to default `mode='live'`, `live_allowed=true`, `candidate_limit=10` (so the schedule trigger fires the live branch with the pilot cap). | **`24b6cbce-63cc-4624-91d0-0471bbe1be1a`** |
| 3 | `activate` | 13:36:58Z | Activate WF-RD-01 for the pilot window. | (no version change; activation is a separate flag) |
| 4 | scheduled tick | 13:40:29Z | First scheduled tick fired. Loaded the pilot fixture as a `live` candidate. **Failed safely** at `RD_Live_Build_Body` with TypeError `Cannot read properties of undefined (reading 'delivery_target')` because the live workflow's `RD_Live_Build_Body` node was still v1.0 (the Phase 2 fix was reverted at Phase 2 restore and not re-applied). The chain stopped BEFORE the Telegram node executed → **no Telegram send, no false-sent**. Ledger row `298dfe75-…` stayed `delivery_status='pending'`. | (no workflow change) |
| 5 | `replace` | 13:43:14Z | **Mid-window safety re-patch.** `RD_Live_Build_Body.parameters.jsCode` v1.0 → v1.1: reads from `$('RD_Classify_And_Build').item.json` instead of `$json` (because `$json` is the upsert RETURNING by that point). Workflow remained `active=true` during the patch — n8n applied the new jsCode atomically. | **`60aaef06-88b9-4b2e-a49b-cde8d69b19f6`** |
| 6 | scheduled tick | 13:45:23Z | Second scheduled tick. Live branch reached Telegram successfully: `result.message_id=548` returned. `RD_Live_Mark_Sent` (with Phase 3 false-sent guard) wrote `delivery_status='sent'`, `provider_message_ref='548'`, `attempts=2`, `sent_at=2026-04-27 13:45:23.751+00`. | (no workflow change) |
| 7 | scheduled tick | 13:50:23Z | Third scheduled tick. `RD_Load_Candidates` returned 0 rows (the fixture's `delivery_status='sent'` excluded by NOT-IN). Chain stopped after the candidate query. **0 duplicate Telegram sends.** | (no workflow change) |
| 8 | `deactivate` | 13:51:12Z | Deactivate WF-RD-01 (Variant A restore step 1). | (no version change) |
| 9 | `replace` | 13:51:13Z | Restore to byte-identical pre-pilot state via the captured pre-snapshot. NoOp restored, RD_Set_Mode v1.0 restored, RD_Live_Build_Body BACK to v1.0 (matches the byte-identical Phase 3 baseline). | **`ff38f3d3-67a5-46d7-b5cf-7dd4b6ec0706`** |

## Deltas vs. pre-state

| Bucket | Pre | Post |
|---|---|---|
| versionId | `5bd37075-…` | `ff38f3d3-…` (content byte-identical; only the n8n versionId hash advanced through the patch+activate+restore round-trip) |
| nodeCount | 11 | 11 |
| connectionCount | 14 | 14 |
| active | false | false |
| `RD_Live_Send_PLACEHOLDER.type` | `noOp` | `noOp` |
| `RD_Live_Build_Body.parameters.jsCode` | v1.0 (the byte-identical Phase 3 baseline) | v1.0 (restored) |
| `RD_Set_Mode.parameters.jsCode` | v1.0 (default `dry_run_audit`) | v1.0 (restored) |
| `RD_Live_Mark_Sent.parameters.options.queryReplacement` | Phase 3 false-sent guard | Phase 3 false-sent guard (preserved by restore — pre-snapshot already had it) |
| `RD_Aggregate_Result.parameters.jsCode` | v1.1 (counts fix) | v1.1 (preserved by restore) |

## Cross-checks of upstream workflows (post-restore)

| Workflow | versionId | Δ |
|---|---|---|
| WF-PL-01 | `d97af7ff-…` | byte-identical |
| WF-ME-01 | `d2197ed5-…` | byte-identical |
| WF-MO-01 | `4e0163b2-…` | byte-identical |
| All other 7 canonical workflows | unchanged | byte-identical |

## Audit trail

V2-028 CLI `replace` / `activate` / `deactivate` operations recorded in
`.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.audit.jsonl`.
Snapshots kept under `artifacts/`.

## Post-mission deferred follow-up

`WF-RD-01.RD_Live_Build_Body` v1.0 (the version that breaks when
`$json` is overwritten by the upstream Postgres node's RETURNING) is
**still the byte-identical Phase 1/3 baseline** in the live workflow.
This pilot proved the bug only manifests when the live branch is
actually exercised; Phase 1/2/3 dry-runs and aggregate fix never
exercised the live branch end-to-end with NoOp.

A clean fix would be: roll the v1.1 jsCode (read from
`$('RD_Classify_And_Build').item.json`) into the canonical workflow
so future Phase 4-style activations don't repeat the safe-failure on
the first tick. Tracked as
**`RD_LIVE_BUILD_BODY_UPSTREAM_READ_FIX_FOLLOWUP`**.

This is a small, safe single-node patch (already proven mid-pilot).
The current Phase 4 closeout chose Variant A (byte-identical restore)
to honour the operator's explicit instruction; the follow-up patch
can be applied in a separate doc-only-then-patch micro-mission before
the next Phase 4 / Phase 5 activation.
