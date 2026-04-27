# WF-EC-01 — Closure Plan (Phase 3)

**Date:** 2026-04-19
**Stage:** WF-EC-01 Execution Context Init
**Companion docs:** `WF-EC-01_CLOSURE_CONTRACT.md`, `WF-EC-01_LIVE_REALITY_CHECK.md`.
**Purpose:** sequence the minimal, additive, reversible steps required
to move EC-01 from its current live-implemented-but-unverified state
to 10/10 closure. No live mutation in this doc. Only the sequencing +
rollback + anti-loop plan.

---

## 1. Goal

Close WF-EC-01 at 10/10 with:

- Live workflow matching §7 of the closure contract (all canonical
  nodes + additive `EC_Input` EWT + disabled chatTrigger).
- Live execution IDs covering V1..V6.
- DB drift confirmed zero on all non-`execution_contexts` tables.
- `CLOSURE_REPORT_WF-EC-01.md` with all evidence.
- `ec_01_live_impl` block promoted into `STATE.json`.
- E2E-01 structural progress preserved (SU trigger, RC→MO ship-disabled).

## 2. Mutation pack (Phase 4 — single live PUT)

One live PUT against `v9jih4jqeXpOJOiH` using `n8n-patch replace`
(since the change is structural — adding a node and disabling a
trigger). Captures a pre-mutation snapshot first.

### 2.1 Pre-mutation snapshot (required)

```
node tools/n8n-patch/n8n-patch.mjs get v9jih4jqeXpOJOiH \
  --out tools/n8n-patch/snapshots/v9jih4jqeXpOJOiH_ec01-pre-closure-mutation-20260419.json
```

### 2.2 Target post-mutation shell

Add: one node `EC_Input` (type `n8n-nodes-base.executeWorkflowTrigger`,
typeVersion 1, empty parameters `{}`), one edge `EC_Input →
EC_Validate_Input`.

Modify: `When chat message received` chatTrigger → `disabled: true`.

Keep byte-identical: every other node (`EC_Validate_Input`,
`EC_Route_Valid`, `EC_Build_Init_Payload`, `EC_Upsert_Context`,
`EC_Load_Existing_Context`, `EC_Return_Result`, `EC_Return_Error`,
`When clicking 'Execute workflow'`).

Keep byte-identical: settings (`executionOrder:'v1'`,
`binaryMode:'separate'`, `timeSavedMode:'fixed'`,
`callerPolicy:'workflowsFromSameOwner'`, `availableInMCP:true`).

Keep connections: every existing edge preserved. The
`When chat message received → EC_Validate_Input` edge persists but the
trigger is disabled, so it never fires.

Target counts: **nodes = 10**, **edges = 9** (one new node + one new
edge from `EC_Input`).

### 2.3 Canonical post-mutation shell

```
Nodes (10):
1. EC_Input                            executeWorkflowTrigger v1       (NEW)
2. When chat message received          chatTrigger v1.4    disabled:true (changed)
3. When clicking 'Execute workflow'    manualTrigger v1
4. EC_Validate_Input                   code v2
5. EC_Route_Valid                      switch v2
6. EC_Build_Init_Payload               code v2
7. EC_Upsert_Context                   postgres v2 (creds Postgres account 2)
8. EC_Load_Existing_Context            postgres v2 (creds Postgres account 2)
9. EC_Return_Result                    code v2
10. EC_Return_Error                    code v2

Edges (9):
  EC_Input                          → EC_Validate_Input  (NEW)
  When chat message received        → EC_Validate_Input  (keep; parent trigger disabled)
  When clicking 'Execute workflow'  → EC_Validate_Input
  EC_Validate_Input                 → EC_Route_Valid
  EC_Route_Valid[0] (valid)         → EC_Build_Init_Payload
  EC_Route_Valid[1] (invalid)       → EC_Return_Error
  EC_Build_Init_Payload             → EC_Upsert_Context
  EC_Upsert_Context                 → EC_Load_Existing_Context
  EC_Load_Existing_Context          → EC_Return_Result
```

### 2.4 PUT command

```
node tools/n8n-patch/n8n-patch.mjs replace v9jih4jqeXpOJOiH \
  tools/n8n-patch/ec-closure-harness/WF-EC-01_post-closure-mutation.json \
  --reactivate
```

