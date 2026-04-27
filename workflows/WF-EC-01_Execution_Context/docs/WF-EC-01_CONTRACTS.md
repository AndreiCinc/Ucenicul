# WF-EC-01 — Contracts (Consolidated Test-Readiness)

**Date:** 2026-04-19
**Status:** CLOSED 10/10 (per CLOSURE_REPORT_WF-EC-01.md)
**Source:** Canonical re-statement of `WF-EC-01_CLOSURE_CONTRACT.md` (Phase 1 document-truth reconstruction)

This document consolidates the authoritative input/output contracts and side-effect invariants for WF-EC-01 Execution Context Init.

---

## 1. Stage identity & role

| Field | Value |
|-------|-------|
| Stage code | WF-EC-01 |
| Workflow ID | `v9jih4jqeXpOJOiH` |
| Workflow name | WF-EC-01 |
| Chain position | Stage 3 (between TR-01 and OR-01) |
| Role | Runtime anchor + retry anchor + partial execution memory |
| Closure status | CLOSED 10/10 with live V1-V7 proof |

---

## 2. Input contract (authoritative)

### Flat form (preferred)

```json
{
  "tenant_id": "uuid",
  "thread_id": "uuid",
  "trigger_message_id": "uuid",
  "resolution_method": "string (optional)",
  "resolved_at": "ISO 8601 (optional)",
  "idempotency_key": "string (optional, ≤300 chars)"
}
```

**Required fields:** `tenant_id`, `thread_id`, `trigger_message_id` (all uuid).

**Optional fields:** `resolution_method`, `resolved_at`, `idempotency_key`.

### Nested form (TR-01 envelope)

```json
{
  "request": {
    "tenant_id": "uuid",
    "thread_id": "uuid",
    "trigger_message_id": "uuid",
    "resolution_method": "string (optional)",
    "resolved_at": "ISO 8601 (optional)"
  },
  "idempotency_key": "string (optional, at top level)"
}
```

**Adapter rule:** EC_Validate_Input accepts both flat and nested. If input has a `request` key, flatten it; preserve top-level `idempotency_key` if present.

### idempotency_key derivation

If caller does not supply `idempotency_key`, EC-01 derives it deterministically as:

```
${tenant_id}:${trigger_message_id}:exec_ctx:v1
```

Upper bound: 300 chars (schema constraint `execution_contexts.idempotency_key VARCHAR(300)`).

---

## 3. Output contract (authoritative)

### Success envelope

```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "thread_id": "uuid",
  "trigger_message_id": "uuid",
  "status": "initialized",
  "current_goal": null,
  "current_plan_ref": null,
  "pending_steps": [],
  "completed_steps": [],
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601",
  "error": null,
  "module_name": "execution_context_init",
  "result_type": "state",
  "status_kind": "success"
}
```

### Error envelope (invalid input)

```json
{
  "error": {
    "code": "INVALID_INPUT | INVALID_UUID | INVALID_RESOLVED_AT | IDEMPOTENCY_KEY_TOO_LONG",
    "missing_fields": ["tenant_id", ...],
    "message": "string"
  },
  "module_name": "execution_context_init",
  "result_type": "error",
  "status_kind": "failure"
}
```

---

## 4. DB side-effect contract

### Write invariants

1. **One row per unique idempotency_key:** exactly one row inserted into `public.execution_contexts` per unique `idempotency_key`.
2. **Deterministic idempotency on replay:** re-running with the same `(tenant_id, trigger_message_id)` returns the same logical row (same `id`, same `created_at`).
3. **Tenant-scoped uniqueness:** the same `trigger_message_id` under a different `tenant_id` produces a distinct row (due to tenant-scoped `idempotency_key` derivation).

### Forbidden side effects

- No writes to `threads`, `messages`, `tenants`, `rag_memories`, `tasks`, `reminders`, `outbound_delivery_ledger_claude_mcp`, or any other canonical or fallback table.
- No deletion or mutation of pre-existing `execution_contexts` rows.
- No live Telegram message dispatch (EC-01 is pre-response).
- No write when input is invalid — invalid input must flow to `EC_Return_Error` without touching the DB.

