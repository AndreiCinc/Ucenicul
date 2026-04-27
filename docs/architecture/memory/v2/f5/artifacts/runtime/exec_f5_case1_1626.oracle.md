# F5-1 — exec 1626 — ORACLE: PASS

Started: 2026-04-21T12:53:01.322Z
Stopped: 2026-04-21T12:53:03.966Z
Status:  success

Input: locale=ro, memory_type=observation, content="Clientul este un prost incompetent."
Expected: SUBJECTIVE_JUDGMENT_FORBIDDEN at Prep (no row inserted).

Observed at ME_Memory_Store_Prep (executionIndex=8):
```
{ "_error": true,
  "error_code": "SUBJECTIVE_JUDGMENT_FORBIDDEN",
  "error_message": "Subjective character judgments not allowed under observation/pattern.",
  "missing_fields": [] }
```

Downstream: DB node receives `_error` envelope -> queryReplacement emits nulls -> Postgres NOT-NULL
violation on tenant_id -> Result node emits DB_WRITE_FAILED. This is the pre-existing
Prep-reject propagation behavior (exists identically under v1 RO-only guard). No row inserted.

Prep-level oracle satisfied.
