# WF-EC-01 — Closure Contract (Phase 1 Document-Truth Reconstruction)

**Date:** 2026-04-19
**Stage:** WF-EC-01 Execution Context Init (canonical active stage)
**Purpose:** reconstruct the authoritative closure contract for EC-01
from canonical docs before any live mutation. No live writes performed
by this document. This is Phase 1 of the 7-phase closure cycle.

**Upstream doc sources:**
- `06_STAGE_WF-EC-01.md` (canonical stage file)
- `20_EXECUTION_CONTEXT_EVOLUTION.md` (semantic + schema expectations)
- `00_ROUTE_MAP.md` (chain position)
- `17_ACTIVE_STAGE_LOCK.md §9` (active-stage mutation rules)
- `WF-E2E-01_CHAIN_CONTRACT_MAP.md` (link 1 TR→EC and link 2 EC→OR envelope)
- `CURRENT_STAGE.md` / `STATE.json` (canonical active-stage assertion)

---

## 1. Stage identity

| Field | Value |
|-------|-------|
| Stage code | WF-EC-01 |
| Workflow name | WF-EC-01 |
| Live workflow id | `v9jih4jqeXpOJOiH` |
| Upstream stage | WF-TR-01 (Thread Resolver — conditional trust per 2026-04-18 re-verify) |
| Downstream stage | WF-OR-01 (Orchestrator — unclosed; no live consumer yet) |
| Chain position | Link 1 downstream / Link 2 upstream |
| Role | runtime anchor + retry anchor + partial execution memory |
| Canonical DB table | `public.execution_contexts` |
| Credentials | `z9nKgToNWvIW7P8f` (Postgres account 2) |
| Pre-cycle snapshot | `tools/n8n-patch/snapshots/v9jih4jqeXpOJOiH_ec01-precycle-20260418.json` |

## 2. Purpose (canonical)

Execution Context Init creates the runtime anchor for one chain turn.
Every subsequent stage — OR, PL, DI, ME, RA, SU, RC, MO — reads and
writes against the row owned by EC-01. It is the single surface that
carries goal, plan reference, pending/completed steps, and terminal
status through the chain. No other stage is allowed to insert new
execution_contexts rows under normal operation.

EC-01 therefore owns three non-negotiable invariants:

1. **Deterministic identity** — one turn → one row → one `id`. Replay
   of the same `(tenant_id, trigger_message_id)` must return the same
   logical row (deterministic idempotency).
2. **Status lifecycle entry point** — EC-01 is the only stage allowed
   to set `status='initialized'`.
3. **Lineage seed** — the returned `id` is the unambiguous foreign key
   that OR, PL, DI, ME, RA, SU, RC, MO will carry through the chain.

## 3. Input contract (authoritative)

From `06_STAGE_WF-EC-01.md §Contract to implement`:

```json
{
  "tenant_id": "uuid",
  "thread_id": "uuid",
  "trigger_message_id": "uuid",
  "resolution_method": "string",
  "resolved_at": "ISO 8601",
  "idempotency_key": "string"
}
```

**Required fields:** `tenant_id`, `thread_id`, `trigger_message_id` (all uuid).
**Optional fields:** `resolution_method`, `resolved_at`, `idempotency_key`.
**Envelope shape (per `WF-E2E-01_CHAIN_CONTRACT_MAP.md`):** both nested
`{request: {...}}` and flat `{...}` must be accepted. Nested is the
canonical wire format from TR-01's `TR_Build_Result`. Flat is allowed
for test harness convenience.

**idempotency_key derivation:** if caller does not supply it, EC-01
must derive it deterministically as:
`${tenant_id}:${trigger_message_id}:exec_ctx:v1`.
This is the contract Live Code currently implements
(`EC_Validate_Input` line 71).

Upper bound: idempotency_key ≤ 300 chars (schema constraint
`execution_contexts.idempotency_key VARCHAR(300)`).

## 4. Output contract (authoritative)

From `06_STAGE_WF-EC-01.md §Output contract`:

