# Mission 2 — MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP

## Objective

Align PL routing with the module registry by supporting upstream `messages.intent='recall_memory'`.

Current behavior: `search_memory` covers most recall use cases. This follow-up is lower priority, but it prevents fallthrough if upstream emits `recall_memory`.

## Expected patch surface

Preferred:
- `WF-PL-01.PL_Build_Planner_Input.parameters.jsCode`
- 1 jsCode rewrite
- 0 node delta
- 0 connection delta
- 0 schema mutation

Patch only if discovery confirms `recall_memory` is absent from PL mapping.

## Required discovery

1. Confirm whether `intentMap.recall_memory` exists.
2. Confirm whether `actionToModule.recall_memory` exists.
3. Inspect ME memory route:
   - Is there a distinct `ME_Memory_Recall_*` handler?
   - Or is recall implemented via `search_memory`?
4. Decide contract:
   - Option A: `recall_memory` maps to `recall_memory` if ME has a real handler.
   - Option B: `recall_memory` aliases to `search_memory` if that is current canonical behavior.
5. Do not modify Memory V2 internals unless a real contradiction is found.

## Start protocol

Create:
`docs/architecture/pl/memory_recall_intentmap/`

With:
- `MEMORY_RECALL_EXECUTION_LOG.md`
- `MEMORY_RECALL_DISCOVERY.md`
- `MEMORY_RECALL_DESIGN_FREEZE.md`
- `MEMORY_RECALL_PATCH_EVIDENCE.md`
- `MEMORY_RECALL_PROBE_RESULTS.md`
- `MEMORY_RECALL_SQL_INVARIANTS.md`
- `MEMORY_RECALL_CLOSEOUT.md`
- `artifacts/`

## Target mapping

If ME recall handler is real:
```js
intentMap.recall_memory = 'recall_memory'
actionToModule.recall_memory = 'memory_module'
```

If recall should alias to search:
```js
intentMap.recall_memory = 'search_memory'
actionToModule.search_memory = 'memory_module'
```

Use the repo's current patterns.

## Input extraction

For recall/search, extract:
- query/content from normalized message;
- source_thread_id/source_message_id if relevant;
- tenant scope from envelope/context, not user text.

No writes.

## Tests

Sequential probes:
1. Seed/store memory fact.
2. `intent='recall_memory'` same-tenant recall in Romanian.
3. `intent='recall_memory'` same-tenant recall in English.
4. Cross-tenant recall blocked.
5. `search_memory` regression read-only.
6. `store_memory` regression writes.
7. `supersede_memory` regression positive if cheap; otherwise cite recent green evidence.
8. `create_task` regression.
9. `capture_feedback` regression.
10. `public.reminders` unchanged.

## SQL invariants

- recall/search 0 row delta;
- same-tenant recall structurally works;
- cross-tenant rows not surfaced;
- store regression writes one row;
- reminders unchanged;
- workflow/schema mutation counts as expected.

## P0 stop conditions

Stop if:
- cross-tenant recall leaks content;
- recall writes memory rows;
- store/search/supersede regression appears;
- broad Memory V2 rewrite required;
- schema migration required;
- duplicate workflow/Path 5 needed.

## Final verdict options

- `MEMORY_RECALL_PL_INTENTMAP_READY = TRUE`
- `MEMORY_RECALL_PL_INTENTMAP_PARTIAL_WITH_BLOCKERS`
- `MEMORY_RECALL_PL_INTENTMAP_STOPPED_ON_P0`
