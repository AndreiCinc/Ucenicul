# AMBIGUOUS CONTENT GUARDS · Closeout

## Verdict

`AMBIGUOUS_CONTENT_GUARDS_READY = TRUE`

The 3 ambiguous-content C7 cases that surfaced the P0 finding in
`PROJECT-E2E-RICH-TEST-MATRIX-REMAINING-CORRIDORS-PHASE1` are now rejected
at the `ME_*_Prep` layer with typed errors `AMBIGUOUS_OR_EMPTY_TASK` /
`AMBIGUOUS_OR_EMPTY_MEMORY`. Zero domain rows written for ambiguous input;
all 6 positive regressions GREEN; 4 safety probes (idempotency × 2,
cross-tenant, reminders unchanged) GREEN.

## Failing C7 cases reproduced

| Case | Goal text | Action | Pre-patch | Post-patch |
|---|---|---|---|---|
| RC-C7-01 | `Fă chestia aia pentru mine.` | create_task | wrote `tasks` row title=`chestia aia pentru mine` | **0 rows** (`AMBIGUOUS_OR_EMPTY_TASK`) ✅ |
| RC-C7-05 | `Ține minte asta.` | store_memory | wrote `memory_items` row content=`asta` | **0 rows** (`AMBIGUOUS_OR_EMPTY_MEMORY`) ✅ |
| RC-C7-07 | `Amintește-mi.` | create_reminder→task | wrote `tasks` row title=`Amintește-mi` | **0 rows** (`AMBIGUOUS_OR_EMPTY_TASK`) ✅ |

## Patch location

| File | Modification |
|---|---|
| `WF-ME-01.ME_Task_Create_Prep` | jsCode v1.0 → v1.1 — adds asciiFold + MIN_TASK_LEN + DEMONSTRATIVE_ONLY guard returning `AMBIGUOUS_OR_EMPTY_TASK`. |
| `WF-ME-01.ME_Memory_Store_Prep` | jsCode v1.0 → v1.1 — adds asciiFold + MIN_MEMORY_LEN + PURE_DEMONSTRATIVE guard returning `AMBIGUOUS_OR_EMPTY_MEMORY`. |
| `docs/architecture/e2e/ambiguous_content_guards/*` | NEW mission-local docs + artifacts (this file + 6 sibling docs + jsCode + envelopes). |
| `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` | Compact addendum (separate edit). |

DB nodes, Result nodes, all other ME nodes, all other 9 canonical workflows: byte-identical pre/post.

## Workflow versionId before / after

| Workflow | id | before | after | nodes | connections | active |
|---|---|---|---|---|---|---|
| WF-ME-01 | `uq26nh1grIpnHju0` | `161a612d-603a-49a7-9580-a256e1c69be5` | `4fd95689-39f9-4dff-8ed2-6d0ccb5270de` | 61 (unchanged) | 79 (unchanged) | ✅ |

All 9 other canonical workflows preserve their pre-mission versionIds (TR `89b783f8`, EC `78569035`, OR `2d37a1f3`, PL `dce0febe`, DI `8b10a865`, RA `4a2be8b4`, SU `4e7bc0d1`, RC `6d3f5208`, MO `4e0163b2`).

## Node / connection delta

- Nodes: **0 delta** (61 → 61).
- Connections: **0 delta** (79 → 79).
- Schema: **0 delta**.

## Ambiguous task no-write evidence

```sql
SELECT count(*) FROM public.tasks
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND created_at >= '2026-04-25T23:41:30Z'
   AND (title ILIKE '%chestia aia%' OR description ILIKE '%chestia aia%');
-- 0
```

## Ambiguous memory no-write evidence

```sql
SELECT count(*) FROM public.memory_items
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND source_thread_id='fe0c4289-d300-4413-8cbe-b2d15651cb5b'::uuid
   AND created_at >= '2026-04-25T23:41:30Z';
-- 0
```

## Ambiguous reminder→task no-write evidence

```sql
-- ACG-03 thread = task_lane (8166dc49-…); only ACG-01 also fired into that thread (also rejected)
SELECT count(*) FROM public.tasks
 WHERE tenant_id='eee0e2e0-0000-0000-0000-000000000001'::uuid
   AND created_at >= '2026-04-25T23:41:30Z'
   AND (title ILIKE 'amintește-mi%' OR title ILIKE 'aminteste-mi%')
   AND title NOT ILIKE '%mâine%';
-- 0
```

## Positive task regression

ACG-04 (`Creează task: ACG smoke pentru chain post-guard.`) wrote 1 row, status=`open`.
ACG-11 (replay-different-msg) wrote 1 NEW row (different exec context → different DB idempotency key — by design).
ACG-04R (true replay, same `message_id`) wrote 0 NEW rows — DB idempotency held.

## Positive memory regression

ACG-05 (`Ține minte că ACG smoke se rulează din thread positive_lane.`) wrote 1 row, content cleanly stored.
ACG-10 (replay-different-msg) wrote 1 NEW row (same logic).
ACG-05R (true replay, same `message_id`) wrote 0 NEW rows — Memory V2 idempotency UNIQUE+ON CONFLICT held.

