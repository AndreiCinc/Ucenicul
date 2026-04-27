# V2-OBS-STORE-PREP-INPUT-PASSTHROUGH — Diff Summary

Ran: 2026-04-24T11:26:56.362Z

- pre sha256  = 51ab7bc9860dffcee9a823ff7afa1f7de02877b9e434c588152e5015e4479a1d
- post sha256 = a149bb2e5dcb3b274d4f59e2d6974af636cba33746757ddd0c89bb18b7e264ad
- Store_Prep jsCode sha256 = 2bf0954c3c40912155889d05c9b4e3585ff908852caa450dd59d91c8b1576766

## Diff surface

- nodes: 49 -> 49 (unchanged)
- connections: unchanged
- modified nodes: ME_Memory_Store_Prep (parameters.jsCode), ME_Memory_Store_DB (parameters.query + parameters.options.queryReplacement)
- new nodes: 0
- removed nodes: 0
- SQL binds: 14 -> 17 ($14=tier, $15=user_confirmed, $16=corroboration_count, $17=embedding CASE-guarded)
- queryReplacement slots: 14 -> 17; success branch adds $json.__db.tier, $json.__db.user_confirmed, $json.__db.corroboration_count before embedding_text; error branch 14 -> 17 NULLs

## BUILD-INV-1..10

All PASS (deterministic / 0 new nodes / 47 non-target byte-identical / connections byte-identical / 17 SQL slots / queryReplacement 17+17 / Prep validates 3 new fields with safe defaults).