`--reactivate` is mandatory because EC-01 carries the Langchain
chatTrigger (webhook surface) and now also adds an `executeWorkflowTrigger`.

### 2.5 Post-mutation verification snapshot

```
node tools/n8n-patch/n8n-patch.mjs get v9jih4jqeXpOJOiH \
  --out tools/n8n-patch/snapshots/v9jih4jqeXpOJOiH_ec01-post-closure-mutation-20260419.json
```

And a structural diff vs pre, expecting exactly:
- `+EC_Input` node
- `+EC_Input → EC_Validate_Input` edge
- `When chat message received.disabled: null → true`

## 3. V1..V6 sweep (Phase 5)

All six tests run live, via `mcp__execute_workflow` against
`v9jih4jqeXpOJOiH` (or an ephemeral sub-caller for EWT smoke).

### 3.1 V1 — shell integrity

- Source: the post-mutation snapshot from §2.5.
- Check: node count=10, edge count=9, credentials bound, chat-trigger
  disabled, `availableInMCP:true`.
- Expected result: PASS.

### 3.2 V2 — invalid input

- Fixture: `tools/n8n-patch/ec-closure-harness/V2.fixture.json`.
- Payload: `{"__probe":"invalid"}`. Missing required `tenant_id`,
  `thread_id`, `trigger_message_id`.
- Invocation: ephemeral caller workflow like the SU-01 smoke, issuing
  `executeWorkflow → workflowId: v9jih4jqeXpOJOiH` with this payload;
  OR direct `mcp__execute_workflow` call against EC-01 via the manual
  trigger with pinData.
- Expected: executes, routes to `EC_Return_Error`, returns envelope
  with `error.code === 'INVALID_INPUT'`, `missing_fields: ['tenant_id',
  'thread_id', 'trigger_message_id']`.
- DB: `execution_contexts` count unchanged.

### 3.3 V3 — happy path

- Fixture: `tools/n8n-patch/ec-closure-harness/V3.fixture.json`.
- Payload (flat, no nested):
  ```json
  {
    "tenant_id": "<test_tenant_uuid>",
    "thread_id": "<test_thread_uuid>",
    "trigger_message_id": "<test_msg_uuid>",
    "resolution_method": "attach_existing_thread",
    "resolved_at": "2026-04-19T00:00:00.000Z",
    "idempotency_key": "wf_ec_01_fixture_v3_happy_20260419T0000Z"
  }
  ```
- All uuids will be derived from a pre-existing tenant in `tenants`
  and a pre-existing thread in `threads` (use real rows to avoid FK
  concerns if any — actually EC-01's INSERT has no FKs on
  tenant_id/thread_id per the schema, so any uuid is accepted).
- Expected: executes, routes to happy path, INSERT returns the row,
  `EC_Load_Existing_Context` reads it back, `EC_Return_Result` emits
  `{status:'initialized', current_goal:null, pending_steps:[],
  completed_steps:[], error:null, module_name:'execution_context_init',
  result_type:'state', status_kind:'success'}`.
- DB: `execution_contexts` count +1.

### 3.4 V4 — idempotency (replay)

- Same fixture as V3 (same `idempotency_key`).
- Expected: executes, `ON CONFLICT DO NOTHING` skips insert,
  `EC_Load_Existing_Context` reads the pre-existing row, returns the
  same `id` + same `created_at`.
- DB: `execution_contexts` count unchanged.

### 3.5 V5 — cross-tenant

- Fixture: `tools/n8n-patch/ec-closure-harness/V5.fixture.json`.
- Payload: same `thread_id` + `trigger_message_id` as V3, but
  different `tenant_id` and different explicit `idempotency_key`
  (`wf_ec_01_fixture_v5_cross_tenant_20260419T0000Z`).
- Expected: executes, insert succeeds (distinct key), returns distinct
  `id`. Confirms tenant-scoping.
- DB: `execution_contexts` count +1.

### 3.6 V6 — TR→EC smoke (envelope shape)

