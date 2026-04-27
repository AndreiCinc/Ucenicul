# Ucenicul — Next 3 Follow-ups Pack

Pack autonom pentru Claude după `FULL_240_VARIANT_SWEEP_GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS`.

## Misiuni în ordine

1. `C11_REPLAY_GROUPING_TARGETED_RERUN`
2. `MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP`
3. `IMPROVEMENT_MODULE_LIST_FOLLOWUP`

## Principiu

Acestea sunt follow-up-uri mici, nu frontiere mari de arhitectură. Claude trebuie să ruleze autonom, dar să se oprească pe P0 real sau product-decision blocker.

## Fișier principal

Dă-i lui Claude:

`02_CLAUDE_AUTONOMOUS_MASTER_PROMPT.md`

## Reguli

- No Path 5.
- No duplicate workflows.
- No schema migration by default.
- No fake Telegram delivery target.
- No reminder delivery here.
- `public.reminders` must remain unchanged.
