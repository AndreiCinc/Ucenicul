# Stage File — WF-PL-01 Plan Builder

> **STATUS: SCOPE-EXPANSION PREP — script-proof level only.**
> This stage file is a forward-looking deliverable. It MUST NOT be promoted to ACTIVE until `WF-EC-01` is CLOSED at 10/10 AND `WF-OR-01` is CLOSED at 10/10 (per `00_ROUTE_MAP.md` "Route rule" and `11_DECISION_PRESETS.md` §15 "Advancement preset").
> Authored during a no-live-access prep cycle. All live-state fields are marked as **UNVERIFIED** until live inspection confirms them.

## Stage identity

- Stage code: `WF-PL-01`
- Workflow shell name: `WF-PL-01` (expected; user-provided shell NOT YET CONFIRMED)
- Current objective: build and validate **Plan Builder** — convert an orchestrator-emitted intent envelope into a deterministic, step-structured execution plan row, persist it, and hand off a plan reference to the downstream Dispatcher stage.
- Upstream dependency: `WF-OR-01` (Orchestrator Input Handoff) — must be closed first. `WF-OR-01` transitively requires `WF-EC-01` closed.
- Working mode: contract-first, shell-preserving, live-runtime verified (live verification deferred to build-cycle execution; this stage file is a prep artifact)

## Why this stage exists

Plan Builder is the canonical runtime segment between Orchestrator and Dispatcher (see `18_RUNTIME_CANONICAL_TARGET.md` §3.5).

- It receives an orchestrator decision (which modules, in which order, against which resources).
- It **structurally validates** and **persists** that decision as a plan row: a deterministic, replayable, dependency-aware description of what will be dispatched.
- Without it, Dispatcher would have to re-derive step structure on every call, and retry/idempotency would be unsafe.

Plan Builder is NOT a free-form reasoning step. It owns:
- envelope construction
- per-step schema validation
- dependency-graph sanity checks
- plan persistence
- handoff contract to Dispatcher

Plan Builder is NOT:
- an LLM call (see §"Scope ambiguity — HUMAN_DECISION_REQUIRED" below)
- an execution step (Dispatcher owns that)
- a response-composition step (Response Composer owns that)

## Scope ambiguity — HUMAN_DECISION_REQUIRED

> These are the OPEN questions that could not be answered from the currently-available pipeline documents. They are preserved here verbatim so the user can resolve them before the stage is promoted to ACTIVE. See `WORK_LOG_WF-PL-01.md` §2 for the full evidence trail.

### HDR-1 — Does PL-01 include an LLM planning call?
- **Default taken for the prep artifacts:** NO. PL-01 is envelope + validation only.
- **Supporting evidence:** Orchestrator contract (`19_MODULE_CONTRACTS.md` §6) owns plan choice; PL-01 receives a plan-like input and structures it.
- **Counter-evidence:** `18_RUNTIME_CANONICAL_TARGET.md` §3.5 phrasing "convert intent into executable plan" reads planner-ish.
- **If the user confirms NO LLM call:** the current prep artifacts are correct.
- **If the user confirms YES LLM call:** the blueprint needs an `PL_LLM_Planner` node between `PL_Validate_Input` and `PL_Build_Plan_Envelope`, a privacy gate per `18_…` §5, and retry logic. `pl_logic.py` would need a stub boundary to the LLM surface. Estimated re-work: +2 nodes, +3 test families, +1 privacy-gate decision record.

### HDR-2 — Plan storage target (table)?
- **Default taken for the prep artifacts:** new `execution_plans` table keyed `(plan_id)` with FK to `execution_contexts.id`.
- **Live evidence partially available:** `BUILD_REPORT.md` (EC-01) confirms `execution_contexts` has a `current_plan_ref` column — consistent with a SEPARATE plans table.
- **Fallback:** `execution_plans_claude_mcp` if direct creation is blocked.
- **User must confirm:** whether `execution_plans` already exists in live DB. If yes, adopt its live schema (§"Required DB side effects"). If no, use the DDL candidate at `workflows/sql/pl/02_create_table_candidate.sql` AFTER live introspection per `05_DB_AUTONOMY_PLAYBOOK.md`.

