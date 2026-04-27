-- 50 SELECT-only invariants for ACCEPT-VIA-CORROBORATION-PROBE
-- Replace :namespace, :tenant_id, :execution_context_id as appropriate. Do not run write SQL from this file.

-- CPI-01
SELECT 'CPI-01' AS invariant_id, id, tier, corroboration_count, user_confirmed, evidence_validated FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-accept-01%';

-- CPI-02
SELECT 'CPI-02' AS invariant_id, id, tier, corroboration_count, user_confirmed, evidence_validated FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-accept-02%';

-- CPI-03
SELECT 'CPI-03' AS invariant_id, id, tier, corroboration_count, user_confirmed, evidence_validated FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-accept-03%';

-- CPI-04
SELECT 'CPI-04' AS invariant_id, id, tier, corroboration_count, user_confirmed, evidence_validated FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-accept-04%';

-- CPI-05
SELECT 'CPI-05' AS invariant_id, id, tier, corroboration_count, user_confirmed, evidence_validated FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-accept-05%';

-- CPI-06
SELECT 'CPI-06' AS invariant_id, id, tier, corroboration_count, user_confirmed, evidence_validated FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-accept-06%';

-- CPI-07
SELECT 'CPI-07' AS invariant_id, id, tier, corroboration_count, user_confirmed, evidence_validated FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-accept-07%';

-- CPI-08
SELECT 'CPI-08' AS invariant_id, id, tier, corroboration_count, user_confirmed, evidence_validated FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-accept-08%';

-- CPI-09
SELECT 'CPI-09' AS invariant_id, id, tier, corroboration_count, user_confirmed, evidence_validated FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-accept-09%';

-- CPI-10
SELECT 'CPI-10' AS invariant_id, id, tier, corroboration_count, user_confirmed, evidence_validated FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-accept-10%';

-- CPI-11
SELECT 'CPI-11' AS invariant_id, id, tier, corroboration_count, user_confirmed, evidence_validated FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-accept-11%';

-- CPI-12
SELECT 'CPI-12' AS invariant_id, id, tier, corroboration_count, user_confirmed, evidence_validated FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-accept-12%';

-- CPI-13
SELECT 'CPI-13' AS invariant_id, id, tier, corroboration_count, user_confirmed, evidence_validated FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-accept-13%';

-- CPI-14
SELECT 'CPI-14' AS invariant_id, id, tier, corroboration_count, user_confirmed, evidence_validated FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-accept-14%';

-- CPI-15
SELECT 'CPI-15' AS invariant_id, id, tier, corroboration_count, user_confirmed, evidence_validated FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-accept-15%';

-- CPI-16
SELECT 'CPI-16' AS invariant_id, id, tier, corroboration_count FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-deny-low-16%';

-- CPI-17
SELECT 'CPI-17' AS invariant_id, id, tier, corroboration_count FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-deny-low-17%';

-- CPI-18
SELECT 'CPI-18' AS invariant_id, id, tier, corroboration_count FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-deny-low-18%';

-- CPI-19
SELECT 'CPI-19' AS invariant_id, id, tier, corroboration_count FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-deny-low-19%';

-- CPI-20
SELECT 'CPI-20' AS invariant_id, id, tier, corroboration_count FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-deny-low-20%';

-- CPI-21
SELECT 'CPI-21' AS invariant_id, id, tier, corroboration_count FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-deny-low-21%';

-- CPI-22
SELECT 'CPI-22' AS invariant_id, id, tier, corroboration_count FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-deny-low-22%';

-- CPI-23
SELECT 'CPI-23' AS invariant_id, id, tier, corroboration_count FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-deny-low-23%';

-- CPI-24
SELECT 'CPI-24' AS invariant_id, id, tier, corroboration_count FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-deny-low-24%';

-- CPI-25
SELECT 'CPI-25' AS invariant_id, id, tier, corroboration_count FROM public.memory_items WHERE idempotency_key LIKE 'store_memory:%:corro-deny-low-25%';

-- CPI-26
SELECT 'CPI-26' AS invariant_id, id, status, tier FROM public.memory_items WHERE idempotency_key LIKE '%corro-deny-invalid-26%';

-- CPI-27
SELECT 'CPI-27' AS invariant_id, id, status, tier FROM public.memory_items WHERE idempotency_key LIKE '%corro-deny-invalid-27%';

-- CPI-28
SELECT 'CPI-28' AS invariant_id, id, status, tier FROM public.memory_items WHERE idempotency_key LIKE '%corro-deny-invalid-28%';

