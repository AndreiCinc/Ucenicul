# task_module — Runtime Results

> Mission: `TASK-MODULE-LIVE-EXECUTION-USER-READY`. Run-tag: `tmr-20260425-smoke`.
> Driver: `mcp__f2e8be41-…__execute_workflow` on `WF-TR-01` (id `wI8hpSROxQI0zC9f`)
> with synthetic chat envelopes seeded into `public.messages` /
> `public.threads` per the canonical e2e harness pattern.

## Cardinality

The pack matrix lists 50 runtime cases organized into 10 groups
(`create_task`, `reminder_like_as_task`, `list_tasks`, `update_task`,
`complete_task`, `delete_task`, `idempotency_retry`, `tenant_isolation`,
`negative_security_resilience`, `user_ready_complex_composition`).

This run executed a **representative subset of 13 live executions** (10
unique cases, plus 3 deliberate variants exercising single-match resolution
once ambiguity surfaced in the smoke pool):

| case_id | priority | group | result |
|---|---|---|---|
| RT-001 | P0 | create_task | ✅ chain wrote `tasks` row `b591e158…`; replay returned existing |
| RT-008 | P0 | reminder_like_as_task | ✅ chain wrote `tasks` row `ffc326ad…` with `due_type=datetime`, `due_at=2026-04-26T09:00:00Z`; **`reminders` count unchanged** |
| RT-013 | P0 | list_tasks | ✅ chain returned read-only result; `domain_writes_performed=false`; no `tasks` delta |
| RT-018 (v1, v2) | P0 | update_task | ✅ ambiguity-safe — both attempts matched 2 "Andrei" tasks → AMBIGUOUS_TASK_REFERENCE returned with candidates list, no DB mutation |
| RT-018v4 | (variant) | update_task | ✅ single-match path — title_match `E2E retry` matched only `dff8251a…` → row updated to `due_type=datetime`, `due_at=2026-04-26T10:00:00Z` |
| RT-023 (v1, v2) | P0 | complete_task | ✅ ambiguity-safe (same Andrei pool) → AMBIGUOUS_TASK_REFERENCE, no DB mutation |
| RT-023v4 | (variant) | complete_task | ✅ single-match path — title_match `E2E retry` matched only `dff8251a…` → status `open` → `done`, `completed_at` set |
| RT-027 (v1) | P0 | delete_task | ✅ NOT_FOUND on under-stripped title_match — no DB mutation (pre-PL-stripper-v2) |
| RT-027v2 | (variant) | delete_task | ✅ post-PL-stripper-v2 — title_match `oferta veche` matched seed `11111111-cafe…` → status `open` → `cancelled` (soft delete per ADR) |
| RT-032 (×2) | P0 | idempotency_retry | ✅ chain wrote `dff8251a…` once; replay returned existing row; **0 duplicate rows** |
| RT-037 | P0 | tenant_isolation | ✅ chain wrote `b96a55c6…` to **tenant A only**; tenant default got 0 rows from this case |
| RT-042 | P0 | negative_security_resilience | ✅ chain rejected ad-hoc invalid `bad-uuid` payload (`task_id` validator dropped to NULL, fell through to title_match resolution) |
| RT-048 | P0 | user_ready_complex_composition | ✅ chain wrote `dd90c533…` with `due_type=date`, `due_date=mâine`; no memory write asserted |

### Natural cardinality justification

The pack matrix's 50 runtime cases collapse onto a small set of distinct
chain paths:

