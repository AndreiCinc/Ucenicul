# WF-RC-01_DOWNSTREAM_HANDOFF

Chain position (per `docs/architecture/n8n_Workflow_Mapping.md`): TR → EC → OR → PL → DI → ME → RA → SU → **RC → MO**.

---

## Upstream producer — WF-SU-01 State/DB/Memory Update

**Invocation**: WF-SU-01 calls WF-RC-01 via an n8n Execute Workflow node, binding to `RC_Input`.

**Envelope WF-SU-01 must produce (WF-RC-01 input contract; ref `WF-RC-01_CONTRACTS.md` §2)**:
- `status_kind = "success"`
- `result_type = "state_update_result"`
- `execution_context_id`, `thread_id`, `tenant_id` — all non-empty UUIDs
- `state_update_result` with required fields:
  - `status` ∈ `{success, partial, failed, no_action}`
  - `summary` — non-empty string
  - Optional: `applied_write_classes`, `blocked_write_classes`, `warnings`, `followup_requests`, `actions_acknowledged`, `user_visible_facts`
- `allowed_next_stage = "WF-RC-01"` — **MUST** be set to permit RC composition
- `response_generation_allowed = true` — **MUST** flip from false (at SU entry) to true (at RC entry)
- Optional: `channel` ∈ `{telegram, whatsapp, web}` (defaults to "telegram")
- Optional: `locale` ∈ `{ro, en}` (defaults to "ro")

**Upstream invariants WF-RC-01 relies on**:
1. SU has already validated that the execution context row exists and is owned by `tenant_id`.
2. SU has already performed all business writes (or decided not to).
3. SU sets `response_generation_allowed = true` ONLY if composition is eligible (fail-closed otherwise).
4. The `state_update_result` summary is honest about what was attempted and what outcome occurred (no invented success).
5. Any warnings, blocked operations, or followup requests are accurately preserved in the `state_update_result` sub-envelope.

**If any upstream invariant is violated**, WF-RC-01 returns `composition_error` with an appropriate CANONICAL_ERROR_CODE — it never throws; it never loses fail-closed posture.

---

## Downstream consumer — WF-MO-01 Message Out / Output Gateway

**Handoff**: WF-RC-01 completes and returns the envelope to SU (which called RC via Execute Workflow). SU receives the response and forwards it downstream to WF-MO-01 (or equivalent message-delivery stage).

**Envelope WF-RC-01 emits (WF-MO-01 input contract)**:
- On success (`RC_Return_Result`): canonical `composed_response` envelope (ref `WF-RC-01_CONTRACTS.md` §3.a)
- On error (`RC_Return_Error` or `RC_Return_Context_Error`): canonical `composition_error` envelope (ref `WF-RC-01_CONTRACTS.md` §3.b)

---

## Downstream invariants preserved by WF-RC-01

| Invariant | Value at handoff (success) | Value at handoff (error) | Rationale |
|---|---|---|---|
| `status_kind` | `"success"` | `"error"` | Reflects composition outcome |
| `result_type` | `"composed_response"` | `"composition_error"` | Semantic routing |
| `execution_context_id` | Exact echo of input | Omitted | MO uses ID to route response to correct context |
| `thread_id` | Exact echo of input | Omitted | MO uses thread ID for conversation threading |
| `tenant_id` | Exact echo of input | Omitted | MO uses tenant ID for tenant isolation |
| `composed_response` | Populated success envelope | N/A | MO consumes final_response_text and metadata |
| `output_gateway_allowed` | `true` | N/A | Permission for MO to proceed |
| `allowed_next_stage` | `"MESSAGE_OUT"` | N/A | Routing hint for SU/orchestrator |
| `response_generation_allowed` | `true` | N/A | Final-stage gate; no further composition allowed |
| `idempotency_key` | `compose:<exec_id>:<digest>` | N/A | MO deduplicates on this key |
| `error.code` | N/A | One of CANONICAL_ERROR_CODES | SU/MO error-path routing |

---

## Boundary validation

**WF-RC-01 side**:
- Validates incoming envelope shape at `RC_Validate_State_Update_Input` (fail-closed on gap).
- Validates `allowed_next_stage = "WF-RC-01"` and `response_generation_allowed = true` at `RC_Validate_State_Update_Input` (fail-closed on violation).
- Enforces tenant/thread/execution_context match at `RC_Verify_Lineage` (fail-closed on LINEAGE_MISMATCH).
- Loads execution context row and thread row from DB (read-only, no writes).

**Downstream (WF-MO-01) side**:
- Responsible for validating WF-RC-01's output shape on its side.
- Must check `output_gateway_allowed = true` before proceeding to message delivery.
- Must use `idempotency_key` to deduplicate across retries.
- Must handle error paths gracefully (return error envelope, do not attempt message delivery).

---

## Data lineage

