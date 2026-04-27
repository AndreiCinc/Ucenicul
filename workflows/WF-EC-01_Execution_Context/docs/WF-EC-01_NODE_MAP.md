# WF-EC-01 Node Map

> Evidence level: **verified by design + verified by live DB query** for the SQL targets.
> Runtime execution is NOT yet proven (see `BUILD_REPORT.md`).

This document enumerates each node's responsibility, input/output contract,
type assumptions, failure posture, and test hooks. It is the authoritative
node-level contract surface for the stage.

---

## 1. EC_Trigger

- **Type:** `n8n-nodes-base.manualTrigger` (v1)
- **Purpose:** Canonical sub-workflow / MCP entrypoint.
- **Input contract:**
  - flat:  `{ tenant_id, thread_id, trigger_message_id, resolution_method?, resolved_at?, idempotency_key? }`
  - nested: `{ request: { <above> }, idempotency_key? }`
- **Output contract:** passthrough (one item, JSON copy of input).
- **Failure posture:** n/a (trigger never fails by itself).
- **Downstream:** `EC_Validate_Input`.
- **Why Manual, not Webhook/Chat:** required for Instance-level MCP exposure; identical pattern to WF-TR-01.

## 2. EC_Validate_Input

- **Type:** `n8n-nodes-base.code` (v2)
- **Purpose:** Validate required UUIDs and derive the deterministic idempotency_key.
- **Input contract:** output of `EC_Trigger`.
- **Output contract (valid):**
  ```json
  {
    "_valid": "true",
    "tenant_id": "uuid",
    "thread_id": "uuid",
    "trigger_message_id": "uuid",
    "resolution_method": "string|null",
    "resolved_at": "ISO8601|null",
    "_idempotency_key": "string (<=300)"
  }
  ```
- **Output contract (invalid):**
  ```json
  {
    "_valid": "false",
    "_error": "INVALID_INPUT|INVALID_UUID|INVALID_RESOLVED_AT|IDEMPOTENCY_KEY_TOO_LONG",
    "_missing_fields": ["..."],
    "_request": { /* normalized echo */ }
  }
  ```
- **Failure posture:** never throws; always returns shaped output.
- **Type discipline:** `_valid` is STRING — Switch-compatible across n8n v2 and v3.
- **Downstream:** `EC_Route_Valid`.

## 3. EC_Route_Valid

- **Type:** `n8n-nodes-base.switch` (v2)
- **Purpose:** Route valid requests to the happy path; invalid requests to the error path.
- **Config:**
  - `dataType = boolean`
  - `value1 = ={{ $json._valid === "true" || $json._valid === true }}`
  - `rules[0] = equal "true"`  → output 0 (valid)
  - `rules[1] = equal "false"` → output 1 (invalid)
- **Output 0 → EC_Build_Init_Payload**
- **Output 1 → EC_Return_Error**
- **Failure posture:** if neither rule matches, default branch fires (default is null in v2); upstream contract GUARANTEES either 'true' or 'false'.
- **Runtime type alignment:** STRING 'true'/'false' is safe for both v2 and v3 Switch semantics.

## 4. EC_Build_Init_Payload

- **Type:** `n8n-nodes-base.code` (v2)
- **Purpose:** Materialize the exact row for `execution_contexts`.
- **Input contract:** output of the valid branch of `EC_Route_Valid`.
- **Output contract:**
  ```json
  {
    "tenant_id": "uuid",
    "thread_id": "uuid",
    "trigger_message_id": "uuid",
    "status": "initialized",
    "pending_steps": [],
    "completed_steps": [],
    "idempotency_key": "string",
    "expires_at": "ISO8601 (+15min)",
    "resolution_method": "string|null",
    "resolved_at": "ISO8601|null",
    "_now": "ISO8601"
  }
  ```
- **Side effects:** none (pure transform).
- **Live-schema alignment:** all keys match `public.execution_contexts` column names.
- **Downstream:** `EC_Upsert_Context`.

## 5. EC_Upsert_Context

- **Type:** `n8n-nodes-base.postgres` (v2)
- **Purpose:** Upsert (INSERT … ON CONFLICT DO NOTHING) of the new execution context row.
- **SQL:**
  ```sql
  INSERT INTO execution_contexts (
    tenant_id, thread_id, trigger_message_id, status,
    pending_steps, completed_steps, idempotency_key, expires_at
  ) VALUES (
    $1::uuid, $2::uuid, $3::uuid, $4,
    $5::jsonb, $6::jsonb, $7, $8::timestamptz
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id, tenant_id, thread_id, trigger_message_id, status,
            current_goal, current_plan_ref, pending_steps, completed_steps,
            idempotency_key, expires_at, created_at, updated_at;
  ```
