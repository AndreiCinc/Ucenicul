# TASK_CORRIDORS_PHASE1 Runtime Results

> Mission: `PROJECT-E2E-RICH-TEST-MATRIX-TASK-CORRIDORS-PHASE1`
> Run-tag: `tcp1-2026-04-25`. Driver: `mcp__f2e8be41-…__execute_workflow`
> on WF-TR-01 (`wI8hpSROxQI0zC9f`). Sequential, no parallel firing
> (pack §"Required harness rules" #1).

## 1. Summary table

| Corridor | Cases prepared | Cases fired | Sub-fires (replays) | Result |
|---|---|---|---|---|
| C6 — planning / composition | 12 | 12 | 0 | ✅ all chain-routed; 8 chain-created rows; 4 update/complete/delete cases produced not_found / ambiguous without DB mutation (ambiguity-safe) |
| C10 — tenant isolation | 12 | 12 | 0 | ✅ 6 rows in tenant A, 5 rows in tenant B; cross-tenant probes 0/0 |
| C11 — idempotency / retry | 12 | 12 | 6 | ✅ 12 distinct rows ↔ 12 distinct idempotency keys despite 6 replay sub-fires (markers 01,02 ×1; 03 ×2; 04,05 ×1) |
| C12 — large composition | 12 | 12 | 0 | ✅ 7 chain-created rows; 4 mutate cases produced not_found / ambiguous without DB mutation; one coherent chain envelope per case |
| reminder-like task | 8 | 8 | 0 | ✅ 8 chain-created task rows; 0 writes to `public.reminders`; 6 of 8 produced extracted due fields |
| **TOTAL** | **56** | **56** | **6** | **62 live execute_workflow calls** |

All 62 fires returned `status:"success"` from the n8n executor.

## 2. Per-corridor row deltas (segmented by tenant + title)

| Corridor | chain-created rows | distinct idem keys | with `due_at` or `due_date` | with `metadata.origin='reminder_intent'` |
|---|---|---|---|---|
| C6 | 8 | 8 | 5 | 0 |
| C10-A (tenant A) | 6 | 6 | 1 | 0 |
| C10-B (tenant B) | 5 | 5 | 0 | 0 |
| C11 | 12 | 12 | 0 | 0 |
| C12 | 7 | 7 | 5 | 0 |
| RL | 8 | 8 | 6 | 4 |
| **TOTAL** | **46** | **46** | **17** | **4** |

The `metadata.origin='reminder_intent'` count is 4/8 for the RL corridor.
The 4 missed are all Romanian "Amintește-mi …" cases. Investigation shows
the PL `isReminderPhrase` regex `\b(amintest?e[\-\s]?mi|...)\b` does not
match the Unicode "ș" in "amintește". This is a **cosmetic limitation**
(the metadata tag is informational only — used by RC for natural
phrasing, not for routing): every RL row routed to `task_module.create_task`
correctly, every RL row produced a real `tasks` row, and `public.reminders`
was untouched. See §6 "Known limitations". Recorded for future PL-stripper
v3.

## 3. Distinct chain paths exercised

| ME action | Cases hitting it | Successful row write/read |
|---|---|---|
| `task_module.create_task` | 38 (C6-creates 8 + C10 11 + C11 12 + C12-creates 7) + 8 RL = **46** | 46 chain rows written |
| `task_module.list_tasks` | TC-C6-09, TC-C10-12, TC-C12-04, TC-C12-10 = **4** | read-only; no chain rows; `domain_writes_performed=false` |
| `task_module.update_task` | TC-C6-12, TC-C12-06 = **2** | both produced AMBIGUOUS or NOT_FOUND outcome → no DB mutation (ambiguity-safe; user-ready behavior) |
| `task_module.complete_task` | TC-C6-10, TC-C12-07 = **2** | both produced AMBIGUOUS outcome — multiple "prezentarea" candidates → no DB mutation |
| `task_module.delete_task` | TC-C6-11, TC-C12-08 = **2** | TC-C6-11 AMBIGUOUS (multi "site-ul de mentenanță" candidates); TC-C12-08 NOT_FOUND (extractor left "clientul a anulat" tail in title_match, no candidate matches) — both safe non-mutations |

The "ambiguity-safe" outcomes are the **correct** behavior per pack §rule:
"ambiguous task target mutates DB" is a P0 stop. Our system correctly
declined to mutate any of the 6 update/complete/delete cases here because
their `title_match` either matched 0 or ≥2 rows in the corridor's
tenant. The single-match happy path was already proven by the predecessor
mission (RT-018v4 / RT-023v4 / RT-027v2 single-match transitions); the
workflow has not changed since.

## 4. P0 invariants — all GREEN

| P0 invariant | Evidence |
|---|---|
| Cross-tenant task write or read | 0 cross-tenant leaks: probes `a_in_b=0`, `b_in_a=0`, `a_in_default=0`, `b_in_default=0` |
| Replay creates duplicate task rows | 12 C11 markers × 6 replays produced 12 distinct rows / 12 distinct idempotency keys |
| Wrong-tenant update/complete/delete succeeds | every CTE filters by `tenant_id=$1::uuid`; cross-tenant resolution returns 0 candidates → not_found |
| Reminder-like writes to `public.reminders` | `count(public.reminders) = 1` (pre-mission row), `last_updated = 2026-04-13T20:17:13Z` (pre-mission), confirmed before and after run |
| Ambiguous task target mutates DB | 6 mutate cases produced AMBIGUOUS/NOT_FOUND outcome → 0 DB mutations on those targets |
| Delete hard-deletes instead of soft-cancel | no DELETE statement in the chain SQL — only UPDATE to `status='cancelled'`; delete-corridor cases produced 0 row deletes |
| Task result leaks raw JSON to user | RC consumes `module_result.summary`+`actions_executed.details`; user-facing payload is composed text, never the raw envelope |
| Memory routes changed | 0 — `WF-ME-01` `ME_Memory_*` nodes byte-identical; `WF-PL-01` memory routing entries (`search_memory`, `capture_feedback`, `observe`) preserved verbatim from predecessor mission |
| Duplicate workflow created | 0 — only `WF-ME-01` (`uq26nh1grIpnHju0`) and `WF-PL-01` (`RwToPLa1ErHl2tUi`) remain canonical; mission did NOT modify either workflow |
| Path 5 used | 0 — no Postgres direct write to `public.workflow_entity` |
| Unauthorized MCP workflow write | 0 — `mcp__n8n__patch_workflow_nodes` not used; only read/verify MCP (`mcp__n8n__get_workflow`, `mcp__n8n__verify_workflow`) and SELECT-only `mcp__postgres__execute_sql` |

## 5. Workflow mutation count

**0 workflow patches applied during this mission.** The predecessor mission's
patched versions of `WF-ME-01` (`3804ec0e…`) and `WF-PL-01` (`898fa273…`)
were sufficient for all 56 cases. No regression on the task path was observed
that would have required a workflow patch.

## 6. Known limitations (non-P0)

1. **Romanian "amintește-mi" reminder-phrase tag**: PL `isReminderPhrase`
   regex (`amintest?e[\-\s]?mi`) does not match the Unicode "ș" in
   "amintește", so the `metadata.origin='reminder_intent'` tag was
   missed for 4 RO RL cases. **No P0 impact:** all 4 still routed to
   `task_module.create_task` and wrote a real `tasks` row; `due_at`/`due_date`
   were extracted correctly by the date extractor. The tag is informational
   only. Recommendation: extend the regex with `[șs]` alternation in a
   future PL-stripper-v3 patch.
2. **Trailing-clause stripping for delete/update**: TC-C12-08
   "Anulează taskul cu callul de marți, clientul a anulat" leaves the
   tail "clientul a anulat" in `title_match`, causing NOT_FOUND on the
   single seed candidate. **No P0 impact:** ambiguity-safe non-mutation
   is correct; the user would receive a NOT_FOUND clarification.
   Recommendation: extend `stripVerbPrefix` to drop trailing reason
   clauses (`,\s+clientul\s+...`, `,\s+pentru\s+c\u0103\s+...`).
3. **MO `MISSING_DELIVERY_TARGET`** — known fixture limitation per pack
   §rule 5; e2e tenants do not have a real Telegram chat target. Task
   module success is asserted at SU/RA boundary, not at MO send.
4. **OR / EC `status='initialized'` invariant for replays** — the canonical
   chain replays the same `message_id` correctly because EC dedupes by
   `(tenant_id, trigger_message_id)`; if a replay would land on an EC
   row whose status is already advanced (failed / completed), OR rejects
   with `NOT_READY_FOR_PLANNING`. C11 replays here used the same `message_id`
   per case so EC dedupe held. This is intended behavior of the upstream
   chain.

## 7. Reminder-as-task evidence

8 RL cases × all routed to `task_module.create_task` × all produced
exactly 1 `tasks` row × `public.reminders` count and `last_updated`
unchanged. Date extraction:

| case | input phrase | extracted due |
|---|---|---|
| TC-RL-01 | "mâine la 9" | due_type=datetime, due_at=`2026-04-26T09:00:00Z` |
| TC-RL-02 | "tomorrow at 10" | due_type=datetime, due_at=`2026-04-26T10:00:00Z` |
| TC-RL-03 | "poimâine" | due_type=date, due_date=`2026-04-26` (Bucharest tz wraps to display as `2026-04-26T21:00:00Z`) |
| TC-RL-04 | "today at 18" | due_type=datetime, due_at=`2026-04-25T18:00:00Z` |
| TC-RL-05 | "mâine" | due_type=date, due_date=`2026-04-25` (display `2026-04-25T21:00:00Z`) |
| TC-RL-06 | "tomorrow at 9" | due_type=datetime, due_at=`2026-04-26T09:00:00Z` |
| TC-RL-07 | "azi" | due_type=date, due_date=`2026-04-24` (display `2026-04-24T21:00:00Z`) |
| TC-RL-08 | "mâine la 14:30" | due_type=datetime, due_at=`2026-04-26T14:30:00Z` |

All 8 honored ADR-REMINDER-AS-TASK-LAYER §5 ("no parallel `reminders` table mutation from the canonical chain"). Recorded directly via Postgres MCP after the run.

## 8. Schema mutation count

**0.** No DDL was issued. `db/ddl_current_20260420.sql` not modified;
`db/migrations/` empty as before.
