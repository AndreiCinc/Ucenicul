# Phase 2 · P0 Stop Conditions

Each condition is evaluated against this run, where the mission halted
at the sandbox-target gate (no patch, no send).

| # | Condition | Evaluation |
|---|---|---|
| 1 | Sandbox `telegram_chat_id` is missing | **TRIGGERED** — by design. This is the gate. The mission's intended response (verdict `BLOCKED_BY_MISSING_SANDBOX_TELEGRAM_TARGET`) is the safe halt. |
| 2 | Provided chat id is not explicitly sandbox-authorized | NOT applicable — no chat id provided. |
| 3 | Workflow active before patch | NOT applicable — no patch. (For the record: WF-RD-01.active=false ✓.) |
| 4 | candidate_limit cannot be forced to 1 | NOT applicable — no run. (Plan documents enforce limit=1 via input.) |
| 5 | Live path can be reached without `live_allowed=true` | NOT applicable — no run. (Code-node `RD_Set_Mode` requires both `mode='live'` AND `live_allowed=true`; otherwise the live branch is unreachable.) |
| 6 | missing_target path can reach Telegram node | NOT applicable — no patch installed. (Switch routes missing_target → RD_Aggregate_Result, never to Telegram.) |
| 7 | backlog path can reach Telegram node | NOT applicable — no patch installed. (Switch routes skipped_backlog → RD_Aggregate_Result.) |
| 8 | More than one candidate would be sent | NOT applicable — no run. (Plan locks `candidate_limit=1`.) |
| 9 | `public.reminders` changes | NOT triggered — count=1, max=2026-04-13.620582+00 byte-identical. |
| 10 | Outbound ledger changes unexpectedly | NOT triggered — count=0 unchanged. |
| 11 | Duplicate Telegram message sent on replay | NOT applicable — no send. |
| 12 | Workflow cannot be restored to safe state | NOT applicable — no patch to restore. |
| 13 | Scheduler activated globally | NOT triggered — WF-RD-01 active=false unchanged. |
| 14 | Any non-WF-RD workflow mutates | NOT triggered — all 10 pre-existing workflows byte-identical. |
| 15 | Path 5 required | NOT triggered. |
| 16 | Telegram credentials missing/ambiguous | NOT applicable — no patch attempted; credentials issue would have been a Phase 2 sub-block, not this gate. |
| 17 | Provider returns error and workflow marks row `sent` anyway | NOT applicable — no send. |

## Conclusion

**0 of 17 unsafe P0 conditions triggered.** Condition 1 (sandbox
target missing) is the gate that the mission brief explicitly
authorised as a safe halt with verdict
`REMINDER_DELIVERY_LAYER_PHASE2_BLOCKED_BY_MISSING_SANDBOX_TELEGRAM_TARGET`.
