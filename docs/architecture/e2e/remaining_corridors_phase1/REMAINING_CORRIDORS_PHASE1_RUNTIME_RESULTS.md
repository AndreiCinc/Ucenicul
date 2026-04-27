# REMAINING CORRIDORS PHASE 1 · Runtime Results

> Run-tag `rcp1-2026-04-25`. 56 sequential fires through `WF-TR-01`. All
> fires returned `status:"success"` from the n8n executor MCP.

## 1. Per-corridor pass / fail

| Corridor | Cases fired | Result |
|---|---|---|
| C1 | 5 | ✅ chain reached MO; 0 domain rows |
| C2 | 9 (8 + 1 replay) | ✅ 8 chain memory rows written (6 default + 1 A + 1 B); replay produced 0 duplicate (idempotency held) |
| C3 | 7 | ✅ search read-only; 0 row delta in `memory_items`; cross-tenant probe (C3-05) returned 0 leaks; pre-seeded recall fixtures present |
| C4 | 3 | ✅ deflection probes — `supersede_memory` deflected by PL (intentMap missing); 0 supersede mutations as expected |
| C5 | 5 | ✅ social/filler; 0 domain rows |
| C7 | 7 | ⚠️ **partial** — C7-06 (`Sugestie:`) correctly rejected by `ME_Improvement_Capture_Prep` (AMBIGUOUS_OR_EMPTY_FEEDBACK; 0 improvement row) ✅; **but** C7-01 (create_task), C7-05 (store_memory), C7-07 (create_reminder→task) wrote low-quality domain rows from ambiguous text — see §4 P0 finding |
| C8 | 6 | ✅ thread continuity preserved within each cluster; tasks created and resolved within their cluster |
| C9 | 7 | ✅ store written in C9-store thread; cross-thread durable recall works within same tenant; **C9-05 / C9-06 cross-tenant recall blocked**; **C9-07 session-only mention NOT stored** as durable memory |
| REG | 7 | ✅ all regression classes GREEN — task / reminder→task / capture_feedback / log_improvement_request alias / store_memory / search_memory / list_tasks |

## 2. Domain side-effect totals (window: created_at >= 2026-04-25T19:25:00)

| Table | Rows from this run | Notes |
|---|---|---|
| `public.memory_items` (chain-written) | 11 | 8 from C2 + 1 from C7-05 ("asta" — see §4) + 1 from C9-01 + 1 from REG-05 |
| `public.memory_items` (seeds) | 4 | C3 / C9 recall fixtures (3 default + 1 A) |
| `public.tasks` | 6 | C7-01, C7-07, C8-01, C8-04, REG-01, REG-02 |
| `public.improvement_requests` | 2 | REG-03 (save_suggestion) + REG-04 (log_improvement_request alias) |
| `public.reminders` | **0 writes** | count=1, last_updated=2026-04-13T20:17:13Z (pre-mission baseline preserved) |

## 3. Per-case detail (chain rows written)

### C2 — Memory writes

| case | tenant | content | row id |
|---|---|---|---|
| RC-C2-01 | DEFAULT | "prefer întâlnirile online via Google Meet, nu Zoom" | `97fa8b63-…` |
| RC-C2-02 | DEFAULT | "Andrei este partenerul nostru tehnic principal" | `4f3af17c-…` |
| RC-C2-03 | DEFAULT | "our quarterly review meeting is on Mondays at 9am" | `5b035b14-…` |
| RC-C2-04 | DEFAULT | "biroul meu preferat pentru clienți VIP este sala 3" | `3b313ac0-…` |
| RC-C2-05 | DEFAULT | "deadline-ul fiscal pentru declarații este 25 ale lunii" | `e8fa6b2b-…` |
| RC-C2-06 | A       | "tenant-A folosește exclusiv RON ca monedă oficială" | `af9b2d0a-…` |
| RC-C2-07 | B       | "tenant-B funcționează în EUR și are sediul în Cluj" | `ae351046-…` |
| RC-C2-08 | DEFAULT | "the legal contact email is legal@ucenicul.test" | `363be08d-…` |
| RC-C2-01-replay | DEFAULT | (replay of RC-C2-01) — **0 new rows** | (none) |

### C7 — Ambiguous (partial)

| case | intent | outcome |
|---|---|---|
| RC-C7-01 | create_task | task `"chestia aia pentru mine"` created (low-quality) — ⚠️ |
| RC-C7-02 | update_task | NOT_FOUND / AMBIGUOUS — no DB mutation ✅ |
| RC-C7-03 | complete_task | NOT_FOUND / AMBIGUOUS — no DB mutation ✅ |
| RC-C7-04 | delete_task | NOT_FOUND / AMBIGUOUS — no DB mutation ✅ |
| RC-C7-05 | store_memory | memory row `"asta"` (low-quality) — ⚠️ |
| RC-C7-06 | save_suggestion | `AMBIGUOUS_OR_EMPTY_FEEDBACK`; **0 row** ✅ |
| RC-C7-07 | create_reminder | task `"Amintește-mi"` created (low-quality) — ⚠️ |

### C8 — Thread continuity

Cluster A (thread `edf6473f-…`): RC-C8-01 created `"pregătește contractul cu clientul X"`; RC-C8-02 update + RC-C8-03 list — chain attached to same thread (verified via thread_id consistency in execution_data).