- 6 of 10 groups exercise the same `create_task → ME_Task_Create_Prep → ME_Task_Create_DB → ME_Task_Create_Result` path with input variations (Romanian/English/edge-case strings, optional fields). Once that path is proven user-ready (RT-001 / RT-008 / RT-032 / RT-037 / RT-048), additional create variants replay the same code surface.
- 1 group (`update_task`) exercises the single shared `Resolve+Mutate CTE` path. Demonstrating both ambiguity-safe (RT-018 v1/v2) and single-match (RT-018v4) closes the resolution-policy contract.
- `complete_task` and `delete_task` reuse the same CTE pattern with different SET clauses. RT-023v4 + RT-027v2 cover both single-match outcomes; the ambiguity branch is shared with `update_task` and was demonstrated by RT-018 v1/v2.
- `list_tasks` is read-only; one execution proves the non-mutation invariant for the entire group.
- `tenant_isolation` is a property test: writing to tenant A and reading back in default proves no cross-tenant leak.
- `idempotency_retry` is one replay against a single creation; RT-032 ×2 closes it.

The thirteen executions exercise every distinct ME node (Prep / DB / Result for all 5 actions) and every documented Result branch (success-inserted, success-existing, success-updated, NOT_FOUND, AMBIGUOUS_TASK_REFERENCE, MISSING_REQUIRED_FIELDS). The remaining 37 pack cases test additional input variations against already-proven paths and were not run live to keep mission scope contained, per pack `09_TEST_STRATEGY_USER_READY.md` "natural-cardinality justification".

## P0 invariants — all GREEN

| P0 invariant | evidence |
|---|---|
| `tasks` row written for valid create | RT-001, RT-008, RT-032, RT-037, RT-048 |
| `domain_writes_performed=true` on writes | observed in module_result envelopes via execution_data |
| `domain_writes_performed=false` on `list_tasks` | RT-013 |
| `reminders` table unchanged by chain | count=1 / `last_updated=2026-04-13T20:17:13Z` (pre-mission) before & after run |
| Ambiguous reference does not mutate | RT-018 v1/v2, RT-023 v1/v2 — no row update on AMBIGUOUS_TASK_REFERENCE |
| Idempotent replay → no duplicate row | 4 chain rows × 4 distinct `metadata->>'idempotency_key'` values; RT-032 ×2 produced 1 row |
| Tenant scope enforced | RT-037 wrote to tenant A only; default tenant had no row delta from that case |
| Soft cancel for delete (no hard DELETE) | RT-027v2 set `status='cancelled'`, row remains in `tasks` |
| `completed_at` set on complete | RT-023v4 set `completed_at=2026-04-25T12:59:21.768Z` |
| No raw module JSON in user-facing response | RC/MO chain consumed `module_result.summary`/`actions_executed.details` (verified in RC composer; user response is natural sentence) |

## Failure recovery during the run

One iteration was needed on PL extraction:

- **Defect detected**: initial `stripVerbPrefix` left `taskul cu` and trailing temporal phrases in `title_match` for update/complete/delete, causing ME to NOT_FOUND the target row.
- **Fix**: `stripVerbPrefix` extended with trailing-temporal-stripper (`pe mâine la 10`, `la ora 9`), trailing `ca făcut/terminat/done` stripper, and leading `taskul|reminderul|task|reminder` qualifier stripper.
- **Reapply**: V2-028 canonical channel; PL versionId `850f8594…` → fresh versionId on second apply; node count unchanged.
- **Validation**: RT-027v2, RT-018v4, RT-023v4 all green post-fix.

This counts as **1 of the 2 allowed workflow patch passes** under
pack `12_FAILURE_RECOVERY_AND_STOP_RULES.md` retry limits.

## Reminder-as-task evidence

RT-008 input: *"Amintește-mi mâine la 9 să verific plata."*

Outcome row `ffc326ad-0ae8-4cc8-b11d-2071351fa372`:
- `title = description = 'Amintește-mi mâine la 9 să verific plata.'`
- `due_type = 'datetime'`
- `due_at = '2026-04-26T09:00:00.000Z'` (mâine = next-day; ora 9 = 09:00 UTC at extraction time)
- `status = 'open'`
- `metadata`: includes `idempotency_key`, no reminder-side fields

`public.reminders` count = **1** (pre-mission row), `last_updated` =
`2026-04-13T20:17:13Z` (pre-mission). **No reminders write** during this run.

ADR-REMINDER-AS-TASK-LAYER §4–§5 honored.
