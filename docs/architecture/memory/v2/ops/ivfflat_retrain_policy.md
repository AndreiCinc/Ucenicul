# ivfflat_retrain_policy.md

Frozen: 2026-04-25 (Memory 100% Pack, Mission B — V2-038).
Status: **CURRENT — operational policy for future pgvector `ivfflat` rebuild/retrain decisions on `memory_items.embedding`.**
Authority: subordinate to `MEMORY_V2_MISSION.md` and `CURRENT_TRUTH_POST_F5.md`. Invoked by `MEMORY_V2_DECISION_LEDGER.md` entry `V2-038`. Does NOT override the F6A / F6A-FOLLOWUP no-backfill and no-ivfflat-rebuild invariants — it extends them with a future decision procedure.

---

## Purpose

Give a future operator (and a future autonomous executor) a single page they can consult **before** deciding whether an `ivfflat` rebuild is warranted for the `memory_items.embedding` index. The policy enforces a conservative posture: no rebuild today, clear thresholds for when to consider one, and strict preconditions for any future rebuild mission.

This policy is doc-only. It **does not** rebuild, drop, create, or retrain any index. No schema mutation. No DB mutation. No workflow mutation.

---

## 1. Current index posture (as of 2026-04-25)

Authoritative index definition, read live from `pg_indexes`:

```sql
CREATE INDEX idx_memory_items_embedding_cos
  ON public.memory_items
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = '100')
  WHERE ((embedding IS NOT NULL) AND (status = 'active'::memory_status_enum));
```

Current facts:

- Vector dimension: **1536** (`text-embedding-3-small`).
- Distance: **cosine** (`vector_cosine_ops`).
- Lists: **100**.
- Partial index: only rows with `embedding IS NOT NULL AND status = 'active'`.
- Corpus size on 2026-04-25 (SELECT-only snapshot): **total_rows=265, populated_embeddings=163, null_embeddings=102, distinct_tenants=2, distinct_categories=39**.
- Embedding producers are wired for store leg (F6A, V2-029) and supersede leg (F6A-FOLLOWUP, V2-030). **Historical NULL-embedding rows are not backfilled** (DS-INV-6 from F6A closure; `F6A-X-02` interdiction remains in force).
- `ivfflat` rebuild / retrain / list resizing has **not** been performed since the index was created. `F6A-X-03` interdiction remains in force.
- Related indexes on `memory_items` (btree, pkey, unique): 8 others — all stable, not in scope of this policy.

## 2. Why rebuild might matter later (not now)

`ivfflat` with `lists=100` is a coarse quantizer: at build time the index partitions the population of vectors into 100 centroids; queries visit the closest `probes` centroids (default 1 until `SET ivfflat.probes`). For very small corpora the partitioning is over-coarse and recall is 100% regardless; for very large corpora the partitioning tends to drift from the empirical distribution as the corpus grows, and recall quality/latency degrades.

At 163 populated embeddings, the current `lists=100` configuration is already **over-partitioned** (rule of thumb: `lists ≈ sqrt(n)` → at n=163, sqrt ≈ 13). This is not a defect — empty/near-empty lists have negligible cost — but it means the index is not yet in a regime where rebuild decisions are load-bearing.

The policy below defines when that changes.

## 3. When to consider rebuild / retrain

All of the following are **triggers to evaluate**, not triggers to act. Every trigger must produce a written evaluation report; no rebuild may proceed without an explicit operator directive opening a scoped mission.

### 3.1 Corpus-size thresholds (populated embeddings per tenant)

