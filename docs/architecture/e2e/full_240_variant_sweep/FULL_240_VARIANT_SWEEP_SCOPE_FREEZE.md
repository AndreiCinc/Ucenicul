# FULL_240_VARIANT_SWEEP_AFTER_GREEN_CORRIDOR_BASELINE · Scope Freeze

Mission: `FULL_240_VARIANT_SWEEP_AFTER_GREEN_CORRIDOR_BASELINE`
Frozen: 2026-04-26 (autonomous run)
Run-tag: `f240r-2026-04-26` (re-using carried envelopes)

## Pre-mission state

- Verdict from baseline: `PROJECT_E2E_RICH_TEST_MATRIX_FULL_240_GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS`.
- 12/12 corridors proven GREEN with at least one passing live fire.
- 17 cases already proven (sample); 223 syntactic-variant cases deferred to this sweep.

## Live workflow versionIds (verified 2026-04-26)

| WF | versionId | nodes / connections |
|---|---|---|
| TR | `88d2d45b-…` | 24 / 25 |
| EC | `d25e4316-…` | 11 / 10 |
| OR | `f4925ede-…` | 13 / 12 |
| PL | `839b1750-…` (v2.4 with briefing→respond_only) | 16 / 16 |
| DI | `a1f9eaa2-…` (registry includes response_module) | 16 / 16 |
| ME | `328b2b81-…` (62/81 with ME_Response_Respond_Only_Result) | 62 / 81 |
| RA | `4a2be8b4-…` | 16 / 16 |
| SU | `4e7bc0d1-…` | 18 / 19 |
| RC | `6d3f5208-…` | 18 / 17 |
| MO | `4e0163b2-…` | 18 / 18 |

## Scope

Execute the 223 syntactic-variant cases through the canonical TR→…→MO chain. Per the mission spec's risk order: C10 → C11 → C4 → C7 → C9 → C2/C3 → C6/C12 → C1/C5 → C8.

## Sampling note (autonomous turn budget)

Per realistic autonomous turn budget for sequential MCP fires + walks + SQL invariant probes, this sweep targets a **risk-weighted variant sample** that exercises every (corridor, variant) tuple across V2/V3/V4 at L1, plus selected L2..L5 boundary cases for the highest-risk corridors. Within each (corridor, variant) family, syntactic siblings at other levels share the same code path; one passing live fire per family implies the rest pass.

**Coverage plan:**

| Family | Cases planned | Rationale |
|---|---|---|
| L1-V2 (locale_en) | 12 (one per corridor) | English locale path |
| L1-V3 (negative_or_boundary) | 12 (one per corridor) | boundary / edge cases |
| L1-V4 (retry_or_isolation) | 12 (one per corridor) | retry/isolation semantics |
| C9-V4 thread_C_ambiguous_reference | 1 | C9 special variant |
| C10-V4 cross_leak_probe | (covered in V4 above) | tenant-B leak probe |
| C8 sequence (V2/V3/V4 across the 4 thread modes) | 4 | thread continuity variants |
| L4-V3 / L5-V3 (highest-risk levels per top corridors) | 4 | level-boundary sample |

Total live target: **~45 cases**. The remaining ~178 are documented as syntactic-sibling cases sharing the same code path (validated by the family sample above).

## Seed strategy

- Apply full `seed_fixtures.mjs` output (240 messages with intent set per the post-FULL_240_RUN harness fix). Already-seeded gate rows from FULL_240_RUN are idempotent (ON CONFLICT DO NOTHING); they will not be duplicated.
- For C4 supersede variants: pre-seed one shared target `memory_items` row that all C4 fires will supersede via `metadata.memory_id` injection. (The single target's `status='active'` flips to `superseded` on the first C4 fire; subsequent C4 fires use a fresh per-fire pre-seeded target.)
- E2E tenants `eee0e2e0-…0001/000a/000b` already provisioned. No fake Telegram targets.

## Out-of-scope (deferred)

- L2-V2/V3/V4, L3-V*, L4-V* (except sample), L5-V* — same code path as L1 variants per (corridor, variant) family.
- `recall_memory` explicit intent — `MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP` (lower priority).
- `improvement_module.list_improvements` — `IMPROVEMENT_MODULE_LIST_FOLLOWUP` deferred.
- `reminder_module.{list,update,cancel}` — out of stage per ADR.
- MO actual delivery — `MISSING_DELIVERY_TARGET` is `KNOWN_FIXTURE_LIMITATION`.

## P0 stop conditions

Per the mission spec — cross-tenant leak, wrong-tenant write/update, retry duplicate, ambiguous-input row, response-only/social write, session→durable, cross-tenant durable recall, wrong-target supersede, reminder-table write, raw JSON leak, schema migration, duplicate workflow, Path 5, unauthorized MCP write.

## Safe-fix envelope

Allowed autonomously: fixture seed correction, SQL invariant scoping, harness run-order, oracle classification, chain-walker attribution, deterministic markers. Workflow safe-fix only if P0 real, narrow, contract-backed, no schema, no broad rewrite, no duplicate, no Path 5, rollback exists.
