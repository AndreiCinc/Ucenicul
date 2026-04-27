# FULL_240_RUN · SQL Invariants

Run-tag: `f240-2026-04-26`

## Invariants exercised this window

For C2-L1-V1 (the one full-chain fire) the harness emitted these invariants:

```
assert_no_memory_write_for_case  params=[tenant=eee0…0001, thread=b82223ee…, fire=2026-04-26T03:05Z]
assert_one_outbound_for_case     params=[tenant=eee0…0001, idempotency_key=e2e:f240-2026-04-26:C2-L1-V1]
assert_idempotency_unique        (planned per matrix, not pre-built — built at walk time)
```

Not executed against DB in this window because the harness fires were diagnostic. Static expected-results given the observed chain digest:

| Invariant | Expected for C2-L1-V1 | Why |
|---|---|---|
| `assert_no_memory_write_for_case` | PASS | Harness's stale `save_suggestion` mapping routed to `improvement_module`, so 0 `memory_items` rows for this tenant+thread+window. *Note: post-harness-fix this would FAIL by design — C2 is supposed to write a memory_items row. The fix relabels C2 to `store_memory` and matrix expectation changes accordingly.* |
| `assert_one_outbound_for_case` | FAIL → demoted to KNOWN_FIXTURE_LIMITATION | MO terminated `MISSING_DELIVERY_TARGET`; oracle demotes per lines 76-92 of `e2e_oracle.mjs`. |
| `assert_idempotency_unique` | PASS | `idempotency_key=e2e:f240-2026-04-26:C2-L1-V1` only appeared once across runs. |

## Reminders baseline invariant — held end-to-end

```sql
SELECT count(*) AS c, max(updated_at) AS last_updated FROM public.reminders;
-- BEFORE: c=1, last_updated=2026-04-13T20:17:13Z
-- AFTER:  c=1, last_updated=2026-04-13T20:17:13Z (unchanged)
```

ADR-REMINDER-AS-TASK-LAYER preserved. **0 writes to `public.reminders` across all fires** in this window.

## Tenant scope invariant — observed

E2E tenant lanes (`eee0e2e0-…0001/000a/000b`) confirmed isolated from real-tenant data via the `seed_fixtures.mjs` insert filter. No real-tenant rows touched.

## Side-effect summary

See `FULL_240_RUNTIME_RESULTS.md` "Side-effect summary by table".
