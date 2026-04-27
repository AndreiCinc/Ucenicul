# F14 — PL `store_memory` IntentMap · Patch Evidence

## 1. Workflow modified

| Workflow | id | versionId before | versionId after | nodes | connections | active |
|---|---|---|---|---|---|---|
| WF-PL-01 | `RwToPLa1ErHl2tUi` | `898fa273-68d3-4443-b6f9-9990d1739bb2` | `c4d9796d-f972-49fa-974e-520fe58556a2` | 16 (unchanged) | 16 (unchanged) | ✅ |

Verified via `mcp__n8n__verify_workflow`: `nodeCount=16`, `connectionCount=16`, `active=true`, post-apply `versionId=c4d9796d-f972-49fa-974e-520fe58556a2`.

## 2. Diff surface

Built locally via `artifacts/build_f14_patch.py` (deterministic mutation of `WF-PL-01.pre.json` → `WF-PL-01.next.json`):

- 1 node `parameters.jsCode` replaced — `PL_Build_Planner_Input` (v2.0 → v2.1).
- 0 node added or removed.
- 0 connection edge added or removed.
- 0 schema mutation.

Programmatic byte-identity audit on the post-apply pull confirms only `PL_Build_Planner_Input` differs from the pre snapshot; every other node is byte-identical (modulo position, which was not touched).

## 3. Apply channel

V2-028 canonical local CLI:

```
node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs replace \
     RwToPLa1ErHl2tUi \
     docs/architecture/pl/f14_store_memory_intentmap/artifacts/WF-PL-01.next.json
```

The CLI auto-snapshots the live workflow before and after the PUT, under the n8n-patch tool's `snapshots/` directory. Mission-local snapshots are also saved at:

- `docs/architecture/pl/f14_store_memory_intentmap/artifacts/WF-PL-01.pre.json`
- `docs/architecture/pl/f14_store_memory_intentmap/artifacts/WF-PL-01.next.json`

Rollback procedure: `node n8n-patch.mjs replace RwToPLa1ErHl2tUi WF-PL-01.pre.json` (restores the v2.0 jsCode byte-for-byte).

## 4. Exact PL mapping additions

`PL_Build_Planner_Input.parameters.jsCode` (v2.0 → v2.1) gained the following surgical additions; every other line of the v2.0 code is preserved byte-for-byte except for the version-comment header:

### 4.1 `intentMap`

```diff
 const intentMap = {
   create_task: 'create_task', list_tasks: 'list_tasks', update_task: 'update_task',
   complete_task: 'complete_task', delete_task: 'delete_task',
   // ADR-REMINDER-AS-TASK-LAYER: current-stage create_reminder is a task with due fields.
   create_reminder: 'create_task',
   list_reminders: 'list_reminders', update_reminder: 'update_reminder', cancel_reminder: 'cancel_reminder',
+  // F14: route memory writes to memory_module.store_memory (Memory V2 chain).
+  store_memory: 'store_memory',
   search_memory: 'search_memory', save_suggestion: 'capture_feedback'
 };
```

### 4.2 `actionToModule`

```diff
 const actionToModule = {
   create_task: 'task_module', list_tasks: 'task_module', update_task: 'task_module',
   complete_task: 'task_module', delete_task: 'task_module',
   // create_reminder routes through task_module per ADR.
   create_reminder: 'task_module',
   list_reminders: 'reminder_module', update_reminder: 'reminder_module', cancel_reminder: 'reminder_module',
+  // F14: memory_module owns store_memory (already owns search_memory).
+  store_memory: 'memory_module',
   search_memory: 'memory_module', capture_feedback: 'improvement_module',
   observe: 'watcher_module_basic'
 };
```

### 4.3 New `stripMemoryWritePrefix` helper

```js
function stripMemoryWritePrefix(s) {
  // F14: strip Romanian/English "remember that …" / "ține minte că …" / "notează că …"
  // verb prefixes from the goal so the stored memory content is the noun phrase, not the directive.
  let r = String(s).trim();
  r = r.replace(/[.!?]+\s*$/, '');
  r = r.replace(/^\s*(?:[țt]ine\s+minte\s+(?:c[ăa]\s+)?|noteaz[aă]\s+(?:c[ăa]\s+)?|salveaz[aă]\s+(?:c[ăa]\s+)?|memoreaz[aă]\s+(?:c[ăa]\s+)?|[îi]nregistreaz[aă]\s+(?:c[ăa]\s+)?|remember\s+(?:that\s+)?|note\s+(?:that\s+)?|save\s+(?:that\s+)?|memo(?:rize)?\s+(?:that\s+)?)/i, '');
  return r.trim();
}
```

### 4.4 `extractInputsForAction` — new `store_memory` clause

```diff
+  // F14: memory write input extraction.
+  if (action === 'store_memory') {
+    const content = stripMemoryWritePrefix(g) || g;
+    return {
+      content: content,
+      memory_type: 'fact',
+      category: 'general'
+    };
+  }
   // Memory + improvement + observation behavior preserved verbatim from v1.3.
   if (action === 'search_memory') {
     ...
```

### 4.5 New late-binding pass for `store_memory`

Added immediately after the existing `create_reminder` rewrite block:

```js
// F14: late-binding inject source_thread_id / source_message_id / safe-default
// memory_type / category for any store_memory action.
requestedActions = requestedActions.map(a => {
  if (a && String(a.action || '') === 'store_memory') {
    const newInputs = Object.assign({}, a.inputs || {});
    if (!newInputs.source_thread_id)  newInputs.source_thread_id  = String(verify.thread_id || '');
    if (!newInputs.source_message_id) newInputs.source_message_id = String(verify.trigger_message_id || '');
    if (!newInputs.memory_type)       newInputs.memory_type       = 'fact';
    if (!newInputs.category)          newInputs.category          = 'general';
    return Object.assign({}, a, { module_name: 'memory_module', inputs: newInputs });
  }
  return a;
});
```

Caller-provided overrides via `plannerContext.inputs` still win (they were Object.assigned LAST in the request-actions construction); this pass only fills what is still missing.

## 5. What did NOT change

- `WF-ME-01` (Memory V2): byte-frozen. No node changed; no connection changed; idempotency contract preserved verbatim.
- `task_module` chain: byte-frozen.
- `reminder_module` stubs: byte-frozen.
- `improvement_module` stub: byte-frozen.
- DB schema: 0 mutations.
- `db/migrations/`: empty (as before).
- All other 8 canonical workflows preserve their pre-mission `versionId`.

## 6. Audit trail

The V2-028 CLI appended an entry to
`.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/.audit.jsonl`
recording the `replace` operation with before/after sha256 hashes and
snapshot file paths. Snapshots are accessible under
`.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/snapshots/`.
