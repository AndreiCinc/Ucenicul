# Phase 12 — B11-PL + B11-RA Fixes

Mission: close the two downstream gaps surfaced by Phase 11
(`B11-PL-INPUT-EXTRACTION-GAP`, `B11-RA-MODULE-ERROR-ENVELOPE-REJECTED`) so
that the TR-originated chain can reach MO on the happy path and return a
canonical `aggregated_result` on the error path.

Scope guard (user mandate): *"Nu atinge nimic din infrastructura noua daca nu
e nevoie. Nu halucina."* → each fix is a single-node code change on an
existing workflow, reversible, additive where possible.

## Artifacts

- Tests
  - `tests/generated/workflows/_walk_b11_pl_extraction.mjs` — walker
  - `tests/generated/edges/phase12_b11_pl_results.json` — 4/4 PASS
  - `tests/generated/workflows/_walk_b11_ra_envelope.mjs` — walker
  - `tests/generated/edges/phase12_b11_ra_results.json` — 3/3 PASS
- Patches (applied via n8n PUT with SETTINGS_WHITELIST)
  - `tests/generated/workflows/snapshots/_patch_pl_extract_inputs_phase12.mjs`
  - `tests/generated/workflows/snapshots/_patch_me_build_ra_envelope_phase12.mjs`
- Snapshots (pre/put)
  - `tests/generated/workflows/snapshots/WF-PL-01_phase12_pre.json` · `…_put.json`
  - `tests/generated/workflows/snapshots/WF-ME-01_phase12_pre.json` · `…_put.json`

## 12.1 — B11-PL: PL input extraction

### Change

`WF-PL-01` / `PL_Build_Planner_Input` jsCode: v1.1 → v1.2.
Adds `extractInputsForAction(action, goalText)` and, in the
`primary_intent`-driven synthesis path, merges its output into
`step.inputs` (planner-supplied `inputs` still win if present).

Extraction per action:
- `create_task`, `create_reminder` → `description`
- `create_reminder` → `remind_at` (Romanian phrases: `la ora HH`, `la HH`,
  `ora HH[:MM]`, `maine`/`poimaine`/`azi`)
- `search_memory` → `memory_query`
- `capture_feedback` → `feedback_text`

v1.1 fail-closed semantics preserved. Day offset defaults to +1 when an
explicit hour is given without a day word.

### Proof (post-fix)

Walker: `_walk_b11_pl_extraction.mjs /tmp/b11_pl_seeds_post.json`

```
B11-PL extraction: 4/4 passed
  ✅ b11-pl-create_task       tr=1186 pl=1189
  ✅ b11-pl-create_reminder   tr=1200 pl=1203
  ✅ b11-pl-search_memory     tr=1214 pl=1217
  ✅ b11-pl-capture_feedback  tr=1221 pl=1224
```

## 12.2 — B11-RA: ME→RA error-envelope adapter

### Problem

Pre-fix, when an ME handler emitted `{status_kind:"error",
result_type:"module_error"}`, `ME_Build_RA_Envelope` passed it through and
`RA_Validate_Module_Batch` rejected with
`{result_type:"aggregation_error", error.code:"INVALID_AGGREGATION_INPUT"}`.
This was the canonical terminus for every TR-originated error-path smoke
after Phase 11.

### Change

`WF-ME-01` / `ME_Build_RA_Envelope` jsCode: v1.0 → v1.1 (B11-RA). Keeps the
success-path wrap unchanged; adds an explicit branch for
`{status_kind:"error", result_type:"module_error"}` which wraps the error
into a canonical failed `module_batch` with exactly one `module_result`
(status=`failed`) whose `observations[]` and `followup_requests[]` preserve
the original error `code`, `message`, `missing_fields`, and `details`.

Context (`execution_context_id`, `thread_id`, `tenant_id`, `step_id`,
`module_name`) is pulled from `ME_Validate_Dispatcher_Result` via a
`safeNode` helper so the wrapper is resilient to upstream errors before
dispatch.

### Proof (post-fix)

Walker: `_walk_b11_ra_envelope.mjs /tmp/b11_ra_seeds_post.json`

```
B11-RA envelope wrap: 3/3 passed
  ✅ b11-ra-reminder-missing-desc     me=1228 ra=1229
  ✅ b11-ra-memory-missing-type       me=1237 ra=1238
  ✅ b11-ra-reminder-update-no-ident  me=1246 ra=1247
```

Per case the walker asserts:

1. `ME_Build_RA_Envelope` ran and emits `{status_kind:"success",
   result_type:"module_batch"}` (was `module_error` pre-fix).
2. `ME_Dispatch_To_RA_01_SUBCALL` output is NOT the canonical RA reject
   (was `INVALID_AGGREGATION_INPUT` pre-fix).
3. The RA sub-execution is located by timestamp proximity and
   `RA_Build_Downstream_Envelope` emits `result_type:"aggregated_result"`
   with `aggregated_result.status === "failed"`,
   `module_results_count === 1`, and the original
   `MISSING_REQUIRED_FIELDS` code preserved in both `observations[]` and
   `followup_requests[]`.

### Note on RA output shape

`ME_Dispatch_To_RA_01_SUBCALL`'s own returned payload is frequently the
`_debug_summary` side-channel because `RA_Status_Summary` shares the
`RA_Return_Result` terminal with `RA_Build_Downstream_Envelope` and n8n
returns the last run. This is an RA-01-internal artifact, not a B11-RA
regression. The canonical aggregated envelope is verified directly in the
RA sub-execution. If the RA caller contract is later tightened to require
the aggregated envelope on the ExecuteWorkflow response, it is a separate
RA-scope patch (side-channel re-route or terminal split).

## RED → GREEN baseline evidence

Running the same walker against the pre-fix seeds (Phase-11 negative execs
`1102`, `1104`, `1106`) still fails as expected, confirming the walker
flags the real bug rather than a tautology:

```
B11-RA envelope wrap: 0/3 passed
  ❌ subcall_out.error.code = "INVALID_AGGREGATION_INPUT"
  ❌ me_emits_module_batch got "module_error"
  ❌ ra_emits_aggregated_result undefined
```

## Blast radius and reversibility

- PL: single jsCode change on `PL_Build_Planner_Input`. v1.1 → v1.2.
- ME: single jsCode change on `ME_Build_RA_Envelope`. v1.0 → v1.1.
- No schema migrations, no new edges, no new nodes, no domain writes.
- Pre-snapshots captured for both workflows; rollback is a single PUT of
  the `_phase12_pre.json` `nodes`/`connections`/`settings` bundle.

## State of the chain after Phase 12

- Happy path: PL now emits per-intent structured inputs, so ME's handlers
  (create_task, create_reminder, search_memory, capture_feedback) receive
  the fields they need to return `status: "success"` module_results
  instead of `MISSING_REQUIRED_FIELDS`.
- Error path: when an ME handler legitimately emits `module_error`, ME now
  forwards a canonical failed module_batch into RA; RA aggregates it into
  an `aggregated_result` (`status: "failed"`) that preserves the original
  error code. The chain can proceed to SU→RC→MO instead of terminating at
  RA.

Both fixes are canonical (conform to Architecture Spec v3 contracts) and
are the smallest changes that satisfy the contract.
