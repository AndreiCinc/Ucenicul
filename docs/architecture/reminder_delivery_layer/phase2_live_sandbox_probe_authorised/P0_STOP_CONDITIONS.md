# Phase 2 Authorised · P0 Stop Conditions

| # | Condition | Triggered? | Notes |
|---|---|---|---|
| 1 | Telegram credential not clearly sandbox | **NO** | Exactly one Telegram credential `Z0ovMbkHwXEC8ZtF` ("Telegram account") in n8n; sandbox chat id `5101664726` is the operator's own DM (`type:private`); pairing is unambiguous. |
| 2 | WF-RD-01 not `active=false` | **NO** | active=false verified pre-patch, between patches, and post-restore. |
| 3 | Live path reachable without `live_allowed=true` | **NO** | `RD_Set_Mode` requires both `mode='live'` AND `live_allowed=true`; otherwise classification falls back to `dry_run` and the live branch is unreachable. |
| 4 | candidate_limit cannot be forced to 1 | **NO** | `RD_Set_Mode` set `candidate_limit=1`; `RD_Load_Candidates` LIMIT clause honoured it (live probe loaded exactly 1 candidate; replay loaded 0). |
| 5 | More than one candidate would be sent | **NO** | Tenant B had 0 prior candidates; `candidate_limit=1`; live probe sent exactly 1 message. |
| 6 | `public.reminders` modified | **NO** | count=1, max(created_at)=2026-04-13 20:17:13.620582+00 byte-identical. |
| 7 | Outbound ledger modified | **NO** | count=0 byte-identical. |
| 8 | Replay sent a second message | **NO** | Replay TR exec 10801 loaded 0 candidates; chain stopped before any Telegram call. |
| 9 | NoOp cannot be restored | **NO** | Restore via V2-028 `replace` succeeded; verified `RD_Live_Send_PLACEHOLDER.type='n8n-nodes-base.noOp'`. |
| 10 | Other workflow mutated | **NO** | TR/EC/OR/PL/DI/ME/RA/SU/RC/MO versionIds byte-identical pre/post. |
| 11 | Provider returned error and row was marked `sent` anyway | **NO** | Telegram returned `ok:true` with `result.message_id=546`; ledger update fired only after the Telegram-node success-output. `provider_message_ref='546'`. |
| 12 | Path 5 needed | **NO** | All workflow operations via V2-028 local CLI. |

## Conclusion

**0 of 12 P0 conditions triggered.** The bug surfaced on TR exec 10799
was caught by n8n's runtime exception in a Code node BEFORE the
Telegram node executed — it is not a P0 violation, it is a controlled
in-chain-error that fixed forward via the same V2-028 channel and led
to the GREEN probe.