---

## 5. Node-level contracts

### EC_Trigger (Entry point)
- **Type:** `n8n-nodes-base.executeWorkflowTrigger` (v1, empty params)
- **Role:** Callable-as-sub by TR-01 and test harness.
- **Output:** Passthrough of input envelope (flat or nested).

### EC_Validate_Input (Adapter + validation)
- **Type:** `n8n-nodes-base.code` (v2)
- **Responsibility:** UUID validation, adapter for nested/flat envelopes, idempotency_key derivation.
- **Output field `_valid`:** STRING 'true' or 'false' (Switch-compatible).

### EC_Route_Valid (Conditional branch)
- **Type:** `n8n-nodes-base.switch` (v2)
- **Config:** `dataType: 'boolean'`, compare `_valid` string to 'true'/'false'.
- **Output 0:** Valid path → EC_Build_Init_Payload
- **Output 1:** Invalid path → EC_Return_Error

### EC_Build_Init_Payload (Row materialization)
- **Type:** `n8n-nodes-base.code` (v2)
- **Responsibility:** Build the exact `execution_contexts` row with all required columns.
- **Schema alignment:** tenant_id, thread_id, trigger_message_id, status='initialized', pending_steps=[], completed_steps=[], idempotency_key, expires_at.

### EC_Upsert_Context (Idempotent insert)
- **Type:** `n8n-nodes-base.postgres` (v2)
- **SQL:** `INSERT … ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`
- **Behavior:** Returns the newly inserted row on first write; returns 0 rows on conflict (handled by `alwaysOutputData: true` → EC_Load_Existing_Context fires next).
- **Credentials:** `z9nKgToNWvIW7P8f` (Postgres account 2).

### EC_Load_Existing_Context (Canonical read)
- **Type:** `n8n-nodes-base.postgres` (v2)
- **SQL:** `SELECT … WHERE idempotency_key = $1 AND tenant_id = $2::uuid LIMIT 1`
- **Role:** Ensures both first-insert and replay return the same row.
- **Credentials:** `z9nKgToNWvIW7P8f` (Postgres account 2).

### EC_Return_Result (Success terminal)
- **Type:** `n8n-nodes-base.code` (v2)
- **Responsibility:** Shape the canonical success output envelope (reads from EC_Load_Existing_Context).

### EC_Return_Error (Invalid-input terminal)
- **Type:** `n8n-nodes-base.code` (v2)
- **Responsibility:** Shape the error output envelope for invalid input (reads from EC_Route_Valid invalid branch).

---

## 6. DB schema (live, verified 2026-04-18)

```
Table: public.execution_contexts
Columns: 18 total
  id                   uuid PK default gen_random_uuid()
  tenant_id            uuid NOT NULL
  thread_id            uuid NOT NULL
  trigger_message_id   uuid NOT NULL
  status               varchar NOT NULL CHECK IN
                         ('initialized', 'planning', 'dispatching', 'executing',
                          'aggregating', 'composing', 'completed', 'failed', 'expired')
  current_goal         text NULL
  current_plan_ref     varchar(200) NULL
  pending_steps        jsonb NOT NULL DEFAULT '[]'
  completed_steps      jsonb NOT NULL DEFAULT '[]'
  idempotency_key      varchar(300) NOT NULL UNIQUE
  expires_at           timestamptz NULL
  created_at           timestamptz NOT NULL DEFAULT now()
  updated_at           timestamptz NOT NULL DEFAULT now()
  … (4 other columns for observability)

Constraints: PRIMARY KEY (id), UNIQUE (idempotency_key),
  CHECK (status IN allowed values)
Indexes: (idempotency_key) UNIQUE, (tenant_id, thread_id), (trigger_message_id),
         (status), (created_at DESC)
```

---

## 7. Live shell layout (post-closure)

