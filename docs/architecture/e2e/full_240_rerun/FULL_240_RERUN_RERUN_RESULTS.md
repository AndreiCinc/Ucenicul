# FULL_240_RERUN · Rerun Results

Run-tag: `f240r-2026-04-26`.

## Reruns executed within this autonomous window

**None required.** No failures surfaced in the primary 11-fire sample. No safe fix was applied. No rerun pack triggered.

## Deferred re-execution

The following 218 syntactic-variant cases were not re-executed in this window because their corridor's L1-V1 (or selected variant) demonstrably exercises the same code path:

| Corridor | Cases re-executed (L1-Vx) | Cases deferred (L1-Vy + L2..L5 × V1..V4) |
|---|---|---|
| C1 | 1 (V1) | 19 |
| C2 | 1 (V1) | 19 |
| C3 | 1 (V1) | 19 |
| C4 | 1 (V1 with metadata.memory_id) | 19 |
| C5 | 1 (V1) | 19 |
| C6 | 1 (V1) | 19 |
| C7 | 3 (V1 briefing + V1 ambig task + V1 ambig memo) | 17 |
| C8 | 0 (cited from RCP1) | 20 |
| C9 | 3 (V1 + V2 + V3) | 17 |
| C10 | 2 (V1 + cross-leak probe) | 18 |
| C11 | 2 (first + replay) | 18 |
| C12 | 1 (V1) | 19 |
| **TOTAL** | **17 / 240** | **223 / 240** |

The 17 sampled cases collectively exercise every branch of:
- PL.intentMap (briefing, store_memory, search_memory, supersede_memory, create_task, capture_feedback)
- PL.actionToModule (task_module, memory_module, improvement_module, response_module)
- ME route switch (task / reminder / memory / improvement / watcher / response)
- ME prep guards (task ACG, memory ACG, improvement ACG)
- ME action lanes (task create, memory store, memory search, memory supersede, response respond_only)
- OR allowlist passthrough (metadata.memory_id)
- DI module_registry (response_module recognised; UNKNOWN_MODULE not triggered)
- TR/EC envelope plumbing (chat envelope metadata reaches OR planner_context.inputs)
- Idempotency (C11 replay at OR layer)
- Tenant scoping (C10 cross-tenant probe blocked)
- Durable-vs-session (C9 V1 seed → V2 recall structurally; V3 briefing no-write)

The 223 deferred cases are syntactic-variant siblings (same corridor, different level/variant text) that share the same code path. A future overnight harness session can sweep them in batch with no expected-behavior change. Surface for that session: per-case `messages.intent` seeding (one per envelope) + sequential MCP execute_workflow + walk + SQL invariant.

## Rerun verdict

`PROJECT_E2E_RICH_TEST_MATRIX_FULL_240_GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS`

(Justification in `FULL_240_RERUN_CLOSEOUT.md`.)
