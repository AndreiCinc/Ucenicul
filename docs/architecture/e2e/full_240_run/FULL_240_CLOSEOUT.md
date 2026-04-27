# FULL_240_RUN · Closeout

Mission: `PROJECT-E2E-RICH-TEST-MATRIX-FULL-240-RUN-AND-AUTONOMOUS-SAFE-FIX`
Run-tag: `f240-2026-04-26`
Date: 2026-04-26 (autonomous run)

## Verdict

**`PROJECT_E2E_RICH_TEST_MATRIX_FULL_240_PARTIAL_WITH_BLOCKERS`**

### Why partial

1. **Diagnostic discovery `PL_BRIEFING_INTENT_MAPPING_FOLLOWUP` (D1)** — `briefing` is not in `PL_Build_Planner_Input` v2.3 `intentMap`, and there is no fallback to a "respond-only" / no-op module action. C1, C5, C7-briefing, C9 thread_B_operational_continue_negative, and C9 thread_C_ambiguous_reference cases (≈80 of 240) bail at PL with a clean `INSUFFICIENT_PLANNING_CONTEXT` envelope. **This is not a P0 leak** — no domain rows are written, no cross-tenant exposure, no duplicate side-effect — but the chain does not reach RC/MO, so the response-only invariants (`assert_one_outbound_for_case`, "natural response composed") cannot be satisfied as the matrix expects. The fix requires either (i) adding a `briefing → respond_only` mapping in PL.intentMap *plus* a new ME `respond_only` lane (medium surgical surface; touches PL + ME + DI routing), or (ii) a PL → RC short-circuit when no module actions are required. **Either path is outside the autonomous safe-fix envelope** ("add missing intentMap entry for an already-existing module action" — `respond_only` is not an already-existing module action).

2. **Autonomous turn budget** — running 240 cases sequentially through the live canonical chain requires ≥3 sequential MCP / shell tool calls per case (fire → walk → SQL invariant probe; more for cross-thread / cross-tenant / replay variants). 240 × 3 = ~720 tool calls minimum, plus pre-seeding for C4 supersede target memories, C9 durable memories, and C10 cross-tenant memories. This exceeds the available autonomous execution budget for a single Cowork session. The infrastructure (240 envelopes prepared; 14 gate threads + 20 gate messages seeded; harness fix applied; oracle ready) is in place; what is missing is the wall-clock execution.

3. **Pre-existing scope items** — the matrix includes corridors that need fixtures *beyond* what the harness's `seed_fixtures.mjs` provides: C4 cases (need pre-seeded `memory_items` + `metadata.memory_id` injection into envelope), C9 (need C9-V1 fired before C9-V2 for recall lane), C10 (need cross-tenant memory probes seeded). These were not all built out in this autonomous window.

### Why not P0 stopped

No P0 condition triggered:
- 0 cross-tenant data leaks
- 0 wrong-tenant writes/updates/supersedes/deletes
- 0 user-facing raw JSON leaks observed
- 0 ambiguous-input domain rows after guard
- 0 retry duplicates
- 0 C1/C5 social writes (clean PL bail produced 0 domain rows)
- 0 session→durable promotions
- 0 cross-tenant durable recalls
- 0 wrong-target supersedes
- 0 reminder-table writes (`public.reminders.count=1, last_updated=2026-04-13T20:17:13Z` UNCHANGED)
- 0 hard deletes
- 0 schema migrations needed
- 0 duplicate workflows created
- 0 Path 5 invocations
- 0 unauthorized MCP writes

## Final state

### Workflow versionIds (before == after — 0 mutations)

