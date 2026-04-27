# WF-RC-01_CONTRACTS

Derived-from-evidence contract surface for WF-RC-01 Response Composer.

Sources (all on-disk, no fabrication):
- `workflow/WF-RC-01_Response_Composer.json` (source pack v1.0)
- `docs/WF-RC-01_NODE_MAP.md` (14 nodes)
- `docs/WF-RC-01_CONNECTION_MAP.md` (13 edges)
- `scripts/rc_logic.py` (canonical deterministic logic)
- `docs/CLOSURE_REPORT__WF-RC-01.md` (pre_live_ready posture)
- `docs/12_STAGE_WF-RC-01.md` (stage spec)
- `sql/` (read-only execution-context and thread-context queries)

---

## 1. Identity

- **Workflow code**: WF-RC-01
- **Role**: Response Composer — consumes canonical `state_update_result` envelope from WF-SU-01, produces single final user-facing response for Message Out gateway.
- **Version**: `wf-rc-01-source-pack-v1.0-pre-live`
- **Tier**: CRITICAL
- **Upstream caller**: WF-SU-01 State/DB/Memory Update (via Execute Workflow node `RC_Input`)
- **Downstream consumer**: WF-MO-01 Message Out / Output Gateway (receives `composed_response` envelope)

---

## 2. Input contract (state update envelope)

Required top-level fields on input payload (ref `rc_logic.validate_state_update_input`, lines 71–153):

| Field | Type | Required value |
|---|---|---|
| `status_kind` | string | must equal `"success"` |
| `result_type` | string | must equal `"state_update_result"` |
| `execution_context_id` | string | non-empty UUID |
| `thread_id` | string | non-empty UUID |
| `tenant_id` | string | non-empty UUID |
| `state_update_result` | object | see §2.a |
| `allowed_next_stage` | string | must equal `"WF-RC-01"` |
| `response_generation_allowed` | boolean | must be `true` |
| `channel` | string | optional — defaults to `"telegram"` |
| `locale` | string | optional — defaults to `"ro"` |

### 2.a `state_update_result`

| Field | Type | Required state |
|---|---|---|
| `status` | string | must be one of `success`, `partial`, `failed`, `no_action` |
| `summary` | string | must be non-empty |
| `applied_write_classes` | array | optional — defaults to `[]` |
| `blocked_write_classes` | array | optional — defaults to `[]` |
| `warnings` | array | optional — defaults to `[]` |
| `followup_requests` | array | optional — defaults to `[]` |
| `actions_acknowledged` | array | optional — defaults to `[]` |
| `user_visible_facts` | array | optional — defaults to `[]` |

### 2.b Allowed enumerations

`channel` ∈ `{telegram, whatsapp, web}` (ref `rc_logic.ALLOWED_CHANNELS`, line 31)
`locale` ∈ `{ro, en}` (ref `rc_logic.ALLOWED_LOCALES`, line 32)
`state_update_result.status` ∈ `{success, partial, failed, no_action}` (ref `rc_logic.ALLOWED_ROLLUP_STATUS`, line 30)

---

## 3. Output contracts

### 3.a Success envelope (`composed_response`)

Returned by `RC_Return_Result`:

```json
{
  "status_kind": "success",
  "result_type": "composed_response",
  "execution_context_id": "...",
  "thread_id": "...",
  "tenant_id": "...",
  "composed_response": {
    "final_response_text": "...",
    "response_status": "success" | "partial" | "failed" | "no_action",
    "includes_followups": boolean,
    "includes_warnings": boolean,
    "followup_count": integer,
    "warning_count": integer,
    "channel": "telegram" | "whatsapp" | "web",
    "locale": "ro" | "en"
  },
  "output_gateway_allowed": true,
  "allowed_next_stage": "MESSAGE_OUT",
  "response_generation_allowed": true,
  "idempotency_key": "compose:<execution_context_id>:<16-char-sha256-digest>"
}
```

Produced by `build_output_envelope()` (ref `rc_logic.py:339–365`).

### 3.b Error envelope (`composition_error`)

Returned by `RC_Return_Error` or `RC_Return_Context_Error`:

```json
{
  "status_kind": "error",
  "result_type": "composition_error",
  "error": {
    "code": "<one of CANONICAL_ERROR_CODES>",
    "message": "...",
    "missing_fields": [...],
    "details": {...}
  }
}
```

