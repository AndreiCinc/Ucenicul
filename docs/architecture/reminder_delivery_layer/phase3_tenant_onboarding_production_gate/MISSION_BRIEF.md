# Phase 3 · Tenant Onboarding & Production Gate · Mission Brief

Mission: `REMINDER_DELIVERY_LAYER_PHASE3_TENANT_ONBOARDING_AND_PRODUCTION_GATE`.
Date: 2026-04-27 (autonomous run).
Predecessor: `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE_GREEN = TRUE` +
`REMINDER_DELIVERY_PHASE2_POST_GREEN_DOC_NORMALIZATION_READY_FOR_PHASE3 = TRUE`.

## Objective

Prepare the Reminder Delivery Layer for **controlled production**, but
do NOT activate production. Phase 3 is the gate, not the rollout.

## Allowed in this mission

- One workflow patch on `WF-RD-01` only (V2-028 local CLI):
  the **false-sent guard** on `RD_Live_Mark_Sent` so that
  `delivery_status='sent'` is only written when Telegram returned
  `ok:true` with a real `result.message_id`. With the placeholder still
  set to `n8n-nodes-base.noOp` (no Telegram), the live branch must
  classify the row as `failed` with `last_error='no_provider_message_id'`.
- 16 mission-local policy + runbook docs.
- Compact reconciliation + Module Registry updates.

## Forbidden

- Activate WF-RD-01.
- Telegram sends.
- Set `tenants.metadata.telegram_chat_id` for any real or sandbox
  tenant (the operator's sandbox chat was removed at Phase 2 restore;
  it stays removed in Phase 3).
- Modify `public.reminders` / `public.outbound_delivery_ledger_claude_mcp`.
- Modify any non-WF-RD workflow.
- Path 5 / unauthorised MCP write / Memory V2 reopen.
- Schema migration.
- Production rollout.

## Pre-state confirmed (2026-04-27)

| Bucket | Value |
|---|---|
| WF-RD-01 versionId | `9744e3a6-6824-42fd-867c-91622b4722b4` |
| WF-RD-01 active | false |
| WF-RD-01 nodes / connections | 11 / 14 |
| `RD_Live_Send_PLACEHOLDER.type` | `n8n-nodes-base.noOp` |
| `public.reminders` count / max | 1 / 2026-04-13 20:17:13.620582+00 |
| `public.outbound_delivery_ledger_claude_mcp` rows | 0 |
| `public.task_reminder_deliveries` rows | 26 (24 Phase 1 dry-run + 1 Phase 2 fixture `sent` + 1 aggregator-fix verify) |
| `tenants_with_chat_id` (count) | 0 (none — no fake target seeded) |

## Outputs

Mission-local under
`docs/architecture/reminder_delivery_layer/phase3_tenant_onboarding_production_gate/`:

- `MISSION_BRIEF.md` (this file)
- `READ_STATUS.md`
- `DISCOVERY_NOTES.md`
- `TENANT_ONBOARDING_POLICY.md`
- `TELEGRAM_CREDENTIAL_POLICY.md`
- `SCHEDULER_ACTIVATION_POLICY.md`
- `BACKLOG_AND_CANDIDATE_LIMIT_POLICY.md`
- `OBSERVABILITY_AND_ALERTING_POLICY.md`
- `WF_RD_AGGREGATE_AND_SENT_GUARD_FIX_PLAN.md`
- `WF_RD_PATCH_LOG.md`
- `FIX_TEST_RESULTS.md`
- `SQL_INVARIANTS.md`
- `PRODUCTION_GATE_RUNBOOK.md`
- `PHASE4_CONTROLLED_PILOT_PLAN.md`
- `P0_STOP_CONDITIONS.md`
- `CLOSEOUT.md`

Plus reconciliation + Module_Registry updates.
