# REMAINING CORRIDORS PHASE 1 · Fixtures

> Idempotent seed batches for run-tag `rcp1-2026-04-25`. All inserts use
> `ON CONFLICT (id) DO NOTHING` (or `(idempotency_key)` for memory_items),
> so re-running the seed is safe.

## 1. Tenants

Already seeded in DB by predecessor missions (`e2e-default`,
`e2e-tenant-a`, `e2e-tenant-b`). Seed batch re-asserts them with
`ON CONFLICT (id) DO NOTHING`.

## 2. Threads (per case + memory-seed source threads)

- 1 thread per unique case_id where `thread_alias` is absent → 41 threads.
- 2 shared threads for C8 clusters A/B → 2 threads.
- 1 store thread + 3 recall threads + 2 cross-tenant probes + 1 session-only → 7 C9 threads.
- 4 memory-seed source threads (1 per pre-seeded `memory_items` row).

Total threads created: ~50. All deterministic via `detUuid(seed)`.

## 3. Messages

One row per case_id (replay shares the same `message_id`). All set
`intent` per the matrix. `source_message_ref = 'rcp1:<case_id>'`.

## 4. Memory seeds (4 rows in `public.memory_items`)

These are the recall fixtures used by C3 and C9 cross-tenant probes.
Inserted directly via SQL (not through the chain) so the test reads
known content.

| id | tenant | content | source_thread |
|---|---|---|---|
| `99000001-0001-…` | DEFAULT | "Culoarea preferată a echipei pentru branding este albastru navy (#1B2A4E)." | C3-seed-team-color |
| `99000001-0002-…` | DEFAULT | "Orele standard de lucru ale echipei sunt 09:00-18:00 ora României." | C3-seed-work-hours |
| `99000001-0003-…` | DEFAULT | "Investor preference is quarterly written reports rather than monthly calls." | C3-seed-investor-pref |
| `99000002-0001-…` | A       | "Tenant-A moneda oficială este RON conform configurației iniţiale." | C3-seed-tenant-a-currency |

Each seed row carries `metadata.rcp1_seed=true` and
`idempotency_key='rcp1-seed:<id>'` so the seed batch is idempotent.

**Embedding handling:** the seeds are inserted **without** an embedding
vector. This means semantic recall (cosine similarity over `embedding`)
will not match these rows. Recall probes will exercise the **lexical
fallback** path of `ME_Memory_Search_DB` — which still finds rows by
content substring match. This is the expected and supported degraded
mode of Memory V2's hybrid recall (per Memory V2 design freeze §F2b
hybrid CTE). Probe outcomes will reflect this characteristic.

## 5. Source-of-truth file

`artifacts/build_rcp1_fixtures.mjs` generates:
- `artifacts/envelopes/rcp1-2026-04-25/_seed.sql` (single SQL batch)
- `artifacts/envelopes/rcp1-2026-04-25/_index.json`
- `artifacts/envelopes/rcp1-2026-04-25/<RC-XXX>.envelope.json` × 56

The seed SQL is then applied against the live DB via
`mcp__postgres__execute_sql` in 1-2 `BEGIN…COMMIT` batches.

## 6. Cleanup policy

No cleanup at end of mission. Seeded rows stay in the DB as part of the
mission's audit trail. Subsequent missions can use the `rcp1:` prefix
(via `metadata.rcp1_seed=true` or `source_message_ref LIKE 'rcp1:%'`) to
filter or recycle them.