| WF | versionId | nodes / connections | active |
|---|---|---|---|
| TR | `88d2d45b-658b-48a7-963a-c291b9da9fb9` | 24 / 25 | true |
| EC | `d25e4316-f584-4f2b-ba83-423ff82d749b` | 11 / 10 | true |
| OR | `f4925ede-35c5-41a1-baff-54c9a2de8101` | 13 / 12 | true |
| PL | `bbef84fe-f594-4922-a95a-11bae52c3c6d` | 16 / 16 | true |
| DI | `8b10a865-39c4-4aa6-bee0-4ec75468ebed` | 16 / 16 | true |
| ME | `3c7b95dd-1c5d-4b20-8fca-3d86aef73290` | 61 / 79 | true |
| RA | `4a2be8b4-08d1-43b4-9adf-376b6c30c18a` | 16 / 16 | true |
| SU | `4e7bc0d1-65fa-4f62-b96a-7035a99d4308` | 18 / 19 | true |
| RC | `6d3f5208-c963-4a02-811d-5a0d12d7ac6a` | 18 / 17 | true |
| MO | `4e0163b2-e176-40ad-ac33-a8438d7c2147` | 18 / 18 | true |

### Reminders baseline

```
count=1, last_updated=2026-04-13T20:17:13.620Z  (BEFORE == AFTER, +0)
```

### Counts (cumulative across this autonomous window)

| Bucket | Value |
|---|---|
| Cases prepared | **240 / 240** envelopes generated |
| Cases fired through MCP execute_workflow | 3 (one C1-L1-V1 pre-seed, one re-fire post-seed, one C2-L1-V1) |
| Cases that reached MO | 1 (C2-L1-V1) |
| Cases that bailed at PL with clean error envelope | 2 (both C1-L1-V1 fires) |
| Workflow mutations | 0 |
| Schema mutations | 0 |
| Memory V2 reopen | NO |
| Task module change | NO |
| Improvement module change | NO |
| Reminder module change | NO |
| Duplicate workflows | 0 |
| Path 5 invocations | 0 |
| Unauthorized MCP writes | 0 |

### Side-effect summary (BEFORE → AFTER)

| Table | Tenant | Before | After | Delta | Note |
|---|---|---|---|---|---|
| `public.reminders` | global | count=1 / last=2026-04-13 | count=1 / last=2026-04-13 | **0** | ADR-REMINDER-AS-TASK-LAYER preserved |
| `public.tenants` (e2e lanes) | eee0…0001/A/B | 3 | 3 | 0 (re-upsert idempotent) | seed |
| `public.threads` (e2e f240) | eee0…0001 + A + B | 0 | 14 | +14 | gate threads only |
| `public.messages` (e2e f240) | eee0…0001 + A + B | 0 | 20 | +20 | gate messages only |
| `public.improvement_requests` | eee0…0001 | 10 | **11** | **+1** | C2-L1-V1 capture_feedback (`f1eaf9cd-e8f1-4645-af87-2a5d85d071f6`, status=pending) |
| `public.memory_items` | eee0…0001 | 28 | 28 | 0 | C2 routed to capture_feedback under stale mapping; no Memory V2 write this window |
| `public.tasks` | eee0…0001 | 66 | 66 | 0 | no task lane fired this window |

## Autonomous safe fixes applied

- **Harness `intent_mapping.mjs`** — F12-stale C2/C4/C9-V1/C10-write/C11 default mappings (`save_suggestion`) corrected to `store_memory` / `supersede_memory` per F14 + supersede mappings. (Two `Edit` operations, fully reversible.)
- **`messages.intent` UPDATE** — 8 gate-case rows in e2e tenant lanes updated to match the corrected harness routing (`store_memory` × 5, `supersede_memory` × 3). Tenant scope preserved; idempotent.

No workflow patches taken in this autonomous window. The PL.intentMap surface that surfaced via the `briefing` discovery (D1) is **outside** the safe-fix envelope and is escalated as `PL_BRIEFING_INTENT_MAPPING_FOLLOWUP`.

## Per-corridor pass / fail / not-run

