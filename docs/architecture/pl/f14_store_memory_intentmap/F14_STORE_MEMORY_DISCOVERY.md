# F14 — PL `store_memory` IntentMap · Discovery

> Source-of-truth audit before patching `WF-PL-01.PL_Build_Planner_Input`.

## 1. Producer / consumer audit

### 1.1 PL gap (the F14 itself)

`WF-PL-01.PL_Build_Planner_Input` v2.0 jsCode (versionId `898fa273…`):

- `intentMap` lacks `store_memory` — has `search_memory`, `save_suggestion`, all task and reminder mappings, but no entry that maps the system intent `store_memory` to a planner action.
- `actionToModule` lacks `store_memory` — has `search_memory: 'memory_module'` and `capture_feedback: 'improvement_module'`, but no entry that maps the action `store_memory` to a module owner.
- `extractInputsForAction(action, goalText)` has clauses for `search_memory`, `capture_feedback`, `observe`, plus the task / reminder family — but no `store_memory` clause.
- The v2.0 source code's own header comment self-documents the gap:
  > "// F14 store_memory gap is OUT OF SCOPE for this mission — left as in v1.3."

Net effect: when an upstream classifier emits `messages.intent='store_memory'`, OR carries it as `planner_context.primary_intent='store_memory'`. PL's `intentMap[primaryIntent]` returns `undefined`, so the auto-routed action branch is skipped. If `requested_actions` is also empty, PL emits `error_code: INSUFFICIENT_PLANNING_CONTEXT` and the chain bottoms out before reaching DI/ME. The store-memory canonical handler in WF-ME-01 is therefore unreachable from the chain.

### 1.2 Memory V2 ME store handler — fully real, contract-aligned

`WF-ME-01` (versionId `3804ec0e…`):

- `ME_Route_Module_Name` switch routes `module_name='memory_module'` to `ME_Route_Memory_Action`.
- `ME_Route_Memory_Action` switch first output (`outputKey: store_memory`) gates on `step.inputs.action === 'store_memory'`.
- `ME_Memory_Store_Prep` is real Code that validates required inputs (`content`, `memory_type ∈ {fact,observation,pattern,inference,preference,constraint}`, `category` matching `^[a-z][a-z0-9_]{0,63}$`, `source_thread_id`); applies the F5 subjective-judgment guard for observation/pattern types; emits `idempotency_key = 'store_memory:' + execution_context_id + ':' + step_id` plus the full `__db` payload Memory V2 expects.
- `ME_Memory_Store_Embed` (HTTP) and `ME_Memory_Store_Embed_Merge` (Code) compute the embedding and merge into the DB payload.
- `ME_Memory_Store_DB` (Postgres v2.4) executes the canonical INSERT into `public.memory_items` with `ON CONFLICT (idempotency_key) DO NOTHING + UNION ALL` fallback. Idempotency is enforced at the DB constraint layer.
- `ME_Memory_Store_Result` builds the canonical `module_result` envelope.

So Memory V2 is **already wired** for store_memory end-to-end. The only thing missing is PL's planner-side routing.

### 1.3 Module Registry contract

`docs/architecture/Module_Registry_Ucenicul.md` `memory_module` entry:

```
"capabilities": ["store_memory", "recall_memory", "promote_memory", "search_memory", "supersede_memory"],
"inputs_expected": ["action", "content", "memory_type", "source_context"],
"can_write_to": ["memory_store"],
"status": "active",
"idempotency_requirements": "idempotency_key based on execution_context_id + step_id; supersede operations must check existing memory_id"
```

`store_memory` is a canonical capability of `memory_module`. The contract's required inputs (`content`, `memory_type`, `source_context`) align exactly with what `ME_Memory_Store_Prep` validates. F14 does not introduce a new contract; it reconnects the existing chain to its existing contract owner.

## 2. Patch surface

The fix is a single jsCode rewrite on `PL_Build_Planner_Input.parameters.jsCode`:

1. `intentMap.store_memory = 'store_memory'`.
2. `actionToModule.store_memory = 'memory_module'`.
3. New `extractInputsForAction('store_memory', goalText)` clause that strips Romanian / English memory-write verb prefixes (`ține minte că…`, `notează că…`, `salvează că…`, `memorează că…`, `înregistrează că…`, `remember that…`, `note that…`, `save that…`, `memo(rize) that…`) from the goal and emits:
   - `content` — the cleaned noun-phrase memory content.
   - `memory_type='fact'` — safe default; matches Memory V2's `VALID_TYPES`.
   - `category='general'` — safe default; matches the `^[a-z][a-z0-9_]{0,63}$` regex.
4. New late-binding pass on `requestedActions` that injects `source_thread_id` from `verify.thread_id`, `source_message_id` from `verify.trigger_message_id`, and confirms `memory_type` / `category` defaults — these fields are not visible to `extractInputsForAction(action, goalText)` (which only sees `goalText`), so the injection has to happen at the request-actions level. Caller-provided values in `plannerContext.inputs` already win because they were Object.assigned LAST in the loop above; the late-binding only fills in what is still missing.

Patch surface counts:

- 1 jsCode rewrite.
- 0 node delta.
- 0 connection delta.
- 0 schema mutation.

## 3. Memory V2 frozen surface

The patch does **not** touch:

- Any node in `WF-ME-01` (memory store / recall / promote / supersede / search remain byte-identical).
- Memory V2's design freeze docs.
- The `public.memory_items` schema or any `rag_memories.*` artefact.
- Any other workflow.

V2-028 canonical local `n8n-patch.mjs replace` is the only write channel used. No Path 5. No MCP `patch_workflow_nodes`. No duplicate workflow.

## 4. Stop conditions evaluated

None of the stop conditions from the pack apply:

- store_memory does **not** require Memory V2 internals modification — ME is already real.
- `WF-ME-01` memory handler is real and contract-aligned (verified above).
- Patch is small (1 jsCode rewrite); not a broad planner rewrite.
- task_module is not touched.
- No cross-tenant risk (tenant scope is enforced at ME/DB layer).
- Replay invariant is enforced at the DB constraint level (UNIQUE on `idempotency_key`).
- No schema migration needed.
- V2-028 canonical channel is authorized.
- No duplicate workflow.

Mission proceeds with the 1-jsCode patch.
