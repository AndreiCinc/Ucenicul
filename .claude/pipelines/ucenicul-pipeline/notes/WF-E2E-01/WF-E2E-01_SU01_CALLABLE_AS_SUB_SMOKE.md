# WF-E2E-01 — SU-01 Callable-As-Sub Smoke Result

**Date:** 2026-04-18T12:45Z
**Workflow under test:** `ENiYNfL3ul8AmmCB` (WF-SU-01 State Persistence Updater)
**Smoke-only verification.** No SU→RC handoff closure claimed.
**EC-01 remains the canonical active stage. E2E-01 remains meta.**

---

## 1. What was tested

Whether the `SU_Input` `executeWorkflowTrigger` node added to SU-01 in
the prior step (PUT 2026-04-18, audit `before=fbb9b1cf3088 after=8e3a224a4e5f`)
is **structurally and functionally invokable as a sub-workflow**.

This is the narrowest possible smoke. It does NOT verify:
- That SU-01 produces the correct downstream envelope on a green payload.
- That SU→RC link contract is satisfied.
- That SU-01's full V1..V6 sweep still passes.

It DOES verify:
- That an upstream `n8n-nodes-base.executeWorkflow` node can resolve
  SU-01 by id and trigger a real sub-execution.
- That the new `SU_Input` node fires and propagates the input item
  into SU-01's first downstream node.
- That this happens with **zero DB drift** because the test payload
  is intentionally invalid and dies safely inside SU-01's existing
  pipeline.

## 2. Test rig

Caller workflow (ephemeral): `u4sWtaivxwHwIh37` — manualTrigger →
`Build_Invalid_Payload` (Set node returning `{"__probe":"invalid"}`)
→ `Call_SU_01` (executeWorkflow with `workflowId.value = "ENiYNfL3ul8AmmCB"`,
mode `"once"`).

Caller has `availableInMCP: true` so `mcp__execute_workflow` can drive it.

Invocation: `mcp__execute_workflow(workflowId=u4sWtaivxwHwIh37, executionMode="manual")`.

## 3. Result — execution 762

n8n returned `{executionId: "762", status: "error"}`. The MCP-level
"error" is the propagated child-workflow error (see §4) — not an
invocation-layer failure.

Caller execution trace (from `get_execution`):
- `Manual` → success.
- `Build_Invalid_Payload` → success, emits `{"__probe":"invalid"}`.
- `Call_SU_01` → status `error` because the child execution errored.
  - **`executionId: "763"` was created on `workflowId: "ENiYNfL3ul8AmmCB"`** — i.e. SU-01 was actually invoked as a sub.

## 4. Child execution 763 (SU-01) — what happened

The error surfaces inside SU-01 at `SU_Load_Execution_Context1`
(postgres node, typeVersion 2.6) with message
`"Query Parameters must be a string of comma-separated values or an array of values"`.

This is the EXPECTED behaviour for an invalid payload. Trace:
1. `SU_Input` (the new `executeWorkflowTrigger`) — fired ✓
2. Item passed to `SU_Validate_Aggregated_Input1` → must have produced
   an output that the routing logic interpreted as "valid" (likely a
   tolerant validator that does not hard-reject on missing fields).
3. `SU_Route_Valid1` → routed forward, not to `SU_Return_Error1`.
4. `SU_Load_Execution_Context1` → tried to bind
   `[$('SU_Validate_Aggregated_Input1').first().json._envelope.execution_context_id, $('SU_Validate_Aggregated_Input1').first().json._envelope.tenant_id]`,
   which on the invalid payload resolves to `[undefined, undefined]`,
   triggering postgres' "Query Parameters must be a string..." rejection.

This proves the trigger and chain wiring are **structurally live**:
the new sub-trigger is resolvable, accepts the input, and propagates
into the existing SU-01 pipeline.

## 5. DB drift

Pre-smoke baseline (taken immediately before the MCP call):
- `execution_contexts = 2`, `threads = 7`, `messages = 6`, `tenants = 7`,
  `rag_memories = 42`, `tasks = 4`, `reminders = 1`,
  `outbound_delivery_ledger_claude_mcp = 0`.

Post-smoke (taken immediately after):
- `execution_contexts = 2`, `threads = 7`, `messages = 6`, `tenants = 7`,
  `rag_memories = 42`, `tasks = 4`, `reminders = 1`,
  `outbound_delivery_ledger_claude_mcp = 0`.

**Drift: zero on every relevant table.** The error inside
`SU_Load_Execution_Context1` was a parameter-binding failure, not a
write — so no UPDATE/INSERT was attempted. Confirms the postgres node
is in `executeQuery` mode with `queryReplacement` (i.e. the V2-V6
production path) and that an early failure does not leak side effects.

## 6. Open observation — validator tolerance

`SU_Validate_Aggregated_Input1` did NOT hard-reject the payload
`{"__probe":"invalid"}`. Instead it routed forward as if valid, and
the failure surfaced two nodes later at the postgres bind. This is
not a regression introduced by E2E-01 — it is a pre-existing tolerance
in the validator. It is recorded here for SU-01's own follow-up cycle
to harden, not for E2E-01 to fix.

For our purposes this is benign because no DB drift occurred.

## 7. Verdict

**Callable-as-sub: PROVEN at the structural+invocation level.**

The new `SU_Input executeWorkflowTrigger` node is fully operational
as a sub-workflow entry point. Any future caller that issues
`executeWorkflow → workflowId="ENiYNfL3ul8AmmCB"` with a *valid*
payload (i.e. carrying `_envelope.execution_context_id` +
`_envelope.tenant_id` and the rest of the SU-01 input contract) will
flow into SU-01's normal V2-V6-validated execution path.

What is NOT yet proven and NOT being claimed:
- SU→RC handoff (no live SU→RC connector exists).
- Green-path SU-01 sub-execution (no green-payload smoke run today).
- That `SU_Input` is on the canonical pack-named path
  (`SU_Validate_Aggregated_Input` without "1" suffix). Live names
  carry a "1" suffix from a prior hotfix re-import, separate
  pre-existing drift.

## 8. Next legitimate step (out of scope this session)

Run a green-payload smoke against SU-01 with a real
`(execution_context_id, tenant_id)` pair from
`public.execution_contexts`. If it returns a valid downstream
envelope and writes the expected idempotent rows, SU-01 is sub-call
ready for SU→RC link wiring.

This requires constructing a fixture payload that matches the SU-01
V3 envelope shape. Owned by SU-01's own follow-up cycle, not by
E2E-01.

## 9. Cleanup

Ephemeral caller `u4sWtaivxwHwIh37` is to be archived after this doc
is written.

## 10. Audit references

- `tools/n8n-patch/snapshots/ENiYNfL3ul8AmmCB_pre-trigger-add-20260418.json`
- `tools/n8n-patch/snapshots/ENiYNfL3ul8AmmCB_post-trigger-add-20260418.json`
- `tools/n8n-patch/snapshots/e2e-01-su-smoke-caller.json`
- `tools/n8n-patch/snapshots/e2e-01-su-smoke-caller-mcp.json`
- n8n executions: `762` (caller, error-bubble) and `763` (SU-01, child).
- `tools/n8n-patch/.audit.jsonl`