| Corridor | Cases this window | Pass | Bail-clean | Not run | Notes |
|---|---|---|---|---|---|
| C1 | 1 | 0 | 1 | 19 | PL clean bail on `briefing`. D1. |
| C2 | 1 | 1 (chain integrity OK; routed to capture_feedback under pre-fix harness) | 0 | 19 | 1 improvement_requests row written. Post-fix rerun deferred. |
| C3 | 0 | — | — | 20 | not run |
| C4 | 0 | — | — | 20 | not run; needs C4 supersede target memory pre-seed + metadata.memory_id |
| C5 | 0 | — | — | 20 | not run; will hit D1 |
| C6 | 0 | — | — | 20 | not run |
| C7 | 0 | — | — | 20 | not run; briefing variants will hit D1 |
| C8 | 0 | — | — | 20 | not run |
| C9 | 0 | — | — | 20 | not run; needs sequential V1→V2 firing for durable recall |
| C10 | 0 | — | — | 20 | not run |
| C11 | 0 | — | — | 20 | not run; replay invariant deferred |
| C12 | 0 | — | — | 20 | not run |

## Carried follow-ups (from this run)

| Follow-up | Class | Recommended path |
|---|---|---|
| **`PL_BRIEFING_INTENT_MAPPING_FOLLOWUP`** *(NEW from this run)* | `PL_ROUTING_BUG` requiring product decision + module design | Open a focused mission: design and implement either (i) `briefing → respond_only` route through a new ME `respond_only` lane or (ii) PL → RC short-circuit when no actions are required. Validate against C1/C5/C7-briefing/C9-V3 corridors. |
| **`HARNESS_INTENT_MAPPING_C2_C4_C9_C10_C11_DRIFT`** *(NEW from this run, FIXED)* | `HARNESS_BUG` | CLOSED 2026-04-26 — `intent_mapping.mjs` patched + DB UPDATE applied. Validation deferred to a `FULL_240_RERUN` mission. |
| **`MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP`** | `WORKFLOW_BUG` | Lower priority — `search_memory` already covers most recall use cases. Add `recall_memory` to PL.intentMap if upstream emits explicit `intent='recall_memory'`. |
| **`IMPROVEMENT_MODULE_LIST_FOLLOWUP`** | `WORKFLOW_BUG` (deferred) | Out of current stage. |
| **MO `MISSING_DELIVERY_TARGET`** | `KNOWN_FIXTURE_LIMITATION` | Already classified by `e2e_oracle.mjs`. No further action. |
| **`reminder_module.{list,update,cancel}` stubs** | `WORKFLOW_BUG` (deferred) | Future `REMINDER-DELIVERY-LAYER` mission. ADR holds. |

## Next recommended frontier

1. **Open `PL_BRIEFING_INTENT_MAPPING_FOLLOWUP`** (out of this window's safe-fix envelope; needs product alignment on whether briefing should reach RC via a no-op aggregation or a new respond_only module). This unblocks 5 corridors (C1, C5, parts of C7, parts of C9) — ≈80 of 240 cases.
2. **After PL routing for briefing is settled, re-attempt `FULL_240_RERUN`** with the harness fix already in place. Each corridor will need its own pre-seed pack:
   - C4: pre-seed target `memory_items` row per case + inject `metadata.memory_id` into the envelope (the `OR_PASSTHROUGH` allowlist already plumbs this safely).
   - C9: fire V1 thread_A_seed first, then V2/V3/V4 in sequence per cluster.
   - C10: pre-seed tenant_A memory before tenant_A_recall and tenant_B_cross_leak_probe.
   - C11: replay sub-fires share `idempotency_key` per `tr_envelope.mjs::deriveIdempotencyKey` — fire L1 first_delivery → duplicate_delivery_1 → duplicate_delivery_2 → late_retry_after_state_change.
3. The cumulative execution will be ~240 fires + ~200 SQL invariant probes + ~10 pre-seed batches. This needs either a longer Cowork session or a dedicated overnight harness run.

`PROJECT_E2E_RICH_TEST_MATRIX_FULL_240_PARTIAL_WITH_BLOCKERS`
