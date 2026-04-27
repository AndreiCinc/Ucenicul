-- 50 SELECT-only invariants for V2-OBS-STORE-PREP-INPUT-PASSTHROUGH
-- Replace :namespace, :tenant_id, :execution_context_id as appropriate. Do not run UPDATE/DELETE/INSERT from this file.

-- SPI-01
SELECT 'SPI-01' AS invariant_id, COUNT(*) AS rows_for_default_case FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-default-01%';

-- SPI-02
SELECT 'SPI-02' AS invariant_id, COUNT(*) AS rows_for_default_case FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-default-02%';

-- SPI-03
SELECT 'SPI-03' AS invariant_id, COUNT(*) AS rows_for_default_case FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-default-03%';

-- SPI-04
SELECT 'SPI-04' AS invariant_id, COUNT(*) AS rows_for_default_case FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-default-04%';

-- SPI-05
SELECT 'SPI-05' AS invariant_id, COUNT(*) AS rows_for_default_case FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-default-05%';

-- SPI-06
SELECT 'SPI-06' AS invariant_id, COUNT(*) AS rows_for_default_case FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-default-06%';

-- SPI-07
SELECT 'SPI-07' AS invariant_id, COUNT(*) AS rows_for_default_case FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-default-07%';

-- SPI-08
SELECT 'SPI-08' AS invariant_id, COUNT(*) AS rows_for_default_case FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-default-08%';

-- SPI-09
SELECT 'SPI-09' AS invariant_id, COUNT(*) AS rows_for_default_case FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-default-09%';

-- SPI-10
SELECT 'SPI-10' AS invariant_id, COUNT(*) AS rows_for_default_case FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-default-10%';

-- SPI-11
SELECT 'SPI-11' AS invariant_id, id, tier, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-tier-11%';

-- SPI-12
SELECT 'SPI-12' AS invariant_id, id, tier, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-tier-12%';

-- SPI-13
SELECT 'SPI-13' AS invariant_id, id, tier, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-tier-13%';

-- SPI-14
SELECT 'SPI-14' AS invariant_id, id, tier, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-tier-14%';

-- SPI-15
SELECT 'SPI-15' AS invariant_id, id, tier, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-tier-15%';

-- SPI-16
SELECT 'SPI-16' AS invariant_id, id, tier, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-tier-16%';

-- SPI-17
SELECT 'SPI-17' AS invariant_id, id, tier, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-tier-17%';

-- SPI-18
SELECT 'SPI-18' AS invariant_id, id, tier, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-tier-18%';

-- SPI-19
SELECT 'SPI-19' AS invariant_id, id, tier, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-tier-19%';

-- SPI-20
SELECT 'SPI-20' AS invariant_id, id, tier, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-tier-20%';

-- SPI-21
SELECT 'SPI-21' AS invariant_id, id, user_confirmed, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-uc-21%';

-- SPI-22
SELECT 'SPI-22' AS invariant_id, id, user_confirmed, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-uc-22%';

-- SPI-23
SELECT 'SPI-23' AS invariant_id, id, user_confirmed, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-uc-23%';

-- SPI-24
SELECT 'SPI-24' AS invariant_id, id, user_confirmed, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-uc-24%';

-- SPI-25
SELECT 'SPI-25' AS invariant_id, id, user_confirmed, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-uc-25%';

-- SPI-26
SELECT 'SPI-26' AS invariant_id, id, user_confirmed, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-uc-26%';

-- SPI-27
SELECT 'SPI-27' AS invariant_id, id, user_confirmed, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-uc-27%';

-- SPI-28
SELECT 'SPI-28' AS invariant_id, id, user_confirmed, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-uc-28%';

-- SPI-29
SELECT 'SPI-29' AS invariant_id, id, user_confirmed, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-uc-29%';

-- SPI-30
SELECT 'SPI-30' AS invariant_id, id, user_confirmed, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-uc-30%';

-- SPI-31
SELECT 'SPI-31' AS invariant_id, id, corroboration_count, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-corro-31%';

-- SPI-32
SELECT 'SPI-32' AS invariant_id, id, corroboration_count, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-corro-32%';

-- SPI-33
SELECT 'SPI-33' AS invariant_id, id, corroboration_count, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-corro-33%';

-- SPI-34
SELECT 'SPI-34' AS invariant_id, id, corroboration_count, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-corro-34%';

-- SPI-35
SELECT 'SPI-35' AS invariant_id, id, corroboration_count, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-corro-35%';

-- SPI-36
SELECT 'SPI-36' AS invariant_id, id, corroboration_count, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-corro-36%';

-- SPI-37
SELECT 'SPI-37' AS invariant_id, id, corroboration_count, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-corro-37%';

-- SPI-38
SELECT 'SPI-38' AS invariant_id, id, corroboration_count, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-corro-38%';

-- SPI-39
SELECT 'SPI-39' AS invariant_id, id, corroboration_count, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-corro-39%';

-- SPI-40
SELECT 'SPI-40' AS invariant_id, id, corroboration_count, array_length(embedding::real[],1) AS emb_dim FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-corro-40%';

-- SPI-41
SELECT 'SPI-41' AS invariant_id, idempotency_key, COUNT(*) AS rows_for_key FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-%' GROUP BY idempotency_key HAVING COUNT(*) > 1; -- expect zero rows

-- SPI-42
SELECT 'SPI-42' AS invariant_id, idempotency_key, COUNT(*) AS rows_for_key FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-%' GROUP BY idempotency_key HAVING COUNT(*) > 1; -- expect zero rows

-- SPI-43
SELECT 'SPI-43' AS invariant_id, idempotency_key, COUNT(*) AS rows_for_key FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-%' GROUP BY idempotency_key HAVING COUNT(*) > 1; -- expect zero rows

-- SPI-44
SELECT 'SPI-44' AS invariant_id, idempotency_key, COUNT(*) AS rows_for_key FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-%' GROUP BY idempotency_key HAVING COUNT(*) > 1; -- expect zero rows

-- SPI-45
SELECT 'SPI-45' AS invariant_id, idempotency_key, COUNT(*) AS rows_for_key FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:step1-%' GROUP BY idempotency_key HAVING COUNT(*) > 1; -- expect zero rows

-- SPI-46
SELECT 'SPI-46' AS invariant_id, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='memory_items' AND indexname='idx_memory_items_embedding_cos';

-- SPI-47
SELECT 'SPI-47' AS invariant_id, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='memory_items' AND indexname='idx_memory_items_embedding_cos';

-- SPI-48
SELECT 'SPI-48' AS invariant_id, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='memory_items' AND indexname='idx_memory_items_embedding_cos';

-- SPI-49
SELECT 'SPI-49' AS invariant_id, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='memory_items' AND indexname='idx_memory_items_embedding_cos';

-- SPI-50
SELECT 'SPI-50' AS invariant_id, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='memory_items' AND indexname='idx_memory_items_embedding_cos';
