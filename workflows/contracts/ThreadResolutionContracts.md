# Thread Resolution Contracts — WF-TR-01 (v2.0)

> **Canonicality: LEVEL 2 — CANONICAL SUBORDINATE**
> Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md` and `docs/Thread_Resolution_Spec.md`.

---

## 1. ThreadResolutionRequest

The Thread Resolver accepts input in BOTH nested and flat shapes for backward compatibility and flexibility.

### Nested Shape (Recommended for Phase 2+)

Complete message payload passed in a single `message` object, with reply linkage explicit:

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

All message fields at root level with optional reply and policy overrides:

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

### Field Definitions

#### Required in Both Shapes

| Field | Type | Constraints | Description |
|---|---|---|---|
| `message_id` or `message.id` | string (UUID) | Non-empty | Unique ID of the triggering message |
| `tenant_id` or `message.tenant_id` | string (UUID) | Non-empty | Tenant isolation key |
| `channel` or `message.channel` | string | Non-empty | Source channel (telegram, whatsapp, web) |
| `direction` or `message.direction` | enum | `inbound` or `outbound` | Message direction |
| `author_type` or `message.author_type` | enum | `user`, `system`, or `bot` | Who authored the message |
| `normalized_content` or `message.normalized_content` | string | Non-empty | Structurally normalized message text. This is the content class consumed by the resolver in MVP. |
| `timestamp` or `message.timestamp` | string (ISO 8601) | Valid datetime | When the message was received |
| `source_message_ref` or `message.source_message_ref` | string | Non-empty | External message reference (e.g., telegram message ID) |

#### Optional in Both Shapes

| Field | Type | Default | Description |
|---|---|---|---|
| `author_entity_id` or `message.author_entity_id` | string (UUID) or null | null | Entity ID of the message author, if resolved |
| `thread_id` (flat) or implicit in reply linkage (nested) | string (UUID) or null | null | Explicit thread reference (priority 1 shortcircuit). In nested shape, use reply context instead. |
| `reply_to_message_id` (flat) | string (UUID) or null | null | ID of the message being replied to (priority 2 lookup). In nested shape, use `reply_to_thread_id` instead. |
| `reply_to_thread_id` (nested or flat) | string (UUID) or null | null | Explicit reopen context. In nested shape, explicitly pass when available. In flat shape, use for direct thread reopening. |
| `related_entity_ids` or `message.related_entity_ids` | array of UUID strings | [] | Entity IDs mentioned in the message |
| `metadata` or `message.metadata` | object | {} | Arbitrary metadata passthrough |

#### Resolution Policy (Optional)

Per-request threshold override. If omitted, defaults apply globally:

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
| `ambiguity_margin` | number (0.0-1.0) | 0.05 | Top-two-score gap threshold for ambiguity |

#### Idempotency Key

| Field | Type | Required | Format |
|---|---|---|---|
| `idempotency_key` | string | Optional in MVP, required Phase 2+ | Any non-empty string; resolver uses it to seed deterministic `resolution_id` |

### Forbidden Fields

- `raw_content` — The resolver MUST NOT receive or consume raw_content. It operates on normalized_content (MVP) or llm_safe_content (Phase 2).
- `full_message_history` — Full raw history is forbidden by default per architecture spec.

**Important:** In the nested shape, `raw_content` may be present in the message object for downstream use by other modules, but the resolver MUST NOT consume it. The message object is passed through to downstream modules; the resolver extracts only the fields it needs.

---

## 2. ThreadResolutionResult

The resolver always returns this contract.

### Always-present Fields

| Field | Type | Constraints | Description |
|---|---|---|---|
| `module_name` | string | `"thread_resolver"` | Module identifier for integration with dispatcher |
| `result_type` | string | `"resolution"` | Result classification for result aggregator |
| `status` | enum | `success`, `partial`, `failed`, `no_action` | Execution status |
| `resolution_id` | string | Format: `tr_{message_id}_{hash(idempotency_key)}` or `tr_{message_id}_{timestamp_ms}` | Deterministic unique ID for audit write; uses hash of idempotency_key if provided, otherwise fallback to timestamp. No Date.now() alone. |
| `message_id` | string (UUID) | Matches request | The message that triggered resolution |
| `tenant_id` | string (UUID) | Matches request | Tenant isolation key |
| `decision` | enum | See Allowed Decisions | The resolution outcome (alias: `resolution_action`) |
| `resolution_action` | enum | See Allowed Decisions | Alias for `decision` field; both MUST be present and identical |
| `resolved_thread_id` | string (UUID) or null | UUID if attached/reopened, null if new/error | The thread chosen or null |
| `winning_reason` | string | Non-empty | Human-readable reason for the decision (alias: `decision_reason`) |
| `decision_reason` | string | Non-empty | Alias for `winning_reason` field; both MUST be present and identical |
| `confidence` | number (0.0-1.0) | >= 0.0 | Confidence score in the chosen resolution (0.0 for new thread, score of best candidate for attach/reopen) |
| `candidate_scores` | array | Max 10 entries, may be empty | Scored candidates for auditability |
| `ambiguity_detected` | boolean | true/false | Whether the ambiguity rule was triggered |
| `reopened_thread` | boolean | true/false | Whether a latent thread was reopened (true iff decision == reopen_latent_thread) |
| `created_thread` | boolean | true/false | Whether result indicates a new thread must be created (true iff decision == create_new_thread) |
| `needs_followup` | boolean | true/false | Whether executor should raise followup request for clarification |
| `followup_requests` | array | May be empty | List of suggested followup clarifications |
| `content_class_used` | string | `normalized_content` (MVP), `llm_safe_content` (Phase 2), `none` (error) | Which content class was consumed |
| `timestamp` | string (ISO 8601) | Valid datetime | When resolution occurred |
| `error` | object or null | See error shape | Error details if status is `failed`; null on success |

### Allowed Decisions

| Decision | Alias | Meaning | resolved_thread_id | confidence | reopened_thread |
|---|---|---|---|---|---|
| `attach_existing_thread` | `attach_existing_thread` | Message attached to an active/waiting/blocked thread | UUID of the thread | Score of best candidate | false |
| `reopen_latent_thread` | `reopen_latent_thread` | Latent thread reopened and message attached | UUID of the reopened thread | Score of best candidate | true |
| `create_new_thread` | `create_new_thread` | No suitable thread found; caller must create a new one | null | 0.0 | false |
| `fail_invalid_input` | `fail_invalid_input` | Request validation failed | null | 0.0 | false |

### Candidate Score Entry Shape

Each entry in `candidate_scores`:

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

For all other statuses, `error` is `null`.

### Scoring Components Explained

Each scored candidate shows the breakdown:

- **entity_match** (0.0 to 0.30): Author entity match (0.30 if primary, 0.15 if related)
- **semantic_match** (0.0 to 0.40): Romanian-aware stemming + character trigram hybrid (MVP) or cosine similarity between embeddings (production)
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

Duplicate inserts (same `resolution_id`) are rejected by the PK constraint with `ON CONFLICT DO NOTHING`. The audit write is **unconditional** — all decisions (including errors) are audited. This ensures true idempotency: replaying the same request with the same idempotency_key against the same DB state produces the same decision and no duplicate audit rows.

---

## 4. Allowed Statuses Referenced

### Thread statuses consumed by resolver

| Status | Treatment |
|---|---|
| `active` | Eligible for attachment (score >= attach_threshold) |
| `waiting` | Treated as active for attachment purposes |
| `blocked` | Treated as active for attachment purposes |
| `latent` | Eligible for reopen (score >= reopen_threshold); NOT returned as attachment candidate |
| `completed` | NOT loaded as candidate |
| `abandoned` | NOT loaded as candidate |
| `new` | NOT loaded as candidate (thread just created, not yet active) |

### Resolution decision statuses

See Allowed Decisions table above.

---

## 5. Thresholds

Default thresholds (configurable per-request via `resolution_policy`):

| Parameter | Default | Configurable | Description |
|---|---|---|---|
| `STRICT_ATTACH_THRESHOLD` or `attach_threshold` | 0.75 | Per-request | Minimum score to attach to active thread. Below this: create new thread. |
| `REOPEN_THRESHOLD` or `reopen_threshold` | 0.65 | Per-request | Minimum score to reopen latent thread. Below this: create new thread. |
| `AMBIGUITY_MARGIN` or `ambiguity_margin` | 0.05 | Per-request | Top-two-score gap below which ambiguity fires (create new instead of attaching) |
| `AMBIGUITY_MINIMUM` | 0.60 | Per-request | Minimum absolute score before ambiguity check applies. If best candidate below this, always create new. |
| `CANDIDATE_WINDOW_DAYS` | 30 | Per-tenant config | How far back to look for candidates |
| `MAX_CANDIDATES` | 50 | Per-request | Maximum threads loaded for scoring |

---

## 6. Entity-Semantic Divergence Rule

If `allow_entity_assisted_match` is true and message has `author_entity_id`:

1. Compute base score without entity matching
2. If base score (semantic + temporal + channel) >= STRICT_ATTACH_THRESHOLD and primary entity does NOT match:
   - This is "semantic match without entity confirmation"
   - Require score >= 0.80 (higher than normal 0.75 threshold) to proceed
   - If 0.75 <= score < 0.80, apply ambiguity rule (create new instead of risking mismatch)

This prevents false attachment when entity context strongly differs from semantic signal.

---

## 7. Contract Reconciliation — Old v1 to New v2

| v1 Field | v2 Field | Change | Reason |
|---|---|---|---|
| `decision` | `decision` + `resolution_action` (alias) | Now appears twice | Clarity for dispatcher integration; `resolution_action` is the official field for state machines |
| `decision_reason` | `decision_reason` + `winning_reason` (alias) | Now appears twice | Clarity for response composition |
| N/A | `module_name` | New | Required for Module Result contract (Architecture Spec v3 F.8) |
| N/A | `result_type` | New | Required for Module Result contract; always `"resolution"` |
| N/A | `status` | New | Required for Module Result contract (success/partial/failed/no_action) |
| N/A | `confidence` | New | Numeric confidence in resolution (0.0 for new, score for attach/reopen) |
| N/A | `reopened_thread` | New | Boolean: was a latent thread reopened? |
| N/A | `created_thread` | New | Boolean: does result indicate a new thread must be created? |
| N/A | `needs_followup` | New | Boolean: should executor raise followup question? |
| N/A | `followup_requests` | New | Array of suggested clarifications |
| `resolution_id` format | `resolution_id` format | Changed from `tr_{message_id}_{timestamp_ms}` to deterministic hash | True idempotency: replaying same request produces same resolution_id |
| N/A | `error` field on success | New | Now EXPLICIT null on success results (was previously omitted in v1) |
| N/A | Dual input shapes | New | Nested shape for Phase 2; flat shape for backward compatibility |
| N/A | `reply_to_thread_id` | New field | Explicit reopen context separate from reply_to_message_id |
| N/A | `idempotency_key` | New field | Seeds deterministic resolution_id |
| N/A | `resolution_policy` | New | Per-request threshold override |
| N/A | `raw_content` passthrough in nested | New | Nested shape preserves message.raw_content for downstream use; resolver does NOT consume it |

---

## 8. Backward Compatibility Notes

- **Flat shape continues to work** as primary input in MVP; nested shape is accepted but not required
- **resolution_action and decision are identical**: integrations may use either field name
- **winning_reason and decision_reason are identical**: integrations may use either field name
- **error is always present** (null on success): clients must check `status` field, not error presence
- **reply_to_thread_id is independent** from reply_to_message_id (flat shape can use both)

---

## 9. Validation Rules

All of the following are enforced by the resolver:

1. If `message_id` is missing or not a valid UUID: return `fail_invalid_input`
2. If `tenant_id` is missing or not a valid UUID: return `fail_invalid_input`
3. If `direction` is not `inbound` or `outbound`: return `fail_invalid_input`
4. If `author_type` is not `user`, `system`, or `bot`: return `fail_invalid_input`
5. If `normalized_content` is empty or missing: return `fail_invalid_input`
6. If both flat and nested shapes are provided, nested takes precedence
7. If `idempotency_key` is provided, use it in resolution_id hash; otherwise use timestamp as fallback
8. All threshold values in `resolution_policy` must be between 0.0 and 1.0

---

> **Level 2 — Canonical Subordinate.** Version: 2.0 | Last updated: 2026-04-15
