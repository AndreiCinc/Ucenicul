# Fix Log — WF-PL-01 (Plan Builder) — Script-Proof Prep

## Stage
`WF-PL-01`

## Cycle type
`SCOPE_EXPANSION_PREP` — no real bugs fixed because no live system was touched. This file instead captures **design-time tensions that would have been fix-loops had they been live**, and logs how each was resolved during authoring.

---

## Fix cycle 1 — Missing reference document: `Architecture_Spec_v3_Ucenicul.md`

### Problem
User's brief names `Architecture_Spec_v3_Ucenicul.md` as an authoritative source for Plan Builder contract. File not present in the project folder.

### Root cause
Project folder snapshot does not contain it. No `uploads/` content either. Likely the document lives elsewhere in the user's wider knowledge base and was not copied into the pipeline folder.

### Fix applied
Reconstructed the PL-01 contract from the pipeline's own canonical docs:
- `18_RUNTIME_CANONICAL_TARGET.md` §3.5
- `19_MODULE_CONTRACTS.md` §6
- `20_EXECUTION_CONTEXT_EVOLUTION.md` §4 (Plan layer)
- `21_RESPONSE_COMPOSER_CONTRACT.md` (downstream consumer hint)

Where these conflicted with or under-specified relative to the user's brief, the gap is preserved as `HUMAN_DECISION_REQUIRED` (HDR-1..HDR-5 in the stage file).

### Verification
- live re-read: N/A (no live target)
- db check: N/A
- runtime check: N/A
- doc audit: the constructed contract is internally consistent (envelope shape matches storage shape matches dispatcher output); verified by inspection of `06_STAGE_WF-PL-01.md` §"Contract to implement" vs §"Required DB side effects".

### Outcome
`PARTIAL` — contract is authoritative for the envelope-only scope; LLM-planner scope remains open (HDR-1).

---

## Fix cycle 2 — Missing reference document: `n8n_Workflow_Mapping.md` (Plan Validator row)

### Problem
User's brief references a "Plan Validator row" implying PL-01 may be split into Plan Builder + Plan Validator stages.

### Root cause
File not present in pipeline folder. `00_ROUTE_MAP.md` lists only `WF-PL-01 — Plan Generation` as a single stage.

### Fix applied
Treated Plan Validator as an internal step (`PL_Validate_Plan_Envelope` node inside PL-01), not a distinct stage. Logged as HDR-3 in the stage file for user confirmation.

### Verification
- Doc audit: the 7-node layout in `06_STAGE_WF-PL-01.md` §"Recommended node layout" makes validation an internal responsibility, consistent with the single-stage reading.

### Outcome
`PARTIAL` — pending HDR-3 resolution.

---

## Fix cycle 3 — Missing reference: "WF-OR-01 closure artifacts"

### Problem
User's brief says "WF-OR-01 closure artifacts as the most recent reference pattern" and asks to "mirror the WF-OR-01 deliverables for PL-01".

### Root cause
WF-OR-01 has not been started yet. Per `00_ROUTE_MAP.md`, WF-OR-01 is `PLANNED NEXT`, after WF-EC-01 (currently `ACTIVE NOW`, `BUILD_BLOCKED` per its BUILD_REPORT).

### Fix applied
Used `06_STAGE_WF-EC-01.md` as the mirror pattern for deliverable shape (stage file template, lock overlay, 4 reports, blueprint JSON, SQL pack, pure-logic port, test families). Created a placeholder archive slot at `docs/ucenicul_claude_handoff_hardened/archive/WF-OR-01_closure_snapshot/README.md` noting the absence.

### Verification
- File inventory shows EC-01 pattern mirrored (stage file, 4 cycle reports — suffixed to avoid colliding with live EC-01 versions).
- Lock overlay does not displace EC-01 lock; strictly additive.

### Outcome
`PASS` — deliverable-shape mirror is complete and explicit about the absent OR-01 source.

---

## Fix cycle 4 — SQL schema inference temptation (avoided)

### Problem
The DDL candidate for `execution_plans` needs exact column types, null constraints, indexes. No live DB access this cycle. Tempting to infer from validator/tool error messages or from the CHECK constraint list seen in EC-01 BUILD_REPORT §2.

### Root cause
Prior stage (EC-01) had clean live introspection evidence; this stage does not.

