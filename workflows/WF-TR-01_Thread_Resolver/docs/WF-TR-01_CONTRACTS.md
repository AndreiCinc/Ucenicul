# WF-TR-01 Thread Resolver — Contracts Canonicalization (v2.0)

> **Status:** pre_live_ready (candidate, advance_allowed=false)  
> **Provenance:** Canonical content derived from `/workflows/WF-TR-01_Thread_Resolver/docs/contracts/ThreadResolutionContracts.md`  
> **Canonicality:** LEVEL 2 — CANONICAL SUBORDINATE (per CLAUDE.md)  
> **Subordination:** Below `docs/architecture/Architecture_Spec_v3_Ucenicul.md` and `docs/Thread_Resolution_Spec.md`

---

## 1. ThreadResolutionRequest Input Contract

WF-TR-01 accepts input in **two shapes** for backward compatibility and forward flexibility.

### Nested Shape (Recommended for Phase 2+)

Complete message payload in single `message` object with explicit reply context:

```json
{
  "message": {
    "id": "uuid",
    "tenant_id": "uuid",
    "channel": "telegram",
    "direction": "inbound",
    "author_type": "user",
    "normalized_content": "string",
    "timestamp": "ISO 8601",
    "source_message_ref": "string",
    "author_entity_id": "uuid or null",
    "related_entity_ids": ["uuid", "uuid"],
    "metadata": {}
  },
  "reply_to_thread_id": "uuid or null",
  "resolution_policy": { ... },
  "idempotency_key": "string"
}
```

### Flat Shape (MVP Backward Compatibility)

All message fields at root level with optional overrides:

```json
{
  "message_id": "uuid",
  "tenant_id": "uuid",
  "channel": "telegram",
  "direction": "inbound",
  "author_type": "user",
  "normalized_content": "string",
  "timestamp": "ISO 8601",
  "source_message_ref": "string",
  "author_entity_id": "uuid or null",
  "thread_id": "uuid or null",
  "reply_to_message_id": "uuid or null",
  "related_entity_ids": ["uuid"],
  "metadata": {},
  "resolution_policy": { ... },
  "idempotency_key": "string"
}
```

### Required Fields (Both Shapes)

| Field | Type | Constraints |
|---|---|---|
| `message_id` / `message.id` | UUID string | Non-empty |
| `tenant_id` / `message.tenant_id` | UUID string | Non-empty |
| `channel` / `message.channel` | string | Non-empty (telegram, whatsapp, web, etc.) |
| `direction` / `message.direction` | enum | `inbound` or `outbound` |
| `author_type` / `message.author_type` | enum | `user`, `system`, or `bot` |
| `normalized_content` / `message.normalized_content` | string | Non-empty; structurally normalized text |
| `timestamp` / `message.timestamp` | string (ISO 8601) | Valid datetime |
| `source_message_ref` / `message.source_message_ref` | string | Non-empty; external reference (e.g., telegram message ID) |

### Optional Fields (Both Shapes)

| Field | Type | Default | Description |
|---|---|---|---|
| `author_entity_id` / `message.author_entity_id` | UUID or null | null | Author's resolved entity ID |
| `thread_id` (flat) | UUID or null | null | Explicit thread (priority 1 shortcircuit) |
| `reply_to_message_id` (flat) | UUID or null | null | Message being replied to (priority 2) |
| `reply_to_thread_id` (both) | UUID or null | null | Explicit thread reopen context |
| `related_entity_ids` / `message.related_entity_ids` | array of UUIDs | [] | Entities mentioned in message |
| `metadata` / `message.metadata` | object | {} | Arbitrary passthrough metadata |

### Resolution Policy (Optional)

Per-request threshold override; if omitted, defaults apply:

