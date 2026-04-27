# IMPROVEMENT_MODULE_LIST_FOLLOWUP · Design Freeze

Date: 2026-04-27.

## Patch surface

### WF-PL-01 (single jsCode rewrite v2.5 → v2.6)

- `intentMap.list_improvements = 'list_improvements'`
- `actionToModule.list_improvements = 'improvement_module'`
- `extractInputsForAction('list_improvements', goalText)` returns
  `{ limit: 25, include_closed: false }` plus optional `status_filter`
  parsed from goal text (regex on `pending|in_progress|closed|rejected|accepted`).
- 0 node delta, 0 connection delta.

### WF-ME-01 (replace — 4 new nodes + 7 new connections + 1 rewired existing connection)

| New node | Type | Purpose |
|---|---|---|
| `ME_Route_Improvement_Action` | `n8n-nodes-base.switch` v3 | Sub-action router for improvement_module: branches to capture_feedback / list_improvements / log_improvement_request alias / fallback |
| `ME_Improvement_List_Prep` | Code | Validates inputs, normalises filters, emits `__db` payload (tenant_id, status_filter, include_closed, since, limit) |
| `ME_Improvement_List_DB` | Postgres v2.4 (parameterised SELECT) | `SELECT id, organization_id, tenant_id, requested_feature, user_message, status, created_at FROM public.improvement_requests WHERE tenant_id = $1 AND ($2 IS NULL OR status = $2) AND ($3 OR status <> 'closed') AND ($4 IS NULL OR created_at >= $4) ORDER BY created_at DESC LIMIT $5` |
| `ME_Improvement_List_Result` | Code | Wraps rows in canonical `module_result` envelope (`result_type='analysis'`, `domain_writes_performed=false`); summary in Romanian; `actions_executed=[{action:'list_improvements', details:{items, filters_applied}}]` |

Connections changed:

- **Removed:** `ME_Route_Module_Name`[improvement_module=output 3] →
  `ME_Improvement_Capture_Prep` (single edge).
- **Added:** `ME_Route_Module_Name`[improvement_module=output 3] →
  `ME_Route_Improvement_Action`.
- **Added:** `ME_Route_Improvement_Action`[capture_feedback] →
  `ME_Improvement_Capture_Prep` (preserves existing capture chain).
- **Added:** `ME_Route_Improvement_Action`[list_improvements] →
  `ME_Improvement_List_Prep`.
- **Added:** `ME_Route_Improvement_Action`[log_improvement_request] →
  `ME_Improvement_Capture_Prep` (defensive alias; PL v2.2 already
  rewrites this action upstream — kept for symmetry).
- **Added:** `ME_Route_Improvement_Action`[extra/fallback] →
  `ME_Return_Error`.
- **Added:** `ME_Improvement_List_Prep` → `ME_Improvement_List_DB`.
- **Added:** `ME_Improvement_List_DB` → `ME_Improvement_List_Result`.
- **Added:** `ME_Improvement_List_Result` → `ME_Return_Result`.

Net delta: **+4 nodes / +7 connections** (62/81 → 66/88).

### WF-DI-01

No change. `improvement_module` already declared with capabilities
including the list lane (capability list is informational; routing is
PL-driven).

### Schema

**No schema migration.** All filters use existing columns.

## Apply channel

V2-028 canonical local CLI:

```
node n8n-patch.mjs patch-node RwToPLa1ErHl2tUi PL_Build_Planner_Input \
    --params artifacts/PL_Build_Planner_Input_v2.6.params.json
node n8n-patch.mjs replace uq26nh1grIpnHju0 \
    artifacts/WF-ME-01_post.json --reactivate
```

## Post-state

- WF-PL-01 versionId `4e0406c3-9813-4374-9178-581409c6bdc4` →
  **`d97af7ff-54c3-4625-9f09-1fbddf7cdc03`** (16n / 16c, active).
- WF-ME-01 versionId `328b2b81-58e6-4003-8966-4159d695cfda` →
  **`d2197ed5-5f2d-454e-a540-fd464f526d2e`** (66n / 88c, active).
- Schema mutation count: **0**.