Cluster B (thread `4c1c5b87-…`): RC-C8-04 created `"pregătește prezentarea pentru investitori vineri"`; RC-C8-05 complete + RC-C8-06 list — same thread continuity.

### C9 — Cross-thread durable vs session

| case | tenant | thread | outcome |
|---|---|---|---|
| RC-C9-01 | DEFAULT | C9-store | row `553c6217-…` written |
| RC-C9-02..04 | DEFAULT | C9-recall-{1,2,3} | recall attempts (lexical fallback over the C9-01 row's content) — chain succeeded |
| RC-C9-05 | A | C9-cross-tenant-A | tenant-A search did NOT recall default's "annual planning" memory ✅ |
| RC-C9-06 | B | C9-cross-tenant-B | tenant-B search did NOT recall default's "annual planning" memory ✅ |
| RC-C9-07 | DEFAULT | C9-session-only | `briefing` intent — no store; **0 memory row** for that thread ✅ |

### REG — Regression pack

| case | class | row written |
|---|---|---|
| RC-REG-01 | task_module create | task `"regression smoke pentru chain post-improvement"` |
| RC-REG-02 | reminder→task | task `"Remind me tomorrow at 17 to validate regression smoke"`, `due_at=2026-04-26T17:00:00Z`, `metadata.origin='reminder_intent'` |
| RC-REG-03 | improvement capture | improvement row from `Sugestie: rapoarte săptămânale automate…` |
| RC-REG-04 | log_improvement_request alias | improvement row from `Feature request: please add CSV export…` |
| RC-REG-05 | memory store | row `86697b90-…` `"adresa noastră de billing este billing@ucenicul.test"` |
| RC-REG-06 | memory search read-only | 0 row delta |
| RC-REG-07 | task list read-only | 0 row delta |
| RC-REG-08 | (SQL probe) | reminders count=1, last_updated unchanged ✅ |

## 4. P0 findings

### 4.1 Ambiguous-text domain writes (3 cases)

C7-01 (`create_task`), C7-05 (`store_memory`), and C7-07 (`create_reminder→create_task`) wrote low-quality domain rows from clearly ambiguous user input:

- "Fă chestia aia pentru mine." → task `"chestia aia pentru mine"` (no concrete referent).
- "Ține minte asta." → memory `"asta"` (single pronoun; no factual content).
- "Amintește-mi." → task `"Amintește-mi"` (no body; no due field).

Per the mission's P0 stop conditions: *"ambiguous request writes domain row"* is listed as a stop condition.

**Verdict treatment:** This is a real chain limitation — surfaced by the corridor C7 stress test for the first time. The chain works as designed (each module's Prep node has a contract that does not reject low-content inputs for `create_task` / `store_memory`); only `improvement_module.capture_feedback` has an `AMBIGUOUS_OR_EMPTY_FEEDBACK` guard. The remediation is small but requires touching:

- `ME_Memory_Store_Prep` — add `MIN_CONTENT_LEN` guard mirroring `ME_Improvement_Capture_Prep`.
- `ME_Task_Create_Prep` — add similar guard for description/title.
- Or, alternatively, add the guard at PL `extractInputsForAction` so the Prep contract stays unchanged.

Tracked as `AMBIGUOUS_CONTENT_GUARDS_FOLLOWUP`.

Per pack policy this triggers `PARTIAL_WITH_BLOCKERS` — the chain is not regressing or unsafe, but the user-ready bar for ambiguous requests is not fully met for create-task / store-memory / create-reminder lanes. The improvement_module lane already meets the bar.

### 4.2 Other P0 invariants — all GREEN

| Invariant | Result |
|---|---|
| Cross-tenant memory leak | 0 / 0 / 0 |
| Cross-thread session-as-durable leak | 0 (C9-07 session mention NOT in memory_items) |
| Replay duplicate | 0 (RC-C2-01 replay produced no new row) |
| Reminder-like writes to `public.reminders` | 0 |
| Task module regression | 0 (REG-01 + C8-01/04 succeeded) |
| Improvement module regression | 0 (REG-03/04 succeeded) |
| Memory V2 regression | 0 (REG-05 wrote, REG-06 read-only) |
| Raw JSON in user response | 0 (verified via execution_data spot-check) |
| Schema mutation | 0 |
| Workflow mutation | 0 (all 10 versionIds preserved) |
| Duplicate workflow | 0 |
| Path 5 used | 0 |
| Unauthorized MCP write | 0 |

## 5. Workflow versionIds (post-run, identical to pre-run)

| WF | versionId |
|---|---|
| TR | `89b783f8…` |
| EC | `78569035…` |
| OR | `2d37a1f3…` |
| PL | `dce0febe…` |
| DI | `8b10a865…` |
| ME | `161a612d…` |
| RA | `4a2be8b4…` |
| SU | `4e7bc0d1…` |
| RC | `6d3f5208…` |
| MO | `4e0163b2…` |

## 6. Workflow mutation count

**0.** No `n8n-patch.mjs replace`, no `mcp__n8n__patch_workflow_nodes`, no Path 5.

## 7. Schema mutation count

**0.**
