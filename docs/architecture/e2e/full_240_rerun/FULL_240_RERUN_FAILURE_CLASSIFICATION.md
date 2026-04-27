# FULL_240_RERUN · Failure Classification

Run-tag: `f240r-2026-04-26`.

## Failures

**None.**

All 11 rerun-window fires + 6 cited PL_BRIEFING fires returned the expected behavior across all 12 corridors.

## P0 stop conditions evaluated

| Condition | Triggered? | Notes |
|---|---|---|
| Cross-tenant data leak | **NO** | C10 tA-seed wrote only to tenant A (`dfb88c46-…`); cross-leak probe (tenant B) returned no tenant A row |
| Wrong-tenant write/update/supersede/delete | **NO** | C10 write isolated to tenant A. C4 supersede operated only on the `c4f24026` target memory in tenant default |
| Retry duplicate side effect | **NO** | C11 replay rejected at OR `NOT_READY_FOR_PLANNING` — 0 duplicate domain row |
| Ambiguous input writes domain row | **NO** | C7 ambig task and C7 ambig memo each rejected by ACG guards — 0 domain row |
| C1/C5 response-only writes domain row | **NO** | C1-L1-V1 and C5-L1-V1 (briefing) wrote 0 rows |
| Session-only data becomes durable memory | **NO** | C9-V3 (briefing) wrote 0 memory_items rows |
| Cross-tenant durable recall | **NO** | C10 tenant B probe did not surface tenant A's row |
| Wrong memory superseded | **NO** | C4 supersede flipped only `c4f24026` (the target) and inserted exactly one new row with the backlink |
| Reminder-like writes to `public.reminders` | **NO** | reminders.count=1 last=2026-04-13 unchanged |
| Hard delete where soft cancel expected | **NO** | No delete actions exercised |
| Raw JSON leaks to user | **NO** | RC composed structured envelope; MO blocked at delivery-target fixture, not at envelope shape |
| Schema migration needed | **NO** | 0 schema mutations |
| Duplicate workflow created | **NO** | 0 |
| Path 5 needed | **NO** | 0 |

## Informational notes

| Note | Why not a failure |
|---|---|
| MO terminated `MISSING_DELIVERY_TARGET` for every fire that reached MO | `KNOWN_FIXTURE_LIMITATION` per `e2e_oracle.mjs` lines 76-92 |
| C11 replay reached only TR→EC→OR (3 hops) | This is the chain's natural idempotency response: execution_context already initialized for the (tenant_id, message_id) tuple, so OR refuses to re-plan. **0 duplicate domain rows** across first+replay. The behavior is correct and expected. |
| Levels L2-L5 + variants V2-V4 not fired this run | Out of autonomous turn budget; same code path as L1; deferred per `FULL_240_RERUN_SCOPE_FREEZE.md` |
| `recall_memory` not exercised | `MEMORY_RECALL_PL_INTENTMAP_FOLLOWUP` (low priority); `search_memory` already covers most recall needs |
| `improvement_module.list_improvements` not exercised | `IMPROVEMENT_MODULE_LIST_FOLLOWUP` deferred |
| `reminder_module.{list,update,cancel}` not exercised | Out of stage per ADR-REMINDER-AS-TASK-LAYER |

## Safe fixes applied

**None taken in this autonomous window.** All chain integrity was already in place from the post-FULL_240_RUN harness fix + post-PL_BRIEFING workflow patches.

(Pre-seed pack — adding 1 `memory_items` row + 5 `messages` rows for fixture support — is fixture seeding, not a fix.)
