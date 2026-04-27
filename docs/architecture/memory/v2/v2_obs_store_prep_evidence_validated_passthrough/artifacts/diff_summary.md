# V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH — Diff Summary
Ran: 2026-04-24T13:21:34.112Z

- pre  sha256 = bb63069396b347d2dea2f0bd83b25dd7bf37db39e81c9dd93759715a1e22cd43
- post sha256 = b59d449e6e8af76bc6dab9668999d7d78406fe0c48e5e952435d9f7041658452
- Store_Prep jsCode sha256 = a6b3f774faa74da9048b103e77253b8bb7cee26717dd199bbceee52c83bf5d85

## Diff surface
- nodes: 49 -> 49 (unchanged)
- connections: unchanged
- modified: ME_Memory_Store_Prep (jsCode), ME_Memory_Store_DB (query + options.queryReplacement)
- new nodes: 0; removed: 0
- SQL binds: 17 -> 18 ( $17::boolean=evidence_validated; $18::vector(1536)=embedding CASE-guarded )
- queryReplacement slots: 17 -> 18; success branch ends with $json.__db.evidence_validated, $json.__db.embedding_text; error branch 17 -> 18 NULLs

## BUILD-INV-1..10 PASS (deterministic; only 2 nodes modified; non-target byte-identical; connections byte-identical; 18 SQL slots; 18+18 queryReplacement; evidence_validated strict check present; V2-031 corroboration_count >=1 regression preserved)
