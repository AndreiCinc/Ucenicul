# Phase 4 · First Tick Results

## TR exec 10806 — first scheduled tick @ 13:40:29Z

The schedule trigger fired ~3.5 minutes after activation (n8n's
schedule trigger for `minutesInterval: 5` aligns to wall-clock
boundaries, so the first post-activation tick can come slightly
sooner than 5 minutes from `activate`).

### Per-node outcomes

- `RD_Schedule_Trigger` → success (1 item).
- `RD_Set_Mode` → success. Output:
  ```json
  { "mode": "live", "live_allowed": true, "candidate_limit": 10, "dry_run": false }
  ```
- `RD_Load_Candidates` → success (1 item — the pilot fixture):
  ```json
  {
    "task_id": "d7bdb0ed-2bb6-40a0-859c-7ba0b2c60bde",
    "tenant_id": "eee0e2e0-0000-0000-0000-00000000000b",
    "title": "rd-phase4: controlled pilot reminder",
    "due_at": "2026-04-27 13:38:13.242577+00",
    "due_occurrence_iso": "2026-04-27T13:38:00Z",
    "delivery_target": "5101664726",
    "channel": "telegram",
    "is_backlog": false,
    "force_send": "true"
  }
  ```
- `RD_Classify_And_Build` → success. `classified_outcome='live'`,
  `__db.delivery_status='pending'`,
  `idempotency_key='rd:af41cf6b6e96ea8b7092b5bb'`,
  reminder text: `Reminder: rd-phase4: controlled pilot reminder — scadent: 2026-04-27 13:38 UTC.`
- `RD_Upsert_Delivery_Row` → success: `id='298dfe75-…', delivery_status='pending', attempts=1`.
- `RD_Route_Outcome` → output 3 (live).
- `RD_Live_Build_Body` → **error**: `TypeError: Cannot read properties of undefined (reading 'delivery_target') [line 8]`.
- Chain stopped. **Telegram node never executed.**

### Why it failed safely

The pre-pilot snapshot (the byte-identical Phase 3 baseline) carried
the v1.0 `RD_Live_Build_Body` jsCode that reads `$json.reminder.delivery_target`.
Coming out of `RD_Upsert_Delivery_Row`, `$json` is the upsert
RETURNING row `{id, delivery_status, attempts}` — no `reminder` field.
TypeError thrown deterministically.

The Phase 2 sandbox probe had patched this node to read from
`$('RD_Classify_And_Build').item.json`, but Phase 2 restore reverted
that patch back to v1.0 to preserve byte-identity. Phase 3 didn't
touch `RD_Live_Build_Body`. So the v1.0 bug re-surfaced when the live
branch was finally exercised end-to-end via the schedule trigger.

### Important safety observation

**The bug stopped the chain BEFORE the Telegram node executed.** No
external API call was made, no false-sent ledger update happened.
The fixture's ledger row stayed `delivery_status='pending'` with
`provider_message_ref=NULL`. The Phase 3 false-sent guard on
`RD_Live_Mark_Sent` would have caught any attempt to mark it `sent`
without a real `message_id`, but the chain didn't even get there.

This is the canonical "fail safely" outcome documented in
`OBSERVABILITY_AND_ALERTING_POLICY.md`: stuck-`pending` rows are an
operator-visible signal, NOT a P0 stop condition.

### Mid-window action

At 13:43:14Z (≈3 min after the failed first tick), the operator-
agent re-applied the Phase 2 fix to `RD_Live_Build_Body.parameters.jsCode`
(v1.0 → v1.1): the new code reads from
`$('RD_Classify_And_Build').item.json` so the upstream classify
payload is available even after the upsert overwrites `$json`.

Workflow was kept `active=true` during the patch — n8n applies the
new jsCode atomically; the next scheduled tick uses the new version.

### Outcome propagated to second tick

The patched `RD_Live_Build_Body` was used by the second scheduled
tick at 13:45:23Z, which completed successfully end-to-end. See
`OBSERVATION_WINDOW_RESULTS.md`.
