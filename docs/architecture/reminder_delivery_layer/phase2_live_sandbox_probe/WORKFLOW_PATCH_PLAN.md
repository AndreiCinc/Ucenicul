# Phase 2 · Workflow Patch Plan (NOT YET APPLIED)

This file documents the exact patch shape that a future authorised
Phase 2 run will apply. **Nothing in this file is applied today**;
this run halts at the gate.

## Apply channel

V2-028 canonical local CLI:
`.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs`.

Recommended: **reversible** patch — replace the NoOp with the
Telegram node, run exactly one probe, then replace back.

## Pre-patch snapshot (mandatory)

```bash
node n8n-patch.mjs get nc7rTC3hjO9QqbXs --out artifacts/WF-RD-01_phase2_pre.json
```

Expected pre-state:
- versionId `894ad514-7ce7-4b35-90d4-6c5190f01408`
- 11 nodes / 14 connections
- `active=false`
- `RD_Live_Send_PLACEHOLDER.type='n8n-nodes-base.noOp'`

## Patch (single-node `parameters` + `type` rewrite via `replace`)

Surgical change inside the workflow JSON (build script only; do not
write directly via MCP):

```json
// Before
{
  "id": "rd-live-send-0009-aaaa-aaaaaaaaaaaa",
  "name": "RD_Live_Send_PLACEHOLDER",
  "type": "n8n-nodes-base.noOp",
  "typeVersion": 1,
  "position": [1920, 220],
  "parameters": {}
}

// After
{
  "id": "rd-live-send-0009-aaaa-aaaaaaaaaaaa",
  "name": "RD_Live_Send_PLACEHOLDER",
  "type": "n8n-nodes-base.telegram",
  "typeVersion": 1.2,
  "position": [1920, 220],
  "parameters": {
    "operation": "sendMessage",
    "chatId": "={{ $json.live_payload.chat_id }}",
    "text":   "={{ $json.live_payload.text }}",
    "additionalFields": {}
  },
  "credentials": {
    "telegramApi": { "id": "<sandbox-bot-credentials-id>", "name": "Sandbox Telegram Bot" }
  }
}
```

Apply:

```bash
node n8n-patch.mjs replace nc7rTC3hjO9QqbXs artifacts/WF-RD-01_phase2_post.json
```

The post-replace workflow MUST still verify:
- versionId moved (audit trail).
- nodes 11 / connections 14 (no structural change).
- `active=false` preserved.
- `availableInMCP=true` preserved.

## Single-probe input

```json
{ "mode": "live", "live_allowed": true, "candidate_limit": 1 }
```

Exactly **one** Telegram message per probe, gated by:
- Telegram credentials must be present (Phase 2 prerequisite).
- `mode='live'` AND `live_allowed=true` (both required by `RD_Set_Mode`).
- `candidate_limit=1` (LIMIT clause cap).
- The fixture's `delivery_target` resolves to the sandbox chat id only.
- Backlog throttle: `force_send=true` on the fixture overrides `is_backlog`.

Any other input shape falls back to `dry_run_audit` and the live branch
is structurally unreachable.

## Replay probe (idempotency)

Re-fire the same input with the same fixture. Expect:
- `RD_Load_Candidates` returns 0 rows (the fixture's row is now
  `delivery_status='sent'`, excluded by the candidate query's
  `NOT IN ('sent', …)`).
- 0 new ledger rows.
- 0 Telegram sends.

## Post-probe restore

Reverse the type/parameters rewrite (NoOp again) via a second
`replace` call. Snapshot artifacts/WF-RD-01_phase2_post_restore.json.
Verify:
- versionId moved a third time.
- nodes/connections unchanged.
- `RD_Live_Send_PLACEHOLDER.type='n8n-nodes-base.noOp'`.
- `active=false`.

## Decision: reversible vs. permanent

**Recommended for Phase 2 v1: reversible** — keeps the workflow safe
when the operator is not actively running probes. The Telegram node
is only present during the probe window.

A "permanent" variant (Telegram node stays) is acceptable only if:
- WF-RD-01 stays `active=false`.
- The live branch is structurally guarded by `mode='live' AND live_allowed=true`.
- The operator-activation runbook is documented separately.
- Sandbox credentials remain isolated from production credentials.

## P0 gates the reversible variant must pass

- After restore: `RD_Live_Send_PLACEHOLDER.type='n8n-nodes-base.noOp'`.
- After restore: `active=false`.
- After restore: 0 sandbox rows can possibly send (NoOp).
