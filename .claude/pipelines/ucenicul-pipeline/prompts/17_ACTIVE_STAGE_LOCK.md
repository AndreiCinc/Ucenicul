# ACTIVE STAGE LOCK

## 1. Purpose
Defines the hard execution boundary for the currently active stage.
Prevents cross-stage drift, unintended mutations, and opportunistic changes.

## 2. Current active stage
- Stage id: `WF-EC-01`
- Stage name: Execution Context Init
- Canonical target workflow: n8n workflow shell named `WF-EC-01` (user-provided placeholder shell; record must be preserved)
- Canonical target tables: `execution_contexts` (primary); `execution_contexts_claude_mcp` (fallback table, used only if direct change to `execution_contexts` is blocked per `05_DB_AUTONOMY_PLAYBOOK.md` and section "If direct table creation is blocked" in `06_STAGE_WF-EC-01.md`)
- Canonical target documents: `06_STAGE_WF-EC-01.md`, `CURRENT_STAGE.md`, `STATE.json`, `BUILD_REPORT.md`, `AUDIT_REPORT.md`, `FIX_LOG.md`, `CLOSURE_REPORT.md`
- Upstream dependency: `WF-TR-01` (Thread Resolver) — must remain closed; its output is the carry-forward input contract for EC Init
- Downstream dependency: next canonical stage after Execution Context Init (planning / dispatch layer) — NOT to be started, designed, or touched while this lock is active

## 3. Allowed mutations
### 3.1 Allowed workflow mutations
- Replace placeholder nodes inside the existing `WF-EC-01` workflow shell
- Remove placeholder internals of `WF-EC-01`
- Reconnect and restructure nodes inside `WF-EC-01` to implement the Execution Context Init contract
- Add the recommended nodes from `06_STAGE_WF-EC-01.md` §"Recommended node layout": `EC_Trigger`, `EC_Validate_Input`, `EC_Build_Init_Payload`, `EC_Upsert_Context`, `EC_Load_Existing_Context`, `EC_Return_Result`, `EC_Return_Error`
- Add minimal helper nodes strictly required for the EC Init contract
- Perform shell-preserving structural replacement with full before/after snapshot verification per `13_WORKFLOW_SNAPSHOT_AND_ROLLBACK.md`

### 3.2 Allowed database mutations
- Insert one execution context row per valid input (happy path)
- Deterministic idempotent upsert behavior keyed on `(tenant_id, thread_id, trigger_message_id, idempotency_key)` as required by the stage contract
- On replay: return/preserve the existing logical row (no duplicate)
- Create `execution_contexts_claude_mcp` fallback table only if direct work on `execution_contexts` is blocked
- Insert marked test fixtures per `14_TEST_FIXTURE_REGISTRY.md` (stage marker `WF-EC-01_FIXTURE` / idempotency marker `wf_ec_01_fixture_<purpose>` / text prefix `[WF-EC-01 TEST]`)
- Cleanup of fixtures that are stage-local, clearly marked, not required for closure evidence, not required for downstream stage, and reversible

### 3.3 Allowed documentation mutations
- Update `BUILD_REPORT.md` with build activity, snapshots, fixtures used
- Update `AUDIT_REPORT.md` with audit findings for WF-EC-01 only
- Update `FIX_LOG.md` with fixes and failed write-path classifications for WF-EC-01 only
- Update `CLOSURE_REPORT.md` only when all closure criteria are met
- Update `STATE.json` only to reflect WF-EC-01 progression (phase, score, next_action, last_updated); do NOT set `advance_allowed: true` before 10/10 closure
- Update `CURRENT_STAGE.md` only to reflect WF-EC-01 progression; do not flip the active stage pointer to any other stage

