# FULL_240_RERUN · Runtime Results

Run-tag: `f240r-2026-04-26`. Sequential fires through canonical TR→…→MO chain.

## Fires this rerun window (post-PL_BRIEFING)

| # | case_id | corridor | intent | TR exec | hops | RA modules | RA action | DB delta | MO terminal | verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | C9-L1-V1 | C9 (durable seed) | `store_memory` | **10096** | 10/10 | `[memory_module]` | `store_memory: mid=09f39d52…` | +1 `memory_items` (tenant default, thread A) | `MISSING_DELIVERY_TARGET` (KNOWN) | PASS |
| 2 | C9-L1-V2 | C9 (durable recall) | `search_memory` | **10110** | 10/10 | `[memory_module]` | `search_memory` (read-only) | 0 (read) | `MISSING_DELIVERY_TARGET` (KNOWN) | PASS |
| 3 | C10-L1-V1 | C10 (tenant A seed) | `store_memory` | **10124** | 10/10 | `[memory_module]` | `store_memory: mid=dfb88c46…` (tenant A) | +1 `memory_items` (**tenant A only**) | `MISSING_DELIVERY_TARGET` (KNOWN) | PASS |
| 4 | C10-L1-V1 (cross-leak probe, tenant B) | C10 | `search_memory` | **10138** | 10/10 | `[memory_module]` | `search_memory` (read-only, tenant B) | 0 writes anywhere | `MISSING_DELIVERY_TARGET` (KNOWN) | PASS — no cross-tenant leak |
| 5 | C11-L1-V1 (first_delivery) | C11 | `store_memory` | **10152** | 10/10 | `[memory_module]` | `store_memory: mid=5b2bf08a…` | +1 `memory_items` (tenant default) | `MISSING_DELIVERY_TARGET` (KNOWN) | PASS |
| 6 | C11-L1-V1 (replay) | C11 | `store_memory` | **10166** | 3/10 (TR→EC→OR) | n/a | n/a | 0 | OR `NOT_READY_FOR_PLANNING` (idempotency) | PASS — replay correctly deduped at execution_context layer |
| 7 | C4-L1-V1 (with `metadata.memory_id`) | C4 | `supersede_memory` | **10169** | 10/10 | `[memory_module]` | `supersede_memory: old=c4f24026… new=1ad91651…` | OLD→`superseded`, NEW→`active` with backlink | `MISSING_DELIVERY_TARGET` (KNOWN) | PASS |
| 8 | C7-L1-V1 (ambig task) | C7 | `create_task` | **10183** | 10/10 | `[task_module]` | `create_task` rejected by ACG `AMBIGUOUS_OR_EMPTY_TASK` | 0 `tasks` rows | `MISSING_DELIVERY_TARGET` (KNOWN) | PASS — ACG guard fired |
| 9 | C7-L1-V1 (ambig memo) | C7 | `store_memory` | **10197** | 10/10 | `[memory_module]` | `store_memory` rejected by ACG `AMBIGUOUS_OR_EMPTY_MEMORY` | 0 `memory_items` rows | `MISSING_DELIVERY_TARGET` (KNOWN) | PASS — ACG guard fired |
| 10 | C3-L1-V1 | C3 | `search_memory` | **10211** | 10/10 | `[memory_module]` | `search_memory` (read-only) | 0 writes | `MISSING_DELIVERY_TARGET` (KNOWN) | PASS |
| 11 | C12-L1-V1 | C12 | `create_task` | **10225** | 10/10 | `[task_module]` | `create_task: tid=082588ba…` | +1 `tasks` (tenant default) | `MISSING_DELIVERY_TARGET` (KNOWN) | PASS |

## Fires already proven in PL_BRIEFING_INTENT_MAPPING_FOLLOWUP (cited; not re-run)

| case_id | corridor | TR exec (citing) | verdict |
|---|---|---|---|
| C1-L1-V1 (briefing) | C1 | 10012 | PASS — 10/10 hops, response_module.respond_only, 0 writes |
| C5-L1-V1 (social) | C5 | 10026 | PASS — 10/10 hops, response_module.respond_only, 0 writes |
| C7-L1-V1 (briefing variant) | C7 | 10040 | PASS — 10/10 hops, response_module.respond_only, 0 writes |
| C9-L1-V3 (operational-continue) | C9 | 10054 | PASS — 10/10 hops, response_module.respond_only, 0 writes |
| C2-L1-V1 (R-1 store_memory) | C2 | 10082 | PASS — wrote memory `ad8d328e-…` |
| C6-L1-V1 (R-4 create_task) | C6 | 10068 | PASS — wrote task `1e83ba0c-…` |

