# Phase 3 · Fix Test Results

The false-sent guard's IIFE was validated via:

1. Inline JS simulation of the n8n queryReplacement expression against
   four canonical mocks of `$json` (Telegram success, NoOp passthrough,
   Telegram error w/ continueOnFail, Telegram `ok=false`).
2. A live dry-run probe (TR exec 10805) with default `dry_run_audit`
   mode, confirming the non-live paths and DB invariants are
   unaffected.

## Inline JS simulation results (all PASS)

```
PASS  Telegram success                            got={s:"sent",  p:"999", e:null}
PASS  NoOp passthrough (Build_Body output)        got={s:"failed",p:null,  e:"no_provider_message_id"}
PASS  Telegram error w/ continueOnFail            got={s:"failed",p:null,  e:"no_provider_message_id"}
PASS  Telegram returns ok=false (no message_id)   got={s:"failed",p:null,  e:"no_provider_message_id"}

Total: 4 pass, 0 fail
```

These prove:

- **Tel success** ⇒ `delivery_status='sent'`, `provider_message_ref` populated.
- **NoOp passthrough** (current placeholder; safety case) ⇒ `delivery_status='failed'`, no provider_ref, `last_error='no_provider_message_id'`. Phase 4-entry safety guarantee.
- **Telegram error with continueOnFail** ⇒ same `failed` outcome (does not falsely mark sent).
- **Telegram `ok:false` JSON** ⇒ same `failed` outcome.

## Live dry-run probe (TR exec 10805)

| Setting | Value |
|---|---|
| Mode | `dry_run_audit` (default — `RD_Set_Mode` v1.0) |
| live_allowed | false |
| candidate_limit | 50 |
| Candidates loaded | **0** |
| Chain endpoint | `RD_Load_Candidates` (no items emitted) |

Result: 0 ledger rows added, 0 ledger rows updated, 0 Telegram API
calls. Workflow active=false preserved. The candidate query
correctly excluded all 26 historical ledger rows via its
`NOT IN ('sent','failed_terminal','skipped_missing_target','skipped_backlog')`
clause, and tenant default has no new past-due tasks since the
aggregator-fix verify.

## Test mapping vs. mission brief §B4

| Mission brief test # | Coverage |
|---|---|
| 1. unit test on Code node logic with provider success mock | ✅ inline JS test 1 |
| 2. unit test on provider error mock | ✅ inline JS test 3 + 4 |
| 3. unit test on NoOp/empty response mock | ✅ inline JS test 2 |
| 4. dry-run audit path unchanged | ✅ TR exec 10805 — `RD_Set_Mode` v1.0 default returned `mode='dry_run_audit'` (unchanged) |
| 5. missing_target path unchanged | ✅ `RD_Classify_And_Build` logic unchanged; aggregator `counts.skipped_missing_target` confirmed live in TR exec 10804 (aggregator fix verification) |
| 6. skipped_backlog path unchanged | ✅ `RD_Classify_And_Build.is_backlog` logic unchanged |
| 7. live path with NoOp does NOT mark sent | ✅ inline JS test 2 (the canonical NoOp passthrough mock); cannot exercise the live path live without setting a chat_id (forbidden in Phase 3), so the SQL-level proof is the inline simulation |
| 8. public.reminders unchanged | ✅ count=1, max=2026-04-13 20:17:13.620582+00 byte-identical |
| 9. outbound ledger unchanged | ✅ count=0 |
| 10. workflow active=false post-patch | ✅ verified via `mcp__n8n__verify_workflow` |

## Why the live-NoOp test isn't run end-to-end here

Triggering the live branch requires a non-NULL
`tenants.metadata.telegram_chat_id`. Phase 3 forbids seeding a chat
id (it's a Phase 4 step). The inline JS mock proves the IIFE's
behaviour deterministically; the live exercise will be done in Phase 4
on the pilot tenant.
