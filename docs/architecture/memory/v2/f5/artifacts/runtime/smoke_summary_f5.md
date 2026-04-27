# F5 Smoke Summary — 2026-04-21

All 7 cases executed via `mcp__f2e8be41__execute_workflow` (chat trigger, production mode) against `WF-ME-01` (`uq26nh1grIpnHju0`) immediately after F5 apply.

Prep-level oracle: the two Prep nodes now (a) recognize English subjective vocabulary, (b) fall back to `ro` when locale is missing or unknown, (c) pass non-guarded `memory_type` (fact/inference/preference/constraint) through untouched.

| Case | Exec ID | locale | memory_type | content | Prep output | Oracle |
|---|---|---|---|---|---|---|
| F5-1 | 1626 | ro  | observation | Clientul este un prost incompetent.      | `SUBJECTIVE_JUDGMENT_FORBIDDEN` | PASS (RO regex fired on `prost`) |
| F5-2 | 1635 | en  | observation | The user is a lazy idiot.                | `SUBJECTIVE_JUDGMENT_FORBIDDEN` | PASS (EN regex fired on `idiot` / `lazy`) |
| F5-3 | 1644 | en  | observation | User prefers morning meetings over evening meetings. | `__db` block (pass-through); inserted id `0fac0a58-dd2a-45f1-a4ec-371f2649f880` | PASS (neutral EN content not caught) |
| F5-4 | 1646 | _missing_ | pattern | Om de rău caracter.                 | `SUBJECTIVE_JUDGMENT_FORBIDDEN` | PASS (missing locale → `ro` default; compound RO regex fired) |
| F5-5 | 1655 | xx  | pattern     | Este dezgustator.                        | `SUBJECTIVE_JUDGMENT_FORBIDDEN` | PASS (unknown locale → `ro` fallback; RO regex fired on `dezgustator`) |
| F5-6 | 1664 | en  | fact        | The user is a lazy idiot.                | `__db` block (pass-through); inserted id `b34bd369-f4d0-4e7f-8b00-1266ffffb1ef` | PASS (guard only runs on observation/pattern) |
| F5-7 | 1666 | en  | observation (supersede) | User is incompetent. + supersedes `0fac0a58-…` | Supersede Prep emitted `SUBJECTIVE_JUDGMENT_FORBIDDEN` | PASS (mirror proof — Supersede Prep matches Store Prep behavior) |

## DB invariant (post-run)

```sql
SELECT id, memory_type, category, tier, idempotency_key, created_at
  FROM memory_items
 WHERE idempotency_key LIKE 'store_memory:d4f82a41-01cd-4fb7-9d70-573557348e74:mem-smoke-v2f5-%'
    OR idempotency_key LIKE 'supersede_memory:d4f82a41-01cd-4fb7-9d70-573557348e74:mem-smoke-v2f5-%'
 ORDER BY created_at;
```

| id | memory_type | category | tier | idempotency_key | created_at |
|---|---|---|---|---|---|
| 0fac0a58-dd2a-45f1-a4ec-371f2649f880 | observation | smoke_f5 | recent | store_memory:d4f82a41-01cd-4fb7-9d70-573557348e74:mem-smoke-v2f5-case3 | 2026-04-21T12:54:15.379Z |
| b34bd369-f4d0-4e7f-8b00-1266ffffb1ef | fact        | smoke_f5 | recent | store_memory:d4f82a41-01cd-4fb7-9d70-573557348e74:mem-smoke-v2f5-case6 | 2026-04-21T12:54:40.918Z |

Exactly 2 rows, matching the expected set. Cases F5-1 / F5-2 / F5-4 / F5-5 produced no row (Prep reject → DB insert receives nulls → NOT-NULL violation → no row). Case F5-7 produced no row in the `supersede_memory` namespace because Supersede Prep rejected the subjective content before the DB call.

## F5-3 row integrity post-supersede-attempt

```sql
SELECT id, tier, status, supersedes_memory_id, created_at, updated_at
  FROM memory_items
 WHERE id IN ('0fac0a58-dd2a-45f1-a4ec-371f2649f880','b34bd369-f4d0-4e7f-8b00-1266ffffb1ef');
```

| id | tier | status | supersedes_memory_id | created_at | updated_at |
|---|---|---|---|---|---|
| 0fac0a58-… (F5-3) | recent | active | null | 2026-04-21T12:54:15.379Z | 2026-04-21T12:54:15.379Z |
| b34bd369-… (F5-6) | recent | active | null | 2026-04-21T12:54:40.918Z | 2026-04-21T12:54:40.918Z |

F5-3's `updated_at == created_at` proves F5-7's attempted supersede did NOT mutate the row (Prep short-circuited before DB touch). `status="active"` / `tier="recent"` confirm no downstream mutation.

## Pre-existing workflow behavior note

When Prep emits `_error` envelope, the downstream `ME_Memory_*_DB` node's `queryReplacement` sees `$json._error` = truthy and uses the null-tuple fallback. Postgres then rejects on NOT-NULL (tenant_id), and `ME_Memory_*_Result` normalizes the error code to `DB_WRITE_FAILED` / `SUPERSEDE_TARGET_INVALID`. This is the identical propagation behavior already exhibited under the v1 RO-only guard and all prior frontiers (F2/F3/F4); no F5 regression. The module-level oracle is Prep output; the outer workflow's post-Prep masking is a known, separate residual (tracked in `final_verification.md §Known limitations` — "Prep rejection produces DB_WRITE_FAILED surface").

## Conclusion

F5 subjective-guard multi-language guard is LIVE and behaves exactly per operator decision §4 answers Q1–Q5 (ro + en only, sub-ms self-contained, ro fallback on missing/unknown, memory-module maintainer stewardship).
