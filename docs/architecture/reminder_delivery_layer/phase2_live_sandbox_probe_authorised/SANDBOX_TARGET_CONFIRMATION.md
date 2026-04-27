# Phase 2 Authorised · Sandbox Target Confirmation

## Operator-provided sandbox

```
SANDBOX_TELEGRAM_CHAT_ID = 5101664726
```

Provenance (operator quoted in the mission prompt):

```json
"chat": {
  "id": 5101664726,
  "first_name": "Andrei",
  "last_name": "Cinc",
  "type": "private"
}
```

The mission used `chat.id` (not `from.id`), per the operator's
instruction.

## Why this is a safe sandbox

- `type: "private"` ⇒ direct chat with one user (the operator).
- `first_name/last_name` match the operator's identity (Andrei Cinc).
- Sending to chat `5101664726` reaches no one besides the operator.

## Tenant gating

Only **tenant B** (`eee0e2e0-0000-0000-0000-00000000000b`) was used:

- Pre-mission tenant B `metadata.telegram_chat_id` = NULL.
- During probe: `metadata.telegram_chat_id = '5101664726'`.
- Post-mission tenant B `metadata.telegram_chat_id` = NULL (removed).

Tenants default and tenant A were **not touched** (verified via
SELECT).

## Single-fixture gating

Exactly one fixture task was inserted:

- `fixture_task_id = 9d39ae1a-9354-42ca-ba78-66bc6d2a6b78`
- `tenant_id = eee0e2e0-0000-0000-0000-00000000000b`
- `title = 'rd-phase2: sandbox live reminder'`
- `due_at = 2026-04-27 12:20:10.57486+00`
- `status = 'open'` initially, soft-cancelled to `'cancelled'` post-probe.
- `metadata.reminder_delivery.force_send = true` (overrides backlog
  throttle for determinism).

Pre-mission verification: `tenant B existing candidates = 0` ⇒ the
`candidate_limit=1` query loaded only this fixture during the live
probe.