| Field | Populated by | Preserved through | Consumed by |
|---|---|---|---|---|---|
| `execution_context_id` | WF-EC-01 | all stages TR→SU→RC | RC load key, MO routing key |
| `thread_id` | WF-TR-01 (origin) | all stages | RC load key, MO threading key |
| `tenant_id` | WF-TR-01 (origin) | all stages | RC lineage check, MO tenant isolation |
| `state_update_result` | WF-SU-01 (new) | SU→RC pipeline only | RC composition input |
| `composed_response` | WF-RC-01 (new) | RC→MO handoff | MO final delivery |
| `idempotency_key` | WF-RC-01 (new) | RC→MO handoff | MO deduplication |
| `error.code` | WF-RC-01 (new, on error) | RC→SU→MO error path | SU/MO error classification |

---

## Composition output details (success path)

### composed_response sub-envelope

```json
{
  "final_response_text": "<multi-line user-facing text>",
  "response_status": "success" | "partial" | "failed" | "no_action",
  "includes_followups": boolean,
  "includes_warnings": boolean,
  "followup_count": integer,
  "warning_count": integer,
  "channel": "telegram" | "whatsapp" | "web",
  "locale": "ro" | "en"
}
```

**final_response_text** is a multi-line string composed of (in order):
1. Status-specific preamble (locale-aware)
2. The input `summary` text
3. Confirmed actions (if any)
4. Applied write classes (labeled)
5. Blocked write classes (labeled)
6. User-visible facts (if any)
7. Warnings (if any)
8. Followup requests (if any)

All sections are optional except the preamble and summary.

**Example (Romanian, success, with warnings):**
```
Am finalizat actualizarea și pot continua cu răspunsul final.
Task has been updated successfully.
Aplicat: starea execuției, firul de lucru.
Atenționări: insufficient_memory; quota_approaching.
```

---

## Routing from RC to MO

WF-MO-01 receives RC output envelope via SU's forwarding. Routing decision tree:

```
RC output received
├─ status_kind == "success"?
│  ├─ YES
│  │  ├─ output_gateway_allowed == true?
│  │  │  ├─ YES → proceed to message delivery (compose SMS/Telegram/Web)
│  │  │  └─ NO → reject; operator review
│  │  └─ NO → reject; treat as upstream gate error
│
└─ status_kind == "error"?
   ├─ YES
   │  └─ Log error.code, do not attempt message delivery
   └─ NO → malformed envelope; operator review
```

---

## Channel-specific composition notes

RC composes language-aware, locale-aware **text only**. Channel-specific rendering (SMS length, Telegram markdown, Web HTML) is the responsibility of WF-MO-01, not RC.

RC guarantees:
- Text is under ~2000 characters (fits all channels)
- No channel-specific markup is injected by RC
- Locale rendering is complete (no placeholders)

---

## Error path (both RC_Return_Error and RC_Return_Context_Error)

On any validation or lineage failure, RC emits a `composition_error` envelope:

```json
{
  "status_kind": "error",
  "result_type": "composition_error",
  "error": {
    "code": "<CANONICAL_ERROR_CODE>",
    "message": "<human-readable message>",
    "missing_fields": [...],
    "details": {...}
  }
}
```

**CANONICAL_ERROR_CODES at handoff**:
- `INVALID_RESPONSE_COMPOSITION_INPUT` — malformed SU envelope
- `COMPOSITION_NOT_ALLOWED` — gates not set by SU
- `LINEAGE_MISMATCH` — DB/context integrity issue

MO must NOT attempt message delivery on error. Instead:
1. Log the error.code
2. Notify operator or escalate to SU for retry
3. Do not produce a user-visible response (fail closed)

---

## Idempotency and deduplication

`idempotency_key` format: `compose:<execution_context_id>:<16-char-sha256-digest>`

SHA256 is computed from:
```
execution_context_id | thread_id | tenant_id | response_status | final_response_text
```

**Why MO needs this**:
- If SU retries the entire pipeline (e.g., on network timeout), WF-RC-01 will produce the same `idempotency_key`.
- MO uses this key to detect and suppress duplicate message deliveries.
- Each unique execution_context + response_status + final_response_text combination produces a unique key.

---

## Version compatibility

- WF-RC-01 output envelope: locked at `wf-rc-01-source-pack-v1.0-pre-live`.
- A change to `CANONICAL_ERROR_CODES` or the `composed_response` shape is a breaking change against WF-MO-01; requires coordinated version bump + contract update on both sides.
- Status values (`success`, `partial`, `failed`, `no_action`) are part of the contract; any new status requires a coordinated change.

---

## Pre-live posture notes

- **Current status**: pre_live_ready (source pack verified, live import and V1–V6 execution pending)
- **Score**: 9.7/10
- **Evidence classification**:
  - source_pack_complete: true
  - script_verified: true (650/650 PASS)
  - sql_verified: static (read-only)
  - db_verified: unknown
  - live_workflow_verified: false
  - runtime_execution_verified: false

Live import and end-to-end execution are required before MO integration.

---

## Misfiled reports reference

**Note on file location drift**: WF-RC-01 closure and audit reports are currently located in `docs/` (not `reports/`). These are canonical:
- `docs/CLOSURE_REPORT__WF-RC-01.md` — canonical closure evidence
- `docs/AUDIT_REPORT__WF-RC-01.md` — canonical audit verdict

This drift should be corrected in post-live reorganization.
