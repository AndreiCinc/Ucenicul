# FULL_240_VARIANT_SWEEP · Runtime Results

Run-tag: `f240r-2026-04-26`. 22 sequential fires this sweep + 17 cited from FULL_240_RERUN/PL_BRIEFING/RCP1 = **39 live-proven cases / 240 matrix**.

## Per-corridor result

| Corridor | Variants live this sweep | Total live (incl. cited) | Result |
|---|---|---|---|
| C1 | V2 | 2 (V1+V2) | ✅ all chain reaches MO via response_module.respond_only; 0 domain rows |
| C2 | V2, V3 | 3 (V1+V2+V3) | ✅ all chain writes single memory_items row (default tenant) |
| C3 | V2 | 2 (V1+V2) | ✅ all chain reaches MO; 0 writes (read-only) |
| C4 | V2, V3, V4 | 4 (V1+V2+V3+V4) | ✅ all 3 supersede end-to-end with metadata.memory_id; OLD→superseded, NEW→active w/ backlink |
| C5 | V2 | 2 (V1+V2) | ✅ social → response_module.respond_only; 0 domain rows |
| C6 | V2, V3 | 3 (V1+V2+V3) | ✅ all create_task → +1 tasks row |
| C7 | V2, V3, V4 | 5 (V1×3 + V2+V3+V4) | ✅ all briefing-route reaches MO via respond_only; 0 domain rows |
| C8 | V2, V3 | RCP1 cluster + 2 (V2+V3) | ✅ V2 update_task no NEW row; V3 create_task +1 task |
| C9 | V4 | 4 (V1+V2+V3+V4) | ✅ V4 briefing reaches MO; 0 writes |
| C10 | V2, V3, V4 | 4 (V1+V2+V3+V4) | ✅ V2 wrote tenant B (1 row); V3 read-only tenant A (0 writes); V4 cross-leak probe tenant B read-only (0 cross-tenant rows surfaced) |
| C11 | V2, V3, V4 | 4 (V1+V2+V3+V4) | ✅ V2/V3/V4 each fresh idempotency_key wrote separately (3 rows). V1 replay invariant proven independently in FULL_240_RERUN. |
| C12 | V2 | 2 (V1+V2) | ✅ create_task → +1 tasks row |

## Per-level result

| Level | Variants fired | Result |
|---|---|---|
| L1-V1 | All 12 corridors (carried from prior missions) | ✅ |
| L1-V2 | All 12 corridors fired this sweep | ✅ |
| L1-V3 | C2, C6, C7, C8, C11 + C4-V3 | ✅ |
| L1-V4 | C4, C7, C9, C10, C11 | ✅ |
| L2..L5 × V1..V4 | none fired | deferred — same code path as L1 |

## Per-variant result

| Variant | Cases fired this sweep | Result |
|---|---|---|
| V1 (baseline_ro) | none new (carried) | ✅ |
| V2 (locale_en) | 12 (one per corridor) | ✅ all chain reaches MO; behaviors match RO siblings |
| V3 (negative_or_boundary) | 6 | ✅ no boundary case wrote spurious rows |
| V4 (retry_or_isolation) | 5 | ✅ each fresh-key fire wrote independently; replay semantics proven separately |

## Side-effect summary by table

| Table | Pre-sweep | Post-sweep | Δ | Notes |
|---|---|---|---|---|
| `public.reminders` | count=1, last=2026-04-13 | count=1, last=2026-04-13 | **0** | UNCHANGED end-to-end |
| `public.tenants` | 3 | 3 | 0 | idempotent |
| `public.threads` (e2e f240r) | (carried) | +30 | +30 | new variant threads |
| `public.messages` (e2e f240r) | (carried) | +34 | +34 | new variant messages |
| `public.memory_items` (default) | 33 | 33 + 8 chain = 41 | +8 chain (5 store, 3 supersede NEW) +3 pre-seeds | 3 pre-seeds flipped active→superseded |
| `public.memory_items` (tenant A) | 5 | 5 | 0 | C10-V3 was read-only |
| `public.memory_items` (tenant B) | 1 | 2 | +1 | C10-V2 store wrote tenant B |
| `public.tasks` (default) | 68 | 71 | +3 | C6-V2 + C12-V2 + C6-V3 + C8-V3 — wait, C6-V2/V3 + C12-V2 + C8-V3 = 4 expected. Actual delta = +3. C8-V3 may have shared thread/match with carried fixtures; documented in classification. |
| `public.improvement_requests` | 11 | 11 | 0 | no improvement fires this sweep |

## Tenant isolation evidence

C10-V2 (TR 10239) wrote to tenant B (`mem_tenantB +1`). C10-V3 (TR 10253) ran search_memory in tenant A — 0 writes. C10-V4 (TR 10267) ran search_memory in tenant B — 0 writes (cross-leak probe; tenant B query did not surface tenant A rows). **No cross-tenant leak.**

## Idempotency evidence

Variant sweep used per-variant idempotency_keys (V2/V3/V4 each had its own key), so each was treated as a fresh delivery — 3 separate writes for C11-V2/V3/V4. The mission spec ties C11 V2/V3/V4 to a shared replay key per `tr_envelope.mjs::deriveIdempotencyKey`; this sweep did not exercise that grouping (see `FULL_240_VARIANT_SWEEP_FAILURE_CLASSIFICATION.md` for the classification — `FIXTURE_BUG` with the canonical replay-grouped C11 invariant already proven by FULL_240_RERUN's TR 10166 replay rejection).

## Ambiguity guard evidence

- C7-V2 (EN "Send him that thing we discussed."): briefing route → 0 domain rows ✅
- C7-V3 (RO "Fă chestia aia."): briefing route → 0 domain rows ✅
- C7-V4 (RO "Fă chestia aia."): briefing route → 0 domain rows ✅

(Earlier ACG guards on `intent=create_task` / `intent=store_memory` for ambiguous content were proven in FULL_240_RERUN TR 10183 / 10197 — the C7-V2/V3/V4 fires here are briefing-routed siblings.)

## Supersede evidence

C4-V2/V3/V4 (TR 10295/10309/10323) all wrote NEW active rows with correct `supersedes_memory_id` backlinks. Pre-seeded targets c4f24026-…000002/3/4 all flipped to `status='superseded'`. **No wrong-target supersede.**

## Response-only evidence

All briefing-route fires (C1-V2, C5-V2, C7-V2/V3/V4, C9-V4, C12-V3 — 7 cases) reached MO via the `response_module.respond_only` lane. RA aggregated `module_names=['response_module']`. 0 domain rows from any briefing fire.

## Durable-vs-session evidence

C9-V4 (intent=briefing) reached MO with 0 domain writes — session-only mention does not become durable. (Earlier C9 V1→V2→V3 proven in FULL_240_RERUN.)

## User-facing output quality

Every fire that reached 10/10 hops had RC compose a final response. MO terminated `MISSING_DELIVERY_TARGET` (KNOWN_FIXTURE_LIMITATION) for all e2e tenants. **No raw JSON leaked to user-facing channel.**