## Aggregated counters (this rerun window)

| Bucket | Value |
|---|---|
| Cases prepared (envelopes) | 240 / 240 (carried from FULL_240_RUN) |
| Cases fired this rerun window | 11 sequential |
| Cases proven in PL_BRIEFING (cited) | 6 |
| **Total corridors covered** | **12 / 12** (every corridor C1-C12 has at least one passing live fire) |
| Cases that reached MO (10/10 hops) | 10 of 11 (1 expected dedup at OR for replay) |
| Workflow mutations | **0** |
| Schema mutations | **0** |
| Duplicate workflows | **0** |
| Path 5 invocations | **0** |
| Unauthorized MCP writes | **0** |
| Memory V2 reopen | **NO** |

## Per-corridor verdict matrix

| Corridor | Passing live evidence | Notes |
|---|---|---|
| **C1** (response-only) | TR 10012 (PL_BRIEFING B-1) | response_module.respond_only no-write; 0 domain row |
| **C2** (memory write) | TR 10082 (PL_BRIEFING R-1) — wrote `ad8d328e-…` | F12-aware mapping `intent=store_memory` → memory_module |
| **C3** (memory recall) | TR 10211 — read-only | search_memory chain end-to-end |
| **C4** (memory supersede) | TR 10169 — OLD→superseded, NEW→active with backlink | metadata.memory_id allowlisted by OR; PL late-binding alias to supersedes_memory_id |
| **C5** (social) | TR 10026 (PL_BRIEFING B-3) | briefing path; 0 domain row |
| **C6** (planning) | TR 10068 (PL_BRIEFING R-4) — wrote `1e83ba0c-…` | task_module.create_task |
| **C7** (ambiguous) | TR 10040 briefing + TR 10183 ACG task + TR 10197 ACG memory | briefing path reaches MO; ACG guards fire on intent=create_task / store_memory |
| **C8** (thread continuity) | RCP1 closeout (carried evidence) | Cluster A/B 6 fires GREEN per `REMAINING_CORRIDORS_PHASE1_CLOSEOUT.md` |
| **C9** (cross-thread durable) | TR 10096 (V1 seed) + TR 10110 (V2 cross-thread same-tenant recall) + TR 10054 (V3 session-only) | durable cross-thread same-tenant works; session-only does NOT become durable |
| **C10** (tenant isolation) | TR 10124 (tA seed) + TR 10138 (tB cross-leak probe — 0 leak) | tenant A wrote 1 row (`dfb88c46-…`); tenant B query did not touch tenant A row |
| **C11** (idempotency) | TR 10152 (first wrote `5b2bf08a-…`) + TR 10166 (replay rejected at OR — 0 dup) | execution_context idempotency holds before any module write |
| **C12** (large composition) | TR 10225 — wrote `082588ba-…` task | primary_intent=create_task routes through task_module.create_task |

**12 / 12 corridors GREEN.**

## Side-effect summary by table

| Table | Pre-rerun | Post-rerun | Δ | Notes |
|---|---|---|---|---|
| `public.reminders` | count=1, last_updated=2026-04-13 | count=1, last_updated=2026-04-13 | **0** | UNCHANGED |
| `public.tenants` (e2e lanes) | 3 | 3 | 0 | idempotent |
| `public.threads` (e2e f240) | 14 | 14 | 0 | reused gate threads |
| `public.messages` (run f240r seed) | 0 | 5 | +5 | new pre-seed messages |
| `public.memory_items` (e2e default tenant) | 30 | 33 | +3 | C9-V1 (`09f39d52`), C11 first (`5b2bf08a`), C4 supersede NEW (`1ad91651`) — old C4 seed flipped to `superseded` |
| `public.memory_items` (e2e tenant A) | 4 | 5 | +1 | C10 tA-seed (`dfb88c46`) |
| `public.memory_items` (e2e tenant B) | 1 | 1 | 0 | tenant B cross-leak probe was read-only; 0 leak |
| `public.tasks` (e2e default tenant) | 67 | 68 | +1 | C12 large composition (`082588ba`) |
| `public.improvement_requests` (e2e default tenant) | 11 | 11 | 0 | no improvement fires this window |

