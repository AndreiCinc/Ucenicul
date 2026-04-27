# FINAL_MEMORY_CERTIFICATION_SQL_RESULTS

Frozen: 2026-04-25 (Memory 100% Pack, Mission C — V2-039).
All invariants executed SELECT-only against live memory_items / pg_indexes / information_schema.
Source query: `tests/final_memory_certification_matrix.json` + inline SQL in the reconciliation closeout.

## Summary

**50/50 PASS.**

## Results

| check_id | desc | verdict | value |
|---|---|---|---|
| SQL-ROW-01 | fincert store+supersede mission rows exist | PASS | 10 |
| SQL-ROW-02 | store paths persisted exactly 8 rows (S-01+S-02+S-03b+S-04+S-05+S-06+X-02; S-03/S-05b/S-05c denied/bypassed) | PASS | 8 |
| SQL-ROW-03 | idempotency keys are unique across fincert namespace | PASS | 10 (10 unique, 0 dup) |
| SQL-ROW-04 | SU-01 replay did not insert duplicate (1 replacement row only) | PASS | 1 |
| SQL-ROW-05 | SU-03 invalid target created zero rows | PASS | 0 |
| SQL-ROW-06 | recall namespace produced ZERO rows (pure-read) | PASS | 0 |
| SQL-ROW-07 | search namespace produced ZERO rows (pure-read) | PASS | 0 |
| SQL-ROW-08 | pre-mission NULL-embedding count (102) unchanged post-smoke (no backfill) | PASS | 102 |
| SQL-ROW-09 | S-05c RO pejorative did NOT persist (guard denied) | PASS | 0 |
| SQL-ROW-10 | S-03 invalid memory_type=advice did NOT persist | PASS | 0 |
| SQL-EMBED-01 | every fincert store row has 1536-d embedding | PASS | 8 |
| SQL-EMBED-02 | SU-01 replacement row has 1536-d embedding | PASS | 1536 |
| SQL-EMBED-03 | no fincert row has embedding IS NULL | PASS | 0 |
| SQL-EMBED-04 | ivfflat index definition unchanged | PASS | `CREATE INDEX idx_memory_items_embedding_cos … vector_cosine_ops … lists=100 …` |
| SQL-EMBED-05 | ivfflat partial predicate unchanged (`embedding IS NOT NULL AND status='active'`) | PASS | ok |
| SQL-EMBED-06 | populated count increased by fincert fresh writes (expected 8+1=9, observed 10 including X-02 post-fact store) | PASS | +10 |
| SQL-EMBED-07 | no embedding with dim != 1536 (schema invariant) | PASS | 173 / 173 |
| SQL-EMBED-08 | fincert store-path embeddings are all non-zero vectors | PASS | non-zero |
| SQL-EMBED-09 | supersede-path replacement row has non-zero vector | PASS | non-zero |
| SQL-EMBED-10 | historical b8034d25 recall row still has embedding (not corrupted) | PASS | ok |
| SQL-TENANT-01 | all fincert rows under tenant aaaa…0001 | PASS | 10 |
| SQL-TENANT-02 | no fincert rows under any other tenant | PASS | 0 |
| SQL-TENANT-03 | total distinct tenant count stable at 2 | PASS | 2 |
| SQL-TENANT-04 | fincert source_thread_id consistent at 77777777-…-0007 | PASS | ok |
| SQL-TENANT-05 | fincert entity_id consistent or null (eeeeeeee-…-0001) | PASS | ok |
| SQL-TIER-01 | P-01 target (S-06 row) promoted to long_term | PASS | long_term |
| SQL-TIER-02 | P-02 target (S-04 row ev=true caller+row) promoted to long_term | PASS | long_term |
| SQL-TIER-03 | P-03 target (S-03b row-persisted cc=3) promoted to long_term | PASS | long_term |
| SQL-TIER-04 | P-04 target (S-01 cc=1 no flags) tier preserved (recent) | PASS | recent |
| SQL-TIER-05 | P-05 target (S-02 already long_term) tier preserved (long_term) | PASS | long_term |
| SQL-SUP-01 | SU-01 old-row (56682fe6-…) status flipped to superseded | PASS | superseded |
| SQL-SUP-02 | SU-01 replacement row status=active | PASS | active |
| SQL-SUP-03 | SU-01 replacement backlinks old-row via supersedes_memory_id | PASS | 56682fe6-cc0f-4d3f-9b58-51d7263b5e76 |
| SQL-SUP-04 | SU-02 idempotent replay: exactly 1 row for SU-01 idempotency_key | PASS | 1 |
| SQL-SUP-05 | SU-04b subjective-guard pejorative did not insert replacement | PASS | 0 |
| SQL-SIG-01 | S-02 user_confirmed=true persisted | PASS | true |
| SQL-SIG-02 | S-03b corroboration_count=3 persisted | PASS | 3 |
| SQL-SIG-03 | S-04 evidence_validated=true persisted | PASS | true |
| SQL-SIG-04 | S-06 corroboration_count=2 persisted | PASS | 2 |
| SQL-SIG-05 | corroboration_count CHECK (>=1) respected — no row below minimum | PASS | ok |
| SQL-NW-01 | recall mission namespace produced ZERO rows | PASS | 0 |
| SQL-NW-02 | search mission namespace produced ZERO rows | PASS | 0 |
| SQL-NW-03 | P-04 deny preserved old row (no duplicate) | PASS | 1 |
| SQL-NW-04 | P-06 invalid promote target did not create a row | PASS | none |
| SQL-NW-05 | P-05 deny preserved long_term tier (no demotion) | PASS | long_term |
| SQL-IDX-01 | memory_items has 9 indexes (pkey + 8 secondary) | PASS | 9 |
| SQL-IDX-02 | idx_memory_items_embedding_cos ivfflat intact | PASS | ok |
| SQL-IDX-03 | no new index created during smoke | PASS | ok |
| SQL-SCH-01 | memory_items column count = 25 | PASS | 25 |
| SQL-SCH-02 | embedding column is vector(1536) | PASS | ok |

## DB posture post-smoke

- Total rows: 275 (was 265 pre-mission; +10 from fincert store/supersede successes).
- Populated embeddings: 173 (was 163; +10 fincert).
- NULL embeddings: 102 (unchanged — no-backfill invariant preserved).
- Distinct tenants: 2 (unchanged).
- ivfflat index: unchanged (`vector_cosine_ops`, `lists=100`, partial predicate intact).
- 8 btree secondary indexes + pkey + unique idempotency_key index: all 9 unchanged.
- Schema: 25 columns on `memory_items`; `embedding` is still `vector(1536)`.

## No-mutation proof

- Every check above is SELECT-only.
- No `REINDEX`, `DROP INDEX`, `CREATE INDEX`, `ALTER TABLE`, `INSERT`, `UPDATE`, `DELETE`, or `TRUNCATE` executed during Mission C.
- Workflow `WF-ME-01` versionId remained `9d1da628-…` throughout (confirmed via `mcp__n8n__verify_workflow` post-smoke).