| Node | Type | Version | Role |
|------|------|---------|------|
| EC_Input | executeWorkflowTrigger | 1 | Callable-as-sub entry (NEW in Phase 4) |
| EC_Validate_Input | code | 2 | Adapter + validation |
| EC_Route_Valid | switch | 2 | Valid/invalid branch |
| EC_Build_Init_Payload | code | 2 | Row builder |
| EC_Upsert_Context | postgres | 2 | Idempotent insert (creds: z9nKgToNWvIW7P8f) |
| EC_Load_Existing_Context | postgres | 2 | Canonical read (creds: z9nKgToNWvIW7P8f) |
| EC_Return_Result | code | 2 | Success terminal |
| EC_Return_Error | code | 2 | Error terminal |
| When clicking 'Execute workflow' | manualTrigger | 1 | Debug entry (retained) |
| When chat message received | chatTrigger | 1.4 | Webhook surface (disabled: true) |

**Total:** 10 nodes, 9 edges. All canonical nodes byte-identical to pre-closure baseline except for additive EC_Input and disabled chatTrigger.

---

## 8. Closure-success conditions (met)

All 10 conditions from WF-EC-01_CLOSURE_CONTRACT.md §12 verified live:

1. ✅ Live shell matches §7 target layout
2. ✅ Chat-trigger webhook surface disabled additively
3. ✅ Credentials bound on postgres nodes
4. ✅ V1 shell integrity passes
5. ✅ V2 invalid-input test passes (execution ID + terminal + DB drift zero)
6. ✅ V3 happy-path test passes (execution ID + terminal + row count +1)
7. ✅ V4 idempotency test passes (2 executions, same ID returned, row count unchanged)
8. ✅ V5 cross-tenant test passes (2 executions, distinct IDs, row count +2)
9. ✅ V6 TR→EC smoke passes (structural envelope shape acceptance proven)
10. ✅ V7 DB drift probe zero on all non-`execution_contexts` tables; fixture rows cleaned

See CLOSURE_REPORT_WF-EC-01.md §5 for full scoring and execution IDs.

---

## 9. Relation to upstream (TR-01) and downstream (OR-01)

### TR-01 → EC-01 handoff (link 1)

EC-01 accepts all five fields from TR-01's `TR_Build_Result` output:
- `tenant_id` → `tenant_id`
- `thread_id` (as `resolved_thread_id` in TR output) → `thread_id`
- `trigger_message_id` (as `message_id` in TR output) → `trigger_message_id`
- `resolution_method` (as `decision` in TR output) → `resolution_method`
- `resolved_at` (as `timestamp` in TR output) → `resolved_at`

EC-01 output is shape-compatible. Link 1 wiring is blocked on TR-01's closure cycle (TR-01 currently has no `executeWorkflow` call node targeting EC-01).

### EC-01 → OR-01 handoff (link 2)

EC-01's output envelope includes all fields OR-01 expects:
- `id` (→ execution_context_id)
- `tenant_id`
- `thread_id`
- `status='initialized'`
- Plus extras (pending_steps, completed_steps) that OR can ignore.

Link 2 wiring is blocked on OR-01's closure cycle (OR-01 must expose an `executeWorkflowTrigger` to accept the handoff).

---

## 10. Outstanding follow-ups

- **Link 1 (TR-01 → EC-01):** Requires TR-01 closure cycle to add `executeWorkflow` call node.
- **Link 2 (EC-01 → OR-01):** Requires OR-01 closure cycle to expose `executeWorkflowTrigger`.
- **availableInMCP flag:** Currently retained at `true` for developer/test convenience; pre-production hardening may disable once Link 1 is wired.

---

## Appendix: Evidence sources

This consolidated contract draws from:
- `WF-EC-01_CLOSURE_CONTRACT.md` — Phase 1 authoritative reconstruction
- `WF-EC-01_LIVE_REALITY_CHECK.md` — Phase 2 verification
- `BUILD_REPORT_WF-EC-01.md` — Phase 4 mutation documentation
- `CLOSURE_REPORT_WF-EC-01.md` — Phase 7 closure evidence + V1-V7 execution IDs
- `WF-EC-01_NODE_MAP.md` — Node-level contracts
- `WF-EC-01_CONNECTION_MAP.md` — Edge topology
