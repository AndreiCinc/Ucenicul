# Next Operator Inputs After This Pack

After Claude closes this pack green, the next executable frontier is Phase 5 controlled multi-tenant rollout.

The operator must provide:

```text
PHASE5_TENANT_ALLOWLIST = [<tenant_id_1>, <tenant_id_2>, ...]
PHASE5_TELEGRAM_CHAT_ID_BY_TENANT = {
  <tenant_id_1>: <chat_id_1>,
  <tenant_id_2>: <chat_id_2>
}
PHASE5_BOOTSTRAP_BACKLOG = true
PHASE5_PER_TENANT_CANDIDATE_LIMIT = 10
PHASE5_GLOBAL_CANDIDATE_LIMIT = 30
PHASE5_ACTIVATION_WINDOW_HOURS = 24
PHASE5_RESTORE_POLICY = deactivate_and_restore_noop OR keep_active_under_observation
```

Do not run Phase 5 without these explicit inputs.