-- CPI-29
SELECT 'CPI-29' AS invariant_id, id, status, tier FROM public.memory_items WHERE idempotency_key LIKE '%corro-deny-invalid-29%';

-- CPI-30
SELECT 'CPI-30' AS invariant_id, id, status, tier FROM public.memory_items WHERE idempotency_key LIKE '%corro-deny-invalid-30%';

-- CPI-31
SELECT 'CPI-31' AS invariant_id, id, status, tier FROM public.memory_items WHERE idempotency_key LIKE '%corro-deny-invalid-31%';

-- CPI-32
SELECT 'CPI-32' AS invariant_id, id, status, tier FROM public.memory_items WHERE idempotency_key LIKE '%corro-deny-invalid-32%';

-- CPI-33
SELECT 'CPI-33' AS invariant_id, id, status, tier FROM public.memory_items WHERE idempotency_key LIKE '%corro-deny-invalid-33%';

-- CPI-34
SELECT 'CPI-34' AS invariant_id, id, status, tier FROM public.memory_items WHERE idempotency_key LIKE '%corro-deny-invalid-34%';

-- CPI-35
SELECT 'CPI-35' AS invariant_id, id, status, tier FROM public.memory_items WHERE idempotency_key LIKE '%corro-deny-invalid-35%';

-- CPI-36
SELECT 'CPI-36' AS invariant_id, idempotency_key, COUNT(*) AS rows_for_key FROM public.memory_items WHERE idempotency_key LIKE '%corro-%' GROUP BY idempotency_key HAVING COUNT(*) > 1; -- expect zero rows

-- CPI-37
SELECT 'CPI-37' AS invariant_id, idempotency_key, COUNT(*) AS rows_for_key FROM public.memory_items WHERE idempotency_key LIKE '%corro-%' GROUP BY idempotency_key HAVING COUNT(*) > 1; -- expect zero rows

-- CPI-38
SELECT 'CPI-38' AS invariant_id, idempotency_key, COUNT(*) AS rows_for_key FROM public.memory_items WHERE idempotency_key LIKE '%corro-%' GROUP BY idempotency_key HAVING COUNT(*) > 1; -- expect zero rows

-- CPI-39
SELECT 'CPI-39' AS invariant_id, idempotency_key, COUNT(*) AS rows_for_key FROM public.memory_items WHERE idempotency_key LIKE '%corro-%' GROUP BY idempotency_key HAVING COUNT(*) > 1; -- expect zero rows

-- CPI-40
SELECT 'CPI-40' AS invariant_id, idempotency_key, COUNT(*) AS rows_for_key FROM public.memory_items WHERE idempotency_key LIKE '%corro-%' GROUP BY idempotency_key HAVING COUNT(*) > 1; -- expect zero rows

-- CPI-41
SELECT 'CPI-41' AS invariant_id, idempotency_key, COUNT(*) AS rows_for_key FROM public.memory_items WHERE idempotency_key LIKE '%corro-%' GROUP BY idempotency_key HAVING COUNT(*) > 1; -- expect zero rows

-- CPI-42
SELECT 'CPI-42' AS invariant_id, idempotency_key, COUNT(*) AS rows_for_key FROM public.memory_items WHERE idempotency_key LIKE '%corro-%' GROUP BY idempotency_key HAVING COUNT(*) > 1; -- expect zero rows

-- CPI-43
SELECT 'CPI-43' AS invariant_id, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='memory_items' AND indexname='idx_memory_items_embedding_cos';

-- CPI-44
SELECT 'CPI-44' AS invariant_id, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='memory_items' AND indexname='idx_memory_items_embedding_cos';

-- CPI-45
SELECT 'CPI-45' AS invariant_id, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='memory_items' AND indexname='idx_memory_items_embedding_cos';

-- CPI-46
SELECT 'CPI-46' AS invariant_id, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='memory_items' AND indexname='idx_memory_items_embedding_cos';

-- CPI-47
SELECT 'CPI-47' AS invariant_id, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='memory_items' AND indexname='idx_memory_items_embedding_cos';

-- CPI-48
SELECT 'CPI-48' AS invariant_id, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='memory_items' AND indexname='idx_memory_items_embedding_cos';

-- CPI-49
SELECT 'CPI-49' AS invariant_id, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='memory_items' AND indexname='idx_memory_items_embedding_cos';

-- CPI-50
SELECT 'CPI-50' AS invariant_id, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='memory_items' AND indexname='idx_memory_items_embedding_cos';
