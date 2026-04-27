# P0 Stop Conditions

Stop immediately if any of these happen:

1. WF-RD-01 becomes active during this run.
2. Any Telegram send is attempted.
3. `RD_Live_Send_PLACEHOLDER` is changed from NoOp outside a prepare-only doc.
4. Any tenant gets `metadata.telegram_chat_id` set.
5. `public.reminders` changes.
6. `public.outbound_delivery_ledger_claude_mcp` changes.
7. Any non-WF-RD workflow changes.
8. Memory V2 is reopened.
9. Path 5 is required.
10. Schema migration is required.
11. Phase 4 cannot be confirmed green.
12. The baseline hardening patch cannot be rolled back.
13. WF-RD-01 node/connection delta is not zero for the baseline hardening patch.
14. Productization roadmap tries to open frontend work.
15. Claude starts Phase 5 runtime without operator tenant/chat allowlist.