### 3.4 Allowed test fixture mutations
- Create stage-marked fixtures for: `runtime_input`, `runtime_expected_row`, `negative_test_fixture`, `idempotency_fixture`, `cross_tenant_fixture`
- Reuse carry-forward fixtures from `WF-TR-01` as EC Init input (after identity verification)
- Preserve at least one replay/idempotency fixture until stage closure
- Preserve at least one TR → EC smoke fixture until the next stage decision is recorded
- Classify each fixture on cleanup as `delete_now` / `keep_until_stage_closure` / `keep_for_next_stage` / `keep_for_evidence`

## 4. Forbidden mutations
### 4.1 Forbidden workflow mutations
- Do not delete the `WF-EC-01` workflow record itself
- Do not leave `WF-EC-01` blank after any update
- Do not treat MCP save success as proof without re-reading the live workflow
- Do not edit, rename, restructure, disable, or activate any workflow other than `WF-EC-01`
- Do not touch `WF-TR-01` or any downstream/future workflow
- Do not rename `WF-EC-01` unless the stage explicitly permits it (it does not)
- No workflow SDK rabbit hole; no unexplained redesign beyond stage scope

### 4.2 Forbidden database mutations
- No schema changes outside the execution-context structure for this stage
- No writes to tables unrelated to execution context init
- No destructive mutation of carry-forward Thread Resolver evidence
- No unmarked ad hoc rows used as runtime proof
- No cleanup of legacy/non-canonical data that is outside current fixture scope
- No cross-tenant evidence collapsing
- No migration of `execution_contexts_claude_mcp` back into `execution_contexts` during this stage (document merge SQL only)

### 4.3 Forbidden documentation mutations
- Do not edit, create, rename, or delete any pipeline document other than those listed in §3.3
- Do not edit `01_MASTER_OPERATING_CONTRACT.md`, `02_AGENT_REGISTRY.md`, `03_EXECUTION_LOOP.md`, `04_N8N_MCP_PLAYBOOK.md`, `05_DB_AUTONOMY_PLAYBOOK.md`, `06_STAGE_WF-EC-01.md`, `07_IMPEDIMENTS_AND_GUARDRAILS.md`, `08_SCORECARD_AND_GATES.md`, `09_REPORT_TEMPLATES.md`, `10_FILE_SCORECARD.md`, `00_ROUTE_MAP.md`, `11_DECISION_PRESETS.md`, `12_TOOL_FAILURE_MATRIX.md`, `13_WORKFLOW_SNAPSHOT_AND_ROLLBACK.md`, `14_TEST_FIXTURE_REGISTRY.md`, `15_STAGE_TEMPLATE.md`, `16_AUTONOMOUS_STOP_AND_RECOVERY.md`, or `README.md`
- Do not introduce new pipeline-level documents beyond what an active stage requires
- Do not claim closure or score improvements without runtime proof

### 4.4 Forbidden stage behavior
- Do not start next stage
- Do not reopen closed stage
- Do not perform opportunistic cleanup
- Do not redesign architecture outside current contract

## 5. Destructive operation policy
- Destructive actions allowed: conditional (no by default for anything affecting canonical state; yes only for stage-local, clearly marked fixtures under strict conditions)
- If yes, under what exact conditions:
  - target is a fixture marked with `WF-EC-01_FIXTURE` / `wf_ec_01_fixture_*` / `[WF-EC-01 TEST]`
  - target is not required for closure evidence
  - target is not required as carry-forward for downstream stage
  - action is reversible or trivially re-creatable from the stage fixture recipe
  - a current before-snapshot of the live workflow exists (per §13) when the destructive action could indirectly affect workflow behavior
  - the action does not touch legacy or canonical rows
- Required rollback artifact before destructive action:
  - live before-snapshot of `WF-EC-01` workflow (if workflow-adjacent): `snapshot_WF-EC-01_before_<timestamp>` per `13_WORKFLOW_SNAPSHOT_AND_ROLLBACK.md`
  - fixture ledger entry in `BUILD_REPORT.md` listing ids/labels, scope class, cleanup classification, and justification
  - reproducible fixture recipe (SQL or JSON payload) captured in `BUILD_REPORT.md`
