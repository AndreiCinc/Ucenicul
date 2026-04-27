# Memory Module — Planning Chat Context Manifest

Purpose: hand this manifest (and the files it references) to a fresh chat
that will design + implement `memory_module`. The load order goes from
HIGHEST authority (decide here on ties) to lowest (operational artifacts).

User-confirmed scope (2026-04-20):
- Chat produces both design doc **and** implementation (n8n patches + DB
  migrations + tests), in the style of the Phase-11 ME expansion.
- Only the final state summary is needed for historical context (not
  individual Phase-9→12 records).
- DB realities and privacy are in scope (tiering, promotion, pgvector,
  normalized_content → llm_safe_content, thread source_context).
- Current ME plan-describer code for memory + the latest n8n patch
  template are in scope (chat has to know what it replaces and how to
  ship patches).

---

## TIER 0 — Authority hierarchy (must read first, in this order)

Per `CLAUDE.md` §Authority Hierarchy:

1. `CLAUDE.md` — Level-3 repo instructions + authority pointers.
   Critical: PostgreSQL query policy, brain_contract.json scope,
   source-of-truth table. (59 lines)
2. `docs/architecture/Architecture_Spec_v3_Ucenicul.md` — Level-1
   canonical. Memory-relevant sections (don't load the whole 907 lines
   unless needed):
   - §F.9 Memory Item (field contract — line ~213)
   - §M Memory Model (working / recent / long-term tiers — line ~365)
   - §V Privacy Contracts (line ~583)
   - §X Schema Gap Register (line ~659) — says exactly what's
     implemented vs target for `memory_items`
   - §Y.4 Thread vs Execution Context vs Memory vs Operational DB
     Boundary Map (line ~760)
   - §Y.9 Privacy Boundary Diagram (line ~867)
3. `docs/migration/Migration_Plan_Ucenicul.md` — Level-1 migration
   authority (for any schema change memory_module requires).

## TIER 1 — Memory-specific canonical specs

4. `docs/architecture/Memory_Model_Spec.md` — tiering, promotion rules,
   decay, supersede semantics. (124 lines)
5. `docs/architecture/Module_Spec_Memory.md` — input/output contract
   for `memory_module` (action enum, per-action required fields —
   `store_memory`, `recall_memory`, `search_memory`, `promote_memory`,
   `supersede_memory`). Authoritative for handler validation. (89 lines)
6. `docs/architecture/Module_Registry_Ucenicul.md` — entry for
   `memory_module` (inputs_expected, outputs_produced, can_read_from,
   can_write_to, activation_rules, privacy_profile,
   idempotency_requirements). (187 lines, focus on the memory_module
   block ~line 77)

## TIER 2 — DB reality (current) + schema gap

7. `db/README.md` — **CRITICAL**. Documents the currently-implemented
   `memory_items` table (pgvector-enabled but minimal) AND the delta to
   the target schema (memory_type, category, confidence, importance,
   durability, source_message_id, source_thread_id, entity_id,
   evidence_refs, status, supersedes_memory_id — all listed
   `NOT YET IMPLEMENTED`). Memory_module implementation must decide what
   schema delta to ship first. (238 lines)
8. `db/schema/README.md` — source-of-truth pointer for implemented
   schema. (49 lines)

## TIER 3 — Cross-cutting specs

9. `docs/architecture/Thread_Resolution_Spec.md` — how `thread_id` gets
   resolved and how `source_context` is populated for a memory item
   (memory items are thread-aware).
10. `docs/architecture/n8n_Workflow_Mapping.md` — §5 PostgreSQL Query
    Policy (parameterized queries vs inline interpolation rules — memory
    writes MUST conform) + WF acronym map (memory_module is a
    sub-workflow dispatched by `WF-ME-01`). (196 lines)

## TIER 4 — Current state (one file, skip per-phase history)

11. `tests/generated/reports/FINAL_TEST_AND_E2E_SUMMARY.md` — zero
    known blockers; documents the TR→MO chain as proven green on four
    canonical intents including `search_memory`; lists every artifact
    path. The chat should NOT need the Phase-9→12 records. (375 lines)