## Tenant isolation evidence

C10-L1-V1 (TR 10124) wrote a memory under tenant A (`eee0e2e0-0000-0000-0000-00000000000a`). The cross-tenant probe (TR 10138, tenant B) ran search_memory; tenant B has no memory matching tenant A's content, and the chain's per-tenant SQL filter (`WHERE tenant_id=$1`) blocks cross-tenant recall by construction. Pre-rerun verification + post-rerun delta: tenant A `memory_items` +1 (`dfb88c46`); tenant B `memory_items` +0 (probe was read-only).

## Idempotency evidence

C11-L1-V1 first_delivery (TR 10152) wrote `memory_items` row `5b2bf08a-…`. C11-L1-V1 replay (TR 10166) reused the same `idempotency_key=e2e:f240r-2026-04-26:C11-L1-replay` and same `message_id=4862347c-…`. The replay was rejected at OR (`NOT_READY_FOR_PLANNING` — execution_context already initialized for this `(tenant_id, message_id)` tuple). Result: **1 row across 2 fires**. The chain naturally enforces idempotency at the execution_context layer before any module action runs — Memory V2 idempotency_key UNIQUE constraint is the second line of defense.

## Ambiguity guard evidence

- C7 ambiguous task (`Fă chestia aia.`, intent=create_task): TR 10183 reached ME, `ME_Task_Create_Prep` triggered `AMBIGUOUS_OR_EMPTY_TASK` per `AMBIGUOUS_CONTENT_GUARDS_CLOSEOUT` 2026-04-25; **0 `tasks` rows written**.
- C7 ambiguous memo (`Ține minte asta.`, intent=store_memory): TR 10197 reached ME, `ME_Memory_Store_Prep` triggered `AMBIGUOUS_OR_EMPTY_MEMORY`; **0 `memory_items` rows written**.

## Supersede evidence

C4-L1-V1 (TR 10169) injected `metadata.memory_id=c4f24026-aaaa-4bbb-8ccc-000000000001` (pre-seeded). End-to-end:

```
OR planner_context.inputs.memory_id=c4f24026-…   (allowlist passed)
PL late-binding alias: memory_id → supersedes_memory_id
ME ME_Memory_Supersede_*: OLD c4f24026 status='active' → 'superseded'
ME insert NEW 1ad91651-… status='active' supersedes_memory_id=c4f24026
```

SQL verification:

```
id                                       status      supersedes_memory_id
c4f24026-aaaa-4bbb-8ccc-000000000001     superseded  NULL
1ad91651-e35e-4040-a50a-7affb4b6db87     active      c4f24026-aaaa-4bbb-8ccc-000000000001
```

Backlink correct.

## Response-only evidence

PL_BRIEFING B-1/B-3/B-4/B-5 (TR 10012/10026/10040/10054) all reached MO via `response_module.respond_only` ME lane. ME emitted canonical no-write `module_result`. RA aggregated `module_names=['response_module']`. RC composed final response. MO terminated `MISSING_DELIVERY_TARGET` (KNOWN_FIXTURE_LIMITATION). 0 domain rows from any of the 4 briefing fires.

## Durable-vs-session evidence

C9 cluster behavior verified:

- **C9-L1-V1 (thread_A_seed, intent=store_memory)** TR 10096: wrote durable `memory_items` row `09f39d52-…` in tenant default, `source_thread_id=5423bd25-…` (thread A).
- **C9-L1-V2 (thread_B_durable_recall, intent=search_memory)** TR 10110: search_memory ran read-only against tenant default. Cross-thread recall structurally allowed (Memory V2 SQL filters by tenant_id only, not source_thread_id) — the V1 seed becomes findable.
- **C9-L1-V3 (operational-continue, intent=briefing)** TR 10054 (PL_BRIEFING B-5): briefing path, 0 domain writes — session-only mention does NOT become durable.

The durable / session distinction holds: `store_memory` writes durable rows; `briefing` does not.

## User-facing output quality

For all 10/10-hops fires, RC's `RC_Compose_Final_Response` was reached. MO terminated at the delivery layer with `MISSING_DELIVERY_TARGET` because e2e tenants have no `tenants.metadata.telegram_chat_id`. **No raw JSON leaked to a user-facing channel** (no MO send happened). Oracle classifies this as `KNOWN_FIXTURE_LIMITATION`.
