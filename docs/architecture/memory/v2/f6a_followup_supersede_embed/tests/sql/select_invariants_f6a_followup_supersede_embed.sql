-- F6A-FOLLOWUP-SUPERSEDE-EMBED SELECT-only invariant probes.
-- Replace the marker literals before running. Do NOT add INSERT/UPDATE/DELETE here.
-- Required placeholders:
--   __MISSION_NAMESPACE__ = mem-smoke-f6a-followup-supersede-embed
--   __APPLY_TIMESTAMP_UTC__ = timestamp captured immediately before apply, e.g. 2026-04-24T10:00:00Z

-- DB-1 / DB-6: ivfflat index unchanged.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'memory_items'
  AND indexname = 'idx_memory_items_embedding_cos';

-- DB-1: no backfill of pre-apply NULL embeddings.
SELECT
  COUNT(*) AS pre_apply_rows,
  COUNT(*) FILTER (WHERE embedding IS NULL) AS pre_apply_null_embedding_rows,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS pre_apply_with_embedding_rows
FROM public.memory_items
WHERE created_at < '__APPLY_TIMESTAMP_UTC__'::timestamptz;

-- DB-2 / DB-3: successful supersede replacement rows in mission namespace carry 1536-d embeddings.
SELECT
  id,
  idempotency_key,
  status,
  supersedes_memory_id,
  embedding IS NOT NULL AS has_embedding,
  CASE WHEN embedding IS NULL THEN NULL ELSE array_length(embedding::real[], 1) END AS embedding_dim,
  created_at
FROM public.memory_items
WHERE idempotency_key LIKE 'supersede_memory:%:__MISSION_NAMESPACE__%'
ORDER BY created_at;

-- DB-4: old rows linked by new replacement rows are superseded and not overwritten by this mission.
SELECT
  old.id AS old_id,
  old.status AS old_status,
  old.embedding IS NOT NULL AS old_has_embedding,
  new.id AS replacement_id,
  new.status AS replacement_status,
  new.embedding IS NOT NULL AS replacement_has_embedding,
  CASE WHEN new.embedding IS NULL THEN NULL ELSE array_length(new.embedding::real[], 1) END AS replacement_embedding_dim
FROM public.memory_items new
JOIN public.memory_items old ON old.id = new.supersedes_memory_id
WHERE new.idempotency_key LIKE 'supersede_memory:%:__MISSION_NAMESPACE__%'
ORDER BY new.created_at;

-- DB-5: idempotency. No duplicate replacement row per supersede key.
SELECT idempotency_key, COUNT(*) AS rows_for_key
FROM public.memory_items
WHERE idempotency_key LIKE 'supersede_memory:%:__MISSION_NAMESPACE__%'
GROUP BY idempotency_key
HAVING COUNT(*) <> 1;

-- DB-7: row scope summary for mission namespace only.
SELECT
  split_part(idempotency_key, ':', 1) AS action,
  COUNT(*) AS rows,
  COUNT(*) FILTER (WHERE embedding IS NULL) AS null_embedding_rows,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS with_embedding_rows
FROM public.memory_items
WHERE idempotency_key LIKE '%__MISSION_NAMESPACE__%'
GROUP BY 1
ORDER BY 1;
