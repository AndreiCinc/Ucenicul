# IMPROVEMENT_MODULE_LIST_FOLLOWUP · Patch Evidence

## WF-PL-01 v2.5 → v2.6 (jsCode-only rewrite)

```
$ node n8n-patch.mjs patch-node RwToPLa1ErHl2tUi PL_Build_Planner_Input \
    --params artifacts/PL_Build_Planner_Input_v2.6.params.json
{"id":"RwToPLa1ErHl2tUi","name":"WF-PL-01","patched":"PL_Build_Planner_Input","keys":["jsCode"]}
```

Verify post:

```
versionId 4e0406c3… → d97af7ff-54c3-4625-9f09-1fbddf7cdc03
nodes 16 → 16, connections 16 → 16, active=true.
```

### Diff sketch (full diff in `artifacts/PL_Build_Planner_Input_v2.6.js`)

```diff
@@ intentMap @@
   recall_memory: 'recall_memory',
+  // IMPROVEMENT_MODULE_LIST_FOLLOWUP: route list_improvements through improvement_module.
+  list_improvements: 'list_improvements',

@@ actionToModule @@
   recall_memory: 'memory_module',
+  // IMPROVEMENT_MODULE_LIST_FOLLOWUP: improvement_module owns list_improvements (read-only lane).
+  list_improvements: 'improvement_module',

@@ extractInputsForAction @@
+  if (action === 'list_improvements') {
+    const out = { limit: 25, include_closed: false };
+    if (/\b(closed|inchise|terminate|done)\b/i.test(lower)) out.include_closed = true;
+    const sm = lower.match(/\b(?:status[:=]?\s*|stare[:=]?\s*)(pending|in_progress|closed|rejected|accepted)\b/);
+    if (sm) out.status_filter = sm[1];
+    return out;
+  }
```

## WF-ME-01 (replace — 4 new nodes + 7 new connections)

```
$ node n8n-patch.mjs replace uq26nh1grIpnHju0 artifacts/WF-ME-01_post.json --reactivate
{"id":"uq26nh1grIpnHju0","name":"WF-ME-01 Module Execution"}
reactivated uq26nh1grIpnHju0
```

Verify post:

```
versionId 328b2b81-58e6-4003-8966-4159d695cfda → d2197ed5-5f2d-454e-a540-fd464f526d2e
nodes 62 → 66, connections 81 → 88, active=true.
```

### Nodes added

| Node | Type | Position | Role |
|---|---|---|---|
| `ME_Route_Improvement_Action` | switch v3 | [2520, 1100] | Sub-action router (capture / list / log_alias / fallback) |
| `ME_Improvement_List_Prep` | code | [2768, 1400] | Builds `__db` payload for SELECT |
| `ME_Improvement_List_DB` | postgres | [2960, 1400] | Parameterised SELECT (5 params) |
| `ME_Improvement_List_Result` | code | [3160, 1400] | Wraps result envelope (Romanian summary, no raw JSON) |

### List_DB query (sanitized)

```sql
SELECT id, organization_id, tenant_id, requested_feature, user_message, status, created_at
FROM public.improvement_requests
WHERE tenant_id = $1::uuid
  AND ($2::text IS NULL OR status = $2::text)
  AND ($3::boolean OR status <> 'closed')
  AND ($4::timestamptz IS NULL OR created_at >= $4::timestamptz)
ORDER BY created_at DESC
LIMIT $5::int;
```

`queryReplacement` binds `[$json.__db.tenant_id, status_filter,
include_closed, since, limit]` per the canonical PostgreSQL Query
Policy (parameterised binding; no raw string concatenation).

### Connection rewiring

| From | To (was) | To (now) |
|---|---|---|
| `ME_Route_Module_Name` output 3 (improvement_module) | `ME_Improvement_Capture_Prep` | `ME_Route_Improvement_Action` |
| (new) `ME_Route_Improvement_Action`[capture_feedback] | — | `ME_Improvement_Capture_Prep` |
| (new) `ME_Route_Improvement_Action`[list_improvements] | — | `ME_Improvement_List_Prep` |
| (new) `ME_Route_Improvement_Action`[log_improvement_request] | — | `ME_Improvement_Capture_Prep` (defensive alias) |
| (new) `ME_Route_Improvement_Action`[extra/fallback] | — | `ME_Return_Error` |
| (new) `ME_Improvement_List_Prep` | — | `ME_Improvement_List_DB` |
| (new) `ME_Improvement_List_DB` | — | `ME_Improvement_List_Result` |
| (new) `ME_Improvement_List_Result` | — | `ME_Return_Result` |

Net: +1 rewired edge + 7 new edges = **+7 connection delta**.

## Other workflows

WF-DI-01, WF-OR-01, WF-EC-01, WF-TR-01, WF-RA-01, WF-SU-01, WF-RC-01,
WF-MO-01: all byte-identical post-mission.