## Positive reminder-as-task regression

ACG-06 (`Amintește-mi mâine la 11 să verific ACG runtime smoke.`) wrote 1 row in `public.tasks` with `due_type=datetime`, `due_at` set, `metadata.origin=reminder_intent`. ADR-REMINDER-AS-TASK-LAYER preserved.

## Improvement regression

ACG-07 (`Sugestie: adaugă vizualizarea task-urilor în calendar pentru ACG smoke.`) wrote 1 row in `public.improvement_requests`. The improvement_module Prep + DB + Result chain was untouched by this mission — the existing `AMBIGUOUS_OR_EMPTY_FEEDBACK` guard remains in `ME_Improvement_Capture_Prep`.

## SQL invariant results

15 invariants in `AMBIGUOUS_CONTENT_GUARDS_SQL_INVARIANTS.md`. **All GREEN.** Summary:

| INV | Domain | Result |
|---|---|---|
| INV-1 | ambig task no-write | 0 ✅ |
| INV-2 | ambig memory no-write | 0 ✅ |
| INV-3 | ambig reminder→task no-write | 0 ✅ |
| INV-4 | valid task wrote | 2 ✅ |
| INV-5 | valid memory wrote | 2 ✅ |
| INV-6 | valid reminder→task with due_at | 1 ✅ |
| INV-7 | valid feedback wrote | 1 ✅ |
| INV-8 | search/list read-only | 0 row delta ✅ |
| INV-9 | reminders unchanged | count=1, last_updated 2026-04-13 ✅ |
| INV-10 | replay create_task idempotent | 0 NEW rows ✅ |
| INV-11 | replay store_memory idempotent | 0 NEW rows ✅ |
| INV-12 | cross-tenant isolation | 0 leak ✅ |
| INV-13 | schema mutation | 0 ✅ |
| INV-14 | workflow mutation | only WF-ME-01 ✅ |

## Reminders unchanged evidence

```sql
SELECT count(*), max(updated_at) FROM public.reminders;
-- count=1, max=2026-04-13T20:17:13.620582Z (pre-mission baseline preserved)
```

## No schema mutation

`information_schema.columns` for `public.tasks`, `public.memory_items`, `public.improvement_requests`, `public.reminders`, `public.threads`, `public.messages` — unchanged from pre-mission shape.

## No duplicate workflow

Only `WF-ME-01` (`uq26nh1grIpnHju0`) was modified, in place via the V2-028 canonical local CLI. No `WF-ME-01-fixed`, no `v2_copy`, no parallel canonical workflow. **No Path 5**, **no `mcp__n8n__patch_workflow_nodes` write**.

## P0 stop conditions evaluated — none triggered

| P0 stop condition | Result |
|---|---|
| valid task creation regresses | ✅ ACG-04 wrote 1 row |
| valid memory store regresses | ✅ ACG-05 wrote 1 row |
| valid reminder→task regresses | ✅ ACG-06 wrote 1 row with due_at |
| improvement capture regresses | ✅ ACG-07 wrote 1 row |
| ambiguous input still writes a row | ✅ INV-1/2/3 all 0 |
| cross-tenant leak appears | ✅ INV-12 = 0 |
| schema migration needed | ✅ 0 schema mutations |
| broad planner rewrite needed | ✅ PL untouched |
| workflow duplicate created | ✅ no duplicates |
| Path 5 used | ✅ V2-028 canonical channel |

## Next recommended frontier

With `AMBIGUOUS_CONTENT_GUARDS_FOLLOWUP` closed, the C7 P0 finding from RCP1 is resolved and the chain meets the user-ready bar across improvement / task / memory ambiguous-input rejection.

Choose from these (small, contract-backed):

1. **`MEMORY_SUPERSEDE_PL_INTENTMAP_FOLLOWUP`** — single PL jsCode rewrite. Add `intentMap.supersede_memory='supersede_memory'` + `actionToModule.supersede_memory='memory_module'` + an `extractInputsForAction('supersede_memory', goalText)` clause that produces `target_memory_id` + new `content`. Same surgical pattern as F14. Memory V2's `ME_Memory_Supersede_*` chain is real and ready; only PL routing is missing.
2. **`MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP`** (lower priority) — add `recall_memory` to PL.intentMap. Currently the chain uses `search_memory` for both search and recall.
3. **`IMPROVEMENT_MODULE_LIST_FOLLOWUP`** (carried from prior mission) — add `ME_Route_Improvement_Action` sub-router + `list_improvements` handler chain (read-only).
4. **Phase 2 rich matrix run** that validates the C4 corridor (memory supersede) end-to-end through the canonical chain, after `MEMORY_SUPERSEDE_PL_INTENTMAP_FOLLOWUP` lands. C4 was deflection-only in RCP1.

Memory V2 stays closed. Task module stays untouched.

`AMBIGUOUS_CONTENT_GUARDS_READY = TRUE`