```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "thread_id": "uuid",
  "trigger_message_id": "uuid",
  "status": "initialized",
  "current_goal": null,
  "current_plan_ref": null,
  "pending_steps": [],
  "completed_steps": [],
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

**Envelope extension (per chain-wide envelope convention, see SU-01/RC-01/MO-01 terminals):**
- `error: null` on success, `{code, ...}` object on error
- `module_name: "execution_context_init"`
- `result_type: "state" | "error"`
- `status_kind: "success" | "failed"`

These four terminal-envelope fields are present in every chain-stage's
Return_Result/Return_Error and are expected by downstream stages.

## 5. Required DB side effects

From `06_STAGE_WF-EC-01.md §Required DB side effects`:

1. Insert exactly one `execution_contexts` row per unique
   `idempotency_key`.
2. On replay (same `idempotency_key`), return the pre-existing row;
   no duplicate insert.
3. No writes outside `execution_contexts` for this stage.

**DB schema reality (verified 2026-04-18T22:40Z via `mcp__postgres__execute_sql`):**
- `execution_contexts` exists, 18 columns, UNIQUE (idempotency_key),
  5 indexes, `status` CHECK with allowed values
  `{initialized, planning, dispatching, executing, aggregating,
  composing, completed, failed, expired}`.
- Table is live in production, not the `_claude_mcp` fallback.
- Row count pre-cycle: 2.

→ No fallback table required. EC-01 can write directly to the canonical table.

## 6. Forbidden side effects

- No writes to `threads`, `messages`, `tenants`, `rag_memories`,
  `tasks`, `reminders`, `outbound_delivery_ledger_claude_mcp`, or any
  other canonical or fallback table.
- No deletion or mutation of pre-existing `execution_contexts` rows
  (closure test windows must use fixture rows and clean them up
  themselves).
- No live Telegram message dispatch (EC-01 is pre-response).
- No write when input is invalid — invalid input must flow to
  `EC_Return_Error` without touching the DB.
- No destructive rewrite of `TR-01`, `WF-EC-01` workflow shell,
  closed workflows (`SU-01 closed_enough`, `RC-01 closed 10/10`,
  `MO-01 closed 10/10`), or the two E2E-01 authorised live mutations
  (SU_Input trigger add on SU-01; RC→MO ship-disabled connector on RC-01).

## 7. Live shell target (per `06_STAGE_WF-EC-01.md §Recommended node layout`)

Target layout (mandate allows additions but not deletions of canonical
names):

1. `EC_Trigger` — entry point. For chain readiness this should be an
   `executeWorkflowTrigger` so that TR-01 can sub-call EC-01 on link 1.
   (The stage file lists `EC_Trigger` generically; call-as-sub is not
   required by the stage file itself but IS required by link 1 of the
   chain per `WF-E2E-01_CHAIN_READINESS_REVIEW.md`. Adding the EWT is
   additive and aligns with the SU-01 precedent.)
2. `EC_Validate_Input` — adapter + UUID validation + idempotency_key
   derivation. Emits `_valid='true'|'false'`.
3. `EC_Route_Valid` — switch → valid path | invalid path.
4. `EC_Build_Init_Payload` — builds the exact insert row.
5. `EC_Upsert_Context` — postgres executeQuery `INSERT … ON CONFLICT
   (idempotency_key) DO NOTHING RETURNING *`.
6. `EC_Load_Existing_Context` — postgres executeQuery `SELECT …
   WHERE idempotency_key = $1 AND tenant_id = $2 LIMIT 1`.
7. `EC_Return_Result` — terminal success envelope.
8. `EC_Return_Error` — terminal invalid-input envelope.

Acceptable additional nodes:
- `EC_Manual_Test_Trigger` — manualTrigger for V-sweep convenience
  (SU-01/RC-01/MO-01 precedent).
- `EC_Input` — `executeWorkflowTrigger` for chain sub-call (alternate
  name for `EC_Trigger` per SU-01/RC-01/MO-01 naming convention — the
  stages all use `*_Input`).

Required credentials on postgres nodes: `z9nKgToNWvIW7P8f` (Postgres
account 2) — already bound on both postgres nodes in the current
shell.

## 8. V1..V6 closure sweep (authoritative test plan)

From `06_STAGE_WF-EC-01.md §Required validations`. All tests are live;
no off-node unit-test farm replaces these.

### V1 — shell integrity (static)
- Workflow `v9jih4jqeXpOJOiH` exists, active, `availableInMCP: true`.
- Node count ≥ 7 canonical names present, all named per section 7.
- Connections: Trigger→Validate→Route→(Valid)→Build→Upsert→Load→ReturnResult;
  Route→(Invalid)→ReturnError.
- Credential `z9nKgToNWvIW7P8f` bound to both postgres nodes.
- Disabled or absent chat-trigger surface (no public webhook entry).

### V2 — invalid input
- Payload missing `tenant_id` (or malformed uuid) → terminal
  `EC_Return_Error` with `{error.code: 'INVALID_INPUT'}` and no DB
  write. Verify by executing live and counting `execution_contexts`
  pre/post.

### V3 — happy path
- Payload with valid uuids → row inserted → terminal
  `EC_Return_Result` with `{id, tenant_id, thread_id, trigger_message_id,
  status:'initialized', pending_steps:[], completed_steps:[]}`.
- `current_goal:null`, `current_plan_ref:null`, `error:null`,
  `module_name:'execution_context_init'`, `result_type:'state'`,
  `status_kind:'success'`.
- Post-exec `SELECT` on `execution_contexts` returns the row with
  expected values.

### V4 — idempotency
- Re-run V3 fixture with the same `(tenant_id, trigger_message_id)`
  twice → exactly one row total in `execution_contexts`; both
  executions return the same `id` and identical `created_at`.

### V5 — cross-tenant
- Same `trigger_message_id` under a different `tenant_id` → distinct
  row (since `idempotency_key` is tenant-scoped in the deterministic
  derivation).

### V6 — TR → EC smoke
- Construct a realistic `TR_Build_Result`-shaped payload (using one of
  the live `thread_resolution_audit` rows as the inspiration) and
  execute EC-01 via its EWT. Confirm happy-path completes end-to-end
  as if TR had sub-called EC.

**V7 (implicit DB drift probe):**
- For each V2..V6 run, measure `execution_contexts`, `threads`,
  `messages`, `tenants`, `rag_memories`, `tasks`, `reminders`,
  `outbound_delivery_ledger_claude_mcp` counts pre/post. Only
  `execution_contexts` should change, and only by the expected delta
  (+1 for V3 first-run, 0 for V4 replay, +1 for V5 distinct-tenant).
- Clean all fixture rows at the end.

## 9. Fixture naming (per 17_ACTIVE_STAGE_LOCK.md §9)

- Workflow fixtures: `WF-EC-01_FIXTURE_v<n>` (e.g. `WF-EC-01_FIXTURE_v3_happy`).
- DB fixture row-level markers in `idempotency_key`:
  `wf_ec_01_fixture_<purpose>_<timestamp>` (e.g.
  `wf_ec_01_fixture_v3_happy_20260419T1100Z`).
- Tenant fixture labels prefixed `[WF-EC-01 TEST]` if a temporary
  tenant/thread row must be created; clean up after V7.

## 10. Closure blockers currently known

From Phase 0 + the fresh pre-cycle snapshot
(`v9jih4jqeXpOJOiH_ec01-precycle-20260418.json`) the following gaps
must be resolved before 10/10 closure can be claimed:

| # | Blocker | Severity | Resolution |
|---|---------|----------|------------|
| B1 | Live has `When chat message received` LangChain `chatTrigger` (typeVersion 1.4) publicly attached to `EC_Validate_Input`. This exposes an inbound webhook surface for a workflow that has nothing to do with chat. | MEDIUM | Disable additively (`disabled: true`) — do not delete. Preserves rollback parity. |
| B2 | No `executeWorkflowTrigger` on EC-01. Link 1 (TR → EC) cannot be structurally wired until EC-01 is callable as sub. | HIGH | Add `EC_Input` `executeWorkflowTrigger` (typeVersion 1, empty params) additively, mirroring the SU-01 precedent. New edge `EC_Input → EC_Validate_Input`. |
| B3 | `EC_Upsert_Context.queryReplacement` is a template string of 8 `{{}}` expressions concatenated with commas. `EC_Load_Existing_Context.queryReplacement` is 2 `{{}}` expressions concatenated with commas. The SU-01 production path uses an `={{ [ ...array literal... ] }}` form. Whether the multi-expression comma form binds correctly at runtime is **unverified** — the live workflow has not been executed against the canonical table yet (count=2 rows predate this cycle; neither row has the current `idempotency_key` derivation pattern in its key). | HIGH | Verify at V3 dry-run. If it fails with "Query Parameters must be a string of comma-separated values or an array of values" (SU-01 smoke signature), rewrite to array-literal form. Keep parameter count and order identical. |
| B4 | `EC_Route_Valid` switch is typeVersion 2 with `dataType: 'boolean'`, comparing `{{ $json._valid }}` against string `'true'` and `'false'`. Version-2 switch with boolean dataType may or may not coerce the string — depends on n8n runtime semantics. The SU-01 precedent uses switch v2 with string dataType (plain string equality), which is unambiguously correct. | MEDIUM | Verify at V2/V3. If the routing fails (valid payload going to `EC_Return_Error` or invalid payload going to `EC_Build_Init_Payload`), rewrite to string-dataType string-equality form. |
| B5 | No live execution evidence. No row in `execution_contexts` was produced by this workflow on this code path. The route-map asserts `CLOSED` for EC-01 but no closure report, no STATE `ec_01_live_impl` block. Mirrors the TR-01 pattern — closure-by-assertion without audit trail. | HIGH | Produce `CLOSURE_REPORT_WF-EC-01.md` with V1..V6 execution IDs + DB-drift evidence. Promote `ec_01_live_impl` block into `STATE.json` mirroring `su_01_live_impl` shape. |
| B6 | No per-stage closure artefacts: `BUILD_REPORT_WF-EC-01.md`, `AUDIT_REPORT_WF-EC-01.md`, `FIX_LOG_WF-EC-01.md`, `CLOSURE_REPORT_WF-EC-01.md`. | LOW | Produce during Phase 4/7. |
| B7 | `current_stage_file` in STATE.json points to `06_STAGE_WF-EC-01.md` but `status = 'ready_to_start'`, `score = 0`, `phase = 'build'`. Confirms EC-01 is in active build phase. | n/a | Already aligned. |

## 11. Relation to upstream (TR-01) and downstream (OR-01)

### 11.1 TR-01 → EC-01 (link 1)

- Upstream handoff envelope shape (per `WF-E2E-01_CHAIN_CONTRACT_MAP.md`):
  TR-01's `TR_Return_Result` emits
  `{resolution_id, tenant_id, thread_id, trigger_message_id,
  resolved_at, resolution_method:'attach_existing_thread'|'create_new_thread'|...,
  decision, result_type, status, module_name:'thread_resolver', ...}`.
- EC-01 currently accepts `tenant_id`, `thread_id`, `trigger_message_id`,
  `resolution_method`, `resolved_at` — **5 of 5 required EC-01 input
  fields are present in TR-01's output.**
- TR→EC connector is **not** wired live (TR-01 has no `executeWorkflow`
  sub-call node targeting EC-01). Wiring that node is forbidden under
  E2E-01 Option B; it belongs to a future TR-01 closure cycle.
- **Conclusion:** EC-01 closure only requires EC-01 to be callable-as-sub
  with the canonical input envelope shape. Proof of real TR→EC hand-off
  is deferred until TR-01 gains its `executeWorkflow` sub-call node.

### 11.2 EC-01 → OR-01 (link 2)

- Downstream consumer: OR-01 is unclosed (10 nodes / 9 edges shell only
  per `WF-E2E-01_CHAIN_READINESS_REVIEW.md`).
- OR-01 requires `execution_context_id`, `tenant_id`, `thread_id`,
  `status`, `goal_hint` or `initial_request` to plan. EC-01's output
  envelope includes `id` (→ execution_context_id), `tenant_id`,
  `thread_id`, `status`, plus extras that OR can ignore.
- **Conclusion:** EC-01 output envelope is shape-compatible with
  OR-01's expected input. EC→OR wiring belongs to OR-01's closure
  cycle; not required for EC-01 closure itself.

## 12. Success conditions for EC-01 closure (10/10)

1. ✓ Live shell matches §7 target layout (all 7 canonical nodes present, plus
   optional `EC_Manual_Test_Trigger` for test harness, and `EC_Input`
   `executeWorkflowTrigger` for link 1 readiness).
2. ✓ Chat-trigger webhook surface disabled additively.
3. ✓ Credentials bound on postgres nodes.
4. ✓ V1 shell integrity passes.
5. ✓ V2 invalid-input test passes (execution id + terminal + DB drift zero).
6. ✓ V3 happy-path test passes (execution id + terminal + row count +1).
7. ✓ V4 idempotency test passes (2 executions, same id returned, row count unchanged).
8. ✓ V5 cross-tenant test passes (2 executions, distinct ids, row count +2).
9. ✓ V6 TR→EC smoke passes (structural — payload shaped from TR audit rows, executed via EWT).
10. ✓ V7 DB drift probe zero on all non-`execution_contexts` tables; fixture rows cleaned up.
11. ✓ `CLOSURE_REPORT_WF-EC-01.md` produced with execution IDs, SQL evidence, fixture cleanup receipts.
12. ✓ STATE.json promoted: `ec_01_live_impl` block (mirroring `su_01_live_impl`), `current_stage` unchanged (EC-01 is active) until the user reviews closure and advances.

## 13. Mandate constraints restated

- Do not displace `WF-EC-01` as `current_stage` until closure is
  formally reported and the user advances (per
  `17_ACTIVE_STAGE_LOCK.md §9`).
- Preserve E2E-01's two authorised live mutations:
  - SU-01 `SU_Input` EWT add (2026-04-18T~12:40Z).
  - RC-01 ship-disabled RC→MO connector (2026-04-18T12:34Z).
- No closed workflows (`SU-01`, `RC-01`, `MO-01`, `TR-01 route-map-asserted`)
  may be touched within this cycle.
- Anti-loop: ≥3 materially-different attempts per failing strategy
  before escalating. Prefer additive + minimal fixes.
- Live/local sync: every live PUT creates before+after snapshots in
  `tools/n8n-patch/snapshots/` and appends to `.audit.jsonl`.

## 14. Phase 1 deliverable

This document (`WF-EC-01_CLOSURE_CONTRACT.md`) constitutes the
authoritative Phase 1 reconstruction. Phase 2 (live reality check +
diff vs contract) and Phase 3 (closure plan) follow in separate
artefacts.

No live mutation has occurred. Pre-cycle snapshot remains unchanged.

---

## Appendix A — EC-01 live shell inventory (from pre-cycle snapshot)

```
Workflow id: v9jih4jqeXpOJOiH
Name:        WF-EC-01
Active:      true
Archived:    null
Settings:    {executionOrder:v1, binaryMode:separate, timeSavedMode:fixed,
              callerPolicy:workflowsFromSameOwner, availableInMCP:true}

