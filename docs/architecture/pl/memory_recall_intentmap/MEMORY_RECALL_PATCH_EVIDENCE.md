# MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP · Patch Evidence

## Diff (v2.4 → v2.5)

Full diff stored alongside in `artifacts/v2.4_v2.5.diff`. The relevant
hunks:

### Header comment swap

```diff
-// PL_Build_Planner_Input — v2.4 (PL_BRIEFING_INTENT_MAPPING_FOLLOWUP 2026-04-26)
+// PL_Build_Planner_Input — v2.5 (MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP 2026-04-27)
```

### intentMap (1 line added)

```diff
   search_memory: 'search_memory', save_suggestion: 'capture_feedback',
+  // MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP: route memory recall to memory_module.recall_memory.
+  recall_memory: 'recall_memory',
```

### actionToModule (1 line added)

```diff
   search_memory: 'memory_module', capture_feedback: 'improvement_module',
+  // MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP: memory_module owns recall_memory.
+  recall_memory: 'memory_module',
   observe: 'watcher_module_basic',
```

### extractInputsForAction clause for `recall_memory`

```diff
   if (action === 'search_memory') { … return { query: q }; }
+  if (action === 'recall_memory') {
+    return { limit: 25 };
+  }
   if (action === 'capture_feedback') { … }
```

### New late-binding pass (between F14 store and supersede)

```js
requestedActions = requestedActions.map(a => {
  if (a && String(a.action || '') === 'recall_memory') {
    const newInputs = Object.assign({}, a.inputs || {});
    const hasStructural = (newInputs.entity_id || newInputs.source_thread_id ||
                            newInputs.category || newInputs.memory_type);
    if (!hasStructural && verify.thread_id) {
      newInputs.source_thread_id = String(verify.thread_id);
    }
    if (!newInputs.limit) newInputs.limit = 25;
    return Object.assign({}, a, { module_name: 'memory_module', inputs: newInputs });
  }
  return a;
});
```

## Live apply

```
$ node n8n-patch.mjs patch-node RwToPLa1ErHl2tUi PL_Build_Planner_Input \
    --params docs/architecture/pl/memory_recall_intentmap/artifacts/PL_Build_Planner_Input_v2.5.params.json
{
  "id": "RwToPLa1ErHl2tUi",
  "name": "WF-PL-01",
  "patched": "PL_Build_Planner_Input",
  "keys": ["jsCode"]
}
```

## Verify

```
$ mcp__n8n__verify_workflow id=RwToPLa1ErHl2tUi expected={nodeCount:16, connectionCount:16}
{
  "summary": {
    "versionId": "4e0406c3-9813-4374-9178-581409c6bdc4",
    "nodeCount": 16,
    "connectionCount": 16,
    "active": true,
    "updatedAt": "2026-04-27T08:11:16.347Z"
  },
  "allPass": true
}
```

VersionId lineage: `839b1750-2fb2-40ab-aeb2-88508d0a01c7` →
**`4e0406c3-9813-4374-9178-581409c6bdc4`**.

WF-ME-01, WF-DI-01, WF-OR-01, WF-EC-01, WF-TR-01, WF-RA-01, WF-SU-01,
WF-RC-01, WF-MO-01: all byte-identical post-mission.
