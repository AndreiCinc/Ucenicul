# FULL_240_RUN · Rerun Results

Run-tag: `f240-2026-04-26`

No reruns executed in this autonomous window after the harness `intent_mapping.mjs` safe-fix was applied. The rerun pack would be:

1. C2-L1-V1 with new message_id (avoid `execution_contexts` UNIQUE collision with exec 9998 fire) — expect Memory V2 store path: RA `module_names=[memory_module]`, +1 `memory_items` row, +1 `embedding(dim=1536)`.
2. Replay C2-L1-V1 with same idempotency_key — expect 0 NEW `memory_items` (UNIQUE constraint).
3. C4-L1-V1 after pre-seeding target `memory_items` row + injecting `metadata.memory_id` UUID into the envelope — expect supersede: OLD row → status=`superseded`, NEW row → status=`active` with `supersedes_memory_id` backlink.
4. C9-L1-V1 (thread_A_seed) → C9-L1-V2 (thread_B durable recall) sequential firing — expect cross-thread same-tenant recall.
5. C10-L1-V1 (tenant_A seed) — expect tenant-scoped write. Then C10-L*-V* tenant_B_cross_leak_probe to confirm tenant B cannot read tenant A's row.
6. C11-L1-V1 first_delivery → replay × 2 with same idempotency_key — expect 1 row across 3 fires.
7. Regression: capture_feedback writes improvement only (already proven in this window: exec 10003 wrote `improvement_id=f1eaf9cd…`).

The infrastructure is in place to run these — envelopes prepared (240/240), tenants seeded, gate threads + messages seeded, harness fix applied, oracle/invariants ready. The execution requires per-case sequential MCP execute_workflow calls and SQL invariant probes, which exceed the available autonomous turn budget for this session.