- **Tiny — ≤ 1 000 populated embeddings per tenant.** No action. Current `lists=100` is acceptable. Monitor only.
- **Small — 1 001 to 10 000.** Monitor. Collect recall-quality samples quarterly (see §4.5). Optional: benchmark query latency.
- **Medium — 10 001 to 100 000.** **Evaluate.** Compute `target_lists ≈ ceil(sqrt(n))` per tenant (or per index-scope if multi-tenant rebuild is ever authorised). If `|current_lists − target_lists| / target_lists > 0.50` for the dominant tenant, open a rebuild-evaluation mission. Run recall-quality comparison on a frozen query set before and after a candidate rebuild in a non-prod copy. Do not rebuild prod on evaluation signals alone.
- **Large — 100 001 to 1 000 000.** **Schedule a controlled rebuild mission.** Rebuild uses `REINDEX INDEX CONCURRENTLY` (Postgres ≥ 14; confirmed-available at the time of the future mission) and a tested `lists` value from §3.6. Mission must ship preflight, dry-run on a live replica, rollback, and post-rebuild verification. Read-only paths must never break.
- **Very large — > 1 000 000.** Dedicated maintenance plan; rebuilds become periodic and need their own capacity model (disk I/O, WAL, checkpoint behaviour). Outside the scope of this short policy — open a proper architecture mission.

Populated-embedding counts must be computed per tenant when tenant isolation matters; the index is global but the hot portion per tenant is what actually drives recall quality for that tenant.

### 3.2 Embedding coverage threshold

- If `populated_embeddings / total_rows < 0.60` across the index scope (`embedding IS NOT NULL AND status = 'active'`), the corpus is embedding-sparse. Rebuild alone will not fix recall; the upstream fix is a scoped backfill mission (see §6).
- At current snapshot: `163 / 265 = 0.615` — just above the sparse threshold. No action today.

### 3.3 Recall-quality degradation signals

Collect, per tenant, on a fixed held-out query set (see §4.5):

- **Top-1 cosine-similarity distribution** — track the 50th / 90th / 99th percentiles over time; a >20 % relative drop at p50 from the baseline warrants an evaluation.
- **Recall@k vs a brute-force baseline** (`ORDER BY embedding <=> q`) with the index disabled for comparison in a non-prod replica. A drop of recall@10 below 0.90 from the established baseline warrants evaluation.

These are signals, not hard triggers. Do not rebuild in prod based on signals alone.

### 3.4 Query-latency signals

- Median latency for `ME_Memory_Search_DB` semantic CTE over the last 10 000 live executions > 150 ms, or p99 > 400 ms at full corpus temperature: open an evaluation.
- Planner choosing sequential scan for semantic queries on a non-trivial hot tenant: open an evaluation (tune `ivfflat.probes` first; `lists` change is a later step).

### 3.5 New-embedding churn since last build

If more than **30 %** of the populated rows have been inserted or replaced since the current index was built (measured by `created_at`/`updated_at` vs. the index build timestamp), open an evaluation. Until then, the live index distribution is still representative.

### 3.6 Recommended `lists` sizing (heuristic, not law)

- **Rule of thumb:** `lists ≈ ceil(sqrt(n_populated))`.
- **Floor:** at least 10 (below which probes=1 approximates brute force anyway).
- **Ceiling:** empirical; the pgvector upstream recommends benchmarking above ~1 000 lists because build time grows and list-search cost rises.
- **Must be benchmarked** in a non-prod replica before any live apply: build three candidates (`target`, `2×target`, `target/2`), compare recall@10 and p99 latency on the frozen query set, choose the Pareto-best.
- `ivfflat.probes` at query time should be tuned after lists is fixed; default 1 is often too low for cosine distance at large N.

Do not hard-code any `lists` value in this policy. The formula above is a starting point; the actual value is measured.

## 4. Operational checklist (future rebuild mission)

If an operator ever opens a rebuild mission, the executor follows this checklist. Everything below §4.4 is **do-not-do** until the mission is authorised.

### 4.1 Pre-flight (SELECT-only)

