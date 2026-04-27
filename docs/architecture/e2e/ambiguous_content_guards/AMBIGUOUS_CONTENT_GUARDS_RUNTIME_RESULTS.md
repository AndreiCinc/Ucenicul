# AMBIGUOUS CONTENT GUARDS · Runtime Results

> Run-tag `acg-2026-04-25`. Run window: `2026-04-25T23:41:30Z` onward.
> Workflow under test: `WF-ME-01` versionId `4fd95689-39f9-4dff-8ed2-6d0ccb5270de` (post-patch).
> All other 9 workflows unchanged from RCP1 closeout.

---

## 1. Pre-test baseline (2026-04-25T23:34:00Z, before patch + before any fires)

| Table | count | notes |
|---|---|---|
| `public.tasks` | 74 | |
| `public.memory_items` | 292 | |
| `public.improvement_requests` | 9 | |
| `public.reminders` | 1 | last_updated `2026-04-13T20:17:13Z` (pre-mission baseline) |

## 2. Test fires

12 sequential live executions through `WF-TR-01` (`wI8hpSROxQI0zC9f`) via the chat trigger with envelope-as-JSON payload, plus 2 same-message-id replays. Pre-seeded: 4 threads in `public.threads` and 12 messages in `public.messages` (with `intent` pre-set, mirroring how production DI/LLM populates intent).