### HDR-3 — Is "Plan Validator" a distinct stage?
- **Default taken:** NO — Plan Validator is an internal step of PL-01 (`PL_Validate_Plan_Envelope` node).
- **Reason:** No evidence in 00–21 docs that it is a separate workflow. Referenced "n8n_Workflow_Mapping.md" not present in project.
- **Risk if wrong:** PL-01 scope would need to be split. Re-work estimate: small (rename one node, move to new workflow shell).

### HDR-4 — Compound-request splitting: inside PL-01 or upstream?
- **Default taken:** inside PL-01. §3.5 says "split compound requests" is a Plan Builder responsibility.
- **Impact:** pl_logic.py includes a `split_compound_intent()` helper. If compound-splitting moves upstream to Orchestrator, that helper becomes a thin pass-through.

### HDR-5 — Plan-step field set beyond the 4-field minimum
- **Default taken:** add `step_id` and `status` beyond the doc-mandated 4 fields (`target_module`, `action_type`, `depends_on`, `expected_side_effect`).
- **Reason:** deterministic dependency graph requires stable step ids; plan-time `status=planned` is required so the Dispatcher can transition `planned → pending → running → completed|failed` without ambiguity.
- **Reversibility:** high. Removing them is trivial if the user rejects.

## Workflow shell policy

Assumes the user will create a `WF-PL-01` placeholder shell workflow (mirroring the pattern used for `WF-EC-01`). Once that shell exists:

You MAY:
- replace its nodes
- remove placeholder internals
- reconnect and restructure it completely

You MUST NOT:
- delete the workflow record itself
- leave it blank after an update
- treat MCP save success as proof without re-reading the live workflow (per `04_N8N_MCP_PLAYBOOK.md`)
- begin build while `WF-OR-01` is still open or `WF-EC-01` build is still blocked

## Contract to implement

### Input contract
Received from `WF-OR-01` (Orchestrator Input Handoff). Shape (UNVERIFIED — assumes OR-01 will produce this):

```json
{
  "execution_id": "uuid",
  "tenant_id": "uuid",
  "thread_id": "uuid",
  "trigger_message_id": "uuid",
  "idempotency_key": "string",
  "intent": {
    "primary_goal": "string",
    "sub_goals": ["string", "..."],
    "required_modules": ["task_module", "reminder_module", "memory_module", "improvement_module", "response_support_module"],
    "privacy_class": "low|medium|high",
    "user_facing_constraints": {}
  },
  "orchestrator_decision": {
    "module_order": ["task_module", "reminder_module"],
    "dependency_graph": { "reminder_module": ["task_module"] },
    "fallback_policy": "string"
  },
  "handoff_metadata": {
    "orchestrator_version": "string",
    "decision_confidence": "number",
    "emitted_at": "ISO 8601"
  }
}
```

### Output contract
Emitted to downstream Dispatcher (`WF-DI-01` when that stage exists). Shape:

```json
{
  "plan_id": "uuid",
  "execution_id": "uuid",
  "tenant_id": "uuid",
  "thread_id": "uuid",
  "status": "planned",
  "steps": [
    {
      "step_id": "string (stable within plan)",
      "target_module": "task_module|reminder_module|memory_module|improvement_module|response_support_module",
      "action_type": "string (module-specific action code)",
      "depends_on": ["step_id", "..."],
      "expected_side_effect": {
        "surface": "tasks|reminders|rag_memories|execution_contexts|none",
        "write_class": "create|update|none",
        "idempotency_key_hint": "string|null"
      },
      "status": "planned"
    }
  ],
  "validation": {
    "graph_valid": true,
    "no_cycles": true,
    "module_set_permitted": true,
    "privacy_preflight_ok": true
  },
  "plan_envelope_version": "pl-01.v1",
  "created_at": "ISO 8601",
  "replayed": false
}
```

Replay behavior: given the same `(execution_id, idempotency_key)`, PL-01 MUST return the existing plan row (set `replayed: true`), not create a duplicate.

## Required DB side effects

> All side effects are DEFERRED until build-cycle execution. Live introspection is mandatory before build. No DDL or DML is executed during this prep cycle.

