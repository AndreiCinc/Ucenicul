# WF-EC-01 — Live Reality Check (Phase 2)

**Date:** 2026-04-19
**Stage:** WF-EC-01 Execution Context Init
**Companion doc:** `WF-EC-01_CLOSURE_CONTRACT.md` (Phase 1).
**Purpose:** verify live workflow, live DB, and live executions against
the Phase 1 contract. No live writes. Read-only.

---

## 1. Method

- Fresh read of live workflow via `n8n-patch get v9jih4jqeXpOJOiH` →
  `tools/n8n-patch/snapshots/v9jih4jqeXpOJOiH_ec01-phase2-20260419.json`.
- Byte-level diff against pre-cycle snapshot
  (`v9jih4jqeXpOJOiH_ec01-precycle-20260418.json`).
- Live DB probes via `mcp__postgres__execute_sql`:
  - `SELECT` on `execution_contexts` contents.
  - `information_schema.columns` on `execution_contexts`.
  - `pg_constraint` on `execution_contexts`.
  - 8-table count baseline.
- No MCP `execute_workflow` calls. No writes. No PUT.

## 2. Workflow drift since Phase 1

- Pre-cycle snapshot size: 32954 bytes.
- Phase 2 snapshot size: 32954 bytes.
- Structural diff (shape + node list + connections): **zero lines
  different**.
- Full node-level diff (name + type + typeVersion + parameters):
  **zero lines different**.
- Full connections diff: **zero lines different**.

**Conclusion:** live EC-01 is byte-identical to the pre-cycle snapshot.
No external party has touched the workflow since 2026-04-18T12:20:21Z.

## 3. DB schema reality check

### 3.1 Columns (18)

Verified via `information_schema.columns`:

| column | type | null? | default | max_len |
|--------|------|-------|---------|---------|
| id | uuid | NO | `gen_random_uuid()` | — |
| tenant_id | uuid | NO | — | — |
| thread_id | uuid | NO | — | — |
| trigger_message_id | uuid | NO | — | — |
| status | varchar | NO | `'initialized'` | 20 |
| current_goal | text | YES | — | — |
| current_plan_ref | varchar | YES | — | **200** |
| pending_steps | jsonb | NO | `'[]'` | — |
| completed_steps | jsonb | NO | `'[]'` | — |
| module_results | jsonb | YES | `'[]'` | — |
| working_notes | jsonb | YES | `'{}'` | — |
| shared_artifacts | jsonb | YES | `'[]'` | — |
| error_state | jsonb | YES | — | — |
| retry_state | jsonb | YES | — | — |
| idempotency_key | varchar | YES | — | **300** |
| expires_at | timestamptz | YES | — | — |
| created_at | timestamptz | NO | `now()` | — |
| updated_at | timestamptz | NO | `now()` | — |

### 3.2 Constraints

| name | kind | definition |
|------|------|------------|
| `execution_contexts_pkey` | PK | `PRIMARY KEY (id)` |
| `execution_contexts_idempotency_key_key` | UNIQUE | `UNIQUE (idempotency_key)` |
| `execution_contexts_status_check` | CHECK | `status IN ('initialized','planning','dispatching','executing','aggregating','composing','completed','failed','expired')` |

### 3.3 Notable findings

1. **`current_plan_ref` is `varchar(200)`, not `uuid`.** The canonical
   stage file (`06_STAGE_WF-EC-01.md §Output contract`) declares it as
   `uuid`. This is a minor doc-vs-schema drift. At runtime EC-01
   returns `null` for this field, so there is no live impact. Worth
   flagging for a future schema/doc alignment pass but not a closure
   blocker.
2. **Status CHECK explicitly allows `initialized`.** Live code writes
   `'initialized'` — aligned.
3. **UNIQUE (idempotency_key)** — the pillar of EC-01's idempotency
   behaviour. `ON CONFLICT (idempotency_key) DO NOTHING` in
   `EC_Upsert_Context` is schema-correct.
4. **4 additional observability columns** beyond the stage-file
   contract (`module_results`, `working_notes`, `shared_artifacts`,
   `error_state`, `retry_state`). All nullable or default, so the
   INSERT statement (8 explicit columns) is schema-compatible. These
   columns will be populated by later stages (OR, PL, DI, ME, RA,
   SU), not by EC-01.

