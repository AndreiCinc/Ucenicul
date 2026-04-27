# Phase 3 · Tenant Onboarding Policy

## Source of truth (frozen)

`public.tenants.metadata->>'telegram_chat_id'` is the **single
canonical source** for the reminder-delivery target. Both `WF-MO-01`
and `WF-RD-01` read from this field. Any future channel (whatsapp etc.)
should mirror this convention with a separate sub-key
(`whatsapp_chat_id`, etc.) — out of scope for Phase 3.

## Onboarding actors and approvals

A tenant gains a `telegram_chat_id` only via one of these explicit
flows. **No automatic write is permitted.**

### Flow A — Operator-approved manual onboarding (recommended for v1)

1. Tenant contact (or operator on behalf of tenant) DMs the
   `Ucenicul_bot`.
2. The chat trigger captures `chat.id`.
3. The operator reviews:
   - chat type (`private` / `group` / `supergroup`)
   - chat owner identity (matches the tenant operator)
   - whether the tenant is on the operator's allowlist
4. The operator runs an explicit SQL update:
   ```sql
   UPDATE public.tenants
      SET metadata = COALESCE(metadata,'{}'::jsonb)
                  || jsonb_build_object('telegram_chat_id', '<CHAT_ID>')
    WHERE id = '<TENANT_ID>'::uuid;
   ```
5. The change is recorded in an onboarding ledger (Phase 4 will define
   the table; for v1 this can be a manual log).

### Flow B — Automated capture (deferred)

Out of scope for Phase 3. Would require a new workflow
(`WF-TON-01_Tenant_Onboarding`) that gates on user consent + tenant
identity verification. **NOT enabled in Phase 3.**

## Authorisation matrix

| Actor | Can set `telegram_chat_id`? | Notes |
|---|---|---|
| End user (DM in Telegram) | NO | their `chat.id` is captured, but the operator must approve before any UPDATE |
| Operator | YES | manual SQL update; logged in onboarding ledger |
| Phase 4 controlled-pilot mission | YES | exactly one tenant, exactly one chat_id, with explicit operator authorisation in the mission prompt |
| Any automated process / WF-RD-01 / scheduler | NO | the schedule path NEVER writes to `tenants.metadata`; reads only |

## Wrong-chat protection (defence-in-depth)

Even with onboarding gated, a wrong chat_id is the largest residual
risk. Mitigations:

1. **Sanity check on chat type at onboarding**: prefer `private`
   (single user), reject `channel` and large `supergroup` unless
   operator explicitly opts in.
2. **Allowlist of tenant↔chat_id**: documented in onboarding ledger;
   any change requires explicit re-approval.
3. **`tasks.metadata.reminder_delivery.opt_in` flag** (Phase 4+):
   per-task opt-out so a user can mute reminders for a single task.
4. **First-tick dry-run mode** (see `BACKLOG_AND_CANDIDATE_LIMIT_POLICY.md`):
   newly-onboarded tenants run dry-run for at least 1 cycle before
   live to catch onboarding mistakes.
5. **Audit trail**: every change to `tenants.metadata.telegram_chat_id`
   is logged via DB trigger or Phase 4 onboarding ledger.

## Removal / opt-out

Operator runs:

```sql
UPDATE public.tenants
   SET metadata = metadata - 'telegram_chat_id'
 WHERE id = '<TENANT_ID>'::uuid;
```

After removal, that tenant's candidates are classified
`skipped_missing_target` on every subsequent tick. **No further
delivery happens.** The historical ledger rows are kept for audit.

## Phase 3 invariant

Phase 3 itself does NOT onboard any tenant. The current state
(`tenants_with_chat_id = 0`) is preserved end-of-mission. Any onboarding
must be done by an explicit operator action in a future mission.
