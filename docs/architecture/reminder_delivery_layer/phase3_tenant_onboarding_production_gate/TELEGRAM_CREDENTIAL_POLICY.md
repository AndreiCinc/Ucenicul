# Phase 3 · Telegram Credential Policy

## Current state

| Credential id | Name | Bot identity | Used by (today) |
|---|---|---|---|
| `Z0ovMbkHwXEC8ZtF` | `Telegram account` | `Ucenicul_bot` (id 8631804832) | `WF-MO-01.MO_Send_Channel_PLACEHOLDER` (production); not currently attached in WF-RD-01 (placeholder is NoOp post-Phase-2-restore) |

Single bot, single credential. **No separate sandbox bot exists.**

## Phase 2 evidence

The Phase 2 sandbox probe used credential `Z0ovMbkHwXEC8ZtF` to send
to `chat.id=5101664726` (operator's private DM). Safe because:

- target was the operator's own chat, type `private` ⇒ no third party.
- chat_id was set on tenant B only and removed after the probe.
- the probe sent exactly 1 message; replay verified 0 duplicates.

## Phase 3 policy

### Decision: keep one bot for v1; enforce isolation via chat_id, not via bot

For Phase 4 controlled pilot and beyond, the same credential
(`Z0ovMbkHwXEC8ZtF`) is the **only authorised production credential**.
Reasons:

1. The operator has full control over the bot (token rotation,
   webhook policy).
2. `chat_id` is the actual delivery isolation mechanism — different
   bots delivering to the same chat_id produce identical messages.
3. Spinning up a separate sandbox bot would double the credential
   surface and introduce its own activation/deactivation policy
   without changing the actual safety guarantee.

### Required guards before Phase 4

- **Bot ownership lockdown**: the bot's token must remain operator-only.
- **No credential alias**: when WF-RD-01's Telegram node is attached
  permanently (Phase 4 entry), it must reference exactly id
  `Z0ovMbkHwXEC8ZtF`. Any other id is a P0 STOP.
- **Reversible patch model preserved** during early Phase 4: the
  Telegram node should be removable from WF-RD-01 within ~30 seconds
  via the V2-028 CLI `replace` if anything goes wrong.

## Cross-workflow contract

| Workflow | Telegram node? | Credential | Activation gating |
|---|---|---|---|
| WF-MO-01 | yes (`MO_Send_Channel_PLACEHOLDER`) | `Z0ovMbkHwXEC8ZtF` | always active in canonical chain; sends iff `tenants.metadata.telegram_chat_id` non-null |
| WF-RD-01 | NO today (NoOp placeholder) | — | placeholder is `n8n-nodes-base.noOp`; live branch unreachable until operator attaches Telegram node + sets `tenants.metadata.telegram_chat_id` AND activates the workflow |

## Wrong-bot protection

The false-sent guard (`WF_RD_AGGREGATE_AND_SENT_GUARD_FIX_PLAN.md`)
ensures that even if the wrong node type is attached or the credential
is missing, the row is NOT marked `sent` without a real
`provider_message_ref`. This is the canonical ledger protection.

## Phase 3 invariant

Phase 3 does NOT attach the Telegram node. Placeholder remains NoOp.
Verified post-mission via `mcp__n8n__verify_workflow`.