## 4. Live `execution_contexts` contents

Two rows pre-dating this cycle:

| idx | id | tenant_id | trigger_message_id | status | idempotency_key | created_at |
|-----|----|-----------|--------------------| -------|-----------------|------------|
| 1 | `a7ae786a-9f64-46b8-b02a-3df62080a8f7` | `aaaaaaaa-…-000000000001` | `aaaabbbb-…-000000000010` | `initialized` | `aaaaaaaa-…-000000000001:aaaabbbb-…-000000000010:exec_ctx:v1` | 2026-04-16T20:16:51Z |
| 2 | `0000ec01-0000-0000-0000-000000000001` | `aaaaaa01-…-000000000001` | `cccccc01-…-000000000001` | `initialized` | `pl-fixture-v1-happy` | 2026-04-17T19:09:08Z |

### 4.1 Row 1 analysis — implicit evidence that live EC-01 has executed

Row 1's `idempotency_key` matches EC-01's deterministic derivation
formula **exactly**:
`${tenant_id}:${trigger_message_id}:exec_ctx:v1`.

This is strong circumstantial evidence that the current
`EC_Validate_Input` → `EC_Build_Init_Payload` → `EC_Upsert_Context`
chain has already produced at least one successful INSERT against the
canonical table. Implications:

- `EC_Upsert_Context.queryReplacement` multi-`{{}}` template form
  **probably binds correctly at runtime** — otherwise this row would
  not exist with this key shape.
- `EC_Route_Valid` switch v2 + `dataType:'boolean'` + string `'true'`
  comparison **probably routes the valid path correctly** — otherwise
  this row would not exist at all.

### 4.2 Row 2 analysis — PL-01 fixture

Row 2's key `pl-fixture-v1-happy` was inserted by the PL-01 prep cycle
(see `pl_01_prep` in `STATE.json`). It bypasses EC-01's idempotency
derivation. Irrelevant to EC-01's closure.

### 4.3 Implications for Phase 1 blockers

- **B3 (queryReplacement form unverified)** → downgraded from HIGH
  to LOW. Row 1 existence is strong but not conclusive evidence;
  a live V3 execution is still required to close this blocker. If
  V3 fails with the SU-01 signature `"Query Parameters must be a
  string of comma-separated values or an array of values"`, we know
  how to fix it (array-literal form).
- **B4 (switch v2 boolean + string 'true')** → downgraded from MEDIUM
  to LOW. Same reasoning.
- **B2 (no EWT on EC-01)** remains HIGH — link 1 readiness still
  blocked without an `executeWorkflowTrigger`.
- **B1 (leftover chatTrigger)** remains MEDIUM — still exposes
  webhook surface.
- **B5 (no live closure evidence)** remains HIGH — Row 1 is a leak,
  not a proof. No closure report. No STATE block. No recorded
  execution IDs. V-sweep is mandatory.

## 5. 8-table baseline snapshot (Phase 2)

Taken 2026-04-19T00:0X (via `mcp__postgres__execute_sql`):

| table | count |
|-------|-------|
| execution_contexts | **2** |
| threads | 7 |
| messages | 6 |
| tenants | 7 |
| rag_memories | 42 |
| tasks | 4 |
| reminders | 1 |
| outbound_delivery_ledger_claude_mcp | 0 |

All counts match the 2026-04-18 post-SU-smoke baseline recorded in
`WF-E2E-01_SU01_CALLABLE_AS_SUB_SMOKE.md §5`.

**Conclusion:** zero DB drift since the E2E-01 operator window closed.

## 6. Contract diff table

