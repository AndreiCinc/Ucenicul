# WF-EC-01 — BUILD_REPORT

Stage: WF-EC-01 (Execution Context Init)
Build attempt date: 2026-04-17
Status: **BUILD BLOCKED — evidence captured**
Shell state: **PRESERVED, unmodified**

---

## 1. Live shell state (read before any write)

Workflow ID: `v9jih4jqeXpOJOiH`
Workflow name: `WF-EC-01`
Active: `true`
Version ID (active): `f0cb6596-510f-4c72-a945-1f9d9a935507`
MCP-visible: `true`
Trigger count: 1
Connections: empty (`{ "When clicking 'Execute workflow'": {"main":[[]]}, "When chat message received": {"main":[[]]} }`)

Nodes (2):

1. `When clicking 'Execute workflow'` — `n8n-nodes-base.manualTrigger` v1, id `ae5c503a-7c72-41f4-974b-d2fcce6ab946`, pos [0,0], parameters `{}`
2. `When chat message received` — `@n8n/n8n-nodes-langchain.chatTrigger` v1.4, id `12d72509-f098-4493-ae5e-0bdaa00cd80a`, pos [208,0], parameters `{ options: {} }`, webhookId `97f2d10d-5b16-47e1-ad80-f53542d1bb8b`

No writes were performed against this shell during this build attempt. The shell remains intact.

## 2. DB reality-check (pre-build)

`public.execution_contexts` is fully provisioned per Spec §F.4:

- Columns present: `id, tenant_id, thread_id, trigger_message_id, status, current_goal, current_plan_ref, pending_steps, completed_steps, module_results, working_notes, shared_artifacts, error_state, retry_state, idempotency_key, expires_at, created_at, updated_at`
- `idempotency_key` has UNIQUE constraint
- `status` CHECK constraint includes `'initialized'` (plus `active, waiting, resolved, abandoned`)
- Owner: `claude_mvp` (current connection user) — DDL allowed if needed
- Existing smoke row from TR→EC handoff: `a7ae786a-9f64-46b8-b02a-3df62080a8f7` (kept as carry-forward evidence; not modified)

Decision: no DB mutation required for Build. `execution_contexts` can be used as canonical target; no `_claude_mcp` fallback needed.

## 3. Canonical working Postgres node shape (cloned reference)

Extracted from `workflows/WF-TR-01_Thread_Resolver.json` (file-level JSON backing the live active workflow). One representative working executeQuery node:

```json
{
  "parameters": {
    "operation": "executeQuery",
    "query": "INSERT INTO thread_resolution_audit (...) VALUES ($1, $2, ...) ON CONFLICT (resolution_id) DO NOTHING",
    "options": {
      "queryParams": "={{ $json.resolution_id }},={{ $json.message_id }},={{ $json.tenant_id }},...",
      "alwaysOutputData": true
    }
  },
  "id": "tr-write-audit-016",
  "name": "TR_Write_Audit",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2,
  "position": [3080, 300]
}
```

Key invariants observed across WF-TR-01's 4 postgres nodes:

- `typeVersion: 2` (not 2.6)
- No `credentials` block in JSON (attached via UI at import time)
- `options.queryParams` = single string, comma-separated `={{ ... }}` expressions
- `options.alwaysOutputData: true` always set
- Parameterized queries using `$1, $2, …`

Code nodes: `type: "n8n-nodes-base.code", typeVersion: 2, parameters: { mode: "runOnceForAllItems", jsCode: "…" }`.
Switch nodes: `type: "n8n-nodes-base.switch", typeVersion: 2, parameters: { rules: { rules: [...] } }`.

## 4. Intended WF-EC-01 layout (7 nodes — from `06_STAGE_WF-EC-01.md`)

1. `EC_Trigger` — manualTrigger v1 (replaces current shell trigger name)
2. `EC_Validate_Input` — code v2 — checks `tenant_id, trigger_message_id, thread_id, idempotency_key` present; sets `_valid`
3. `EC_Route_Valid` — switch v2 — routes on `_valid`
4. `EC_Build_Init_Payload` — code v2 — builds init row matching Spec §F.4 required fields; derives `id` deterministically from idempotency_key hash
5. `EC_Upsert_Context` — postgres v2 — `INSERT … ON CONFLICT (idempotency_key) DO NOTHING RETURNING *` plus a SELECT fallback for replay
6. `EC_Return_Result` — code v2 — emits `{ execution_context_id, tenant_id, thread_id, status, created_at, idempotency_key, replayed: bool }`
7. `EC_Return_Error` — code v2 — emits error envelope on invalid input

Intended connection graph:

```
EC_Trigger → EC_Validate_Input → EC_Route_Valid
EC_Route_Valid[0 valid]   → EC_Build_Init_Payload → EC_Upsert_Context → EC_Return_Result
EC_Route_Valid[1 invalid] → EC_Return_Error
```

The target JSON blueprint embodying this layout is saved at `WF-EC-01_target_blueprint.json` in the same pipeline folder (import-ready; credentials configured post-import, mirroring the WF-TR-01 import pattern).

## 5. Write path attempted

The only MCP write tool available is `update_workflow(code)`, which requires **n8n Workflow SDK code** (not raw n8n JSON).

- Raw n8n JSON embedded as object literals in `nodes:[]` compiles (`valid: true`) but yields `nodeCount: 0` — the SDK's parser does not treat raw JSON as nodes.
- The SDK builder grammar (the function that turns a typed declaration into a node the validator counts) is not discoverable from `validate_workflow` error messages, nor from `get_node_types` (which returns TypeScript parameter typedefs only), nor from `get_suggested_nodes` (which returns service recommendations only).
- Local repo contains no SDK examples — only native n8n JSON (WF-TR-01 was imported via JSON file upload per `IMPORT_WF-TR-01.md`, not built via SDK).
- Probing budget consumed per user's ">3 validate-only loops forbidden" rule. Probing stopped.

See `FIX_LOG.md` for the full probe matrix and the exact error signatures returned by the SDK parser.

## 6. Fixtures touched this attempt

None. No DB rows were inserted/updated/deleted during this build attempt. The carry-forward TR→EC smoke row `a7ae786a-…` is preserved.

## 7. Snapshots

- **Before snapshot (pre-build)**: captured above in §1 — workflow id, version id, node count (2), connection count (0), node names, ordered list.
- **After snapshot**: identical to before — no write was performed.
- Structural delta: **zero change**. Shell integrity: **confirmed preserved**.

## 8. Rollback discipline

No rollback needed: no destructive write was performed. Shell remains in the state the user created it.

## 9. Build verdict

`BUILD_BLOCKED` — the n8n Workflow SDK write path is classified **`unsafe_for_current_stage`** by Tool Failure Matrix §3 (repeated false-success: `valid: true, nodeCount: 0`) until an authoritative SDK grammar example is supplied. No runtime tests (V1–V6) were executed; see CLOSURE_REPORT.