- Required evidence after destructive action:
  - re-read of affected table(s) confirming only the marked target rows were removed
  - confirmation that canonical `execution_contexts` rows and carry-forward TR evidence are intact
  - after-snapshot of `WF-EC-01` workflow if workflow-adjacent: `snapshot_WF-EC-01_after_<timestamp>`
  - entry in `FIX_LOG.md` or `BUILD_REPORT.md` referencing the rollback artifact and the post-action verification

## 6. Stage-local source of truth
- Live workflow state: the live `WF-EC-01` workflow as read back via n8n MCP immediately after any write (see `04_N8N_MCP_PLAYBOOK.md` and `13_WORKFLOW_SNAPSHOT_AND_ROLLBACK.md`)
- Live DB schema: live Postgres state for `execution_contexts` (or `execution_contexts_claude_mcp` if the fallback is in use), verified via read-back, not assumed from prior writes
- Stage file: `06_STAGE_WF-EC-01.md`
- Contract file: `06_STAGE_WF-EC-01.md` §"Contract to implement" (input contract + output contract) and §"Required DB side effects"
- Test fixture registry: `14_TEST_FIXTURE_REGISTRY.md` (§11 "Current default for WF-EC-01")
- Most recent handoff/report: `BUILD_REPORT.md` (current), `AUDIT_REPORT.md`, `FIX_LOG.md`, and `CLOSURE_REPORT.md` (only once closure criteria are met); `STATE.json` is the live pointer (currently `status: ready_to_start`, `phase: build`, `score: 0`, `advance_allowed: false`, `last_updated: 2026-04-16`)

## 7. Lock enforcement rules
- Any action outside allowed mutations is prohibited
- Any discovered issue outside stage scope must be logged, not fixed
- Any stage expansion requires explicit evidence that it blocks current stage closure
- Any conflict defaults to current stage contract and live verified state

## 8. Exit condition
This lock remains active until one of:
- STAGE_CLOSED
- BLOCKED_WITH_EVIDENCE
- HUMAN_DECISION_REQUIRED

## 9. Current lock instance
- Status: ACTIVE
- Opened at: 2026-04-17
- Last updated at: 2026-04-17
- Owner role: Stage executor for `WF-EC-01` (per `02_AGENT_REGISTRY.md` execution loop)
- Current strategy: contract-first, shell-preserving structural implementation of Execution Context Init inside the existing `WF-EC-01` workflow shell, with before/after snapshots on every workflow write, DB fallback via `_claude_mcp` suffix if direct change is blocked, and stage-marked fixtures per `14_TEST_FIXTURE_REGISTRY.md`
- Next executable action: per `STATE.json.next_action` — "Read the required files in README.md order, then perform DB and workflow reality checks." Concretely: verify `WF-EC-01` shell identity live, verify `execution_contexts` table availability (or decide fallback), capture a before-snapshot, then begin building `EC_Trigger` → `EC_Validate_Input` → `EC_Build_Init_Payload` → `EC_Upsert_Context` → `EC_Load_Existing_Context` → `EC_Return_Result` / `EC_Return_Error`, validating V1–V6 before claiming any score movement.

## 10. Scope-expansion prep lock instance — WF-PL-01 (non-canonical overlay)

> This is a **PREP-ONLY** lock instance and does NOT displace the active §9 lock.
> It exists so that forward-looking PL-01 prep artifacts can be authored WITHOUT leaking any mutation into WF-EC-01 or WF-OR-01 canonical surfaces.
> Authored on 2026-04-17 under the explicit user instruction: "SCOPE-EXPANSION PREP only, do not touch WF-EC-01 or WF-OR-01 artifacts except as read references".

