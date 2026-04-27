# REMAINING CORRIDORS PHASE 1 · Scope Freeze

> Frozen at preflight exit. Implementation must match this freeze.

## In scope

8 non-task corridors of the rich matrix:

- C1 simple one-shot / response-only
- C2 memory write (store_memory)
- C3 memory recall / search
- C4 memory update / supersede (deflection-only — route blocked at PL)
- C5 no-memory social / filler
- C7 ambiguous request / clarification
- C8 thread continuity
- C9 cross-thread durable memory vs session state

Plus an 8-case regression pack (per mission spec).

## Out of scope

- Task corridors C6 / C10 / C11 / C12 (already GREEN — covered via the
  small regression pack only).
- Memory V2 internals reopen.
- Workflow mutation absent a P0 safety regression.
- Implementing `supersede_memory` PL routing — deferred to
  `MEMORY_SUPERSEDE_PL_INTENTMAP_FOLLOWUP`.
- Implementing `recall_memory` / `promote_memory` PL routing — deferred.
- IMPROVEMENT_MODULE_LIST_FOLLOWUP (deferred from prior mission).
- Schema migration; Path 5; duplicate workflows; unauthorized MCP write.

## Tenant lanes

| Lane | tenant_id | Used for |
|---|---|---|
| DEFAULT | `eee0e2e0-…0001` | majority |
| A | `eee0e2e0-…000a` | C2 isolation, C3 cross-tenant probe, C9 isolation |
| B | `eee0e2e0-…000b` | C2 isolation, C9 cross-tenant probe |

## Run-tag

`rcp1-2026-04-25` — appears in:

- `messages.source_message_ref` as `rcp1:<case_id>`
- `threads.title` as `rcp1:<case_id>` or `rcp1:<shared_thread_label>` (C8/C9)
- `memory_items.metadata->>'rcp1_seed'='true'` for pre-seeded recall fixtures
- TR envelope `idempotency_key` = `rcp1:<case_id>`

## Cardinality (vs pack target 90)

| Corridor | Pack target | Allocated | Justification |
|---|---|---|---|
| C1 | 8 | **5** | Response-only path collapses onto a single chain shape (TR→…→RC→MO with no domain step). 5 cases cover RO + EN + length variation. |
| C2 | 12 | **8 + 1 replay = 9 fires** | F14 closeout already proved 1 case GREEN; this mission adds tenant-isolation breadth + replay invariant + content-class variation. |
| C3 | 12 | **7** | Recall has limited natural variation against a fixed seed set; same-tenant happy + cross-tenant probe + zero-result probe + EN query exhaust the path. |
| C4 | 10 | **3** | PL chain cannot route `supersede_memory` (intentMap missing). Cases here are deflection probes proving the route is blocked, plus 1 supersede attempt demonstrating no domain mutation. Deferred as `MEMORY_SUPERSEDE_PL_INTENTMAP_FOLLOWUP`. |
| C5 | 8 | **5** | Social / filler collapses onto the same chain shape as C1 (no domain write). 5 cases cover RO + EN + thank-you + apology + greeting. |
| C7 | 10 | **7** | Ambiguity manifests in 4 different action lanes (task / memory / improvement / reminder). 7 cases cover each lane plus 3 "intent unclear" cases. |
| C8 | 10 | **6** | Continuity tested by reusing 1 thread across 3 messages × 2 thread-clusters = 6 fires; cross-thread separation tested by case 7 in cluster A using a fresh thread. |
| C9 | 12 | **7** | 1 store + 3 cross-thread recalls (same tenant) + 2 cross-tenant probes + 1 session-only-no-durable. |
| Regression | 8 | **8** | Mandatory per spec; one fire per regression class. |
| **TOTAL** | **90** | **57 unique cases + 1 replay = 58 fires** | ≥ pack minimum 56; every corridor represented. |

## P0 stop conditions (verbatim from pack)

Stop on any of: cross-tenant memory leak, cross-thread session-as-durable
leak, replay duplicate, ambiguous-write domain row, social/filler-write
domain row, reminder-like writes to `public.reminders`, task module
regression, improvement module regression, Memory V2 regression, raw JSON
in user response, schema mutation required, workflow mutation required
without contract, duplicate workflow, Path 5, unauthorized MCP write.

## Verdict ladder

- `E2E_REMAINING_CORRIDORS_PHASE1_READY = TRUE` — every corridor green,
  C4 documented as deferred per spec, no P0 fired.
- `E2E_REMAINING_CORRIDORS_PHASE1_PARTIAL_WITH_BLOCKERS` — recoverable
  harness/oracle issue blocked some cases but no P0.
- `E2E_REMAINING_CORRIDORS_PHASE1_STOPPED_ON_P0` — a P0 stop condition fired.