1. Insert one row in `execution_plans` (or `execution_plans_claude_mcp` fallback) per valid input.
2. Update `execution_contexts.current_plan_ref` to the new plan_id.
3. Deterministic upsert keyed on `(execution_id, idempotency_key)` — replay returns existing row.
4. No writes to `tasks`, `reminders`, `rag_memories`, `thread_resolution_audit`, `threads`, or `messages` — per `19_MODULE_CONTRACTS.md` cross-module rule.
5. No deletion of prior plan rows (retain audit trail).

Candidate DDL for `execution_plans` (see `workflows/sql/pl/02_create_table_candidate.sql` — NOT EXECUTED):
- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `execution_id UUID NOT NULL REFERENCES execution_contexts(id)`
- `thread_id UUID NOT NULL`
- `status TEXT CHECK (status IN ('planned','superseded','abandoned','completed','failed'))`
- `steps JSONB NOT NULL`
- `validation JSONB NOT NULL`
- `plan_envelope_version TEXT NOT NULL`
- `idempotency_key TEXT UNIQUE NOT NULL`
- `created_at TIMESTAMPTZ DEFAULT now()`
- `updated_at TIMESTAMPTZ DEFAULT now()`
- `expires_at TIMESTAMPTZ NULL`

## If direct table creation is blocked

Per `05_DB_AUTONOMY_PLAYBOOK.md` ownership rule + `11_DECISION_PRESETS.md` §7:

- create `execution_plans_claude_mcp` with the same column set
- continue implementation against it
- record exact merge SQL in `workflows/sql/pl/99_merge_back_notes.sql`
- the workflow nodes MUST still target the live table name; the `_claude_mcp` suffix is resolved via a single templated node variable (`$env.PL_TABLE`) so swap is a one-node edit

## Recommended node layout

7 nodes — mirroring the EC-01 layout depth:

1. `PL_Trigger` — entry point; expects OR-01 output envelope.
2. `PL_Validate_Input` — code v2 — checks required top-level fields: `execution_id`, `tenant_id`, `thread_id`, `idempotency_key`, `intent.required_modules` (≥1), `orchestrator_decision.module_order` (≥1). Sets `_valid` boolean.
3. `PL_Route_Valid` — switch v2 — routes on `_valid`.
4. `PL_Build_Plan_Envelope` — code v2 — constructs the `steps[]` array by walking `orchestrator_decision.module_order` + `dependency_graph`, assigns stable `step_id` (e.g. `step_<module>_<ordinal>`), derives `expected_side_effect.surface` from a fixed module→surface map (see `pl_logic.py::MODULE_SURFACE_MAP`).
5. `PL_Validate_Plan_Envelope` — code v2 — runs 4 structural checks: (a) no cycles in dependency graph, (b) every `depends_on` step_id exists, (c) all `target_module` values ∈ the 5 canonical modules, (d) privacy pre-flight (no `response_support_module` without at least one producing module upstream). Populates `validation` sub-envelope.
6. `PL_Upsert_Plan` — postgres v2 — `INSERT INTO execution_plans (...) ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING *` + a SELECT fallback for replay. Then a companion `UPDATE execution_contexts SET current_plan_ref = $1 WHERE id = $2` inside the same node or chained to it.
7. `PL_Return_Result` — code v2 — emits the plan envelope per output contract, sets `replayed` flag accurately.
   Plus: `PL_Return_Error` — code v2 — emits error envelope with failure class (`invalid_input`, `graph_cycle`, `module_not_permitted`, `privacy_gate_failed`, `db_conflict`).

Expected connection graph:

```
PL_Trigger
  → PL_Validate_Input
  → PL_Route_Valid
      [0 valid]   → PL_Build_Plan_Envelope → PL_Validate_Plan_Envelope → PL_Upsert_Plan → PL_Return_Result
      [1 invalid] → PL_Return_Error
```

PL_Validate_Plan_Envelope may short-circuit to `PL_Return_Error` on graph/privacy failure (second invalid exit).

## Required validations

### V1 — shell integrity
- workflow `WF-PL-01` exists
- node count in the range expected (7 nominal; ≥6 acceptable)
- connections present between all 7 nodes per the graph above
- active/draft state understood

### V2 — input validation
- missing `execution_id` → clean error
- missing `idempotency_key` → clean error
- empty `module_order` → clean error
- module name outside the 5 canonical set → clean error

