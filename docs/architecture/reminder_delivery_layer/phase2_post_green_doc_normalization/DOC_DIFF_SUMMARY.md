# Phase 2 Post-Green · Doc Diff Summary

## File 1 — `e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md`

### §0.1 — close Phase 2 sandbox probe row + add cosmetic closure + add Phase 3 next-frontier row

```diff
-| **`REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE`** (next frontier) | `OPEN` | … | Replace NoOp with `n8n-nodes-base.telegram` … |
+| ~~**`REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE`** (next frontier)~~ | ~~`OPEN`~~ | ~~…~~ | **CLOSED 2026-04-27** by `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE_AUTHORISED`. WF-RD-01 patched; Telegram message_id 546 delivered to operator's DM (chat 5101664726); ledger row `3503894c-…` `delivery_status='sent'`; replay 0 dupes; WF-RD-01 restored to byte-identical Phase 1 baseline. See top-of-file 2026-04-27 banner and `phase2_live_sandbox_probe_authorised/CLOSEOUT.md`. |
+| ~~**`RD_AGGREGATE_RESULT_LIVE_SENT_COUNT_FIX_FOLLOWUP`** (cosmetic)~~ | ~~`COSMETIC`~~ | ~~Phase 2 result envelope's `counts.sent` did not increment when the live branch succeeded.~~ | **CLOSED 2026-04-27** — single-node V2-028 patch on `RD_Aggregate_Result.parameters.jsCode` v1.0 → v1.1 (iterates `$('RD_Classify_And_Build').all()` + reconciles live sent via `$('RD_Live_Mark_Sent').all().length`). Verified live (TR exec 10804). WF-RD-01 versionId `9744e3a6-…`. See `aggregate_counts_fix/CLOSEOUT.md`. |
+| **`REMINDER_DELIVERY_LAYER_PHASE3_TENANT_ONBOARDING_AND_PRODUCTION_GATE`** (next frontier) | `OPEN` | Phase 2 GREEN in sandbox; production rollout requires explicit policies for tenant onboarding / Telegram credentials / scheduler activation / backlog & concurrency / observability / alerting; plus a false-sent guard so a NoOp placeholder cannot mark a row `sent`. | Phase 3 is the **production gate**, NOT production rollout. Write all five policy docs, apply the false-sent guard on `RD_Live_Mark_Sent`, draft the Phase 4 controlled-pilot runbook. WF-RD-01 stays `active=false` throughout. |
```

### §0.2 — close step 10, add steps 11–12

```diff
-10. **`REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE`** (current next frontier) — replace `RD_Live_Send_PLACEHOLDER` (NoOp) with `n8n-nodes-base.telegram`, onboard a sandbox `telegram_chat_id` … Gated on operator providing the sandbox chat id.
+10. ~~**`REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE`** (current next frontier)~~ — **DONE 2026-04-27** by `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE_AUTHORISED`. `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE_GREEN = TRUE`.
+11. ~~**`RD_AGGREGATE_RESULT_LIVE_SENT_COUNT_FIX_FOLLOWUP`** (cosmetic deferred)~~ — **DONE 2026-04-27**. `RD_AGGREGATE_RESULT_LIVE_SENT_COUNT_FIX_READY = TRUE`.
+12. **`REMINDER_DELIVERY_LAYER_PHASE3_TENANT_ONBOARDING_AND_PRODUCTION_GATE`** (current next frontier) — production gate, NOT production rollout. Document tenant onboarding / credential / scheduler / backlog / observability policies; apply false-sent guard on `RD_Live_Mark_Sent`; draft Phase 4 controlled-pilot runbook. WF-RD-01 stays `active=false`. No Telegram sends. No real `telegram_chat_id` seeded.
```

## File 2 — `Module_Registry_Ucenicul.md`

### `reminder_module` 2026-04-27 banner — Phase 2 GREEN + Phase 3 next

```diff
- > Next mission: `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE`.
+ > ~~Next mission: `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE`.~~
+ >
+ > **2026-04-27 update:** `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE_GREEN = TRUE`
+ > — one Telegram message delivered live to operator's sandbox DM
+ > (chat 5101664726, message_id 546), one ledger row `sent` with
+ > `provider_message_ref='546'`, replay produced 0 duplicates, WF-RD-01
+ > restored to byte-identical Phase 1 baseline. Cosmetic
+ > `RD_AGGREGATE_RESULT_LIVE_SENT_COUNT_FIX` also CLOSED. WF-RD-01 final
+ > versionId: `9744e3a6-6824-42fd-867c-91622b4722b4`. **Next mission:**
+ > `REMINDER_DELIVERY_LAYER_PHASE3_TENANT_ONBOARDING_AND_PRODUCTION_GATE`.
```

## File 3 — `n8n_Workflow_Mapping.md`

**No diff in this mission.** §11 declaration of `WF-RD-01` was already
in place; the early versionId snapshot reference there is kept as a
historical anchor (operator may refresh in a future hygiene pass).
