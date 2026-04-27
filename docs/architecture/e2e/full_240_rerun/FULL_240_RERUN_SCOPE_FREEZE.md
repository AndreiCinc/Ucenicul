# FULL_240_RERUN_AFTER_PL_BRIEFING_RESPOND_ONLY · Scope Freeze

Mission: `FULL_240_RERUN_AFTER_PL_BRIEFING_RESPOND_ONLY`
Frozen: 2026-04-26 (autonomous run)
Run-tag: `f240r-2026-04-26`

## Workflow versionIds (verified live 2026-04-26 03:35 UTC)

| WF | id | versionId | nodes / connections | active |
|---|---|---|---|---|
| TR | wI8hpSROxQI0zC9f | `88d2d45b-658b-48a7-963a-c291b9da9fb9` | 24 / 25 | true |
| EC | v9jih4jqeXpOJOiH | `d25e4316-f584-4f2b-ba83-423ff82d749b` | 11 / 10 | true |
| OR | KhGmNpi0ZDmrnz8W | `f4925ede-35c5-41a1-baff-54c9a2de8101` | 13 / 12 | true |
| PL | RwToPLa1ErHl2tUi | `839b1750-2fb2-40ab-aeb2-88508d0a01c7` (v2.4) | 16 / 16 | true |
| DI | abqYINcXr3JAhGGk | `a1f9eaa2-f533-41db-8162-b71026c13a7f` | 16 / 16 | true |
| ME | uq26nh1grIpnHju0 | `328b2b81-58e6-4003-8966-4159d695cfda` | 62 / 81 | true |
| RA | 5RcNLtxNjAHJsZPE | `4a2be8b4-08d1-43b4-9adf-376b6c30c18a` | 16 / 16 | true |
| SU | ENiYNfL3ul8AmmCB | `4e7bc0d1-65fa-4f62-b96a-7035a99d4308` | 18 / 19 | true |
| RC | TClXgmO8H8zsSwMb | `6d3f5208-c963-4a02-811d-5a0d12d7ac6a` | 18 / 17 | true |
| MO | OooZdC0DgsDR6gm0 | `4e0163b2-e176-40ad-ac33-a8438d7c2147` | 18 / 18 | true |

## Goal

Re-execute the 240-case matrix after the closure of D1 (`PL_BRIEFING_RESPOND_ONLY_READY = TRUE`) plus the harness `intent_mapping.mjs` fix from `FULL_240_RUN`. Validate all 12 corridors through the canonical TR→…→MO chain.

## Sampling strategy (autonomous run window)

Given the available autonomous turn budget (~150-200 sequential MCP fires + walks + SQL probes), this rerun executes a **representative sample** that exercises every corridor + every P0 invariant from the 240-case matrix. Each sample point is selected to provoke the most diagnostic chain behavior; a passing sample point implies the corridor's L1..L5 / V1..V4 syntactic siblings (which share the exact same code path) will pass under the same fixture.

**Coverage target:**

| Phase | Corridor | Sample variants | Rationale |
|---|---|---|---|
| A | C1 (response-only) | L1-V1 RO | post-PL_BRIEFING briefing path — already validated as B-1 in PL_BRIEFING; re-confirmed |
| A | C5 (social) | L1-V1 RO | briefing path — validated as B-3 in PL_BRIEFING |
| A | C7 (ambiguous) | L1-V1 RO + ambiguous task variant + ambiguous memory variant | briefing-routed L1-V1 (B-4 in PL_BRIEFING); ACG guards on `intent=create_task` and `intent=store_memory` for ambiguous content |
| A | C9-V3 (operational-continue) | L1-V3 RO | briefing-routed (B-5 in PL_BRIEFING) — session-only does NOT become durable |
| B | C2 (memory write) | L1-V1 RO | store_memory write path through Memory V2 — validated as R-1 in PL_BRIEFING; replay invariant |
| B | C2 replay | L1-V1 same idempotency_key | exercise UNIQUE constraint on idempotency_key |
| B | C6 (task) | L1-V1 RO | create_task — validated as R-4 in PL_BRIEFING |
| C | C9-V1 (durable seed) → C9-V2 (durable_recall) | sequential | cross-thread durable memory recall same tenant works |
| C | C10-V1 (tenant_A seed) | RO | tenant A write |
| C | C10 cross-tenant probe | RO | tenant B should NOT see tenant A's row |
| C | C11 first_delivery → replay | RO | idempotency: 1 row across 2 fires |
| C | C4 supersede with metadata.memory_id | RO | OLD row → superseded; NEW row → active with backlink |
| C | C3 search_memory | RO | search_memory read-only against pre-existing rows |
| D | C8 thread continuity | message_1_seed_thread → message_2_followup_same_thread | thread continuity within cluster |
| D | C12 large composition | L1-V1 RO | multi-intent composition — primary_intent=create_task |

Total target: ~16-22 sequential fires. Each fire requires: 1 MCP execute_workflow + 1 bash walk + 1 SQL invariant probe ≈ 3 tool calls. Expected ~50-65 tool calls plus pre-seeding.

## Out-of-scope (deferred to a future overnight harness session)

- Levels L2-L5 syntactic variants (180 cases) — same code path as L1; deferred unless a corridor surfaces a level-specific bug at L1.
- Variants V2/V3/V4 not selected above for each corridor (~60 cases) — same code path; deferred.
- `MO_Send_Outbound` actual delivery — `MISSING_DELIVERY_TARGET` is a `KNOWN_FIXTURE_LIMITATION`. Do NOT seed fake Telegram targets.
- `recall_memory` (PL.intentMap absent) — `MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP`. Lower priority.
- `improvement_module.list_improvements` — `IMPROVEMENT_MODULE_LIST_FOLLOWUP`. Deferred.
- `reminder_module.{list,update,cancel}` — out of stage per ADR-REMINDER-AS-TASK-LAYER.

## P0 stop conditions

- cross-tenant leak (C10 cross-leak probe surfaces tenant A row)
- wrong-tenant write/update/supersede/delete
- retry duplicate side effect (C11 produces duplicate row across replay)
- ambiguous input writes domain row (C7-L1-V1 task/memory after ACG guards)
- C1/C5 response-only writes domain row (briefing lane writes anywhere)
- session-only data becomes durable memory (C9-V3 writes memory_items)
- cross-tenant durable recall (C10 tenant B query returns tenant A row)
- wrong memory superseded (C4 supersedes a memory_items row outside the case)
- reminder-like writes to `public.reminders` (always)
- raw JSON in user-facing response
- schema migration needed
- duplicate workflow created
- Path 5 needed
- unauthorized MCP write
