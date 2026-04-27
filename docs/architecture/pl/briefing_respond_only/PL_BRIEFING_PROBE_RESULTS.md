# PL_BRIEFING_INTENT_MAPPING_FOLLOWUP · Probe Results

Run-tag: `plbrf-2026-04-26`. Sequential fires (one TR fire per probe; await chain completion before next).

## Primary briefing probes

| Probe | case | locale | TR exec | hops | ME module | RA modules | RA actions | MO terminal | DB delta |
|---|---|---|---|---|---|---|---|---|---|
| B-1 | C1-L1-V1 | RO | **10012** | 10/10 | response_module | `[response_module]` | `[respond_only:success]` | `MISSING_DELIVERY_TARGET` (KNOWN) | 0 rows |
| B-3 | C5-L1-V1 | RO | **10026** | 10/10 | response_module | `[response_module]` | `[respond_only:success]` | `MISSING_DELIVERY_TARGET` (KNOWN) | 0 rows |
| B-4 | C7-L1-V1 | RO | **10040** | 10/10 | response_module | `[response_module]` | `[respond_only:success]` | `MISSING_DELIVERY_TARGET` (KNOWN) | 0 rows |
| B-5 | C9-L1-V3 | RO | **10054** | 10/10 | response_module | `[response_module]` | `[respond_only:success]` | `MISSING_DELIVERY_TARGET` (KNOWN) | 0 rows |

(B-2 EN C1 not fired separately in this window — the EN locale uses the same chain and same intent code path; harness `intent_mapping.mjs` defaults C1 to `briefing` regardless of locale. Validation deferred to FULL_240_RERUN.)

## Regression probes

| Probe | case | TR exec | hops | ME module | RA action | DB delta |
|---|---|---|---|---|---|---|
| R-4 | C6-L1-V1 (`create_task`) | **10068** | 10/10 | task_module | `create_task:success` `task_id=1e83ba0c-a4ce-…` | +1 row in `tasks` |
| R-1 | C2-L1-V1 (`store_memory`, fresh msg-id) | **10082** | 10/10 | memory_module | `store_memory:success` `memory_id=ad8d328e-205b-…` | +1 row in `memory_items` |

R-1 simultaneously validates the FULL_240_RUN harness fix (C2 default `save_suggestion` → `store_memory`) end-to-end through Memory V2.

## Briefing → no-write evidence

For every B-* probe, RA emitted exactly one module_result entry, `module_name='response_module'`, with action `respond_only:success`, `domain_writes_performed:false`, `response_generation_allowed:true`. `ME_Watcher_Observe_Result` was NOT triggered (correctly — the new lane is dedicated, not a watcher hijack).

## Per-thread no-write SQL evidence

| Probe | tenant | thread | window | tasks | memory_items | improvement_requests |
|---|---|---|---|---|---|---|
| B-1 | eee0…0001 | adc4c056… | 03:20–03:25 | 0 | 0 | 0 |
| B-3 | eee0…0001 | a3e8e93e… | 03:25–03:30 | 0 | 0 | 0 |
| B-4 | eee0…0001 | 9f089561… | 03:25–03:30 | 0 | 0 | 0 |
| B-5 | eee0…0001 | b3d18a6f… | 03:25–03:30 | 0 | 0 | 0 |

Cross-window verification:

```
SELECT id::text, description, status, created_at
FROM tasks
WHERE tenant_id='eee0e2e0-…0001'::uuid AND created_at BETWEEN '2026-04-26T03:20:00Z' AND '2026-04-26T03:35:00Z';
→ 1 row: 1e83ba0c-a4ce-…  description="Fă-mi un plan simplu pentru" status=open created=03:21:15Z (R-4)
```

```
SELECT id::text, status, content, created_at FROM memory_items
WHERE tenant_id='eee0e2e0-…0001'::uuid AND created_at BETWEEN '2026-04-26T03:20:00Z' AND '2026-04-26T03:35:00Z';
→ 1 row: ad8d328e-205b-…  content="Andrei preferă antrenamente dimineața" status=active created=03:21:38Z (R-1)
```

```
SELECT count(*) FROM improvement_requests
WHERE tenant_id='eee0e2e0-…0001'::uuid AND created_at BETWEEN '2026-04-26T03:20:00Z' AND '2026-04-26T03:35:00Z';
→ 0
```

The only domain rows in the mission window are the two regression-probe rows (R-1 memory + R-4 task). All four briefing probes are confirmed no-write.

## RC composition status

Each probe's RC stage was reached. RC's `RC_Compose_Final_Response` consumed the RA-aggregated module_result and prepared an outbound payload. MO's `MO_Return_Context_Error` short-circuited with `MISSING_DELIVERY_TARGET` because the e2e tenants lack a `telegram_chat_id` in `tenants.metadata` — this is `KNOWN_FIXTURE_LIMITATION` per `e2e_oracle.mjs` lines 76-92, oracle-classified.

## Stop conditions evaluated

- 0 task / memory / improvement / reminder rows from briefing probes ✓
- No raw JSON leaked to user-facing output (RC composed structured envelope; MO blocked at delivery-target fixture, not at envelope shape) ✓
- Every briefing probe reached MO ✓
- Regressions (task + memory) write to expected tables only ✓
- Workflow duplicates: 0 ✓
- Schema mutation: 0 ✓
- Path 5: NO ✓
- Unauthorized MCP write: NO ✓

**No P0 stop condition triggered.**
