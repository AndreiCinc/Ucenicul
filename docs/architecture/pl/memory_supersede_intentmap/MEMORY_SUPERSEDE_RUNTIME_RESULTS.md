# MEMORY SUPERSEDE PL INTENTMAP · Runtime Results

> Run-tag `mss-2026-04-26`. Workflow under test: `WF-PL-01` versionId
> `bbef84fe-f594-4922-a95a-11bae52c3c6d` (post-patch).

---

## 1. Pre-test baseline (2026-04-26T01:47:52Z)

| Table | count | notes |
|---|---|---|
| `public.tasks` | 77 | |
| `public.memory_items` | 294 | |
| ` ↳ status='superseded'` | 32 | (pre-existing; baseline for delta) |
| `public.improvement_requests` | 10 | |
| `public.reminders` | 1 | last_updated `2026-04-13T20:17:13Z` (pre-mission) |

## 2. Test fires

| # | Case | Workflow | Action | Outcome |
|---|---|---|---|---|
| 1 | MSS-01 e2e (TR) | `wI8hpSROxQI0zC9f` | `messages.intent='supersede_memory'` | exec 9667/9670/9671/9672: PL ✅ routed `module_name='memory_module', step='step_01_supersede_memory'`; DI ✅ dispatched; ME Prep returned `MISSING_REQUIRED_FIELDS` (no `supersedes_memory_id` because OR doesn't pass `messages.metadata`); 0 row delta. ME's `ME_Memory_Supersede_Embed` has a pre-existing crash on `_error` short-circuit — see §4 limitation. |
| 2 | MSS-02 PL-direct positive (full envelope with explicit `supersedes_memory_id`) | `RwToPLa1ErHl2tUi` | full `planner_context.requested_actions` with explicit ID | exec 9673: **PL→DI→ME→DB→Result** all GREEN; OLD memory marked `superseded`, NEW memory written with `supersedes_memory_id` ✅ |
| 3 | store_memory regression | `wI8hpSROxQI0zC9f` | `messages.intent='store_memory'` | exec 9684: 1 new `memory_items` row written ✅ |
| 4 | create_task regression | `wI8hpSROxQI0zC9f` | `messages.intent='create_task'` | exec 9698: 1 new `tasks` row written ✅ |
| 5 | search_memory regression | `wI8hpSROxQI0zC9f` | `messages.intent='search_memory'` | exec 9712: 0 row delta ✅ |

## 3. Domain side-effect totals

| Table | Rows from this run | Cases |
|---|---|---|
| `public.memory_items` (chain-written, status='superseded') | 1 | OLD row `433fc68a-…` from MSS-02 |
| `public.memory_items` (chain-written, status='active', new supersede target) | 1 | NEW row `b7184fff-…` from MSS-02, `supersedes_memory_id='433fc68a-…'` |
| `public.memory_items` (regression, store_memory) | 1 | regression #3 |
| `public.tasks` | 1 | regression #4 |
| `public.improvement_requests` | 0 | n/a |
| `public.reminders` | **0 writes** | count=1, last_updated=2026-04-13 preserved |

## 4. Known limitations (pre-existing, NOT introduced by this mission)

### 4.1 OR doesn't pass `messages.metadata` into `planner_context.inputs`

`OR_Build_Handoff_Payload` v1.4 only injects `user_message_text` (= `messages.normalized_content`) and `primary_intent` (= `messages.intent`) into `planner_context`. There is no path for arbitrary message metadata (e.g., `memory_id` or `supersedes_memory_id` from a UI flow) to flow through OR → PL → ME via the canonical chain.

Practically this means **the canonical TR→…→ME chain cannot execute a positive supersede** unless upstream (UI / API caller) directly populates `requested_actions` with explicit `supersedes_memory_id` and bypasses OR (e.g., by firing PL directly with a full handoff envelope, as MSS-02 demonstrated).

This is a separate routing-completeness issue tracked as **`OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_FOLLOWUP`**. The PL routing patch in this mission is sufficient and correct for the case where the explicit ID *is* in scope.

### 4.2 `ME_Memory_Supersede_Embed` crashes on `_error` short-circuit

When `ME_Memory_Supersede_Prep` returns `_error: true` (e.g., `MISSING_REQUIRED_FIELDS`), the next node `ME_Memory_Supersede_Embed` tries to evaluate `JSON.stringify({input: $json.__db.content})` without a defensive guard. `__db` is undefined → `JSON.stringify({input: undefined})` produces `"undefined"` which is not valid JSON → the HttpRequest node throws.

This is a Memory V2 internals defensive gap that surfaces only when the supersede Prep rejects (which couldn't happen before this mission because PL routing didn't reach the supersede chain at all). Expected fix: a Set/IF node before `ME_Memory_Supersede_Embed` that short-circuits to `ME_Memory_Supersede_Result` when `$json._error === true`. Per pack policy "Memory V2 stays closed", this fix is **out of scope** here.

Tracked as **`MEMORY_V2_SUPERSEDE_EMBED_DEFENSIVE_GUARD_FOLLOWUP`**.

## 5. P0 invariants — all GREEN

| INV | Result |
|---|---|
| INV-1 PL routes supersede (verified via exec 9670 trace) | ✅ |
| INV-2 supersede end-to-end via direct PL fire (MSS-02) | ✅ PASS |
| INV-3 OLD memory marked `superseded` | ✅ |
| INV-4 NEW memory has `supersedes_memory_id` pointing to OLD | ✅ |
| INV-5 unrelated memory untouched | ✅ active |
| INV-6 store_memory regression NEW_ROW | ✅ 1 |
| INV-7 create_task regression NEW_ROW | ✅ 1 |
| INV-8 search_memory read-only | ✅ 0 row delta |
| INV-9 reminders unchanged | ✅ count=1, last_updated=2026-04-13 |

## 6. Workflow versionIds (post-run)

| WF | versionId |
|---|---|
| TR | `89b783f8…` (unchanged) |
| EC | `78569035…` (unchanged) |
| OR | `2d37a1f3…` (unchanged) |
| **PL** | **`bbef84fe-f594-4922-a95a-11bae52c3c6d`** (was `dce0febe…`; bumped) |
| DI | `8b10a865…` (unchanged) |
| ME | `4fd95689-39f9-4dff-8ed2-6d0ccb5270de` (unchanged from ACG) |
| RA | `4a2be8b4…` (unchanged) |
| SU | `4e7bc0d1…` (unchanged) |
| RC | `6d3f5208…` (unchanged) |
| MO | `4e0163b2…` (unchanged) |

## 7. Workflow / schema mutation count

- Workflow mutations: **1** (`WF-PL-01` only — single jsCode rewrite).
- Schema mutations: **0**.