```json
{
  "attach_threshold": 0.75,
  "reopen_threshold": 0.65,
  "max_candidate_threads": 50,
  "allow_latent_reopen": true,
  "allow_entity_assisted_match": true,
  "ambiguity_margin": 0.05
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `attach_threshold` | number (0.0-1.0) | 0.75 | Minimum score to attach to active thread |
| `reopen_threshold` | number (0.0-1.0) | 0.65 | Minimum score to reopen latent thread |
| `max_candidate_threads` | integer | 50 | Maximum threads loaded for scoring |
| `allow_latent_reopen` | boolean | true | Allow reopening latent threads |
| `allow_entity_assisted_match` | boolean | true | Allow entity matching to boost score |
| `ambiguity_margin` | number (0.0-1.0) | 0.05 | Top-two-score gap threshold for ambiguity detection |

### Idempotency Key

| Field | Type | Required | Format |
|---|---|---|---|
| `idempotency_key` | string | Optional (MVP), required (Phase 2+) | Any non-empty string; seeds deterministic `resolution_id` |

### Forbidden Fields

- `raw_content` — Resolver does NOT consume raw_content. In nested shape, `raw_content` may be present for downstream use; resolver only consumes `normalized_content`.
- `full_message_history` — Full raw history forbidden per architecture spec.

### Validation Rules (Enforced by TR_Validate_Input)

1. If `message_id` missing or not valid UUID → `fail_invalid_input`
2. If `tenant_id` missing or not valid UUID → `fail_invalid_input`
3. If `direction` not `inbound` or `outbound` → `fail_invalid_input`
4. If `author_type` not `user`, `system`, or `bot` → `fail_invalid_input`
5. If `normalized_content` empty or missing → `fail_invalid_input`
6. If both flat and nested shapes provided, nested takes precedence
7. If `idempotency_key` provided, use it in resolution_id hash; otherwise use timestamp fallback
8. All threshold values in `resolution_policy` must be 0.0-1.0

---

## 2. ThreadResolutionResult Output Contract

WF-TR-01 always returns this contract structure.

### Always-Present Fields

| Field | Type | Constraints |
|---|---|---|
| `module_name` | string | `"thread_resolver"` |
| `result_type` | string | `"resolution"` |
| `status` | enum | `success`, `partial`, `failed`, `no_action` |
| `resolution_id` | string | Format: `tr_{message_id}_{hash(idempotency_key)}` or `tr_{message_id}_{timestamp_ms}` |
| `message_id` | UUID string | Matches request |
| `tenant_id` | UUID string | Matches request |
| `decision` | enum | See Allowed Decisions table |
| `resolution_action` | enum | Alias for `decision` (both present, identical) |
| `resolved_thread_id` | UUID or null | UUID if attached/reopened, null if new/error |
| `winning_reason` | string | Human-readable reason for decision |
| `decision_reason` | string | Alias for `winning_reason` (both present, identical) |
| `confidence` | number (0.0-1.0) | >= 0.0; 0.0 for new, score for attach/reopen |
| `candidate_scores` | array | Max 10 entries; may be empty |
| `ambiguity_detected` | boolean | true/false |
| `reopened_thread` | boolean | true iff decision == `reopen_latent_thread` |
| `created_thread` | boolean | true iff decision == `create_new_thread` |
| `needs_followup` | boolean | Whether executor should raise clarification request |
| `followup_requests` | array | List of suggested clarifications; may be empty |
| `content_class_used` | string | `normalized_content` (MVP), `llm_safe_content` (Phase 2), `none` (error) |
| `timestamp` | string (ISO 8601) | When resolution occurred |
| `error` | object or null | Error details if `status` is `failed`; null on success |

### Allowed Decisions

| Decision | Meaning | resolved_thread_id | confidence | reopened_thread |
|---|---|---|---|---|
| `attach_existing_thread` | Attached to active/waiting/blocked thread | UUID | Score of best candidate | false |
| `reopen_latent_thread` | Latent thread reopened | UUID | Score of best candidate | true |
| `create_new_thread` | No suitable thread found | null | 0.0 | false |
| `fail_invalid_input` | Request validation failed | null | 0.0 | false |

### Candidate Score Entry Shape

Each entry in `candidate_scores` array:

```json
{
  "thread_id": "uuid",
  "thread_status": "active | waiting | blocked | latent",
  "thread_title": "string",
  "score": 0.85,
  "entity_match": 0.3,
  "semantic_match": 0.25,
  "temporal_proximity": 0.2,
  "channel_relevance": 0.1
}
```

### Error Result Shape

When `status` is `failed`, the `error` field contains:

```json
{
  "code": "INVALID_INPUT | INVALID_TENANT_ID | INVALID_DIRECTION | INVALID_AUTHOR_TYPE | DB_ERROR",
  "message": "human-readable error description",
  "missing_fields": ["field_name_1", "field_name_2"]
}
```

For all other statuses, `error` is explicitly `null`.

### Scoring Components Breakdown

- **entity_match** (0.0 to 0.30): Author entity match (0.30 if primary, 0.15 if related)
- **semantic_match** (0.0 to 0.40): Romanian-aware stemming + character trigram hybrid (MVP) or cosine similarity (production)
- **temporal_proximity** (0.0 to 0.20): Decaying score based on time since last activity
- **channel_relevance** (0.0 to 0.10): Message channel matches thread source channels

---

## 3. Audit Payload

Written to `thread_resolution_audit` table. Fields map directly from ThreadResolutionResult:

| DB Column | Source | Type | Nullable |
|---|---|---|---|
| `resolution_id` | result.resolution_id | VARCHAR(255) PK | NO |
| `message_id` | result.message_id | UUID | NO |
| `tenant_id` | result.tenant_id | UUID | NO |
| `decision` | result.decision | VARCHAR(50) | NO |
| `resolved_thread_id` | result.resolved_thread_id | UUID | YES |
| `candidate_scores` | result.candidate_scores | JSONB | YES |
| `ambiguity_detected` | result.ambiguity_detected | BOOLEAN | NO |
| `content_class_used` | result.content_class_used | VARCHAR(50) | NO |
| `decision_reason` | result.decision_reason | TEXT | NO |
| `error` | result.error | JSONB | YES |
| `resolved_at` | result.timestamp | TIMESTAMPTZ | NO |
| `created_at` | system | TIMESTAMPTZ | NO |

### Audit Write Idempotency

The `resolution_id` is the primary key using deterministic generation: `tr_{message_id}_{hash(idempotency_key)}`.

Duplicate inserts (same `resolution_id`) are rejected by PK constraint with `ON CONFLICT DO NOTHING`. Audit write is **unconditional** — all decisions (including errors) are audited. This ensures true idempotency: replaying the same request with the same idempotency_key against the same DB state produces the same decision and no duplicate audit rows.

---

## 4. Thread Statuses Consumed by Resolver

| Status | Treatment |
|---|---|
| `active` | Eligible for attachment (score >= attach_threshold) |
| `waiting` | Treated as active for attachment purposes |
| `blocked` | Treated as active for attachment purposes |
| `latent` | Eligible for reopen (score >= reopen_threshold); NOT returned as attachment candidate |
| `completed` | NOT loaded as candidate |
| `abandoned` | NOT loaded as candidate |
| `new` | NOT loaded as candidate |

---

## 5. Default Thresholds

| Parameter | Default | Configurable | Description |
|---|---|---|---|
| `STRICT_ATTACH_THRESHOLD` | 0.75 | Per-request | Minimum score to attach to active thread |
| `REOPEN_THRESHOLD` | 0.65 | Per-request | Minimum score to reopen latent thread |
| `AMBIGUITY_MARGIN` | 0.05 | Per-request | Top-two-score gap below ambiguity fires |
| `AMBIGUITY_MINIMUM` | 0.60 | Per-request | Minimum absolute score before ambiguity check applies |
| `CANDIDATE_WINDOW_DAYS` | 30 | Per-tenant config | How far back to look for candidates |
| `MAX_CANDIDATES` | 50 | Per-request | Maximum threads loaded for scoring |

---

## 6. Entity-Semantic Divergence Rule

If `allow_entity_assisted_match` is true and message has `author_entity_id`:

1. Compute base score without entity matching
2. If base score (semantic + temporal + channel) >= STRICT_ATTACH_THRESHOLD and primary entity does NOT match:
   - This is "semantic match without entity confirmation"
   - Require score >= 0.80 (higher than normal 0.75 threshold) to proceed
   - If 0.75 <= score < 0.80, apply ambiguity rule (create new instead)

This prevents false attachment when entity context strongly differs from semantic signal.

---

## 7. Contract Reconciliation — v1 to v2

| v1 Field | v2 Field | Change | Reason |
|---|---|---|---|
| `decision` | `decision` + `resolution_action` (alias) | Now appears twice | Clarity for dispatcher; `resolution_action` official for state machines |
| `decision_reason` | `decision_reason` + `winning_reason` (alias) | Now appears twice | Clarity for response composition |
| N/A | `module_name` | New | Module Result contract (Architecture Spec v3 F.8) |
| N/A | `result_type` | New | Module Result contract; always `"resolution"` |
| N/A | `status` | New | Module Result contract (success/partial/failed/no_action) |
| N/A | `confidence` | New | Numeric confidence in resolution |
| N/A | `reopened_thread` | New | Boolean: was latent thread reopened? |
| N/A | `created_thread` | New | Boolean: does result indicate new thread must be created? |
| N/A | `needs_followup` | New | Boolean: should executor raise followup question? |
| N/A | `followup_requests` | New | Array of suggested clarifications |
| `resolution_id` format | `resolution_id` format | Changed to deterministic hash | True idempotency: same request = same ID |
| N/A | `error` field on success | New | Now EXPLICIT null on success (was omitted in v1) |
| N/A | Dual input shapes | New | Nested for Phase 2; flat for backward compat |
| N/A | `reply_to_thread_id` | New | Explicit reopen context separate from reply_to_message_id |
| N/A | `idempotency_key` | New | Seeds deterministic resolution_id |
| N/A | `resolution_policy` | New | Per-request threshold override |
| N/A | `raw_content` passthrough (nested) | New | Nested shape preserves raw_content; resolver does NOT consume |

---

## 8. Backward Compatibility Notes

- **Flat shape continues to work** as primary input in MVP; nested shape accepted but not required
- **resolution_action and decision are identical**: integrations may use either field name
- **winning_reason and decision_reason are identical**: integrations may use either field name
- **error is always present** (null on success): clients must check `status` field, not error presence
- **reply_to_thread_id is independent** from reply_to_message_id (flat shape can use both)

---

## Versioning

| Version | Date | Status | Notes |
|---|---|---|---|
| 1.0 | 2026-03-01 | Superseded | Initial contract definition |
| 2.0 | 2026-04-15 | CURRENT (pre_live_ready) | Dual shapes, deterministic ID, module result fields, audit idempotency |

**Canonicality Level:** LEVEL 2 — CANONICAL SUBORDINATE  
**Last Updated:** 2026-04-15  
**Derived From:** `/workflows/WF-TR-01_Thread_Resolver/docs/contracts/ThreadResolutionContracts.md` (lines 1-315)