### 10.1 Scope
- Target stage (prep only): `WF-PL-01` — Plan Builder
- Target live workflow: NONE during prep. No live n8n edits permitted.
- Target live DB: NONE during prep. No DB writes permitted.
- Target canonical documents: `06_STAGE_WF-PL-01.md` (new, prep), `WORK_LOG_WF-PL-01.md` (new), suffixed PL-01 cycle reports (`BUILD_REPORT_WF-PL-01.md`, `AUDIT_REPORT_WF-PL-01.md`, `FIX_LOG_WF-PL-01.md`, `CLOSURE_REPORT_WF-PL-01.md`), `workflows/WF-PL-01_*`, `workflows/sql/pl/*`, `workflows/scripts/pl/*`, `workflows/tests/pl/*`.

### 10.2 Allowed mutations under this prep lock
- Create **new** files under the paths listed in §10.1 only.
- Append a PL-01 lock entry (this §10) to `17_ACTIVE_STAGE_LOCK.md` WITHOUT editing §1–§9 or §"Runtime Protection".
- Update `STATE.json` ONLY by adding a `pl_01_prep` metadata block; MUST NOT change `current_stage`, `current_stage_file`, or `advance_allowed`.
- Update `CURRENT_STAGE.md` ONLY by appending a "Forward prep status" section; MUST NOT change "Active stage" or "Read next".

### 10.3 Forbidden mutations under this prep lock
- No edit, rename, delete of `06_STAGE_WF-EC-01.md`, `BUILD_REPORT.md`, `AUDIT_REPORT.md`, `FIX_LOG.md`, `CLOSURE_REPORT.md` (EC-01 canonical versions).
- No edit of `00_ROUTE_MAP.md` stage progression markers ("ACTIVE NOW" / "PLANNED NEXT" / "PLANNED").
- No edit of pipeline docs `01`, `02`, `03`, `04`, `05`, `07`, `08`, `09`, `10`, `11`, `12`, `13`, `14`, `15`, `16`, `18`, `19`, `20`, `21` or `README.md`.
- No n8n MCP write tool invocations.
- No DB `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, `DROP`, or `TRUNCATE` statements. Read-only SELECTs are permitted but NOT executed during this prep cycle.
- No promotion of `WF-PL-01` to ACTIVE. No promotion of the PL-01 prep reports to unsuffixed canonical names.
- No advancement of `STATE.json.current_stage`.
- No claim of closure score > 8.5/10 for PL-01 during this prep cycle.

### 10.4 Lock priority
If a rule conflict arises between §9 (active EC-01 lock) and §10 (prep PL-01 lock):
1. §9 wins.
2. If the PL-01 prep action would require ANY mutation forbidden by §9, it is NOT PERFORMED.
3. The conflict is logged in `WORK_LOG_WF-PL-01.md` §5.

### 10.5 Prep lock instance metadata
- Status: ACTIVE (prep-only overlay)
- Opened at: 2026-04-17
- Last updated at: 2026-04-17
- Owner role: Forward-prep author for `WF-PL-01` (out-of-band; NOT the stage executor)
- Current strategy: author all PL-01 script-proof artifacts from the canonical docs (18_…, 19_…, 20_…, 21_…) without touching live systems, cap score at 8.5/10, produce BLOCKED_WITH_EVIDENCE end-state with next executable path pointing back to EC-01 live-green → OR-01 live-green → PL-01 promotion.
- Next executable action when prep lock exits: user reviews `06_STAGE_WF-PL-01.md` §"Scope ambiguity — HUMAN_DECISION_REQUIRED" (HDR-1..HDR-5); resolves OR defers them; resumes EC-01 build per §9.
- Exit condition: this prep lock auto-exits when any of is true:
  (a) PL-01 is promoted to ACTIVE (requires EC-01 + OR-01 both CLOSED)
  (b) user explicitly retires the PL-01 prep artifacts
  (c) PL-01 contract changes materially and the prep artifacts are replaced

## Runtime Protection
No mutation may weaken canonical runtime chain.