- Fixture: `tools/n8n-patch/ec-closure-harness/V6.fixture.json`.
- Payload: nested `{request: {...}}` form shaped exactly like
  `TR_Build_Result`'s output envelope, using one of the real
  `thread_resolution_audit` rows' data (`resolution_id`, `tenant_id`,
  `thread_id`, `trigger_message_id`, `resolution_method`,
  `resolved_at`). Use a distinct `idempotency_key`
  `wf_ec_01_fixture_v6_tr_smoke_20260419T0000Z` to keep V6 separate
  from V3/V5 rows.
- Invocation: ephemeral caller workflow (`executeWorkflow → EC-01`)
  with this payload. This mirrors the SU-01 smoke rig and proves the
  `EC_Input` EWT accepts the canonical TR-shaped envelope.
- Expected: executes, happy path, adapter flattens nested shape,
  INSERT succeeds, `EC_Return_Result` emits canonical envelope.
- DB: `execution_contexts` count +1.

### 3.7 V7 — DB drift probe

- Before V2: capture 8-table count baseline.
- After V6 (and after fixture cleanup in §3.8): capture 8-table count
  again.
- Expected: all counts unchanged from post-smoke baseline.

### 3.8 Fixture cleanup

```sql
DELETE FROM execution_contexts WHERE idempotency_key IN (
  'wf_ec_01_fixture_v3_happy_20260419T0000Z',
  'wf_ec_01_fixture_v5_cross_tenant_20260419T0000Z',
  'wf_ec_01_fixture_v6_tr_smoke_20260419T0000Z'
);
```

No tenants/threads/messages were created by EC-01 itself — no cleanup
needed on those tables.

## 4. Failure strategies with anti-loop (Phase 6)

If any V-test fails, the anti-loop rule is **≥3 materially-different
attempts per failing strategy** before escalating or declaring
blocker-quality report. Materially-different means changing the node
code/config in a distinct way each attempt, not just re-running the
same fixture.

### 4.1 Known likely failure modes + their fix ladders

**F1 — `EC_Upsert_Context` fails with "Query Parameters must be a
string of comma-separated values or an array of values"** (the SU-01
signature).

Fix ladder:
1. Rewrite `queryReplacement` to array-literal form:
   `={{ [ $json.tenant_id, $json.thread_id, $json.trigger_message_id, $json.status, JSON.stringify($json.pending_steps), JSON.stringify($json.completed_steps), $json.idempotency_key, $json.expires_at ] }}`.
2. If that fails, try positional list with explicit array wrap around
   each expression.
3. If that fails, rewrite to use Postgres insert mode (not
   executeQuery) with field mapping.

**F2 — `EC_Route_Valid` mis-routes on boolean switch v2**.

Fix ladder:
1. Change `dataType` from `'boolean'` to `'string'`, keep `value1`
   and string comparison values.
2. If still mis-routes, change to switch v3.2 with
   `options.fallbackOutput:'extra'`, rewrite rules to string equality
   with expressions.
3. If still mis-routes, replace the switch with an `IF` node + two
   explicit branches.

**F3 — `EC_Input` EWT does not fire as sub-caller** (unlikely given
SU-01 precedent).

Fix ladder:
1. Confirm typeVersion is `1` (not `1.1`) — `1` is the proven form.
2. Confirm `parameters: {}` is empty object, not missing key.
3. If still dead, rebuild via `mcp__n8n__patch_workflow_nodes` add
   rather than `replace`.

**F4 — `ON CONFLICT DO NOTHING RETURNING *` returns empty row on
conflict**, causing `EC_Return_Result` to emit `INTERNAL_LOAD_FAILED`.

This is the expected n8n postgres v2 behaviour (RETURNING is empty on
conflict). `EC_Load_Existing_Context` is designed to handle it — it
does a separate SELECT. If `EC_Return_Result` still emits the error
envelope on replay, the cause is `EC_Load_Existing_Context` failing.

Fix ladder for EC_Load_Existing_Context:
1. Rewrite queryReplacement to array-literal form.
2. Use named parameters (`$1, $2`) with a different queryReplacement
   shape.
3. Merge Upsert + Load into a single CTE:
   `WITH upserted AS (INSERT … ON CONFLICT … DO NOTHING RETURNING *)
    SELECT * FROM upserted UNION ALL
    SELECT * FROM execution_contexts WHERE idempotency_key=$7 LIMIT 1`.

### 4.2 Anti-loop log