```sql
-- Corpus posture.
SELECT
  count(*) AS total_rows,
  count(*) FILTER (WHERE embedding IS NULL) AS null_embeddings,
  count(*) FILTER (WHERE embedding IS NOT NULL) AS populated_embeddings,
  count(DISTINCT tenant_id) AS distinct_tenants,
  count(DISTINCT category) AS distinct_categories
FROM memory_items;

-- Per-tenant populated-embedding distribution.
SELECT
  tenant_id,
  count(*) FILTER (WHERE status = 'active' AND embedding IS NOT NULL) AS active_populated,
  count(*) AS total
FROM memory_items
GROUP BY tenant_id
ORDER BY active_populated DESC;

-- Per-category churn since last build.
SELECT
  category,
  count(*) FILTER (WHERE created_at >= '<last_index_build_ts>') AS new_rows,
  count(*) AS total
FROM memory_items
WHERE embedding IS NOT NULL AND status = 'active'
GROUP BY category
ORDER BY new_rows DESC
LIMIT 20;

-- Current index definition and size.
SELECT
  i.relname AS indexname,
  pg_size_pretty(pg_relation_size(i.oid)) AS size,
  idx.indexdef
FROM pg_class i
JOIN pg_index ix ON ix.indexrelid = i.oid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_indexes idx ON idx.indexname = i.relname
WHERE t.relname = 'memory_items' AND i.relname LIKE 'idx_memory_items_embedding%';
```

### 4.2 Index inventory and baseline metrics

- Snapshot all indexes under `memory_items` (see `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'memory_items'`).
- Capture query-latency baseline for the semantic search CTE over a frozen 50–100 query set.
- Capture recall@10 baseline vs. brute-force (in a replica, not prod).
- Dump current `ivfflat.probes` (session default + any override in workflow config).

### 4.3 Top-k quality sample (tenant-scoped)

- Never sample across tenants — recall-quality for tenant A must not be estimated from tenant B's rows.
- Frozen query set must be tenant-local.
- Retain raw `ORDER BY embedding <=> q LIMIT k` outputs for all evaluated configurations; pin the sha256 of the query set.

### 4.4 Maintenance-window rules

- Rebuild only during a named maintenance window.
- Use `REINDEX INDEX CONCURRENTLY idx_memory_items_embedding_cos` when the Postgres version supports it (>= 14 for pgvector). Validate on a replica first.
- Do not `DROP INDEX` and `CREATE INDEX` separately in prod — the gap is a recall black hole for any live search.
- Keep non-embedding btree indexes untouched.
- Require a rollback plan: the pre-rebuild replica snapshot is the rollback source; rollback is not "drop and recreate the old" but "fail over to the replica" if recall collapses post-apply.

### 4.5 Post-rebuild verification

- Re-run the frozen query set, compare recall@10 and p99 latency to the pre-rebuild baseline.
- Accept only if recall@10 is within 2 percentage points of the pre-rebuild measurement (or strictly better) AND p99 latency is within 20 % (or strictly better).
- Publish the before/after table in the mission closeout.
- Update `MEMORY_V2_DECISION_LEDGER.md` with the new `lists` value and measured recall/latency.

### 4.6 Rollback plan (always pre-authored)

- Replica snapshot taken in §4.2 is the rollback source.
- If rebuild degrades recall below the acceptance threshold, fail over to the replica; do not attempt an in-place second rebuild under pressure.
- Record the rollback in the mission closeout and the decision ledger.

## 5. Tenant safety

- All recall/search quality samples are **tenant-scoped**. No cross-tenant sampling. No cross-tenant aggregation of embeddings.
- Rebuild does not change query semantics; the `WHERE` predicate (`embedding IS NOT NULL AND status = 'active'`) is unchanged; tenant filter continues to be applied at query level.
- Do not "optimize global recall" at the expense of tenant isolation: per-tenant p99 is the metric that matters, not a global average.
- Never share a rebuild's evaluation report across tenants as if it were representative of another tenant's corpus.

## 6. Backfill policy (unchanged — no-backfill default)