`CANONICAL_ERROR_CODES` (ref `rc_logic.py:34–36):
- `INVALID_RESPONSE_COMPOSITION_INPUT` — missing required fields, invalid enums, malformed state_update_result
- `LINEAGE_MISMATCH` — execution_context row missing, tenant/thread/execution_context_id mismatch
- `COMPOSITION_NOT_ALLOWED` — `allowed_next_stage ≠ "WF-RC-01"` OR `response_generation_allowed ≠ true`

Unknown codes are coerced to `INVALID_RESPONSE_COMPOSITION_INPUT` per `canonical_error()` lines 58–68.

---

## 4. Routing invariants

1. **response_generation_allowed** MUST flip false→true between SU output and RC input (line 100, `rc_logic.py`). RC fails-closed if this flag is not true.

2. **allowed_next_stage** MUST equal `"WF-RC-01"` at RC input (line 94). Any other value → `COMPOSITION_NOT_ALLOWED`.

3. **Lineage validation**: execution_context row (loaded via `RC_Load_Execution_Context`) MUST match input `tenant_id`, `thread_id`, `execution_context_id` (ref `verify_lineage()`, lines 156–217). Any mismatch → `LINEAGE_MISMATCH`.

4. **Thread context load** (optional): thread row (loaded via `RC_Load_Thread_Context`) MUST match input `tenant_id` and `thread_id` if row exists. Absence of thread row is acceptable (defaults to empty dict, line 216).

5. **Composition eligibility**: `response_generation_allowed` MUST be `true` BEFORE composition begins. This is the sole eligibility gate.

6. **Status rendering**: response text is composed per `compose_response()` (lines 268–336) and MUST include:
   - Status-specific preamble in the requested `locale`
   - The input `summary` text (verbatim)
   - Action items (if `actions_acknowledged` is non-empty)
   - Applied write class labels (if any)
   - Blocked write class labels (if any)
   - User-visible facts (if any)
   - Warnings (if any)
   - Followup requests (if any)

---

## 5. Error codes (full enumeration)

| Code | Triggered by | Recovery |
|---|---|---|
| `INVALID_RESPONSE_COMPOSITION_INPUT` | Missing required top-level fields; wrong status_kind/result_type; invalid channel/locale; empty summary; invalid state_update_result.status | Upstream (SU) must fix envelope and retry |
| `COMPOSITION_NOT_ALLOWED` | `allowed_next_stage ≠ "WF-RC-01"` OR `response_generation_allowed ≠ true` | Upstream (SU) must set flags correctly and retry |
| `LINEAGE_MISMATCH` | execution_context row missing from DB; tenant_id mismatch; thread_id mismatch; execution_context_id mismatch | DB/context integrity issue; operator review required |

---

## 6. DB interactions (ref `sql/`)

Read paths (read-only, tenant-scoped):
- `RC_Load_Execution_Context` — SELECT from `public.execution_contexts` by `execution_context_id + tenant_id`
- `RC_Load_Thread_Context` — SELECT from `public.threads` by `thread_id + tenant_id`

Write paths: **None.** WF-RC-01 is read-only.

Queries:
- `rc_load_execution_context.sql` — parameterized query, `alwaysOutputData: true`
- `rc_load_thread_context.sql` — parameterized query, `alwaysOutputData: true`

---

## 7. Composition logic (render details)

### 7.a Write-class labels (i18n)

Romanian (locale=`ro`) labels:
- `execution_state_update` → "starea execuției"
- `thread_state_update` → "firul de lucru"
- `memory_candidate_persistence` → "candidații de memorie"
- `audit_persistence` → "auditul intern"
- `domain_event_write` → "scriere de eveniment de domeniu"

English (locale=`en`) labels:
- `execution_state_update` → "execution state"
- `thread_state_update` → "thread context"
- `memory_candidate_persistence` → "memory candidates"
- `audit_persistence` → "audit trail"
- `domain_event_write` → "domain event write"

(Ref `rc_logic.WRITE_CLASS_LABELS_RO/EN`, lines 38–51.)

### 7.b Status preambles

**Romanian:**
- `success`: "Am finalizat actualizarea și pot continua cu răspunsul final."
- `partial`: "Am finalizat doar parțial actualizarea necesară înainte de răspuns."
- `failed`: "Nu am putut finaliza corect pregătirea răspunsului."
- `no_action`: "Am verificat starea curentă. Nu a fost necesară nicio acțiune suplimentară."

**English:**
- `success`: "I completed the required preparation and can proceed with the final response."
- `partial`: "I completed the preparation only partially before the final response."
- `failed`: "I could not complete the response preparation correctly."
- `no_action`: "I checked the current state. No additional action was required."

(Ref `rc_logic.compose_response()`, lines 281–324.)

---

## 8. Idempotency

Output envelope includes `idempotency_key` = `compose:<execution_context_id>:<16-char-sha256>`, where SHA256 is computed from:
```
execution_context_id | thread_id | tenant_id | response_status | final_response_text
```

(Ref `rc_logic.build_output_envelope()`, lines 351–364.)

This key enables downstream idempotent message delivery.

---

## 9. Known non-contract invariants (from script verification)

- 650/650 off-node test harness green (13 families × 50 tests per family).
- V1 shell integrity, V2 invalid input, V3 happy paths, V4 followup/warning rendering, V5 lineage mismatch, V6 read-only drift — all PASS per `docs/WF-RC-01_TEST_MATRIX.md`.
- RC is SOLE producer of final user-facing response text (ownership rule, ref `docs/12_STAGE_WF-RC-01.md` line 77).

---

## 10. Versioning

- Contract surface locked at `wf-rc-01-source-pack-v1.0-pre-live`.
- Change control: any new error code, status value, channel/locale, or write-class label MUST update this file AND the test matrix before live deployment.

---

## 11. Status decay notes

- **Current posture**: `pre_live_ready` (source pack verified, live import pending)
- **Score**: 9.7/10
- **Advance allowed**: false
- **Evidence classification**:
  - source_pack_complete: true
  - script_verified: true (650/650 PASS)
  - sql_verified: static (read-only)
  - db_verified: unknown
  - live_workflow_verified: false
  - runtime_execution_verified: false

Live import and V1–V6 execution are required for closure.
