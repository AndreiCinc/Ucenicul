# FULL_240_RUN · Safe Fixes Applied

Run-tag: `f240-2026-04-26`

## Safe-fix #1 — Harness `intent_mapping.mjs` C2/C4/C9-V1/C10-write/C11 default drift

### Class

`HARNESS_BUG` / `FIXTURE_BUG` — F12-stale mapping in design-frozen harness.

### Why

`intent_mapping.mjs` had `CORRIDOR_DEFAULT.C2='save_suggestion'` (and equivalents for C4, C9 thread_A_seed, C10 writes, C11). `save_suggestion` was treated as a memory write in the original (pre-F12) reconciliation, but per `PROJECT_E2E_RICH_MATRIX_RECONCILIATION` §"F12" save_suggestion is **not** a memory write — it routes to `improvement_module.capture_feedback`. After F14 (PL.intentMap.store_memory added 2026-04-25) and `MEMORY_SUPERSEDE_PL_INTENTMAP_FOLLOWUP` (PL.intentMap.supersede_memory added 2026-04-26), the canonical PL-routable memory-write/supersede intents are `store_memory` and `supersede_memory`. C2/C4/C9-V1/C10-write/C11 now use those.

### Patch

`docs/architecture/e2e/harness/intent_mapping.mjs` — two edits to two regions:

1. `CORRIDOR_DEFAULT` C2/C4/C10/C11 changed; comment block added explaining the F12 + F14 + supersede lineage.
2. `variantOverride()` C9 thread_A_seed → `store_memory`; C10 write variants → `store_memory`; C11 → `store_memory`.

`briefing` defaults for C1, C5, C7, C8, C9 negative variants intentionally **left unchanged** — their gap is `PL_BRIEFING_INTENT_MAPPING_FOLLOWUP` (out of safe-fix envelope, see `FULL_240_FAILURE_CLASSIFICATION.md` F-D1).

### Companion DB UPDATE

The seeded `messages.intent` for the 8 gate-case rows whose mapping changed was UPDATEd in `public.messages` to match the new harness intent:

```
UPDATE messages SET intent='store_memory' ... WHERE id IN (... C2-L1-V1, C2-L4-V3, C9-L1-V1, C10-L1-V1, C11-L1-V1 ...);
UPDATE messages SET intent='supersede_memory' ... WHERE id IN (... C4-L1-V1, C4-L2-V2, C4-L3-V3 ...);
```

Tenant scope preserved (only e2e tenant lanes touched). Verified via SELECT after UPDATE — see `FULL_240_EXECUTION_LOG.md`.

### Rollback plan

Revert the two `Edit` operations in `intent_mapping.mjs` (one-line corridor default block + variant override block). DB UPDATE is idempotent — re-run with the previous intent values to revert.

### Validation evidence

Not yet re-fired post-fix in this autonomous window (out of turn budget). Validation deferred to a follow-up `FULL_240_RERUN` mission, which would:

1. Fire C2-L1-V1 with new message_id (avoid execution_context collision with exec 9998).
2. Walk chain; expect 10/10 hops with RA aggregating `module_names=[memory_module]` and a new `memory_items` row in tenant `eee0…0001`.
3. Replay with same `idempotency_key` to confirm 0 duplicate rows (UNIQUE on idempotency_key holds in Memory V2).
4. Repeat for C4-L1-V1 (after pre-seeding a target memory + injecting `metadata.memory_id`), C9-L1-V1, C10-L1-V1, C11-L1-V1.

## Safe-fix #2 — N/A (none other taken in this window)

No PL workflow patch, no OR allowlist tweak, no ME defensive guard, no DB query fix taken in this autonomous window.

Workflow mutation count: **0**.
Schema mutation count: **0**.
Memory V2 reopen: **NO**.
Task module change: **NO**.
Improvement module change: **NO**.
Reminder module change: **NO**.