- Historical `memory_items.embedding IS NULL` rows are **not** backfilled as part of any rebuild. The F6A closure property DS-INV-6 (no-backfill) and the `F6A-X-02` interdiction both remain in force.
- If a future mission needs backfill (for example, to push embedding coverage above the §3.2 sparse threshold), it must be opened as a **dedicated backfill mission** separate from any rebuild mission. Such a mission must be:
  - tenant-aware (per-tenant batches, no global jobs);
  - idempotent (per-row stable key; safe to replay);
  - rate-limited (controlled OpenAI `text-embedding-3-small` QPS and cost);
  - reversible at the job level (halt and revert-to-NULL a specific tenant's backfilled rows without affecting others);
  - journaled (write a per-row audit trail of `before: NULL, after: <dim>` with timestamp + job id);
  - running only in a maintenance window;
  - closed out with a ledger row and evidence under a new mission folder.
- Backfill and rebuild are **two different missions**. Combining them in one pass is forbidden by this policy.

## 7. What is not allowed under this policy

- Opportunistic rebuild during unrelated feature work.
- Rebuild as a side-effect of any recall / search / store / supersede / promote fix.
- Direct DB mutation via any channel (`mcp__postgres__execute_sql UPDATE/INSERT/DELETE/DDL`, Path 5, SDK) without a rebuild-specific operator directive.
- Using `mcp__postgres__execute_sql` to run `REINDEX`, `CREATE INDEX`, `DROP INDEX`, or `VACUUM FULL` on `memory_items` or any of its indexes.
- Path 5 (direct UPDATE on `public.workflow_entity`) does not apply — it is an n8n-side bypass, unrelated to Postgres index maintenance.
- Promoting a recall-quality signal into a rebuild action in a single session; signals trigger evaluation, evaluation triggers mission, mission triggers action.
- Tuning `lists` in production without first benchmarking on a replica.
- Running the rebuild outside a named maintenance window.
- Assuming Postgres / pgvector version behaviour without verifying (`SHOW server_version; SELECT extversion FROM pg_extension WHERE extname='vector';`).
- Modifying any non-embedding index as part of the rebuild (the 8 btree/pkey/unique indexes on `memory_items` are out of scope; their maintenance is a separate backlog item).
- Backfilling historical NULL-embedding rows as part of a rebuild mission (see §6).
- Claiming memory is blocked by ivfflat at the current scale — **it is not**. This policy exists so that a future scale event is handled calmly, not to signal present risk.

## 8. Discoverability

This file is referenced from:

- `MEMORY_V2_DECISION_LEDGER.md` (V2-038 row).
- `CURRENT_TRUTH_POST_F5.md` (compact pointer in header).
- `MEMORY_V2_STATE.md` (compact pointer in active-frontier line).
- `SESSION_HANDOFF_NEXT.md` (compact pointer).
- `MEMORY_V2_CLOSEOUT.md` (compact index entry).
- `HISTORICAL_VS_CURRENT.md` — classified `[CURRENT]` on next authority-change pass if any.

Grep hints for future sessions: `ivfflat`, `retrain`, `rebuild`, `embedding coverage`, `no-backfill`, `lists sizing`, `REINDEX`.

## 9. Change log

- 2026-04-25 — V2-038 (Memory 100% Pack Mission B) — file created. No DB mutation, no workflow mutation. Corpus-size snapshot taken via SELECT-only (`total_rows=265, populated_embeddings=163, null_embeddings=102, distinct_tenants=2, distinct_categories=39`); ivfflat config captured verbatim; no thresholds crossed.

## 10. Relationship to prior decisions

- **V2-022 / V2-028** — apply-channel and MCP write restrictions. This policy only governs DB index maintenance; workflow apply channel is unchanged.
- **V2-026** — Path 5 survives as last-resort DB-bypass for `workflow_entity` writes. It does not apply to `memory_items` index maintenance. Do not reference Path 5 in any ivfflat rebuild mission.
- **F6A-X-02 / F6A-X-03** — no-backfill and no-ivfflat-rebuild interdictions remain in force. This policy inherits them and specifies the conditions under which a **new mission** may supersede them. Until that mission exists, the interdictions win.
- **V2-036** — memory_module v2 formally closed stable. This policy is a post-close operational artefact; it does not reopen memory v2 or change current truth about it.