Nodes (9):
1. When chat message received        @n8n/n8n-nodes-langchain.chatTrigger v1.4
2. When clicking 'Execute workflow'   n8n-nodes-base.manualTrigger v1
3. EC_Validate_Input                  n8n-nodes-base.code v2
4. EC_Route_Valid                     n8n-nodes-base.switch v2
5. EC_Build_Init_Payload              n8n-nodes-base.code v2
6. EC_Upsert_Context                  n8n-nodes-base.postgres v2    creds: Postgres account 2 / z9nKgToNWvIW7P8f
7. EC_Load_Existing_Context           n8n-nodes-base.postgres v2    creds: Postgres account 2 / z9nKgToNWvIW7P8f
8. EC_Return_Result                   n8n-nodes-base.code v2
9. EC_Return_Error                    n8n-nodes-base.code v2

Edges (8):
  When chat message received        → EC_Validate_Input
  When clicking 'Execute workflow'  → EC_Validate_Input
  EC_Validate_Input                 → EC_Route_Valid
  EC_Route_Valid[0] (valid)         → EC_Build_Init_Payload
  EC_Route_Valid[1] (invalid)       → EC_Return_Error
  EC_Build_Init_Payload             → EC_Upsert_Context
  EC_Upsert_Context                 → EC_Load_Existing_Context
  EC_Load_Existing_Context          → EC_Return_Result
```

## Appendix B — execution_contexts canonical schema (verified 2026-04-18)

```
Table: public.execution_contexts
Columns: 18 total
  id                   uuid PK default gen_random_uuid()
  tenant_id            uuid NOT NULL
  thread_id            uuid NOT NULL
  trigger_message_id   uuid NOT NULL
  status               varchar NOT NULL CHECK IN
                         ('initialized', 'planning', 'dispatching', 'executing',
                          'aggregating', 'composing', 'completed', 'failed', 'expired')
  current_goal         text NULL
  current_plan_ref     uuid NULL
  pending_steps        jsonb NOT NULL DEFAULT '[]'
  completed_steps      jsonb NOT NULL DEFAULT '[]'
  idempotency_key      varchar(300) NOT NULL UNIQUE
  expires_at           timestamptz NULL
  created_at           timestamptz NOT NULL DEFAULT now()
  updated_at           timestamptz NOT NULL DEFAULT now()
  … (4 other columns for observability: input_hash, last_error, retry_count, completed_at)
Indexes: (idempotency_key) UNIQUE, (tenant_id, thread_id), (trigger_message_id),
         (status), (created_at DESC)
Row count pre-cycle: 2
```
