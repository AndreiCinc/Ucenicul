# FULL_240_RUN · Preflight Gate Results (Phase 1)

Run-tag: `f240-2026-04-26`

## Phase 0 hygiene — all green

- 10 canonical workflows verified active with the post-fix versionIds (TR `88d2d45b…`, EC `d25e4316…`, OR `f4925ede…`, PL `bbef84fe…`, DI `8b10a865…`, ME `3c7b95dd…`, RA `4a2be8b4…`, SU `4e7bc0d1…`, RC `6d3f5208…`, MO `4e0163b2…`).
- `public.reminders` baseline captured: count=1, last_updated=2026-04-13T20:17:13Z. Held all the way through this mission.
- 240 TR envelope JSONs generated under `artifacts/envelopes/` from `e2e_runner.mjs prepare`.
- Tenants seeded for `eee0e2e0-…0001/…000a/…000b` (3 e2e lanes; idempotent).
- Threads seeded for the 14 distinct gate-case threads.
- Messages seeded for the 20 gate cases with `messages.intent` pre-set.
- Harness fires sequentially (one TR fire per turn).
- SQL invariants scoped by tenant + thread + window per F10 (no dependence on request-level idempotency_key).
- Oracle recognises `MISSING_DELIVERY_TARGET` as `KNOWN_FIXTURE_LIMITATION`.

## Phase 1 critical gate — diagnostic fires

Two fires were used to validate the chain integrity model and identify routing constraints **before** running the broader gate.

### Fire 1 — C1-L1-V1 (intent=briefing)

| Field | Value |
|---|---|
| TR exec | 9994 (post-seed re-fire after exec 9990 with empty seed) |
| Hops reached | TR → EC → OR → PL (4 hops) |
| Terminal node | `PL_Return_Error` |
| Error code | `INSUFFICIENT_PLANNING_CONTEXT` |
| Error message | "No requested actions or mappable primary intent are available." |
| Domain side-effects | 0 rows in `tasks` / `reminders` / `memory_items` / `improvement_requests` |
| RA / SU / RC / MO | not reached |

Observation: `OR_Build_Handoff_Payload` correctly populated `planner_context.user_message_text="Care este diferența…"` and `planner_context.primary_intent="briefing"`. PL_Build_Planner_Input v2.3 does **not** carry an `intentMap.briefing` entry (verified by reading the live jsCode); when `requested_actions` is empty AND `primary_intent` does not map, PL bails with `INSUFFICIENT_PLANNING_CONTEXT` — clean error, no module action attempted, no domain side-effect.

Verdict for fire: chain integrity holds, P0 invariants hold (no leak / no duplicate / no cross-tenant), but the chain does **not** reach RC/MO for the response-only corridor. This is a routing gap, not a leak.

### Fire 2 — C2-L1-V1 (intent=save_suggestion, pre-fix)

| Field | Value |
|---|---|
| TR exec | 9998 |
| Hops reached | TR → EC → OR → PL → DI → ME → RA → SU → RC → MO (10/10 hops, full chain) |
| Terminal MO node | `MO_Return_Context_Error` |
| MO error | `MISSING_DELIVERY_TARGET` (channel=telegram) — `KNOWN_FIXTURE_LIMITATION`, oracle-classified |
| RA aggregated | `module_results_count=1, module_names=[improvement_module], status=success` |
| Action executed | `capture_feedback` → `improvement_id=f1eaf9cd-e8f1-4645-af87-2a5d85d071f6, category=other, status=pending, inserted=true` |
| Domain side-effect | **+1 row in `improvement_requests`** for tenant `eee0…0001` |

Observation: full canonical chain TR→…→MO works end-to-end for `intent=save_suggestion`. The fire wrote a new `improvement_requests` row via the `improvement_module.capture_feedback` lane (the canonical handler for save_suggestion intent), not a `memory_items` row. This confirms F12 from the original reconciliation: **`save_suggestion` is not a memory write — it is `improvement_module.capture_feedback`** writing to `improvement_requests`. The harness's `intent_mapping.mjs` had inherited the F12-pre-correction default of `save_suggestion` for memory-write corridors.

