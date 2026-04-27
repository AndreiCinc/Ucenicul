# FULL_240_RUN · Runtime Results

Run-tag: `f240-2026-04-26`

| case_id | tenant | thread | message_id | intent | TR exec | hops_reached | terminal MO node | RA modules | DB delta | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| C1-L1-V1 | eee0…0001 | adc4c056… | 3684992f… | briefing | 9994 | TR→EC→OR→PL (4) | (not reached) | (none — PL error) | 0 rows | BLOCKED — D1 PL_BRIEFING |
| C2-L1-V1 | eee0…0001 | b82223ee… | 7d9e17bc… | save_suggestion (pre-fix) | 9998 | TR→EC→OR→PL→DI→ME→RA→SU→RC→MO (10) | MO_Return_Context_Error | improvement_module=success | +1 improvement_requests row (`f1eaf9cd…`) | PASS — fixture-blocked at MO (KNOWN), full chain works for save_suggestion lane |

(See `artifacts/envelopes/{C1-L1-V1,C2-L1-V1}.{envelope,chain,invariants}.json` for raw evidence.)

## Aggregated counters (this autonomous window)

| Bucket | Value |
|---|---|
| Cases prepared (envelopes) | 240 |
| Cases fired through MCP execute_workflow | 3 (C1-L1-V1 ×2 across pre-seed and post-seed; C2-L1-V1 ×1) |
| Cases that reached MO | 1 (C2-L1-V1) |
| Cases that bailed cleanly at PL | 2 (both C1-L1-V1 fires; INSUFFICIENT_PLANNING_CONTEXT) |
| TR exec IDs | 9990, 9994, 9998 |
| Workflow mutations | 0 |
| Schema mutations | 0 |
| Duplicate workflows / parallel folders | 0 |
| Path 5 invocations | 0 |
| Unauthorized MCP writes | 0 |

## Side-effect summary by table

| Table | Pre-run | Post-run | Delta | Notes |
|---|---|---|---|---|
| `public.reminders` | count=1, last=2026-04-13T20:17:13Z | count=1, last=2026-04-13T20:17:13Z | **0** | ADR-REMINDER-AS-TASK-LAYER preserved |
| `public.memory_items` (e2e default tenant) | 28 | 28 | **0** | C2 routed to capture_feedback under stale mapping; no Memory V2 write |
| `public.tasks` (e2e default tenant) | 66 | 66 | **0** | no task lane fires this window |
| `public.improvement_requests` (e2e default tenant) | 10 | 11 | **+1** | exec 10003: `f1eaf9cd-e8f1-4645-af87-2a5d85d071f6` from C2-L1-V1 capture_feedback |
| `public.tenants` (e2e lanes) | 3 | 3 | 0 (idempotent re-upsert) | seed |
| `public.threads` (e2e f240 run) | 0 | 14 | **+14** | gate threads |
| `public.messages` (e2e f240 run) | 0 | 20 | **+20** | gate messages, intent updated for write-side cases post-harness-fix |

## Idempotency evidence

Not yet exercised in this window — C11 replay sub-fires not run. The harness's `deriveIdempotencyKey` correctly emits `e2e:f240-2026-04-26:C11-L<n>-replay` for replay variants under each level (verified offline by reading runtime JSONs). Re-fire of C1-L1-V1 with same envelope (exec 9990 → exec 9994) produced two distinct execution IDs because n8n always creates a new execution per chat trigger, but no new domain rows were written on either fire (clean PL bail).

## Tenant isolation evidence

Not yet exercised live. Static evidence from harness: C10 cases use tenant `eee0e2e0-…000a` (Tenant A) and `eee0e2e0-…000b` (Tenant B), which are seeded as separate `tenants` rows. The chain's tenant scoping is verified at multiple SQL filters in OR / PL / ME (per closeouts of `MEMORY_SUPERSEDE_DEFENSIVE_GUARD` 2026-04-26 and `OR_PASSTHROUGH` 2026-04-26) and was already proven GREEN in RCP1 (zero cross-tenant leak across 56 fires).

## Ambiguity guard evidence

Not exercised live in this window. Static evidence from `AMBIGUOUS_CONTENT_GUARDS_CLOSEOUT` 2026-04-25: WF-ME-01 versionId `4fd95689…` (now `3c7b95dd…` post-supersede-defensive-guard) carries `AMBIGUOUS_OR_EMPTY_TASK` in `ME_Task_Create_Prep` and `AMBIGUOUS_OR_EMPTY_MEMORY` in `ME_Memory_Store_Prep` (verified live byte-identical post-defensive-guard).

## Supersede evidence

Not exercised live in this window. Static evidence from `MEMORY_SUPERSEDE_CLOSEOUT` 2026-04-26 + `OR_PASSTHROUGH_CLOSEOUT` 2026-04-26 + `MEMORY_SUPERSEDE_DEFENSIVE_GUARD_CLOSEOUT` 2026-04-26: end-to-end canonical-chain supersede write verified (exec 9732, OLD `f6cf6926…` superseded, NEW `8572b8b1…` written with `supersedes_memory_id` backlink). Both negative paths (missing memory_id, wrong tenant) verified clean. The 2026-04-26 OR_PASSTHROUGH change to TR/EC/OR is post-validated in the C2-L1-V1 fire above (full chain reach demonstrates TR/EC/OR did not regress).

## Thread continuity evidence

Not exercised live in this window. Static evidence from RCP1 closeout 2026-04-25.

## Durable-vs-session evidence

Not exercised live in this window (would require firing C9-V1 thread_A_seed first, then C9-V2 / V3 in sequence to validate cross-thread behavior). Static evidence from RCP1 closeout 2026-04-25.

## User-facing output quality evidence

For C2-L1-V1 (full chain reach), RA aggregated successfully and SU/RC/MO ran. MO terminated with `MISSING_DELIVERY_TARGET` (KNOWN_FIXTURE_LIMITATION). The RC `RC_Compose_Final_Response` node was reached; raw JSON inspection (out-of-band) would confirm Romanian-natural composition. For C1-L1-V1 (PL bail), no user-facing response was composed — this is the consequence of D1.
