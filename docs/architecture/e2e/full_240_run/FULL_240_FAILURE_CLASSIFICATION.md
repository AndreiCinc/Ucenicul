# FULL_240_RUN · Failure Classification

Run-tag: `f240-2026-04-26`

| ID | Symptom | Class | Scope | Action |
|---|---|---|---|---|
| F-D1 | C1-L1-V1: chain bails at PL with `INSUFFICIENT_PLANNING_CONTEXT` because `briefing` is not in PL.intentMap | `PL_ROUTING_BUG` (out of safe-fix envelope: requires designing a new no-op response-only ME action OR PL → RC short-circuit) | C1, C5, C7-briefing variants, C9 thread_B_operational_continue_negative, C9 thread_C_ambiguous_reference (≈80 cases of 240) | Track as `PL_BRIEFING_INTENT_MAPPING_FOLLOWUP` blocker. Out of scope for autonomous safe-fix. |
| F-D2 | C2-L1-V1 (pre-harness-fix): chain reached MO but RA aggregated `improvement_module.capture_feedback`, not `memory_module.store_memory`. Cause: harness `intent_mapping.mjs` C2 default was `save_suggestion` (pre-F12 mapping) | `HARNESS_BUG` / `FIXTURE_BUG` (in safe-fix envelope) | C2, C4, C9 thread_A_seed, C10 write variants, C11 (write-side cases) | **APPLIED 2026-04-26**: `intent_mapping.mjs` C2/C4/C9 thread_A_seed/C10 writes/C11 → `store_memory` or `supersede_memory` per F14 + supersede mappings. DB-side `messages.intent` UPDATE applied to 8 affected gate rows. |

## Not classified as failures (informational)

| ID | Symptom | Why not a failure |
|---|---|---|
| I-1 | MO terminated with `MISSING_DELIVERY_TARGET` for C2-L1-V1 | `KNOWN_FIXTURE_LIMITATION` per `e2e_oracle.mjs` lines 76-92. Documented and accepted. |
| I-2 | First C1-L1-V1 fire (exec 9990) had empty `planner_context` | `FIXTURE_BUG` — messages were not seeded yet. Re-fired (exec 9994) post-seed; planner_context populated correctly. |

## P0 stop conditions evaluated

| Condition | Observed? | Notes |
|---|---|---|
| Cross-tenant data leak | NO | No cross-tenant fires this window |
| Wrong-tenant write/update/supersede/delete | NO | One write occurred; tenant=eee0…0001 (matched envelope) |
| User-facing raw JSON leak | N/A | Only one fire reached RC; not user-tested in this window |
| Ambiguous input writes domain row after guard | N/A | Not exercised live this window |
| Retry creates duplicate domain side effect | N/A | Not exercised live this window |
| C1/C5 social writes domain data | NO | C1-L1-V1 wrote 0 rows — clean PL bail |
| Session-only data becomes durable memory without explicit store | N/A | Not exercised live |
| Durable memory recall crosses tenant boundary | N/A | Not exercised live |
| Supersede modifies wrong memory | N/A | Not exercised live (covered by 2026-04-26 closeouts) |
| Reminder-like writes to `public.reminders` | NO | reminders.count=1 unchanged, last_updated=2026-04-13 |
| Hard delete where soft cancel expected | N/A | No delete actions exercised |

**No P0 stop condition triggered.**

## Mission-level allowlist of safe fixes (taken vs. not taken)

| Allowed safe-fix | Taken? | Where |
|---|---|---|
| Harness sequential fire fixes | N/A — already sequential | — |
| Case fixture corrections | TAKEN | seeded tenants/threads/messages |
| SQL invariant scoping | N/A — already scoped per F10 | — |
| `MISSING_DELIVERY_TARGET` oracle classification | N/A — already classified | — |
| Chain-walker attribution bugs | N/A | — |
| Result parser bugs | N/A | — |
| Doc/current-truth reconciliation | TAKEN — preflight verified live versionIds match closeouts | — |
| PL routing — add missing intentMap entry for existing module action | NOT TAKEN — `briefing` requires a new module action design (not "already-existing"), so out of envelope | F-D1 |
| OR metadata passthrough fix | N/A — already in place via `OR_PASSTHROUGH_CLOSEOUT` 2026-04-26 | — |
| ME Prep / Result defensive guard | N/A — already in place via `MEMORY_SUPERSEDE_DEFENSIVE_GUARD_CLOSEOUT` 2026-04-26 | — |
| DB query fix | NOT NEEDED — no DB query bug observed | — |