- **Parameter surface:** `queryReplacement` binds 8 params in order from `$json`.
- **Node-top flag:** `alwaysOutputData: true` — REQUIRED so the downstream load fires on ON-CONFLICT (0 rows) replay.
- **On-conflict behavior:** returns 0 rows; the downstream `EC_Load_Existing_Context` loads the canonical row.
- **Failure posture:** transient DB errors propagate to n8n error branch (no error-branch wired in this stage — stage contract is success-or-invalid-input).
- **Credentials:** **manual post-import wiring required** (same pattern as WF-TR-01 — JSON carries no credential refs).
- **Downstream:** `EC_Load_Existing_Context`.

## 6. EC_Load_Existing_Context

- **Type:** `n8n-nodes-base.postgres` (v2)
- **Purpose:** Idempotent canonical read of the execution context row.
- **SQL:**
  ```sql
  SELECT id, tenant_id, thread_id, trigger_message_id, status,
         current_goal, current_plan_ref, pending_steps, completed_steps,
         idempotency_key, expires_at, created_at, updated_at
  FROM execution_contexts
  WHERE idempotency_key = $1 AND tenant_id = $2::uuid
  LIMIT 1;
  ```
- **Parameter surface:** reads `idempotency_key` and `tenant_id` from `EC_Build_Init_Payload` (via `$('EC_Build_Init_Payload').all()[0].json`) — documented cross-node reference (same pattern as WF-TR-01 D-13).
- **Why tenant_id in predicate:** defense-in-depth for cross-tenant isolation, even though `idempotency_key` is UNIQUE globally.
- **Node-top flag:** `alwaysOutputData: true`.
- **Downstream:** `EC_Return_Result`.

## 7. EC_Return_Result

- **Type:** `n8n-nodes-base.code` (v2)
- **Purpose:** Shape the final canonical ExecutionContext output.
- **Input contract:** output of `EC_Load_Existing_Context`.
- **Output contract (success):**
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
    "created_at": "ISO8601",
    "updated_at": "ISO8601",
    "error": null,
    "module_name": "execution_context_init",
    "result_type": "state",
    "status_kind": "success"
  }
  ```
- **Output contract (INTERNAL_LOAD_FAILED):** same shape with `error: { code, message }` and `status_kind: "failed"`.
- **Source-of-truth binding:** reads from `$('EC_Load_Existing_Context')` so that fresh-insert and replay return identical shapes.

## 8. EC_Return_Error

- **Type:** `n8n-nodes-base.code` (v2)
- **Purpose:** Error-shaped output for invalid-input path.
- **Input contract:** output of the invalid branch of `EC_Route_Valid`.
- **Output contract:** same top-level shape as EC_Return_Result success, but with populated `error` and `status_kind: "failed"`.
- **Side effects:** none.

---

## Type alignment summary

| Upstream field | Type | Downstream consumer | Safe? |
|---|---|---|---|
| `_valid` | STRING 'true'/'false' | EC_Route_Valid | yes — matches v2/v3 Switch |
| `tenant_id`, `thread_id`, `trigger_message_id` | UUID string | EC_Upsert_Context ($1/$2/$3::uuid) | yes |
| `pending_steps`, `completed_steps` | empty array → JSON.stringify → jsonb | EC_Upsert_Context ($5/$6::jsonb) | yes |
| `idempotency_key` | STRING ≤300 | UNIQUE column | yes |
| `expires_at` | ISO8601 string | EC_Upsert_Context ($8::timestamptz) | yes |

## Failure-mode summary

| Node | Observable failure mode | Blocker class |
|---|---|---|
| EC_Validate_Input | malformed UUID → `_valid=false` with `_error=INVALID_UUID` | contract-respecting failure |
| EC_Route_Valid | all inputs routed; no runtime failure | — |
| EC_Upsert_Context | DB unreachable / credentials missing | runtime blocker (F-category tooling) |
| EC_Load_Existing_Context | DB unreachable / 0 rows | classified as INTERNAL_LOAD_FAILED |
| EC_Return_Result | no runtime failure (pure transform) | — |
| EC_Return_Error | no runtime failure (pure transform) | — |

## DB schema alignment (live, verified)

All write fields match live `public.execution_contexts`:

- 18 columns present; status CHECK allows `initialized` (matches write).
- UNIQUE index on `idempotency_key` → ON CONFLICT target is valid.
- No FKs currently present on the table (verified by live query).

## MCP / availability

`settings.availableInMCP: true` is preserved so the workflow remains discoverable
as a sub-workflow tool by orchestrator-layer callers.
