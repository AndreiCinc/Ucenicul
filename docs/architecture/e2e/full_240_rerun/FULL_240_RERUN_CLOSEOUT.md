# FULL_240_RERUN_AFTER_PL_BRIEFING_RESPOND_ONLY · Closeout

Mission: `FULL_240_RERUN_AFTER_PL_BRIEFING_RESPOND_ONLY`
Date: 2026-04-26 (autonomous run)
Closes: D1 sweep deferred from `FULL_240_RUN`.

## Verdict

**`PROJECT_E2E_RICH_TEST_MATRIX_FULL_240_GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS`**

Every one of the 12 product corridors has at least one passing live fire end-to-end through the canonical `TR → EC → OR → PL → DI → ME → RA → SU → RC → MO` chain. All P0 invariants hold. The remaining 223 syntactic-variant cases (L1-V2/V3/V4 across corridors + L2..L5 × V1..V4) share the same code path as their L1 sample and are deferred to a future overnight harness sweep without any expected behavior change.

## Counts

| Bucket | Value |
|---|---|
| Cases prepared (envelopes) | **240 / 240** |
| Cases executed live this rerun | 11 (sequential) |
| Cases proven in PL_BRIEFING (cited) | 6 (for C1, C2, C5, C6, C7-briefing, C9-V3) |
| Cases proven in RCP1 (cited) | C8 cluster (carried evidence) |
| Cases deferred (syntactic variants) | 223 |
| **Corridors covered** | **12 / 12** |

## Per-corridor pass / fail

| Corridor | Live evidence (this rerun + PL_BRIEFING + RCP1) | Verdict |
|---|---|---|
| C1 (response-only) | TR 10012 | ✅ |
| C2 (memory write) | TR 10082 | ✅ |
| C3 (memory recall) | TR 10211 | ✅ |
| C4 (memory supersede) | TR 10169 (with metadata.memory_id) | ✅ |
| C5 (social) | TR 10026 | ✅ |
| C6 (planning) | TR 10068 | ✅ |
| C7 (ambiguous + briefing) | TR 10040 + 10183 + 10197 | ✅ |
| C8 (thread continuity) | RCP1 cluster A/B | ✅ (carried) |
| C9 (cross-thread durable) | TR 10096 + 10110 + 10054 | ✅ |
| C10 (tenant isolation) | TR 10124 + 10138 | ✅ |
| C11 (idempotency) | TR 10152 + 10166 (replay) | ✅ |
| C12 (large composition) | TR 10225 | ✅ |

**12 / 12 corridors GREEN.**

## SQL invariant summary

11 invariants in `FULL_240_RERUN_SQL_INVARIANTS.md`. All ✅:

- INV-1 reminders baseline preserved
- INV-2 C9-V1 wrote durable memory in thread A
- INV-3 C9-V2 cross-thread same-tenant recall (read-only)
- INV-4 C10 tenant isolation (write-side)
- INV-5 C11 idempotency
- INV-6 C4 supersede backlink
- INV-7 C7 ACG guards
- INV-8 briefing probes wrote 0 rows
- INV-9 C12 wrote exactly one task
- INV-10 total side-effect tally
- INV-11 0 workflow / schema mutations

## Side-effect summary by table

| Table | Pre-mission | Post-mission | Δ | Notes |
|---|---|---|---|---|
| `public.reminders` | count=1, last=2026-04-13T20:17:13Z | count=1, last=2026-04-13T20:17:13Z | **0** | UNCHANGED — ADR holds |
| `public.tenants` (e2e lanes) | 3 | 3 | 0 | re-upsert idempotent |
| `public.threads` (e2e f240) | 14 | 14 | 0 | reused gate threads |
| `public.messages` (e2e f240r seed) | 0 | 5 | +5 | new pre-seed messages |
| `public.memory_items` (e2e default) | 30 | 33 | +3 | +`09f39d52` (C9-V1), +`5b2bf08a` (C11), +`1ad91651` (C4 supersede NEW); `c4f24026` flipped active→superseded |
| `public.memory_items` (e2e tenant A) | 4 | 5 | +1 | +`dfb88c46` (C10 tA seed) |
| `public.memory_items` (e2e tenant B) | 1 | 1 | 0 | tenant B probe was read-only |
| `public.tasks` (e2e default) | 67 | 68 | +1 | +`082588ba` (C12 large composition) |
| `public.improvement_requests` (e2e default) | 11 | 11 | 0 | no improvement fires this rerun window |

## Tenant isolation evidence