## TIER 5 — Baseline ME code (plan-describer, to be replaced)

ME's memory handlers currently return `status:"success"` without
touching the DB — they are plan-describer placeholders from Phase-11.
The memory_module build replaces these with real implementations
(pgvector upsert, RAG recall, promotion). The chat must know the
contract they already honour (status_kind, module_result shape,
tenant/thread/execution_context fields).

12. `tests/generated/workflows/me_handlers_current/ME_Validate_Dispatcher_Result.js`
    — how ME extracts `step`, `execution_context_id`, `thread_id`,
    `tenant_id`, `module_name` for the handler. Memory handlers read
    from `$('ME_Validate_Dispatcher_Result').first().json` — this file
    is the upstream contract.
13. `tests/generated/workflows/me_handlers_current/ME_Memory_Search_Result.js`
    — baseline for `action: search_memory`. Currently validates
    `inputs.query`; returns empty `recall_results[]`. Replace with real
    pgvector search.
14. `tests/generated/workflows/me_handlers_current/ME_Memory_Store_Result.js`
    — baseline for `action: store_memory`. Replace with real insert +
    embedding.
15. `tests/generated/workflows/me_handlers_current/ME_Build_RA_Envelope.js`
    — how ME wraps handler output into `module_batch` (happy path) or
    failed `module_batch` (error path, B11-RA v1.1). The memory handler
    output must fit this envelope unchanged.

## TIER 6 — Implementation templates (how to ship)

16. `docs/architecture/ME_Module_Expansion_Plan.md` — Phase-11 design
    doc (Level-2 subordinate canonical). Excellent template for the
    memory_module design doc: goals, scope, routing map,
    per-handler I/O table, step-by-step implementation plan,
    rollback. (375 lines)
17. `tests/generated/workflows/snapshots/_patch_pl_field_align_phase12_3.mjs`
    — latest n8n patch-via-PUT template. Shows the canonical ship
    procedure: load env, GET, snapshot pre, deactivate → PUT (with
    `SETTINGS_WHITELIST`) → activate, post-PUT marker verification.
18. `tests/generated/workflows/snapshots/_patch_me_build_ra_envelope_phase12.mjs`
    — ME-specific patch example (same template, targeting a node inside
    WF-ME-01). Useful if memory handlers need a jsCode change in place.

## Optional / nice-to-have

- `db/queries/README.md` + `db/migrations/README.md` — currently stubs,
  but if non-empty they document how migrations are delivered.
- `tests/generated/workflows/_walk_phase12_3_chains.mjs` — walker
  pattern (timestamp-proximity sub-exec discovery + assertion over
  `aggregated_result`). Template for the chain test the memory_module
  build will need (prove `status:"success"` on real DB hits for
  store_memory → search_memory round-trip).

## What NOT to send

- `tests/generated/edges/PHASE_{9,10,11,12,12_3}_*_RECORD.md` — except
  the Phase-12.3 one if the chat asks for a concrete diagnose→fix
  example. User's scope choice: final summary only.
- `tests/generated/workflows/snapshots/WF-*_pre/put.json` — huge JSON
  snapshots; the chat should read individual node JS from the
  `me_handlers_current/` folder instead.
- `brain_contract.json` — per `CLAUDE.md`, scoped to the brain layer
  (intent classification); not authoritative for memory_module
  contracts.

## One-line load order for the new chat

Paste this into the new chat along with the 18 file paths above:

> Tu vei proiecta și implementa `memory_module` pentru Ucenicul. Citește
> fișierele în ordinea TIER 0 → TIER 6 din acest manifest. Produ un
> design doc în stilul `ME_Module_Expansion_Plan.md` (Phase-11) urmat
> de patch-uri n8n + migrații DB + teste. Autoritate supremă:
> `Architecture_Spec_v3_Ucenicul.md`. Verificarea ship-ului: walker
> similar cu `_walk_phase12_3_chains.mjs`, asertând
> `aggregated_result.status === "success"` pe store_memory →
> search_memory round-trip pe o fixture fresh.