| # | Requirement (Phase 1) | Live state | Status | Resolution plan |
|---|-----------------------|------------|--------|-----------------|
| 1 | Workflow active, availableInMCP | `active:true`, `availableInMCP:true` | ✓ | — |
| 2 | EC_Trigger entry point (callable-as-sub) | absent (only chatTrigger + manualTrigger) | ✗ (B2) | Phase 4 — add `EC_Input` EWT additively. |
| 3 | EC_Validate_Input adapter + UUID validation | present, v1.0, matches contract | ✓ | Keep byte-identical. |
| 4 | EC_Route_Valid switch | switch v2, `dataType:'boolean'`, value1=`={{ $json._valid }}`, rules `['true','false']` | ? (B4) | Verify in V2/V3. If miswires, rewrite to string dataType (SU-01 precedent). |
| 5 | EC_Build_Init_Payload | present, v1.0, builds INSERT row | ✓ | Keep byte-identical. |
| 6 | EC_Upsert_Context INSERT ON CONFLICT DO NOTHING RETURNING * | present, v2 executeQuery with `DO NOTHING RETURNING` full column list | ✓ | Keep query byte-identical. Verify queryReplacement form in V3 (B3). |
| 7 | EC_Load_Existing_Context SELECT by (idempotency_key, tenant_id) | present | ✓ | Keep byte-identical. |
| 8 | EC_Return_Result terminal | present, reads from `$('EC_Load_Existing_Context')`, INTERNAL_LOAD_FAILED fallback | ✓ | Keep byte-identical. |
| 9 | EC_Return_Error terminal | present, reads from `_valid='false'` item | ✓ | Keep byte-identical. |
| 10 | Credentials on postgres nodes | `z9nKgToNWvIW7P8f` / Postgres account 2 bound on both | ✓ | — |
| 11 | No inbound chat webhook | `When chat message received` chatTrigger enabled, wired to Validate_Input | ✗ (B1) | Phase 4 — set `disabled: true` additively. |
| 12 | DB table `execution_contexts` ready | verified 18 columns, constraints match | ✓ | — |
| 13 | V1..V6 live execution IDs on file | none | ✗ (B5) | Phase 5 — run full V-sweep. |
| 14 | CLOSURE_REPORT_WF-EC-01.md | does not exist | ✗ (B5/B6) | Phase 7 — produce. |
| 15 | `ec_01_live_impl` block in STATE.json | not present | ✗ (B5/B6) | Phase 7 — promote. |

## 7. Blocker re-grade after live probe

| id | description | pre-Phase-2 severity | post-Phase-2 severity | notes |
|----|-------------|----------------------|------------------------|-------|
| B1 | chatTrigger still attached | MEDIUM | MEDIUM | Fix: disable additively. |
| B2 | no EWT on EC-01 | HIGH | HIGH | Fix: add `EC_Input` EWT additively. |
| B3 | queryReplacement multi-`{{}}` pattern unverified | HIGH | LOW | Row 1 is implicit evidence it works. V3 will prove. |
| B4 | switch v2 boolean + string `'true'` | MEDIUM | LOW | Same — Row 1 existence implies routing is OK. V2/V3 will prove. |
| B5 | no live closure evidence | HIGH | HIGH | Fix: run V1..V6 sweep, produce closure report. |
| B6 | no per-stage artefacts | LOW | LOW | Produce during Phase 4/7. |
| B7 | STATE alignment | n/a | n/a | Already aligned. |

## 8. Live safety confirmation

- No live mutation occurred in Phase 2.
- No new files written outside
  `tools/n8n-patch/snapshots/v9jih4jqeXpOJOiH_ec01-phase2-20260419.json`
  + this document + the Phase 1 contract.
- `tools/n8n-patch/.audit.jsonl` untouched for EC-01 (no write ops
  in this phase).
- EC-01 remains `current_stage` in STATE.json.
- No E2E-01 mutations regressed:
  - SU-01 trigger add still present (verified — STATE carries
    `su_01_live_impl.sub_call_smoke` block with execution 763).
  - RC-01 ship-disabled connector still present (verified — STATE
    carries `e2e_01_meta.live_mutations_applied[1]` entry).

## 9. Conclusion

EC-01 is materially implemented at the code level. The canonical
pack-shape concerns (B3, B4) are likely already satisfied — one
pre-existing row carrying the deterministic `exec_ctx:v1` key pattern
is strong evidence that the current workflow executes correctly on
the happy path. The remaining gaps are:

- **Structural:** add `EC_Input` EWT (B2); disable chatTrigger (B1).
- **Evidential:** run V1..V6 with recorded execution IDs (B5);
  produce closure report + STATE block (B6).

Phase 3 (closure plan) will sequence these into a minimal, additive,
reversible mutation pack followed by a full V-sweep.