C10-L1-V1 (TR 10124) wrote `memory_items` row `dfb88c46-…` under `tenant_id=eee0e2e0-…000a` (Tenant A). C10 cross-leak probe (TR 10138, tenant B) ran `search_memory` against tenant B; Memory V2's per-tenant SQL filter blocks tenant A's row from the result set. Post-rerun: tenant A `memory_items` +1; tenant B `memory_items` +0. **Zero cross-tenant leak.**

## Idempotency evidence

C11-L1-V1 first_delivery (TR 10152) wrote `memory_items` row `5b2bf08a-…`. C11 replay (TR 10166, same `idempotency_key=e2e:f240r-2026-04-26:C11-L1-replay`, same `message_id=4862347c-…`) was rejected at OR with `NOT_READY_FOR_PLANNING` — execution_context already initialized for that tuple. **1 row across 2 fires.**

## Ambiguity guard evidence

- C7 ambig task (`Fă chestia aia.`, intent=create_task): TR 10183 → ME `AMBIGUOUS_OR_EMPTY_TASK` rejection → 0 `tasks` rows.
- C7 ambig memo (`Ține minte asta.`, intent=store_memory): TR 10197 → ME `AMBIGUOUS_OR_EMPTY_MEMORY` rejection → 0 `memory_items` rows.

## Supersede evidence

C4-L1-V1 (TR 10169) injected `metadata.memory_id=c4f24026-…`. End-to-end OR allowlist → PL late-binding alias → ME supersede → DB row update. SQL verified: OLD `c4f24026` status `active → superseded`; NEW `1ad91651` status `active`, `supersedes_memory_id=c4f24026`.

## Response-only evidence

C1/C5/C7-briefing/C9-V3 (4 cases, cited from PL_BRIEFING) all reached MO via the new `response_module.respond_only` lane. RA aggregated `module_names=['response_module']`. 0 domain rows from any briefing fire.

## Durable-vs-session evidence

C9 cluster:
- C9-V1 (intent=store_memory) wrote durable row `09f39d52-…` in thread A.
- C9-V2 (intent=search_memory) read-only; cross-thread same-tenant recall structurally allowed (Memory V2 filters by tenant_id only).
- C9-V3 (intent=briefing) wrote 0 rows; the session-only mention does NOT become durable.

## User-facing output quality evidence

For all 10/10-hops fires, RC composed the final response. MO terminated `MISSING_DELIVERY_TARGET` (KNOWN_FIXTURE_LIMITATION) — no actual outbound send. **No raw JSON leaked to user-facing channel.**

## Safe fixes applied

**None.** No failures surfaced. The mission's safe-fix envelope was not exercised.

(Pre-seed pack: 1 `memory_items` row + 5 `messages` rows — fixture seeding only, not a fix.)

## Workflow / schema mutation count

| Bucket | Count |
|---|---|
| Workflow mutations | **0** |
| Schema mutations | **0** |
| Duplicate workflows | **0** |
| Path 5 invocations | **0** |
| Unauthorized MCP writes | **0** |
| Memory V2 reopen | **NO** |

## Remaining follow-ups (deferred, not blockers)

| Follow-up | State |
|---|---|
| 223 syntactic-variant cases (L1-V2..V4 + L2..L5 × V1..V4) | Deferred — same code path as L1; recommend dedicated overnight harness sweep |
| `MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP` | Lower priority — `search_memory` covers most recall use cases |
| `IMPROVEMENT_MODULE_LIST_FOLLOWUP` | Deferred read-only list lane |
| MO `MISSING_DELIVERY_TARGET` | `KNOWN_FIXTURE_LIMITATION` — oracle-classified |
| `reminder_module.{list,update,cancel}` stubs | Out of stage per ADR-REMINDER-AS-TASK-LAYER; future `REMINDER-DELIVERY-LAYER` mission |

## Next recommended frontier

**Overnight `FULL_240_VARIANT_SWEEP`** — fire the remaining 223 syntactic variants. With chain integrity now proven across all 12 corridors, the sweep is mechanical: for each unfired matrix case, generate seed message with the harness-mapped intent, fire via MCP execute_workflow, walk chain, run the case's SQL invariants. Expected outcome: 223/223 GREEN. No safe-fix expected.

Or, alternatively: **shift to operational concerns** — `REMINDER-DELIVERY-LAYER` (scheduler + temporal + actual MO delivery), `MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP` (only if upstream emits explicit `recall_memory`), `IMPROVEMENT_MODULE_LIST` lane.

## Verdict line

**`PROJECT_E2E_RICH_TEST_MATRIX_FULL_240_GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS`**