| # | Case | Action | Goal text | Pre-guard expectation | Result |
|---|---|---|---|---|---|
| 1 | ACG-01 | create_task | `Fă chestia aia pentru mine.` | reject (DEMONSTRATIVE_ONLY: `chestia ... pentru mine`) | exec 9480 → 0 task rows ✅ |
| 2 | ACG-02 | store_memory | `Ține minte asta.` | reject (length=4 < MIN_MEMORY_LEN after strip) | exec 9494 → 0 memory rows ✅ |
| 3 | ACG-03 | create_reminder→task | `Amintește-mi.` | reject (length=0 after `aminteste`-strip) | exec 9508 → 0 task rows ✅ |
| 4 | ACG-04 | create_task | `Creează task: ACG smoke pentru chain post-guard.` | accept | exec 9522 → 1 task row ✅ |
| 5 | ACG-05 | store_memory | `Ține minte că ACG smoke se rulează din thread positive_lane.` | accept | exec 9536 → 1 memory row ✅ |
| 6 | ACG-06 | create_reminder→task | `Amintește-mi mâine la 11 să verific ACG runtime smoke.` | accept (with `due_at`) | exec 9550 → 1 task row with `due_at` ✅ |
| 7 | ACG-07 | save_suggestion | `Sugestie: adaugă vizualizarea task-urilor în calendar pentru ACG smoke.` | accept | exec 9564 → 1 improvement_requests row ✅ |
| 8 | ACG-08 | search_memory | `Ce știi despre ACG smoke?` | read-only | exec 9578 → 0 row delta ✅ |
| 9 | ACG-09 | list_tasks | `Listează task-urile mele.` | read-only | exec 9592 → 0 row delta ✅ |
| 10 | ACG-10 | store_memory (replay-different-msg of ACG-05) | (same content) | accept (different exec_ctx → new idempotency_key) | exec 9606 → 1 NEW memory row (by design: different msg → different exec context → different DB idempotency key) |
| 11 | ACG-11 | create_task (replay-different-msg of ACG-04) | (same content) | accept (different exec_ctx → new idempotency_key) | exec 9620 → 1 NEW task row (same logic as #10) |
| 12 | ACG-12 | search_memory (cross-tenant A) | `Ce știi despre ACG smoke?` | read-only; isolation by tenant_id | exec 9634 → 0 row delta in tenant A ✅ |
| 13 | ACG-04R | **real replay (SAME message_id as ACG-04)** | (same content, same `message_id`) | reject DUP at DB layer | exec 9648 → 0 NEW task rows ✅ idempotent |
| 14 | ACG-05R | **real replay (SAME message_id as ACG-05)** | (same content, same `message_id`) | reject DUP at DB layer | exec 9651 → 0 NEW memory rows ✅ idempotent |

Plus the upstream verification fire of ACG-01 (exec 9480) showed the chain reached ME (sub-execution 9485 in WF-ME-01) and the rollup_status = `failed` — consistent with the Prep guard returning `_error: AMBIGUOUS_OR_EMPTY_TASK` per the design.

## 3. Domain side-effect totals (window: created_at >= 2026-04-25T23:41:30Z)

| Table | Rows from this run | Cases that wrote |
|---|---|---|
| `public.tasks` (chain-written) | 3 | ACG-04 + ACG-06 + ACG-11 |
| `public.memory_items` (chain-written) | 2 | ACG-05 + ACG-10 |
| `public.improvement_requests` (chain-written) | 1 | ACG-07 |
| `public.reminders` | **0 writes** | (none) — count=1, last_updated `2026-04-13T20:17:13Z` preserved |

## 4. P0 findings

### 4.1 Ambiguous-text guards — ALL GREEN ✅

| C7 case (RCP1) | ACG repro | Pre-patch outcome | Post-patch outcome | Verdict |
|---|---|---|---|---|
| RC-C7-01 `Fă chestia aia pentru mine.` | ACG-01 | wrote `tasks` row title=`chestia aia pentru mine` | **0 rows** | ✅ guard fired |
| RC-C7-05 `Ține minte asta.` | ACG-02 | wrote `memory_items` row content=`asta` | **0 rows** | ✅ guard fired |
| RC-C7-07 `Amintește-mi.` | ACG-03 | wrote `tasks` row title=`Amintește-mi` | **0 rows** | ✅ guard fired |

### 4.2 Positive regressions — ALL GREEN ✅

| Class | Probe | Result |
|---|---|---|
| `task_module.create_task` | ACG-04 | 1 row, title `ACG smoke pentru chain post-guard` |
| `memory_module.store_memory` | ACG-05 | 1 row, content `ACG smoke se rulează din thread positive_lane` |
| `create_reminder→task` | ACG-06 | 1 row with `due_type=datetime`, `due_at` set, `metadata.origin=reminder_intent` |
| `improvement_module.capture_feedback` | ACG-07 | 1 row, user_message contains `Sugestie: ... ACG smoke` |
| `memory_module.search_memory` (read-only) | ACG-08 | 0 row delta in `memory_items` |
| `task_module.list_tasks` (read-only) | ACG-09 | 0 row delta in `tasks` |

### 4.3 Safety probes — ALL GREEN ✅

| Probe | Outcome |
|---|---|
| Replay valid store_memory (ACG-05R, same `message_id`) | 0 NEW memory rows — DB-level idempotency held via execution_context_id-derived key. |
| Replay valid create_task (ACG-04R, same `message_id`) | 0 NEW task rows — same. |
| Cross-tenant memory recall (ACG-12, tenant A) | 0 cross-tenant leak. Memory V2 SQL filters by `tenant_id`. |
| `public.reminders` unchanged | count=1, last_updated `2026-04-13T20:17:13Z` — ADR-REMINDER-AS-TASK-LAYER preserved. |

### 4.4 Other P0 invariants

| Invariant | Result |
|---|---|
| Schema mutations | 0 |
| Workflow mutations beyond `WF-ME-01` | 0 |
| Duplicate workflow created | 0 |
| Path 5 used | 0 |
| Unauthorized MCP write | 0 |
| Memory V2 reopen | none — guard is in `ME_Memory_Store_Prep` only; Memory V2 internals (Store_DB, Store_Result, Search/Recall/Promote/Supersede chains) byte-identical. |
| improvement_module touched | none — `ME_Improvement_Capture_Prep` byte-identical. |

## 5. Workflow versionIds (post-run)

| WF | versionId |
|---|---|
| TR | `89b783f8…` (unchanged) |
| EC | `78569035…` (unchanged) |
| OR | `2d37a1f3…` (unchanged) |
| PL | `dce0febe-1bc0-42e3-a44a-a41e6737e1e7` (unchanged) |
| DI | `8b10a865…` (unchanged) |
| **ME** | **`4fd95689-39f9-4dff-8ed2-6d0ccb5270de`** (was `161a612d…`; bumped by this mission) |
| RA | `4a2be8b4…` (unchanged) |
| SU | `4e7bc0d1…` (unchanged) |
| RC | `6d3f5208…` (unchanged) |
| MO | `4e0163b2…` (unchanged) |

## 6. Workflow mutation count

**1** (`WF-ME-01` only — 2 jsCode rewrites, 0 node delta, 0 connection delta).

## 7. Schema mutation count

**0.**

## 8. Note on the chain-reached-ME proof

To verify the chain actually reached `ME_Task_Create_Prep` / `ME_Memory_Store_Prep` (and the no-write was caused by the new guard, not by an upstream PL rejection), the harness pre-seeded `public.messages` rows with `intent` set per case. The first un-seeded fires (executions 9476/9440/etc.) returned `INSUFFICIENT_PLANNING_CONTEXT` from PL — proving PL wouldn't even reach ME without intent. The seeded re-fires (9480 onward) reached ME (visible in the parent execution's metadata: `subExecutionsCount` and the inner `module_results_count: 1`, `returned_step_ids: ["step_01_create_task"]` in the ACG-01 trace), and the `rollup_status: "failed"` is the canonical signal of a Prep `_error` short-circuit. The 0-row outcome confirms the guard's `_error` propagated through DB (queryReplacement all-null → no INSERT) and through Result (existing `_error` short-circuit).