### Fix applied
Explicitly treated the DDL as CANDIDATE in `workflows/sql/pl/02_create_table_candidate.sql` with header comment:
```
-- CANDIDATE DDL — NOT authoritative. Live-introspect first via 01_schema_inspect.sql.
-- Per 12_TOOL_FAILURE_MATRIX.md §5: no schema inference from validator errors.
```
Left `idempotency_key` column intentionally matching the EC-01 canonical pattern (UNIQUE, TEXT, NOT NULL) — this IS authoritative, inherited from a live-verified sibling table.

### Verification
- Inspection of the SQL file confirms the header disclaimer.
- No use of validator error text as schema evidence.

### Outcome
`PASS` — schema-inference rule honored.

---

## Fix cycle 5 — Plan-step field set over-/under-specification

### Problem
`18_RUNTIME_CANONICAL_TARGET.md` §3.5 lists 4 mandatory step fields: `target module`, `action type`, `dependency`, `expected side effect`. Not enough for a deterministic dependency graph (no stable ids) or for idempotent dispatcher transitions (no status).

### Root cause
§3.5 is the minimum contract; the spec does not prohibit additions.

### Fix applied
Added `step_id` and `status` to the plan-step schema, with explicit rationale in `06_STAGE_WF-PL-01.md` §"Scope ambiguity — HUMAN_DECISION_REQUIRED" HDR-5. Default `status = "planned"` at PL-01 time; Dispatcher transitions to `pending → running → completed|failed`.

### Verification
- `pl_logic.py::PlanStep` dataclass has exactly 6 fields.
- `test_families.py` family #5 (`family_step_id_assignment`) covers id stability.
- Reversible — removing these two fields later is trivial.

### Outcome
`PASS` — addition is safe, deterministic, documented, reversible.

---

## Fix cycle 6 — Report-file name collision avoided

### Problem
`09_REPORT_TEMPLATES.md` names reports as `BUILD_REPORT.md`, `AUDIT_REPORT.md`, `FIX_LOG.md`, `CLOSURE_REPORT.md`. These files are currently owned by the ACTIVE EC-01 stage. Creating PL-01 versions with the same names would overwrite EC-01 live evidence.

### Root cause
The naming convention assumes one active stage at a time. Forward-prep on a not-yet-active stage breaks that assumption.

### Fix applied
Used suffixed names `BUILD_REPORT_WF-PL-01.md`, etc. for the prep cycle. When PL-01 becomes ACTIVE, the stage executor MUST rename to unsuffixed names and archive EC/OR versions under `docs/ucenicul_claude_handoff_hardened/archive/`. Documented in `06_STAGE_WF-PL-01.md` §"Required reports for this stage".

### Verification
- `BUILD_REPORT.md` (EC-01) is untouched.
- `BUILD_REPORT_WF-PL-01.md` exists as a new file.

### Outcome
`PASS` — lock-scope preserved.

---

## Fix cycle 7 — STATE.json update scope discipline

### Problem
Updating `STATE.json` risks flipping `current_stage` to `WF-PL-01`, which would violate the lock and the route rule (no advance before 10/10 closure).

### Root cause
Natural authoring instinct is to overwrite the whole file.

### Fix applied
Added a nested `pl_01_prep` metadata block. Did NOT change `current_stage`, `current_stage_file`, `status`, `phase`, `score`, `advance_allowed`, or `next_action`. Added `pl_01_prep.advance_allowed: false` explicitly.

### Verification
- See §"Current stage" in `CURRENT_STAGE.md` — still points to `WF-EC-01`.
- See top-level `STATE.json` keys — unchanged.

### Outcome
`PASS` — advancement-preset (`11_DECISION_PRESETS.md` §15) respected.

---

## Failed write-path classifications (inherited from EC-01, not re-tested this cycle)

Per `12_TOOL_FAILURE_MATRIX.md` §3 + EC-01 BUILD_REPORT §9:
- `update_workflow(code)` SDK path — classified `unsafe_for_current_stage` for any stage not backed by authoritative SDK-grammar examples.
- Use **file JSON import** as the canonical write path at PL-01 build time.
- This is captured explicitly in `workflows/WF-PL-01_IMPORT_PATCH_PLAN.md` §"Write path".
