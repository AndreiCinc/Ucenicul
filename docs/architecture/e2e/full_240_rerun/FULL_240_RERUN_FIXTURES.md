# FULL_240_RERUN · Fixtures

Run-tag: `f240r-2026-04-26`. Pre-seed pack applied 2026-04-26 03:38 UTC.

## Pre-seeded `memory_items`

| id | tenant_id | content | status | purpose |
|---|---|---|---|---|
| `c4f24026-aaaa-4bbb-8ccc-000000000001` | eee0…0001 | "Andrei preferă antrenamente dimineața." | `active` (later → `superseded` after C4 fire) | C4-L1-V1 supersede target memory |

Carried forward from earlier missions (untouched by this run): RCP1 / RCP1+1 / Memory V2 supersede / OR_PASSTHROUGH probe seeds (`af9b2d0a-…`, `99000002-…`, `87cc077d-…`, `ea076ebb-…`, `ae351046-…` per tenants A/B; `8572b8b1-…`, `f6cf6926-…` per default per supersede missions).

## Pre-seeded `messages` (run-tag `f240r-2026-04-26`)

| message_id | tenant | thread | intent | content (truncated) | purpose |
|---|---|---|---|---|---|
| `c7c70011-2222-4333-8444-555555555555` | eee0…0001 | C7 thread | `create_task` | "Fă chestia aia." | C7 ambiguity guard task lane |
| `c7c70022-2222-4333-8444-555555555555` | eee0…0001 | C7 thread | `store_memory` | "Ține minte asta." | C7 ambiguity guard memory lane |
| `c100aaaa-2222-4333-8444-555555555555` | eee0…000a | C10 A thread | `search_memory` | "Ce știi despre preferințele mele?" | C10 tenant A recall (deferred — exec not used in this run window) |
| `c100bbbb-2222-4333-8444-555555555555` | eee0…000b | C10 B thread | `search_memory` | "Ce știi despre preferințele utilizatorului A?" | C10 cross-tenant leak probe |
| `c9c90202-2222-4333-8444-555555555555` | eee0…0001 | C9 B thread | `search_memory` | "Ce știi despre Andrei pentru antrenament?" | C9-L1-V2 cross-thread durable recall |

## Carried gate fixtures (from FULL_240_RUN, intent UPDATEd in PL_BRIEFING)

`messages.id` rows that were seeded in `FULL_240_RUN` and whose `intent` was UPDATEd by the post-FULL_240 harness fix to align with the `store_memory` / `supersede_memory` mappings:

- C2-L1-V1 `7d9e17bc-…` → `store_memory`
- C4-L1-V1 `3dccbc17-…` → `supersede_memory`
- C9-L1-V1 `e91d15f6-…` → `store_memory`
- C10-L1-V1 `04366a3d-…` → `store_memory`
- C11-L1-V1 `4862347c-…` → `store_memory`

Plus the original briefing/intent rows (C1-L1-V1, C5-L1-V1, C7-L1-V1, C9-L1-V3) used unchanged for the briefing path probes.

Plus the `aaaa1111-c922-4559-80ce-db8e2e8ee772` C2-L1-V1 fresh-msg row from `PL_BRIEFING` (R-1 regression).

## C4 envelope augmentation

For C4-L1-V1 fire (TR exec 10169), the envelope's `metadata.memory_id` was set to `c4f24026-aaaa-4bbb-8ccc-000000000001` (the pre-seeded target). OR's UUID allowlist (post `OR_PASSTHROUGH_CLOSEOUT`) plumbed it through to `planner_context.inputs.memory_id`. PL's late-binding pass for `supersede_memory` aliased it to `supersedes_memory_id`. ME's supersede chain consumed it, marked the OLD row `superseded`, and inserted the NEW row with `supersedes_memory_id` backlink.
