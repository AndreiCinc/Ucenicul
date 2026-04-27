# FULL_240_VARIANT_SWEEP · Fixtures

Run-tag: `f240r-2026-04-26`. Pre-seeds applied 2026-04-26.

## Pre-seed pack additions

**Threads (30 new + 14 carried from FULL_240_RUN gate)**: per-case e2e threads for the variant cases plus shared cluster threads (C8 cont, C8 reply, C9 B, C10 A, C10 B, C11 replay-L1).

**Messages (34 new + carried gate rows)**: one inbound message per variant case fired, with `messages.intent` set per the post-PL_BRIEFING harness `intent_mapping.mjs`.

**`memory_items` C4 supersede targets (3 new)**:

| id | tenant | content | purpose |
|---|---|---|---|
| `c4f24026-aaaa-4bbb-8ccc-000000000002` | eee0…0001 | "Andrei preferă antrenamente dimineața (target C4-L1-V2)." | C4-V2 supersede target |
| `c4f24026-aaaa-4bbb-8ccc-000000000003` | eee0…0001 | "Andrei preferă antrenamente dimineața (target C4-L1-V3)." | C4-V3 supersede target |
| `c4f24026-aaaa-4bbb-8ccc-000000000004` | eee0…0001 | "Andrei preferă antrenamente dimineața (target C4-L1-V4)." | C4-V4 supersede target |

(All three flipped from `active` → `superseded` post-fire with NEW rows backlinking via `supersedes_memory_id`.)

## Pre-existing fixtures (carried)

- e2e tenants `eee0e2e0-…0001/000a/000b` (3 tenants).
- C4 V1 target `c4f24026-aaaa-4bbb-8ccc-000000000001` (now superseded; carried from FULL_240_RERUN).
- Carried gate threads + messages from FULL_240_RUN + FULL_240_RERUN (60+ rows).
- Memory V2 supersede / OR_PASSTHROUGH carried seed rows in tenants A/B.

## Fixture build script

`docs/architecture/e2e/full_240_variant_sweep/artifacts/build_variant_seed.mjs` — generates the 34-message + 30-thread + 3-target SQL batch from the matrix, the harness `intent_mapping.mjs`, and the matrix's case_ids list. Idempotent (ON CONFLICT DO NOTHING).

## C4 envelope augmentation

For C4-V2/V3/V4 fires, the envelope's `metadata.memory_id` was set to the pre-seeded target UUID. OR's UUID allowlist (post `OR_PASSTHROUGH_CLOSEOUT`) plumbed it through to `planner_context.inputs.memory_id`. PL's late-binding pass aliased it to `supersedes_memory_id`. ME's supersede chain consumed it.

## Reminders fixture invariant

`public.reminders` count=1, last_updated=2026-04-13T20:17:13Z — preserved end-to-end, no fake delivery target seeded.