### V3 — happy path
- row inserted in `execution_plans`
- `execution_contexts.current_plan_ref` updated atomically (or compensatingly)
- output envelope matches contract
- `status = "planned"`, `validation.graph_valid = true`

### V4 — idempotency / replay
- same `(execution_id, idempotency_key)` → returns existing plan row with `replayed: true`, no duplicate insert
- superseding plan (new idempotency_key for same execution_id) → old plan status set to `superseded`, new row created, `current_plan_ref` updated (DECISION: confirm with user during build whether supersede is in PL-01 scope or Dispatcher scope — default: **not** in PL-01 scope for script-proof, leave old plan untouched, error if `current_plan_ref` already set)

### V5 — cross-tenant / isolation
- plan created for tenant A does not appear in SELECT scoped to tenant B
- no cross-tenant write pollution via shared `execution_id`

### V6 — upstream smoke handoff (OR→PL)
- use a real or realistic OR-01 output as input
- confirm the PL output envelope is accepted by a DI-01 stub (when available)
- OR-01 artifact reuse: latest carry-forward from WF-OR-01 (when OR-01 is closed)

## Required reports for this stage

- `BUILD_REPORT.md` (PL-01) — file: `BUILD_REPORT_WF-PL-01.md` during prep (this cycle uses a per-stage suffix to avoid colliding with the live EC-01 `BUILD_REPORT.md`)
- `AUDIT_REPORT.md` (PL-01) — file: `AUDIT_REPORT_WF-PL-01.md`
- `FIX_LOG.md` (PL-01) — file: `FIX_LOG_WF-PL-01.md`
- `CLOSURE_REPORT.md` (PL-01) — file: `CLOSURE_REPORT_WF-PL-01.md`

**When PL-01 actually becomes ACTIVE**, the stage owner MUST rename these to the canonical unsuffixed names per `09_REPORT_TEMPLATES.md` and archive the EC/OR versions under `docs/ucenicul_claude_handoff_hardened/archive/`. Until then, the suffixed names are the prep artifacts.

## Completion criteria

This stage is CLOSED only when:
- live workflow `WF-PL-01` exists and matches the 7-node layout
- live DB `execution_plans` (or `_claude_mcp` fallback) path exists
- V1–V6 all pass with live runtime proof
- `execution_contexts.current_plan_ref` update path proven live
- audit score is 10/10
- `CLOSURE_REPORT.md` (PL-01) is written and all HDR-1..HDR-5 open items have RESOLVED status

## Script-proof cap for THIS prep cycle

Per the user's run brief, this cycle is capped at **script-proof-ready ≤ 8.5/10**. Live-green (10/10) is NOT achievable without:
- EC-01 live-green (prerequisite)
- OR-01 live-green (prerequisite)
- user-resolved HDR-1..HDR-5

Script-proof deliverables for THIS cycle are:
1. This stage file
2. `workflows/WF-PL-01_Plan_Builder.json` blueprint
3. `workflows/WF-PL-01_blueprint.json` (mirror)
4. `workflows/WF-PL-01_IMPORT_PATCH_PLAN.md`
5. SQL pack at `workflows/sql/pl/`
6. `workflows/scripts/pl/pl_logic.py` — pure logic port
7. `workflows/tests/pl/test_families.py` — ≥500 test cases
8. PL-01 cycle reports (BUILD/AUDIT/FIX/CLOSURE, with suffixes)
9. `WORK_LOG_WF-PL-01.md`
10. PL-01 lock instance appended to `17_ACTIVE_STAGE_LOCK.md`
11. `STATE.json` + `CURRENT_STAGE.md` updated to REFLECT (not advance) PL-01 readiness

## Forbidden behaviors (stage-scoped)

- no n8n workflow writes during the prep cycle (hard rule per user brief)
- no DB writes during the prep cycle (hard rule per user brief)
- no advancement of `STATE.json.current_stage` from `WF-EC-01`
- no mutation of `WF-EC-01` or `WF-OR-01` canonical artifacts (lock scope § `17_ACTIVE_STAGE_LOCK.md`)
- no LLM call inside PL-01 until HDR-1 is resolved
- no destructive redesign of `execution_contexts` — additive references only
- no claim of 10/10 during this cycle
- no schema inference from validator errors (`12_TOOL_FAILURE_MATRIX.md` §5) — live introspection is the only permitted schema source before build