All attempts logged in `FIX_LOG_WF-EC-01.md` during Phase 6 with:
- `attempt_number`, `strategy`, `diff_from_previous`, `execution_id`,
  `result`, `next_strategy_candidate`.

If three distinct strategies fail on the same V-test, stop and produce
a blocker-quality report per §7 of the user mandate.

## 5. Rollback (safety net)

If any mutation produces unexpected behaviour or shell drift:

```
node tools/n8n-patch/n8n-patch.mjs replace v9jih4jqeXpOJOiH \
  tools/n8n-patch/snapshots/v9jih4jqeXpOJOiH_ec01-pre-closure-mutation-20260419.json \
  --reactivate
```

The pre-mutation snapshot from §2.1 is the canonical rollback source.

## 6. Phase 7 artefacts (closure delivery)

- `BUILD_REPORT_WF-EC-01.md` — summary of mutation pack applied + diffs.
- `FIX_LOG_WF-EC-01.md` — recursive-fix log per §4.2 (may be single-entry
  if no fixes needed).
- `AUDIT_REPORT_WF-EC-01.md` — credential usage, DB writes inventory,
  cleanup receipts.
- `CLOSURE_REPORT_WF-EC-01.md` — consolidated 10/10 closure report,
  V1..V6 execution IDs, final live shell hash, STATE block proposal.
- `STATE.json` — `ec_01_live_impl` block promoted, mirroring
  `su_01_live_impl` shape.

## 7. Operator report (Phase 7, final)

14-field autonomous operator report as specified in the mandate:
1. Inspected
2. Live changes (what, where, why, with snapshots/audit)
3. Local changes (files, diffs)
4. Tests run (V1..V6 + DB drift + fixture cleanup)
5. Passed
6. Failed
7. Blocked
8. Closure claim (YES/NO + score)
9. EC-01 STATE block proposal
10. E2E-01 preservation confirmation
11. Unsafe side-effects confirmation
12. Next best step
13. Canonical stage confirmation
14. Closing note

## 8. Preservation rules (restated)

- Never touch SU-01 outside its existing `SU_Input` EWT (added
  2026-04-18). Do not modify SU-01 jsCodes, node names, or settings.
- Never touch RC-01 outside the two existing ship-disabled connector
  nodes (added 2026-04-18). Do not enable those nodes. Do not modify
  them.
- Never touch TR-01 at all. TR-01 is under "conditional trust" but
  not in EC-01's scope.
- Never touch MO-01.
- Never modify `current_stage` in STATE.json until the user reviews
  closure delivery and explicitly advances.

## 9. Success / non-success definitions

**Success (closure claim = YES, score = 10):** all V1..V6 passed with
execution IDs, DB drift confirmed zero on non-`execution_contexts`,
fixture rows cleaned, closure report produced, STATE block promoted.

**Partial success (closure claim = CONDITIONAL, score = 8-9):** V1..V5
pass but V6 (TR-shape smoke) fails due to an envelope-shape edge case
that is not EC-01's fault (e.g. TR_Build_Result has an unexpected
field). Record as partial closure pending a TR-01 closure cycle.

**Non-success (closure claim = NO, blocker-quality report):** any of
F1..F4 fails 3 distinct strategies. Produce blocker-quality report
per §7 of the mandate listing every attempt, every execution ID, and
an exact theory of what needs to change in EC-01 or in the
infrastructure.

## 10. Estimated time + risk

- Phase 4 mutation: ~5 min (single PUT + reactivate).
- Phase 5 V-sweep: ~30-45 min including ephemeral caller setup, fixtures,
  DB probes.
- Phase 6 recursive fix: 0-120 min depending on how many strategies
  fail. Unlikely given the Row 1 evidence that core paths already
  work.
- Phase 7 closure delivery: ~30 min for reports + STATE block.

Total: 1-3 hours, likely on the lower end.

Key risks:
1. n8n runtime quirks on postgres queryReplacement (known; ladder in place).
2. n8n runtime quirks on switch routing (known; ladder in place).
3. Unexpected credential-scoping issue (low risk — creds already bound
   and have been working per Row 1).

This plan is additive, reversible, well-instrumented, and aligned with
the closure-first, audit-first, contract-first discipline of the
Ucenicul project.
