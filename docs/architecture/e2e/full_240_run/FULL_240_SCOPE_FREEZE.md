# FULL_240_RUN · Scope Freeze

Mission: `PROJECT-E2E-RICH-TEST-MATRIX-FULL-240-RUN-AND-AUTONOMOUS-SAFE-FIX`
Frozen: 2026-04-26 (autonomous run)
Run-tag: `f240-2026-04-26`

## Goal

Execute the full 240-case E2E rich matrix (12 corridors × 5 levels × 4 variants = 240) end-to-end through the canonical TR→EC→OR→PL→DI→ME→RA→SU→RC→MO chain in live execution mode, classify failures, apply safe fixes inside the autonomous envelope, and produce a final verdict.

## Live workflow versionIds (verified 2026-04-26 02:34 UTC)

| Acronym | id | versionId | nodes / connections | active |
|---|---|---|---|---|
| TR | wI8hpSROxQI0zC9f | 88d2d45b-658b-48a7-963a-c291b9da9fb9 | 24 / 25 | true |
| EC | v9jih4jqeXpOJOiH | d25e4316-f584-4f2b-ba83-423ff82d749b | 11 / 10 | true |
| OR | KhGmNpi0ZDmrnz8W | f4925ede-35c5-41a1-baff-54c9a2de8101 | 13 / 12 | true |
| PL | RwToPLa1ErHl2tUi | bbef84fe-f594-4922-a95a-11bae52c3c6d | 16 / 16 | true |
| DI | abqYINcXr3JAhGGk | 8b10a865-39c4-4aa6-bee0-4ec75468ebed | 16 / 16 | true |
| ME | uq26nh1grIpnHju0 | 3c7b95dd-1c5d-4b20-8fca-3d86aef73290 | 61 / 79 | true |
| RA | 5RcNLtxNjAHJsZPE | 4a2be8b4-08d1-43b4-9adf-376b6c30c18a | 16 / 16 | true |
| SU | ENiYNfL3ul8AmmCB | 4e7bc0d1-65fa-4f62-b96a-7035a99d4308 | 18 / 19 | true |
| RC | TClXgmO8H8zsSwMb | 6d3f5208-c963-4a02-811d-5a0d12d7ac6a | 18 / 17 | true |
| MO | OooZdC0DgsDR6gm0 | 4e0163b2-e176-40ad-ac33-a8438d7c2147 | 18 / 18 | true |

Cumulative reconciliation: TR/EC/OR carry the OR_PASSTHROUGH (2026-04-26) rewrites that plumb chat envelope `metadata` through to `planner_context.inputs`. PL carries supersede intentMap (`bbef84fe…`). ME carries the supersede defensive guard on `ME_Memory_Supersede_Embed` (`3c7b95dd…`).

## Baseline pre-run

```sql
SELECT count(*), max(updated_at) FROM public.reminders;
-- count=1, last_updated=2026-04-13T20:17:13Z (PRE-MISSION BASELINE)
```

| Table | Pre-run count | Tenant scope |
|---|---|---|
| public.reminders | 1 | global |
| public.memory_items (e2e default tenant) | 28 | eee0…0001 |
| public.tasks (e2e default tenant) | 66 | eee0…0001 |
| public.improvement_requests (e2e default tenant) | 10 | eee0…0001 |
| public.tenants (e2e lanes 1/A/B) | 3 | eee0…0001/A/B |

## Run plan

1. **Phase 0** — preflight hygiene: doc drift / harness sequencing / SQL invariant scoping confirmation.
2. **Phase 1** — critical preflight gate (20 cases). Halt if a gate case fails and apply safe fix; rerun gate; only proceed to FULL_240 after gate is green.
3. **Phase 2** — full 240-case run (sequential, run-tag `f240-2026-04-26`).
4. **Phase 3** — failure classification + autonomous safe fixes (within envelope) + reruns.
5. **Phase 4** — closeout, regression pack, verdict.

## Run-tag → idempotency

`run_tag = f240-2026-04-26`. Per-case idempotency_key prefix: `e2e:f240-2026-04-26:<case_id>`. C11 replay variants share their per-level replay key per `tr_envelope.mjs::deriveIdempotencyKey`.

## Constraints (non-goals)

- No workflow mutation outside the safe-fix envelope (PL routing/extraction, OR allowlist, ME defensive guards, harness/oracle/fixture).
- No DB schema migration.
- No duplicate workflow.
- No unauthorized MCP write.
- No fake Telegram delivery target seeding.
- No reminder_module CRUD beyond the ADR rewrite.
- No hard delete semantics.
- No Memory V2 reopen beyond already-authorized defensive fixes.
- No Path 5.

## P0 stop conditions

Cross-tenant leak; wrong-tenant write; ambiguous-input row after guard; retry duplicate; C1/C5 social/response-only domain write; session→durable promotion without explicit store; cross-tenant durable recall; wrong-target supersede; reminder-table write; hard delete instead of soft cancel; raw JSON in user-facing output; schema change required; duplicate workflow; Path 5; unauthorized MCP write.

## Safe-fix envelope

Allowed (autonomous): harness/fixture/oracle bug fixes; PL intentMap/actionToModule entries for already-existing ME action; PL/ME extraction guards; OR allowlist tweaks (UUID-safe); ME prep/result defensive guard; parameterized DB query repair preserving tenant scope.

Disallowed (stop & report): schema migration; product semantics decision; broad OR/PL/ME rewrite; privacy/tenant model change; reminder delivery layer; full reminder_module CRUD; hard-delete semantics; Memory V2 embedding/index strategy change; Path 5; duplicate workflow; unauthorized MCP write.

## Carried follow-ups (not blockers)

- `MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP` (low priority — `search_memory` covers most recall use cases)
- `IMPROVEMENT_MODULE_LIST_FOLLOWUP` (deferred read lane)
- MO `MISSING_DELIVERY_TARGET` (known fixture limitation; do not seed fake Telegram targets)
- `reminder_module.{list,update,cancel}` stubs (out of current stage; reminder-like routes to `task_module.create_task` per ADR)