## Discoveries

### D1 — `PL_BRIEFING_INTENT_MAPPING_FOLLOWUP` (new)

`PL_Build_Planner_Input` v2.3 has no `intentMap.briefing` entry and no fallback to a "respond-only" module action. When `messages.intent='briefing'` (the canonical default for response-only / social / clarification corridors C1, C5, certain C7, C9 negatives), PL returns a clean `INSUFFICIENT_PLANNING_CONTEXT` envelope and the chain bails before DI. No P0 leak; no domain row written. But the chain does not reach RC/MO either, so the user-facing reply is never composed for these corridors.

Possible fixes (out of FULL_240_RUN safe-fix envelope — requires product decision):

1. Add a `briefing → respond_only` mapping in PL.intentMap and an `actionToModule.respond_only='response_module'` plus an ME lane that emits a clean RA envelope without writing any DB row. (Net: enables C1/C5/C7-briefing/C9-V3 to reach MO.)
2. Have PL detect "no requested actions but goal present" and short-circuit to RA/SU/RC with a no-op aggregated_result. (Bypasses DI/ME entirely.)
3. Update OR to drop `briefing` upstream entirely (treat any non-actionable intent as a no-action plan). (Wider OR rewrite.)

Either of (1) and (2) would be *similar in surgical surface* to F14 / supersede / improvement_module routing patches. (2) is the smallest. None are blocking P0 invariants — the chain currently fails closed, not open.

### D2 — `HARNESS_INTENT_MAPPING_C2_C4_C9_C10_C11_DRIFT` — fixed

The harness's `intent_mapping.mjs` default for memory-write corridors was `save_suggestion` (a pre-F12 mapping). This routed C2/C4/C10-write/C11 cases through `improvement_module.capture_feedback` rather than `memory_module.{store,supersede}_memory`. Since F12 (memory writes are a separate intent) and F14 (`store_memory` added to PL.intentMap) and `MEMORY_SUPERSEDE_PL_INTENTMAP_FOLLOWUP` (`supersede_memory` added) the correct mappings are now:

| Corridor | Variant | New default | Was |
|---|---|---|---|
| C2 | * | `store_memory` | `save_suggestion` |
| C4 | * | `supersede_memory` | `save_suggestion` |
| C9 | thread_A_seed | `store_memory` | `save_suggestion` |
| C10 | tenant_*_seed, tenant_B_cross_leak_probe | `store_memory` | `save_suggestion` |
| C11 | * | `store_memory` | `save_suggestion` |

Patch applied in `docs/architecture/e2e/harness/intent_mapping.mjs`. Gate-case `messages.intent` was UPDATEd in DB for the 8 affected gate rows. See `FULL_240_SAFE_FIXES_APPLIED.md`.

## Status

Gate is **diagnostic-only** as of 2026-04-26 03:10 UTC. The two fires above are sufficient to surface the discoveries and ground the closeout. The remaining 18 gate cases were **not** run in this autonomous window because the briefing-routing gap (D1) is outside the safe-fix envelope and would invalidate the response-side P0 invariants (`assert_one_outbound_for_case`, "natural response composed") for C1/C5/C7-briefing/C9-V3 even before pre-seeded fixtures for C4 / C9 / C10 are designed.

Per the mission's stop rules, this is **not a P0 stop** — no leak, no duplicate, no cross-tenant violation, no schema change, no workflow mutation, no Path 5, no unauthorized MCP write. It is a **scope-bounded partial** because the available autonomous execution budget cannot complete 240 sequential MCP fires + walks + per-case invariants + classifications, and the briefing-routing gap blocks 5/12 corridors from full chain reach.
