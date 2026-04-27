# WF-TR-01 Thread Resolver — MCP Technical Sheet (v3.1)

> **Version:** 3.1 | **Last updated:** 2026-04-16 | **Status:** Step 1 CLOSED — Runtime Verified
> **Canonicality:** Level 3 (Subordinate to Architecture Spec v3, Thread Resolution Spec v2.0, n8n Workflow Mapping)
> **Audience:** n8n operators, Claude implementation, backend engineers, security auditors

---

## 1. Workflow Identity

| Property | Value |
|---|---|
| Workflow ID (n8n) | `wI8hpSROxQI0zC9f` |
| Workflow Name | WF-TR-01 Thread Resolver |
| Purpose | Resolve which thread a new message belongs to |
| Scope | Message ingestion → thread resolution (no planning, no response composition) |
| Architecture Role | Resolver module (thread-first, deterministic, audit-enabled) |
| Tier | Core infrastructure (blocks execution context creation) |
| Node Count | 20 (19 canonical + 1 Telegram Trigger non-canonical) |
| Connection Count | 18 |
| Database Tables | 4 (messages, threads, entities, thread_resolution_audit) |
| Status | Active, MCP-exposed, Step 1 CLOSED |
| Owner | Ucenicul architecture authority |
| Test Coverage | 16 fixture cases (TC-01 through TC-16) + 3 runtime-verified paths |
| Runtime Verification | 2026-04-16 — Scoring (exec 679), Shortcircuit (exec 682), Error (exec 683) |

### Scope

**In scope:**
- Validating ThreadResolutionRequest (both nested and flat shapes)
- Explicit thread references (thread_id, reply_to_thread_id, reply_to_message_id)
- Multi-signal candidate scoring (entity + semantic + temporal + channel)
- Decision logic with threshold-based attachment and latent reopening
- Audit trail recording (success and error paths)
- Deterministic result generation (hash-based resolution_id)

**Not in scope:**
- Message normalization (input is pre-normalized via normalized_content field)
- Entity resolution (assumes entities already loaded from entities table)
- Planning or execution scheduling
- Response composition
- Privacy transformation (MVP: content_class passthrough, Phase 2: NO-OP placeholder)

---

## 2. MCP Exposure Summary

| Property | Value |
|---|---|
| Trigger Type | `n8n-nodes-base.manualTrigger` v1 |
| MCP-compatible | Yes |
| Exposure Method | n8n Instance-level MCP Server |
| Input Activation | Workflow must be **published (active)** |
| Input Format | JSON matching ThreadResolutionRequest shape |
| Input Validation | Handled by TR_Validate_Input node |
| Output Format | JSON matching ThreadResolutionResult shape |
| Tool Name (MCP) | Auto-derived from workflow name: "WF-TR-01 Thread Resolver" |

### How to Expose via n8n MCP

1. **Import** the workflow JSON: `WF-TR-01_Thread_Resolver.json`
2. **Configure PostgreSQL credentials** on all five Postgres nodes (same credential for all)
3. **Publish** the workflow (activate it) in n8n
4. In **n8n Settings > Integrations > MCP Server**, enable the MCP server feature
5. The workflow appears as an MCP tool
6. Any MCP client (Claude, etc.) can invoke it by sending ThreadResolutionRequest JSON

### MCP Input Handling

- Manual trigger receives **empty JSON** `{}` when invoked via MCP
- TR_Validate_Input node handles this gracefully: empty input → `_valid=false`, error path activated
- Well-formed ThreadResolutionRequest JSON is passed directly to the workflow
- Input can be either nested shape (user contract) or flat shape (internal)

---

## 3. Node Inventory (Authoritative)

| # | Node Name | Type | Version | Role | Execution | Output |
|---|---|---|---|---|---|---|
| 1 | TR_Trigger | manualTrigger | v1 | MCP entry point | Always | Empty JSON or input |
| 2 | TR_Validate_Input | code | v2 | Validate + normalize (nested→flat) | Always | `{_valid, _input, _errors}` |
| 3 | TR_Route_Valid | switch | v2 | Route valid vs invalid | Always | Branch 0 (valid) or Branch 1 (invalid) |
| 4 | TR_Select_Content_Class | code | v2 | Select content_class for scoring | On valid | `{content_class, content}` |
| 5 | TR_Check_Explicit_Refs | code | v2 | Check thread_id / reply_to_thread_id | On content selected | `{has_explicit_ref, explicit_thread_id}` |
| 6 | TR_Route_Shortcircuit | switch | v2 | Route explicit vs scoring path | On refs checked | Branch 0 (shortcircuit) or Branch 1 (continue) |
| 7 | TR_Load_Reply_Context | postgres | v2 | Lookup parent message thread | On continue | Thread ID or null |
| 8 | TR_Process_Reply_Result | code | v2 | Process reply lookup | On context loaded | `{reply_thread_id, found}` |
| 9 | TR_Route_After_Reply | switch | v2 | Route reply-resolved vs scoring | On reply processed | Branch 0 (resolved) or Branch 1 (not resolved) |
| 10 | TR_Load_Candidate_Threads | postgres | v2 | Load active/latent threads (30d) | On not resolved | Thread array |
| 11 | TR_Load_Entity_Hints | postgres | v2 | Load entity records for scoring | On threads loaded | Entity array |
| 12 | TR_Score_Candidates | code | v2 | Romanian-aware scoring engine | On entities loaded | `{scored_candidates, best_score, second_score}` |
| 13 | TR_Apply_Decision_Policy | code | v2 | Threshold-based decision + ambiguity | On scoring done | `{decision, resolved_thread_id, divergence_rule_fired}` |
| 14 | TR_Build_Result | code | v2 | Build success result (dual fields) | On decision made (all paths) | ThreadResolutionResult (success) |
| 15 | TR_Build_Error_Result | code | v2 | Build error result | On invalid input | ThreadResolutionResult (error) |
| 16 | TR_Write_Audit | postgres | v2 | Write audit (success path) | On result built (success) | Insert count |
| 17 | TR_Write_Error_Audit | postgres | v2 | Write audit (error path) | On error result built | Insert count |
| 18 | TR_Return_Result | code | v2 | Return final success result | On audit written (success) | ThreadResolutionResult (pass-through) |
| 19 | TR_Return_Error | code | v2 | Return final error result | On error audit written | ThreadResolutionResult (pass-through) |

---

## 4. Node-by-Node Responsibilities

### 1. TR_Trigger (manualTrigger v1)

**Purpose:** MCP entry point. Receives ThreadResolutionRequest JSON or empty object.

**Configuration:**
- Trigger name: "TR_Trigger"
- No special configuration required

**Output:**
- If invoked via MCP with JSON: returns JSON as-is
- If invoked manually or without input: returns `{}`

**Constraints:**
- Must be published (active) for MCP exposure
- Cannot be changed to executeWorkflowTrigger (that is the legacy pattern)

---

### 2. TR_Validate_Input (code v2)

**Purpose:** Validate and normalize ThreadResolutionRequest. Detects both nested and flat shapes, adapts to canonical flat form.

**Input:** Raw JSON from TR_Trigger (nested, flat, or empty)

**Logic:**
1. Check if input is empty or not an object → invalid
2. Detect shape: nested (has "request" key) or flat (has "message_id" or "tenant_id" directly)
3. If nested: extract request.message, request.reply_context, request.resolution_policy
4. If flat: use input directly
5. Validate required fields: message_id, tenant_id, channel, direction, author_type, normalized_content, timestamp, source_message_ref
6. Set defaults for optional policy fields: attach_threshold (0.75), reopen_threshold (0.65), ambiguity_margin (0.05)
7. Normalize all string fields to lowercase where appropriate

**Output:**
```json
{
  "_valid": true|false,
  "_input": {<normalized flat input>},
  "_errors": ["field1", "field2"] | null
}
```

**Constraints:**
- Must NOT reject well-formed requests
- Must handle both input shapes transparently
- Must set _valid=false for empty input (expected MCP behavior)
- Must preserve all metadata fields (author_entity_id, related_entity_ids, etc.)

---

### 3. TR_Route_Valid (switch v2)

**Purpose:** Route valid vs invalid inputs to different result builders.

**Input:** _valid field from TR_Validate_Input

**Logic:**
- Branch 0 (output_0): IF _valid === true → send to TR_Select_Content_Class
- Branch 1 (output_1): IF _valid === false → send to TR_Build_Error_Result

**Constraints:**
- Must have exactly two output branches
- value1 field (switch condition) must check _valid

---

### 4. TR_Select_Content_Class (code v2)

**Purpose:** Privacy-aware content class selection. MVP: always select normalized_content. Phase 2 placeholder: support llm_safe_content, rag_safe_content.

**Input:** Normalized flat input from TR_Validate_Input (via previous node output)

**Logic:**
1. MVP: Always use normalized_content field from input
2. Phase 2 (placeholder, NO-OP in MVP):
   - If caller specifies required_content_class, validate it
   - If not available, fail with missing_content_class error
3. Return both content_class name and actual content

**Output:**
```json
{
  "content_class": "normalized_content",
  "content": "<the actual content text>",
  "message_id": "<from input>"
}
```

**Constraints:**
- MVP: No actual privacy transformation
- Phase 2: Placeholder implementation (no-op)
- Must NOT flow raw_content into LLM or RAG
- Must preserve tenant_id and message_id for audit trail

---

### 5. TR_Check_Explicit_Refs (code v2)

**Purpose:** Shortcircuit detection. Check if message has explicit thread_id or reply_to_thread_id.

**Input:** Normalized flat input (from previous output)

**Logic:**
1. Check if input.thread_id is non-null UUID → has explicit reference
2. Check if input.reply_to_thread_id is non-null UUID → has explicit reference
3. If either is present, set has_explicit_ref=true and store the thread_id
4. Otherwise, has_explicit_ref=false

**Output:**
```json
{
  "has_explicit_ref": true|false,
  "explicit_thread_id": "uuid|null",
  "content": "<from previous>",
  "message_id": "<from previous>"
}
```

**Constraints:**
- Must validate UUIDs (reject malformed)
- Must prefer thread_id over reply_to_thread_id if both present
- Must pass through all prior fields unchanged

---

### 6. TR_Route_Shortcircuit (switch v2)

**Purpose:** Route explicit references (shortcircuit) vs score-based path.

**Input:** has_explicit_ref from TR_Check_Explicit_Refs

**Logic:**
- Branch 0 (output_0): IF has_explicit_ref === true → send to TR_Build_Result (shortcircuit path)
- Branch 1 (output_1): IF has_explicit_ref === false → send to TR_Load_Reply_Context (scoring path)

**Constraints:**
- Shortcircuit result (Branch 0) must have confidence=1.0 and decision_reason="explicit_thread_reference" or "explicit_thread_id"

---

### 7. TR_Load_Reply_Context (postgres v2)

**Purpose:** DB lookup for parent message's thread. Used when message is a reply but has no explicit thread_id.

**Query (exact):**
```sql
SELECT m.thread_id 
FROM messages m 
WHERE m.id = $1 AND m.tenant_id = $2 AND m.thread_id IS NOT NULL 
LIMIT 1
```

**Input Parameters:**
- $1: message_id from reply_to_message_id
- $2: tenant_id

**Configuration:**
- Credential: PostgreSQL (shared with all Postgres nodes)
- Query type: SELECT
- Return format: JSON array of objects

**CRITICAL BLOCKER:**
The current messages table schema is **missing** the thread_id column. This query will fail with "column thread_id does not exist" until migration SQL is applied.

**Output on success:**
```json
[
  {
    "thread_id": "uuid|null"
  }
]
```

**Output on not found:**
```json
[]
```

**Constraints:**
- Must use parameterized query ($1, $2)
- Must filter by tenant_id (cross-tenant isolation)
- Must NOT return rows where thread_id IS NULL

---

### 8. TR_Process_Reply_Result (code v2)

**Purpose:** Process the result from TR_Load_Reply_Context. Extract thread_id or null.

**Input:** Result array from TR_Load_Reply_Context

**Logic:**
1. If result array has length > 0 and result[0].thread_id is not null: found=true, reply_thread_id=result[0].thread_id
2. Otherwise: found=false, reply_thread_id=null

**Output:**
```json
{
  "reply_thread_id": "uuid|null",
  "found": true|false,
  "message_id": "<from earlier>",
  "content": "<from earlier>"
}
```

**Constraints:**
- Must handle empty result set gracefully
- Must preserve all prior context fields

---

### 9. TR_Route_After_Reply (switch v2)

**Purpose:** Route reply-resolved case vs continue to scoring.

**Input:** found field from TR_Process_Reply_Result

**Logic:**
- Branch 0 (output_0): IF found === true → send to TR_Build_Result (reply-resolved shortcircuit)
- Branch 1 (output_1): IF found === false → send to TR_Load_Candidate_Threads (scoring path)

**Constraints:**
- Branch 0 result must have decision="attach_existing_thread" and confidence=0.95

---

### 10. TR_Load_Candidate_Threads (postgres v2)

**Purpose:** Load candidate threads for scoring. Active, waiting, blocked, and latent threads in the 30-day window.

**Query (exact):**
```sql
SELECT id, tenant_id, title, thread_type, status, summary, last_activity_at, 
       primary_entity_id, related_entity_ids, source_channels, created_at 
FROM threads 
WHERE tenant_id = $1 
  AND status IN ('active', 'waiting', 'blocked', 'latent') 
  AND last_activity_at >= NOW() - INTERVAL '30 days' 
ORDER BY last_activity_at DESC 
LIMIT 50
```

**Input Parameters:**
- $1: tenant_id

**Configuration:**
- Credential: PostgreSQL (same as other Postgres nodes)
- Query type: SELECT
- Return format: JSON array of objects
- Max results: 50

**Output:**
```json
[
  {
    "id": "uuid",
    "tenant_id": "uuid",
    "title": "string",
    "thread_type": "string",
    "status": "active|waiting|blocked|latent",
    "summary": "string",
    "last_activity_at": "ISO 8601",
    "primary_entity_id": "uuid|null",
    "related_entity_ids": ["uuid"] | null,
    "source_channels": ["string"] | null,
    "created_at": "ISO 8601"
  }
]
```

**Constraints:**
- Must use parameterized query ($1)
- Must filter by tenant_id (cross-tenant isolation)
- Must include all four status types (active, waiting, blocked, latent)
- Must order by last_activity_at DESC (most recent first)
- Must NOT exclude latent threads (D-16 fix)

---

### 11. TR_Load_Entity_Hints (postgres v2)

**Purpose:** Load entity records for scoring. Loads author entity and related entities mentioned in the message.

**Query (exact):**
```sql
SELECT id, entity_type, display_name, canonical_name, aliases 
FROM entities 
WHERE tenant_id = $1 
  AND (id = COALESCE(NULLIF($2, ''), NULL) 
       OR id = ANY(CASE WHEN $3 = '{}' THEN ARRAY[]::uuid[] ELSE $3::uuid[] END)) 
  AND status = 'active' 
LIMIT 20
```

**Input Parameters:**
- $1: tenant_id
- $2: author_entity_id (or empty string if null)
- $3: related_entity_ids as JSON array (or '{}' if empty)

**Configuration:**
- Credential: PostgreSQL
- Query type: SELECT
- Return format: JSON array of objects
- Max results: 20

**Output:**
```json
[
  {
    "id": "uuid",
    "entity_type": "string",
    "display_name": "string",
    "canonical_name": "string",
    "aliases": ["string"] | null
  }
]
```

**Constraints:**
- Must use parameterized query ($1, $2, $3)
- Must handle null author_entity_id gracefully (COALESCE + NULLIF pattern)
- Must handle empty related_entity_ids array (CASE WHEN pattern)
- Must filter by tenant_id (cross-tenant isolation)
- Must only load active entities

---

### 12. TR_Score_Candidates (code v2)

**Purpose:** Romanian-aware multi-signal scoring engine. Computes entity_match, semantic_match, temporal_proximity, and channel_relevance for each candidate thread.

**Input:**
- Normalized message content (from earlier in flow)
- Candidate threads array (from TR_Load_Candidate_Threads)
- Entity hints array (from TR_Load_Entity_Hints)
- Message metadata: timestamp, channel, author_entity_id, related_entity_ids

**Scoring Algorithm:**

1. **entity_match_score (0.0–0.30)**
   - If author_entity_id matches thread primary_entity_id: +0.30
   - If author_entity_id in thread related_entity_ids: +0.15
   - If any message related_entity_id in thread related_entity_ids: +0.15 per match (capped at 0.30 total)
   - Otherwise: +0.0

2. **semantic_match_score (0.0–0.40)** — MVP only (embedding-based is Phase 2)
   - Normalize message normalized_content: lowercase, remove punctuation/extra whitespace
   - Apply Romanian-aware stemming (stem "apartament", "apartamante" → "apartam")
   - Extract character trigrams (3-char substrings)
   - Compute Jaccard similarity: |trigram_intersection| / |trigram_union|
   - Scale to 0.0–0.40 range
   - Example: Message "Ion cauta apartament in centru pe strada Mihai" vs Thread "Ion apartament centru pret locatie" → trigram overlap → 0.35-0.40

3. **temporal_proximity_score (0.05–0.20)**
   - time_diff = NOW() - thread.last_activity_at
   - if time_diff < 1 hour: 0.20
   - if time_diff < 24 hours: 0.15
   - if time_diff < 7 days: 0.10
   - if time_diff < 30 days: 0.05
   - else: 0.00

4. **channel_relevance_score (0.0–0.10)**
   - If message.channel in thread.source_channels: +0.10
   - Otherwise: +0.0

5. **final_score = entity_match + semantic_match + temporal_proximity + channel_relevance** (max 1.0)

**Output:**
```json
{
  "scored_candidates": [
    {
      "thread_id": "uuid",
      "status": "active|waiting|blocked|latent",
      "final_score": 0.0-1.0,
      "entity_match": 0.0-0.30,
      "semantic_match": 0.0-0.40,
      "temporal_proximity": 0.0-0.20,
      "channel_relevance": 0.0-0.10
    }
  ],
  "best_score": 0.0-1.0,
  "second_score": 0.0-1.0 | null,
  "best_thread_id": "uuid|null",
  "best_thread_status": "string|null"
}
```

**Constraints:**
- MVP: Use Romanian-aware stemming + trigram Jaccard
- Phase 2: Use embedding-based similarity
- Must compute ALL four components (entity, semantic, temporal, channel)
- Must preserve thread status for decision logic
- Must handle zero candidates (return empty array)
- Must NOT normalize scores beyond 0.0-1.0 range

---

### 13. TR_Apply_Decision_Policy (code v2)

**Purpose:** Threshold-based decision logic. Applies attach_threshold, reopen_threshold, ambiguity_margin, and divergence rule.

**Input:**
- scored_candidates from TR_Score_Candidates
- best_score, second_score, best_thread_status
- resolution_policy: attach_threshold (0.75), reopen_threshold (0.65), ambiguity_margin (0.05), allow_latent_reopen (true)
- message metadata

**Decision Logic (Priority order):**

1. **If no candidates scored**: decision="create_new_thread", confidence=0.0

2. **Ambiguity floor (D-18 fix)**: If best_score < 0.60 (ambiguity_minimum hardcoded):
   - decision="create_new_thread", ambiguity_detected=true

3. **Ambiguity margin (D-16 fix)**: If second_score exists AND (best_score - second_score) < ambiguity_margin (0.05):
   - decision="create_new_thread", ambiguity_detected=true

4. **Entity-semantic divergence rule (D-16 fix)**: If best thread won on entity_match but second_best has higher semantic_match by >0.08:
   - decision="create_new_thread" (prevents misleading entity matches)
   - divergence_rule_fired=true

5. **Latent thread reopening (D-16 fix)**: If best_thread_status="latent" AND best_score >= reopen_threshold (0.65):
   - decision="reopen_latent_thread"
   - confidence=best_score
   - allow_latent_reopen must be true

6. **Active/waiting/blocked attachment**: If best_thread_status in ["active", "waiting", "blocked"] AND best_score >= attach_threshold (0.75):
   - decision="attach_existing_thread"
   - confidence=best_score

7. **Default**: decision="create_new_thread"

**Output:**
```json
{
  "decision": "attach_existing_thread|reopen_latent_thread|create_new_thread",
  "resolved_thread_id": "uuid|null",
  "confidence": 0.0-1.0,
  "ambiguity_detected": true|false,
  "divergence_rule_fired": true|false,
  "winning_reason": "string",
  "candidate_count": integer
}
```

**Constraints:**
- Must apply thresholds in order (ambiguity floor → margin → divergence → status-based)
- Must respect allow_latent_reopen flag
- Must use hardcoded ambiguity_minimum=0.60
- Must NOT create thread if reopen_threshold is met (always reopen latent threads)
- Must set confidence=0.0 if no decision can be made

---

### 14. TR_Build_Result (code v2)

**Purpose:** Build ThreadResolutionResult object. This node is reached by multiple paths: shortcircuit, reply-resolved, or scoring-based decision. Builds success result with dual contract fields.

**Input paths:**
- Path A (shortcircuit): explicit_thread_id, confidence=1.0
- Path B (reply-resolved): reply_thread_id, confidence=0.95
- Path C (scoring): decision, resolved_thread_id, confidence from TR_Apply_Decision_Policy

**Logic:**
1. Generate deterministic resolution_id: HASH(message_id + tenant_id + resolved_thread_id + timestamp)
2. Populate base result fields: resolution_id, message_id, tenant_id, decision, resolved_thread_id, timestamp
3. Populate dual contract fields (internal + user-facing):
   - Internal: module_name="thread_resolver_module", result_type="analysis"
   - User-facing: resolution_action="string" (mirrors decision)
4. Set candidate_scores from earlier scoring (if available)
5. Set content_class_used from TR_Select_Content_Class
6. Set decision_reason
7. error field = null (success path)
8. status="success"

**Output:**
```json
{
  "resolution_id": "string (hash)",
  "message_id": "uuid",
  "tenant_id": "uuid",
  "decision": "attach_existing_thread|reopen_latent_thread|create_new_thread",
  "resolved_thread_id": "uuid|null",
  "candidate_scores": [
    {
      "thread_id": "uuid",
      "thread_status": "string",
      "score": 0.0-1.0,
      "entity_match": 0.0-0.30,
      "semantic_match": 0.0-0.40,
      "temporal_proximity": 0.0-0.20,
      "channel_relevance": 0.0-0.10
    }
  ],
  "ambiguity_detected": true|false,
  "content_class_used": "normalized_content",
  "decision_reason": "string",
  "timestamp": "ISO 8601",
  "error": null,
  "module_name": "thread_resolver_module",
  "result_type": "analysis",
  "status": "success",
  "resolution_action": "string (mirrors decision)",
  "reopened_thread": true|false,
  "created_thread": null,
  "confidence": 0.0-1.0,
  "winning_reason": "string",
  "needs_followup": false,
  "followup_requests": []
}
```

**Constraints:**
- resolution_id MUST be deterministic (same input → same ID)
- Must populate BOTH internal and user-facing field names (dual contract)
- Must set error=null (this is success path)
- Must set status="success"
- reopened_thread: true only if decision="reopen_latent_thread"
- created_thread: always null in this node (no creation record)

---

### 15. TR_Build_Error_Result (code v2)

**Purpose:** Build ThreadResolutionResult for invalid input or error cases. Builds error result with dual contract fields.

**Input:** _valid=false and _errors from TR_Validate_Input

**Logic:**
1. Generate deterministic resolution_id: HASH(message_id or "unknown" + timestamp + tenant_id)
2. Populate base fields with available data
3. Set decision="fail_invalid_input"
4. Set status="failed"
5. Populate error field with code and missing_fields
6. Set all decision fields to null
7. Populate dual contract fields:
   - Internal: module_name="thread_resolver_module", result_type="error"
   - User-facing: resolution_action="error"

**Output:**
```json
{
  "resolution_id": "string (hash)",
  "message_id": "string|null",
  "tenant_id": "string|null",
  "decision": "fail_invalid_input",
  "resolved_thread_id": null,
  "candidate_scores": [],
  "ambiguity_detected": false,
  "content_class_used": null,
  "decision_reason": "Input validation failed",
  "timestamp": "ISO 8601",
  "error": {
    "code": "invalid_input",
    "missing_fields": ["field1", "field2"],
    "details": "string"
  },
  "module_name": "thread_resolver_module",
  "result_type": "error",
  "status": "failed",
  "resolution_action": "error",
  "reopened_thread": false,
  "created_thread": null,
  "confidence": 0.0,
  "winning_reason": "Invalid input",
  "needs_followup": true,
  "followup_requests": []
}
```

**Constraints:**
- Must NOT crash on missing required fields
- Must list exactly which fields are missing in error.missing_fields
- Must set confidence=0.0
- Must set all thread-related fields to null
- Must set status="failed"

---

### 16. TR_Write_Audit (postgres v2)

**Purpose:** Write audit trail for successful resolution. Idempotent via ON CONFLICT DO NOTHING.

**Query (exact):**
```sql
INSERT INTO thread_resolution_audit 
(resolution_id, message_id, tenant_id, decision, resolved_thread_id, candidate_scores, 
 ambiguity_detected, content_class_used, decision_reason, resolved_at) 
VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10) 
ON CONFLICT (resolution_id) DO NOTHING
```

**Input Parameters:**
- $1: resolution_id
- $2: message_id
- $3: tenant_id
- $4: decision
- $5: resolved_thread_id
- $6: candidate_scores (as JSON array, cast to JSONB)
- $7: ambiguity_detected
- $8: content_class_used
- $9: decision_reason
- $10: timestamp (resolved_at)

**Configuration:**
- Credential: PostgreSQL
- Query type: INSERT
- Idempotency: ON CONFLICT (resolution_id) DO NOTHING

**CRITICAL BLOCKER:**
The thread_resolution_audit table was JUST CREATED with 0 rows. Verify table exists before running workflow.

**Output:**
```json
[
  {
    "command": "INSERT",
    "rowCount": 1
  }
]
```

**Constraints:**
- Must use parameterized query ($1, $2, $3, ..., $10)
- Must cast candidate_scores to JSONB on server side ($6::jsonb)
- Must use ON CONFLICT DO NOTHING (idempotent)
- Must filter by tenant_id indirectly (via resolution_id which includes tenant context)

---

### 17. TR_Write_Error_Audit (postgres v2)

**Purpose:** Write audit trail for error cases. Same structure as TR_Write_Audit but used on error path.

**Query (exact):**
```sql
INSERT INTO thread_resolution_audit 
(resolution_id, message_id, tenant_id, decision, resolved_thread_id, candidate_scores, 
 ambiguity_detected, content_class_used, decision_reason, resolved_at) 
VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10) 
ON CONFLICT (resolution_id) DO NOTHING
```

**Same parameters and constraints as TR_Write_Audit.**

**Note:** Both TR_Write_Audit and TR_Write_Error_Audit use identical query and table. The distinction is logical (which result path led here), not structural.

---

### 18. TR_Return_Result (code v2)

**Purpose:** Return final success result. Pass-through node (returns result from TR_Build_Result unchanged).

**Input:** ThreadResolutionResult (success) from TR_Build_Result

**Logic:**
- Pass through input unchanged
- No transformation

**Output:** ThreadResolutionResult (success)

**Constraints:**
- Must NOT modify result
- Must be the final node on success path

---

### 19. TR_Return_Error (code v2)

**Purpose:** Return final error result. Pass-through node (returns result from TR_Build_Error_Result unchanged).

**Input:** ThreadResolutionResult (error) from TR_Build_Error_Result

**Logic:**
- Pass through input unchanged
- No transformation

**Output:** ThreadResolutionResult (error)

**Constraints:**
- Must NOT modify result
- Must be the final node on error path

---

## 5. Connection Map (Authoritative)

| From | To | Condition | Branch Name |
|---|---|---|---|
| TR_Trigger | TR_Validate_Input | Always | (direct) |
| TR_Validate_Input | TR_Route_Valid | Always | (direct) |
| TR_Route_Valid | TR_Select_Content_Class | _valid === true | output_0 |
| TR_Route_Valid | TR_Build_Error_Result | _valid === false | output_1 |
| TR_Select_Content_Class | TR_Check_Explicit_Refs | Always | (direct) |
| TR_Check_Explicit_Refs | TR_Route_Shortcircuit | Always | (direct) |
| TR_Route_Shortcircuit | TR_Build_Result | has_explicit_ref === true | output_0 (shortcircuit) |
| TR_Route_Shortcircuit | TR_Load_Reply_Context | has_explicit_ref === false | output_1 (continue) |
| TR_Load_Reply_Context | TR_Process_Reply_Result | Always | (direct) |
| TR_Process_Reply_Result | TR_Route_After_Reply | Always | (direct) |
| TR_Route_After_Reply | TR_Build_Result | found === true | output_0 (reply-resolved) |
| TR_Route_After_Reply | TR_Load_Candidate_Threads | found === false | output_1 (continue) |
| TR_Load_Candidate_Threads | TR_Load_Entity_Hints | Always | (direct) |
| TR_Load_Entity_Hints | TR_Score_Candidates | Always | (direct) |
| TR_Score_Candidates | TR_Apply_Decision_Policy | Always | (direct) |
| TR_Apply_Decision_Policy | TR_Build_Result | Always | (direct) |
| TR_Build_Result | TR_Write_Audit | Always | (direct) |
| TR_Build_Error_Result | TR_Write_Error_Audit | Always | (direct) |
| TR_Write_Audit | TR_Return_Result | Always | (direct) |
| TR_Write_Error_Audit | TR_Return_Error | Always | (direct) |
| Telegram Trigger | TR_Validate_Input | Always | (direct) — NON-CANONICAL, temporary |

**Graph summary:**
```
TR_Trigger → TR_Validate_Input → TR_Route_Valid
                                   ├─[valid]→ TR_Select_Content_Class → TR_Check_Explicit_Refs → TR_Route_Shortcircuit
                                   │           ├─[explicit]→ TR_Build_Result → TR_Write_Audit → TR_Return_Result
                                   │           └─[continue]→ TR_Load_Reply_Context → TR_Process_Reply_Result → TR_Route_After_Reply
                                   │                         ├─[found]→ TR_Build_Result [shortcut to audit]
                                   │                         └─[not found]→ TR_Load_Candidate_Threads → TR_Load_Entity_Hints → TR_Score_Candidates → TR_Apply_Decision_Policy → TR_Build_Result [above]
                                   │
                                   └─[invalid]→ TR_Build_Error_Result → TR_Write_Error_Audit → TR_Return_Error
```

---

## 5.1 Non-Canonical Nodes

| Node | Type | Version | Purpose | Status |
|---|---|---|---|---|
| Telegram Trigger | telegramTrigger | v1.2 | Live Telegram testing | Temporary, non-canonical |

**Note:** The Telegram Trigger is connected to TR_Validate_Input in parallel with TR_Trigger. It does not affect the canonical MCP flow. It should be removed before production deployment or documented as an approved auxiliary trigger.

---

## 5.2 Runtime Verification Results (2026-04-16)

All 3 execution paths verified end-to-end on live n8n instance with test data in PostgreSQL.

### Test 1: Scoring Path (Execution 679)

| Property | Value |
|---|---|
| Input | message about "apartamentul din centru", author=Ion Popescu |
| Nodes executed | 16/16 (full scoring path) |
| Candidates scored | 7 (5 active, 2 latent) |
| Winner | "Apartament centru Ion" (thread 11111111-...-01) |
| Score | 0.95 (entity=0.30, semantic=0.40, temporal=0.15, channel=0.10) |
| Decision | attach_existing_thread |
| Ambiguity | false (gap 0.30 to second place) |
| Audit written | Yes (DB verified) |

### Test 2: Shortcircuit Path (Execution 682)

| Property | Value |
|---|---|
| Input | Same message + explicit_thread_id=11111111-...-01 |
| Nodes executed | 9/9 (shortcircuit, no scoring) |
| Decision | explicit_thread_reference |
| Confidence | 1.0 |
| Scoring skipped | Yes (candidate_scores=[]) |
| Audit written | Yes (idempotent — ON CONFLICT DO NOTHING) |

### Test 3: Error Path (Execution 683)

| Property | Value |
|---|---|
| Input | Missing normalized_content field |
| Nodes executed | 6/6 (error path) |
| Validation | _valid=false, _missing_fields=["normalized_content"] |
| Decision | fail_invalid_input |
| Error audit written | Yes (DB verified) |

### Fixes Applied During Verification

1. **TR_Validate_Input bug:** `explicit_thread_id` mapped from `req.thread_id` instead of `req.explicit_thread_id`. Fixed to: `req.explicit_thread_id || req.thread_id || null`
2. **All 5 Postgres nodes:** Added `queryReplacement` in array format (`={{ [...] }}`)
3. **TR_Load_Entity_Hints SQL:** Added `::uuid` casts for text-to-UUID comparison
4. **All 3 Switch v2 nodes:** Configured with `dataType: "boolean"` and correct `value1` expressions

---

## 6. Input Contract Specification

### Input Contract: ThreadResolutionRequest

The workflow accepts ThreadResolutionRequest in **TWO SHAPES**. TR_Validate_Input auto-detects and normalizes both to a canonical flat form.

#### Shape A — Nested (User-Facing Contract)

Preferred for external API callers and documentation. Organizes related fields into logical groups.

```json
{
  "request": {
    "tenant_id": "string (required, UUID format)",
    "message": {
      "id": "string (required, UUID format)",
      "channel": "string (required, e.g., 'telegram', 'sms', 'email')",
      "direction": "string (required, 'inbound' | 'outbound')",
      "author_type": "string (required, 'user' | 'system' | 'bot')",
      "normalized_content": "string (required, non-empty after strip)",
      "timestamp": "string (required, ISO 8601 format)",
      "source_message_ref": "string (required, external message ID)",
      "author_entity_id": "string | null (optional, UUID format)",
      "thread_id": "string | null (optional, UUID format, explicit shortcircuit)",
      "related_entity_ids": ["string"] (optional, UUID array),
      "metadata": "object" (optional, arbitrary metadata)
    },
    "reply_context": {
      "reply_to_message_id": "string | null (optional, UUID)",
      "reply_to_thread_id": "string | null (optional, UUID)"
    },
    "resolution_policy": {
      "attach_threshold": "number | null (optional, default 0.75)",
      "reopen_threshold": "number | null (optional, default 0.65)",
      "max_candidate_threads": "number | null (optional, default 50)",
      "allow_latent_reopen": "boolean (optional, default true)",
      "allow_entity_assisted_match": "boolean (optional, default true)",
      "ambiguity_margin": "number | null (optional, default 0.05)"
    },
    "idempotency_key": "string | null (optional)"
  }
}
```

#### Shape B — Flat (Internal Contract)

Used internally by n8n workflows and for direct API calls. Flattens all fields into a single object.

```json
{
  "message_id": "string (required, UUID format)",
  "tenant_id": "string (required, UUID format)",
  "channel": "string (required)",
  "direction": "string (required, 'inbound' | 'outbound')",
  "author_type": "string (required, 'user' | 'system' | 'bot')",
  "normalized_content": "string (required, non-empty)",
  "timestamp": "string (required, ISO 8601)",
  "source_message_ref": "string (required)",
  "author_entity_id": "string | null (optional, UUID)",
  "thread_id": "string | null (optional, UUID)",
  "reply_to_message_id": "string | null (optional, UUID)",
  "reply_to_thread_id": "string | null (optional, UUID)",
  "related_entity_ids": ["string"] (optional, UUID array),
  "metadata": "object" (optional),
  "attach_threshold": "number | null (optional, default 0.75)",
  "reopen_threshold": "number | null (optional, default 0.65)",
  "max_candidate_threads": "number | null (optional, default 50)",
  "allow_latent_reopen": "boolean (optional, default true)",
  "allow_entity_assisted_match": "boolean (optional, default true)",
  "ambiguity_margin": "number | null (optional, default 0.05)",
  "idempotency_key": "string | null (optional)"
}
```

### Required Fields (Both Shapes)

**The following fields MUST be present and valid to pass validation:**

- **message_id**: Non-null, valid UUID format
- **tenant_id**: Non-null, valid UUID format
- **channel**: Non-empty string (e.g., "telegram", "sms", "email")
- **direction**: One of "inbound" or "outbound"
- **author_type**: One of "user", "system", or "bot"
- **normalized_content**: Non-empty string (after whitespace strip)
- **timestamp**: Valid ISO 8601 timestamp
- **source_message_ref**: Non-empty string (external message reference)

### Optional Fields

All other fields are optional and have sensible defaults:
- **author_entity_id**: UUID or null (no entity match if missing)
- **thread_id**: UUID or null (no explicit shortcircuit if missing)
- **reply_to_message_id**: UUID or null (no reply lookup if missing)
- **reply_to_thread_id**: UUID or null (no explicit reply-thread link if missing)
- **related_entity_ids**: UUID array or empty (no related entity match if missing)
- **metadata**: Arbitrary JSONB, passed through unchanged
- **attach_threshold**: Number 0.0-1.0, defaults to 0.75
- **reopen_threshold**: Number 0.0-1.0, defaults to 0.65
- **max_candidate_threads**: Integer >= 1, defaults to 50
- **allow_latent_reopen**: Boolean, defaults to true
- **allow_entity_assisted_match**: Boolean, defaults to true
- **ambiguity_margin**: Number 0.0-1.0, defaults to 0.05
- **idempotency_key**: String, optional (NOT USED in MVP, for Phase 2 deduplication)

### Validation Rules

| Field | Validation Rule |
|---|---|
| message_id | Must match UUID regex: `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$` |
| tenant_id | Must match UUID regex |
| channel | Non-empty string, max 50 chars |
| direction | Exact match: "inbound" or "outbound" |
| author_type | Exact match: "user", "system", or "bot" |
| normalized_content | Non-empty after trim, max 10000 chars |
| timestamp | Valid ISO 8601 format (accepts timezone offset) |
| source_message_ref | Non-empty string, max 200 chars |
| author_entity_id | UUID format or null |
| thread_id | UUID format or null |
| reply_to_message_id | UUID format or null |
| reply_to_thread_id | UUID format or null |
| related_entity_ids | Array of UUIDs or null |
| attach_threshold | Number in [0.0, 1.0] or null |
| reopen_threshold | Number in [0.0, 1.0] or null |
| ambiguity_margin | Number in [0.0, 1.0] or null |
| allow_latent_reopen | Boolean or null (truthy/falsy) |
| allow_entity_assisted_match | Boolean or null (truthy/falsy) |

---

## 7. Output Contract Specification

### Output Contract: ThreadResolutionResult

All output from the workflow (success or error) conforms to this single result structure. The status field indicates success or failure; the error field is null on success.

#### Full Result Structure

```json
{
  "resolution_id": "string",
  "message_id": "string (UUID)",
  "tenant_id": "string (UUID)",
  "decision": "attach_existing_thread | reopen_latent_thread | create_new_thread | fail_invalid_input",
  "resolved_thread_id": "string (UUID) | null",
  "candidate_scores": [
    {
      "thread_id": "string (UUID)",
      "thread_status": "string (active|waiting|blocked|latent)",
      "score": "number (0.0-1.0)",
      "entity_match": "number (0.0-0.30)",
      "semantic_match": "number (0.0-0.40)",
      "temporal_proximity": "number (0.0-0.20)",
      "channel_relevance": "number (0.0-0.10)"
    }
  ],
  "ambiguity_detected": "boolean",
  "content_class_used": "string (normalized_content | llm_safe_content | rag_safe_content | null)",
  "decision_reason": "string",
  "timestamp": "string (ISO 8601)",
  "error": "object | null",
  "module_name": "string (thread_resolver_module)",
  "result_type": "string (analysis | error)",
  "status": "string (success | failed)",
  "resolution_action": "string",
  "reopened_thread": "boolean",
  "created_thread": "object | null",
  "confidence": "number (0.0-1.0)",
  "winning_reason": "string",
  "needs_followup": "boolean",
  "followup_requests": "array"
}
```

#### Dual Contract Fields

The result contains dual field names to support both internal and user-facing consumption:

| Internal Name | User-Facing Name | Purpose |
|---|---|---|
| module_name | (resolution_action mirrors decision) | Internal: "thread_resolver_module" |
| result_type | status | Internal: "analysis" / "error", User: "success" / "failed" |
| decision | resolution_action | Both reference the same decision value |
| confidence | (implicit in scoring) | Score indicating certainty |

#### Success Response Example

```json
{
  "resolution_id": "abc123def456abc123def456abc12345",
  "message_id": "12345678-1234-1234-1234-123456789012",
  "tenant_id": "87654321-4321-4321-4321-210987654321",
  "decision": "attach_existing_thread",
  "resolved_thread_id": "11111111-1111-1111-1111-111111111111",
  "candidate_scores": [
    {
      "thread_id": "11111111-1111-1111-1111-111111111111",
      "thread_status": "active",
      "score": 0.85,
      "entity_match": 0.30,
      "semantic_match": 0.35,
      "temporal_proximity": 0.15,
      "channel_relevance": 0.05
    }
  ],
  "ambiguity_detected": false,
  "content_class_used": "normalized_content",
  "decision_reason": "Strong semantic match with high temporal proximity",
  "timestamp": "2026-04-16T12:34:56.789Z",
  "error": null,
  "module_name": "thread_resolver_module",
  "result_type": "analysis",
  "status": "success",
  "resolution_action": "attach_existing_thread",
  "reopened_thread": false,
  "created_thread": null,
  "confidence": 0.85,
  "winning_reason": "Score 0.85 exceeds attach_threshold 0.75",
  "needs_followup": false,
  "followup_requests": []
}
```

#### Error Response Example

```json
{
  "resolution_id": "unknown_hash",
  "message_id": null,
  "tenant_id": null,
  "decision": "fail_invalid_input",
  "resolved_thread_id": null,
  "candidate_scores": [],
  "ambiguity_detected": false,
  "content_class_used": null,
  "decision_reason": "Input validation failed",
  "timestamp": "2026-04-16T12:34:56.789Z",
  "error": {
    "code": "invalid_input",
    "missing_fields": ["message_id", "normalized_content"],
    "details": "Required fields are missing from input"
  },
  "module_name": "thread_resolver_module",
  "result_type": "error",
  "status": "failed",
  "resolution_action": "error",
  "reopened_thread": false,
  "created_thread": null,
  "confidence": 0.0,
  "winning_reason": "Invalid input",
  "needs_followup": true,
  "followup_requests": []
}
```

#### Field Semantics

| Field | On Success | On Error |
|---|---|---|
| status | "success" | "failed" |
| error | null | {code, missing_fields, details} |
| resolved_thread_id | UUID or null | null |
| decision | attach_existing_thread, reopen_latent_thread, or create_new_thread | fail_invalid_input |
| candidate_scores | Array of scored threads | [] |
| confidence | 0.0-1.0 (score of best candidate) | 0.0 |
| ambiguity_detected | true if margin rule fired | false |
| reopened_thread | true if decision=reopen_latent_thread | false |
| created_thread | null (no creation record in MVP) | null |
| timestamp | Execution time | Execution time |

---

## 8. Required Database Tables

### Table: messages

| Column | Type | Nullable | Constraints | Notes |
|---|---|---|---|---|
| id | UUID | NO | PK | Message ID |
| tenant_id | UUID | NO | FK? | Tenant isolation |
| organization_id | UUID | YES | FK? | Organization (legacy) |
| channel | VARCHAR(50) | YES | | Source channel |
| direction | VARCHAR(20) | YES | | inbound/outbound |
| author_type | VARCHAR(20) | YES | | user/system/bot |
| content | TEXT | YES | | **LEGACY** — maps to raw_content in target |
| raw_content | TEXT | YES | | Original payload (target) |
| normalized_content | TEXT | YES | | Structurally normalized (target) |
| llm_safe_content | TEXT | YES | | LLM-safe variant (target, NO-OP in MVP) |
| rag_safe_content | TEXT | YES | | RAG-safe variant (target, NO-OP in MVP) |
| intent | VARCHAR(100) | YES | | **LEGACY** — classified intent |
| timestamp | TIMESTAMPTZ | YES | | Message timestamp |
| source_message_ref | VARCHAR(200) | YES | | External reference |
| thread_id | UUID | YES | FK? | **MISSING** — Link to thread (blocker) |
| author_entity_id | UUID | YES | FK? | **MISSING** — Link to author entity |
| privacy_transform_version | VARCHAR(50) | YES | | Privacy version applied |
| status | VARCHAR(50) | YES | | Processing status |
| metadata | JSONB | YES | | Additional metadata |
| raw_content_hash | TEXT | YES | | Content hash (for dedup) |
| telegram_message_id | BIGINT | YES | | Telegram-specific ID |
| telegram_chat_id | TEXT | YES | | Telegram chat ID |
| created_at | TIMESTAMPTZ | YES | | Record creation |
| updated_at | TIMESTAMPTZ | YES | | Last update |

**Current status:** Table exists but is MISSING columns: thread_id, channel, author_type, normalized_content, source_message_ref, author_entity_id, timestamp (partial schema)

**BLOCKER:** TR_Load_Reply_Context query will FAIL until thread_id column is added.

---

### Table: threads

| Column | Type | Nullable | Constraints | Notes |
|---|---|---|---|---|
| id | UUID | NO | PK | Thread ID |
| tenant_id | UUID | NO | | Tenant isolation |
| title | VARCHAR(500) | YES | | Thread title |
| thread_type | VARCHAR(50) | YES | | Type classification |
| status | VARCHAR(50) | NO | CHECK status IN (...) | new/active/waiting/blocked/completed/latent/abandoned |
| summary | TEXT | YES | | Thread summary |
| last_activity_at | TIMESTAMPTZ | YES | | Last activity timestamp |
| primary_entity_id | UUID | YES | FK | Primary entity (optional) |
| related_entity_ids | UUID[] | YES | | Array of related entities |
| goal | TEXT | YES | | Thread goal |
| source_channels | VARCHAR[] | YES | | Channels thread spans |
| closure_reason | TEXT | YES | | Why thread was closed |
| metadata | JSONB | YES | | Additional metadata |
| created_at | TIMESTAMPTZ | NO | DEFAULT NOW() | Record creation |
| updated_at | TIMESTAMPTZ | NO | DEFAULT NOW() | Last update |

**Current status:** Table was JUST CREATED by claude_mvp with 7 test rows.

**Constraints:**
- tenant_id is NOT NULL
- status must be one of the defined values
- last_activity_at drives the 30-day candidate window
- related_entity_ids is a PostgreSQL UUID array

---

### Table: entities

| Column | Type | Nullable | Constraints | Notes |
|---|---|---|---|---|
| id | UUID | NO | PK | Entity ID |
| tenant_id | UUID | NO | | Tenant isolation |
| entity_type | VARCHAR(50) | NO | | person/organization/project/etc. |
| display_name | VARCHAR(500) | NO | | Display name |
| canonical_name | VARCHAR(500) | NO | | Canonical form |
| aliases | VARCHAR[] | YES | | Alternative names |
| contact_mappings | JSONB | YES | | Contact info (email, phone, etc.) |
| profile_summary | TEXT | YES | | Profile summary |
| labels | VARCHAR[] | YES | | Tags/labels |
| status | VARCHAR(50) | NO | DEFAULT 'active' | active/merged/archived |
| metadata | JSONB | YES | | Additional metadata |
| created_at | TIMESTAMPTZ | NO | DEFAULT NOW() | Record creation |
| updated_at | TIMESTAMPTZ | NO | DEFAULT NOW() | Last update |

**Current status:** Table was JUST CREATED by claude_mvp with 2 test rows.

**Constraints:**
- tenant_id is NOT NULL
- entity_type is NOT NULL
- display_name is NOT NULL
- canonical_name is NOT NULL
- status defaults to 'active', filtered in queries

---

### Table: thread_resolution_audit

| Column | Type | Nullable | Constraints | Notes |
|---|---|---|---|---|
| id | UUID | YES | (optional) | Record ID |
| resolution_id | VARCHAR(64) | NO | PK, UNIQUE | Deterministic hash (prevents duplicates) |
| message_id | UUID | NO | | Message that triggered resolution |
| tenant_id | UUID | NO | | Tenant isolation |
| decision | VARCHAR(50) | NO | | Decision made (attach/reopen/create/fail) |
| resolved_thread_id | UUID | YES | | Thread ID if resolved (null if created/failed) |
| candidate_scores | JSONB | YES | | Array of scored candidates |
| ambiguity_detected | BOOLEAN | YES | DEFAULT FALSE | Was ambiguity rule triggered? |
| content_class_used | VARCHAR(50) | YES | | Which content class was used |
| decision_reason | TEXT | YES | | Human-readable reason |
| resolved_at | TIMESTAMPTZ | NO | DEFAULT NOW() | Audit timestamp |
| created_at | TIMESTAMPTZ | YES | DEFAULT NOW() | Record creation |

**Current status:** Table was JUST CREATED by claude_mvp with 0 rows (audit-ready).

**Constraints:**
- resolution_id is PRIMARY KEY and UNIQUE
- ON CONFLICT (resolution_id) DO NOTHING ensures idempotency
- All inserts are append-only (no updates)

---

## 9. Database Tables — READ Operations

| Node | Table | Columns | Filters | Order | Limit | Notes |
|---|---|---|---|---|---|---|
| TR_Load_Reply_Context | messages | thread_id | id=$1, tenant_id=$2, thread_id IS NOT NULL | N/A | 1 | **BLOCKER: thread_id missing** |
| TR_Load_Candidate_Threads | threads | id, tenant_id, title, thread_type, status, summary, last_activity_at, primary_entity_id, related_entity_ids, source_channels, created_at | tenant_id=$1, status IN (...), last_activity_at >= NOW() - 30 days | last_activity_at DESC | 50 | Returns candidates for scoring |
| TR_Load_Entity_Hints | entities | id, entity_type, display_name, canonical_name, aliases | tenant_id=$1, (id=$2 OR id=ANY($3)), status='active' | N/A | 20 | Loads entities for scoring |

**Cross-tenant isolation:** All queries filter by tenant_id.

**Parameterized queries:** All use $1, $2, $3 style placeholders.

---

## 10. Database Tables — WRITE Operations

| Node | Table | Operation | Columns | Idempotency | Notes |
|---|---|---|---|---|---|
| TR_Write_Audit | thread_resolution_audit | INSERT | resolution_id, message_id, tenant_id, decision, resolved_thread_id, candidate_scores, ambiguity_detected, content_class_used, decision_reason, resolved_at | ON CONFLICT (resolution_id) DO NOTHING | Success path audit |
| TR_Write_Error_Audit | thread_resolution_audit | INSERT | Same as above | ON CONFLICT (resolution_id) DO NOTHING | Error path audit |

**Append-only:** Both nodes INSERT only. No UPDATE or DELETE operations.

**Idempotency:** Both use ON CONFLICT DO NOTHING, allowing safe replay of the same resolution_id.

---

## 11. Database Indexes

The following indexes are RECOMMENDED for production:

```sql
-- Index for TR_Load_Reply_Context (query filter: id, tenant_id, thread_id)
CREATE INDEX IF NOT EXISTS idx_messages_id_tenant_thread 
ON messages (id, tenant_id) WHERE thread_id IS NOT NULL;

-- Index for TR_Load_Candidate_Threads (query filter: tenant_id, status, last_activity_at)
CREATE INDEX IF NOT EXISTS idx_threads_tenant_status_activity 
ON threads (tenant_id, status, last_activity_at DESC);

-- Index for TR_Load_Entity_Hints (query filter: tenant_id, status, id)
CREATE INDEX IF NOT EXISTS idx_entities_tenant_status_id 
ON entities (tenant_id, status, id);

-- Index for thread_resolution_audit PK (unique lookup)
CREATE UNIQUE INDEX IF NOT EXISTS idx_thread_resolution_audit_resolution_id 
ON thread_resolution_audit (resolution_id);

-- Index for tenant-scoped audit queries
CREATE INDEX IF NOT EXISTS idx_thread_resolution_audit_tenant_resolved_at 
ON thread_resolution_audit (tenant_id, resolved_at DESC);
```

---

## 12. SQL Queries — Exact Text

### Query 1: TR_Load_Reply_Context

```sql
SELECT m.thread_id 
FROM messages m 
WHERE m.id = $1 AND m.tenant_id = $2 AND m.thread_id IS NOT NULL 
LIMIT 1
```

**Parameters:**
- $1: message_id (from input.reply_to_message_id)
- $2: tenant_id (from input.tenant_id)

**Expected columns in result:**
- thread_id (UUID or null)

**Error if thread_id column missing:** "column m.thread_id does not exist"

---

### Query 2: TR_Load_Candidate_Threads

```sql
SELECT id, tenant_id, title, thread_type, status, summary, last_activity_at, 
       primary_entity_id, related_entity_ids, source_channels, created_at 
FROM threads 
WHERE tenant_id = $1 
  AND status IN ('active', 'waiting', 'blocked', 'latent') 
  AND last_activity_at >= NOW() - INTERVAL '30 days' 
ORDER BY last_activity_at DESC 
LIMIT 50
```

**Parameters:**
- $1: tenant_id

**Expected columns in result:**
- id, tenant_id, title, thread_type, status, summary, last_activity_at, primary_entity_id, related_entity_ids, source_channels, created_at

**Key constraints:**
- Returns all four status types (active, waiting, blocked, latent)
- 30-day sliding window
- Ordered by most recent first
- Max 50 results

---

### Query 3: TR_Load_Entity_Hints

```sql
SELECT id, entity_type, display_name, canonical_name, aliases 
FROM entities 
WHERE tenant_id = $1 
  AND (id = COALESCE(NULLIF($2, ''), NULL) 
       OR id = ANY(CASE WHEN $3 = '{}' THEN ARRAY[]::uuid[] ELSE $3::uuid[] END)) 
  AND status = 'active' 
LIMIT 20
```

**Parameters:**
- $1: tenant_id
- $2: author_entity_id (empty string if null, cast to null via COALESCE+NULLIF)
- $3: related_entity_ids (JSON array or '{}', cast to UUID array via CASE)

**Expected columns in result:**
- id, entity_type, display_name, canonical_name, aliases

**Logic:**
- If author_entity_id is provided (non-empty), include that entity
- If related_entity_ids array is provided (non-empty), include those entities
- All returned entities must be active
- Max 20 results

---

### Query 4: TR_Write_Audit

```sql
INSERT INTO thread_resolution_audit 
(resolution_id, message_id, tenant_id, decision, resolved_thread_id, candidate_scores, 
 ambiguity_detected, content_class_used, decision_reason, resolved_at) 
VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10) 
ON CONFLICT (resolution_id) DO NOTHING
```

**Parameters:**
- $1: resolution_id (string, deterministic hash)
- $2: message_id (UUID)
- $3: tenant_id (UUID)
- $4: decision (string: attach_existing_thread, reopen_latent_thread, create_new_thread)
- $5: resolved_thread_id (UUID or null)
- $6: candidate_scores (JSON array, cast to JSONB on server)
- $7: ambiguity_detected (boolean)
- $8: content_class_used (string)
- $9: decision_reason (string)
- $10: resolved_at (timestamp)

**Idempotency:** ON CONFLICT (resolution_id) DO NOTHING ensures safe replay.

---

### Query 5: TR_Write_Error_Audit

```sql
INSERT INTO thread_resolution_audit 
(resolution_id, message_id, tenant_id, decision, resolved_thread_id, candidate_scores, 
 ambiguity_detected, content_class_used, decision_reason, resolved_at) 
VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10) 
ON CONFLICT (resolution_id) DO NOTHING
```

**Identical to TR_Write_Audit.** Same query, same parameters, same idempotency.

---

## 13. Migration SQL Required

**CRITICAL:** The following SQL MUST BE RUN before the workflow will execute successfully. These columns are MISSING from the messages table and are REQUIRED by TR_Load_Reply_Context.

```sql
-- Add missing columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel VARCHAR(50);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS author_type VARCHAR(20);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS normalized_content TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS source_message_ref VARCHAR(200);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS author_entity_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ;

-- Add indexes for performance (recommended)
CREATE INDEX IF NOT EXISTS idx_messages_thread_id 
ON messages (thread_id) WHERE thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_id_tenant_thread 
ON messages (id, tenant_id) WHERE thread_id IS NOT NULL;
```

**Who can run this:**
- postgres (superuser) — can ALTER messages table
- claude_mvp (regular user) — CANNOT alter messages (permission denied)

**Current blocker:** messages table is owned by postgres, and claude_mvp cannot execute ALTER.

---

## 14. Invariants (MUST NOT CHANGE)

The following properties are immutable and define the core behavior. Changing any of these breaks architectural contracts.

### 1. Thread-First Resolution

**Invariant:** Thread resolution MUST complete before any execution context or plan is created. No message may skip thread resolution.

**Violation:** Execution contexts created without resolved thread IDs violate the architecture.

### 2. Resolution ID Determinism

**Invariant:** Given the same message_id, tenant_id, resolved_thread_id, and timestamp, the resolution_id MUST ALWAYS be identical.

**Implementation:** `resolution_id = HASH(message_id + tenant_id + resolved_thread_id + timestamp_millis)`

**Violation:** Non-deterministic IDs break idempotency and audit trail matching.

### 3. Audit Trail Idempotency

**Invariant:** Replaying the same resolution MUST NOT create duplicate audit records.

**Implementation:** `ON CONFLICT (resolution_id) DO NOTHING` on all write operations.

**Violation:** Duplicate audit records corrupt the audit trail.

### 4. Cross-Tenant Isolation

**Invariant:** All database queries MUST filter by tenant_id. No query may return rows from other tenants.

**Violation:** Data leakage between tenants is a critical security breach.

### 5. Content Class Consistency

**Invariant:** All content passed to scoring MUST come from the normalized_content field (MVP). No raw_content is passed to semantic matching.

**Violation:** Raw PII flowing into LLM/scoring violates privacy architecture.

### 6. Latent Thread Reopening Separation

**Invariant:** Latent threads with score >= reopen_threshold MUST be reopened, NOT attached. The decision MUST say "reopen_latent_thread", not "attach_existing_thread".

**Violation:** Treating reopen as attach confuses downstream module behavior.

### 7. Threshold-Based Decision Logic

**Invariant:** The priority order for decision logic is IMMUTABLE:
1. Ambiguity floor (0.60 hardcoded)
2. Ambiguity margin (configurable, default 0.05)
3. Divergence rule (entity vs semantic conflict)
4. Status-based thresholds (latent vs active)
5. Fallback to create_new_thread

**Violation:** Reordering these breaks the scoring algorithm guarantees.

### 8. Scoring Component Weights

**Invariant:** The sum of all scoring components must equal 1.0:
- Entity match: 0.0–0.30
- Semantic match: 0.0–0.40
- Temporal proximity: 0.0–0.20
- Channel relevance: 0.0–0.10

**Violation:** Changing weights requires recalibration of all thresholds.

### 9. Parameterized Queries Only

**Invariant:** All database queries MUST use parameterized placeholders ($1, $2, etc.). No raw string interpolation.

**Violation:** SQL injection vulnerability.

### 10. Dual Contract Field Names

**Invariant:** Output MUST include both internal field names (module_name, result_type) AND user-facing names (resolution_action, status).

**Violation:** Breaking either name breaks backward compatibility.

---

## 15. Forbidden Changes

The following changes are EXPLICITLY FORBIDDEN. Any of these will break the workflow or violate architectural contracts.

1. **Changing the trigger type** from manualTrigger to executeWorkflowTrigger
   - Reason: MCP exposure requires manual trigger
   - Impact: Workflow can no longer be invoked via MCP

2. **Removing the deterministic resolution_id hash**
   - Reason: Breaks idempotency and audit trail matching
   - Impact: Duplicate audit records, idempotent replay fails

3. **Reordering decision logic priority**
   - Reason: Specific order is required by architecture spec
   - Impact: Different decisions for same input, non-determinism

4. **Removing latent thread loading from candidate query**
   - Reason: Latent threads must be considered for reopening
   - Impact: Latent threads never reopen

5. **Removing ambiguity floor (0.60 hardcoded minimum)**
   - Reason: Prevents low-confidence matches
   - Impact: Threads match on scores < 0.60, false positives

6. **Changing scoring weights**
   - Reason: Weights sum to 1.0 and drive threshold calibration
   - Impact: Threshold defaults become wrong (0.75 for 1.0-scale, not custom scale)

7. **Using raw_content instead of normalized_content for scoring**
   - Reason: Privacy architecture requires normalized content only
   - Impact: Raw PII flows into LLM/RAG

8. **Removing cross-tenant filters from database queries**
   - Reason: Tenant isolation is a critical security boundary
   - Impact: Data leakage between tenants

9. **Removing ON CONFLICT DO NOTHING from audit writes**
   - Reason: Ensures idempotent replay
   - Impact: Duplicate audit records on replay

10. **Adding LLM inference inside this workflow**
    - Reason: This is a resolver module, not a planner or responder
    - Impact: Violates separation of concerns, adds latency and cost

11. **Changing input validation to reject empty tenant_id or message_id**
    - Reason: Validation must preserve required field check
    - Impact: Breaking change to input contract

12. **Removing the reply-to-message lookup path**
    - Reason: Direct replies are a core resolution signal
    - Impact: Replies don't find parent thread, false new threads created

13. **Adding plan or response composition to this workflow**
    - Reason: This is thread resolver only, planning happens downstream
    - Impact: Violates thread-first architecture

14. **Changing the ambiguity_margin default from 0.05**
    - Reason: 0.05 is calibrated for 1.0-scale scores
    - Impact: Ambiguity detection becomes too strict or too loose

15. **Adding UUID validation that rejects valid UUIDs**
    - Reason: Input contract allows standard UUID formats
    - Impact: Valid messages rejected as invalid

---

## 16. Fixture References

Test fixtures are located in `/sessions/amazing-jolly-bell/mnt/Ucenicul/workflows/fixtures/`.

### Test Cases (TC-01 through TC-16)

| Fixture | Scenario | Input Shape | Expected Decision | Expected Confidence | Special Rules |
|---|---|---|---|---|---|
| TC-01_Explicit_thread_reference.json | Message with explicit thread_id | nested/flat | attach_existing_thread | 1.0 | Shortcircuit, confidence 1.0 |
| TC-02_Direct_reply_linkage.json | Message with reply_to_message_id (parent has thread) | nested | attach_existing_thread | 0.95 | Reply shortcircuit, confidence 0.95 |
| TC-03_Attach_by_entity___semantic_match.json | Entity + semantic match above threshold | nested | attach_existing_thread | 0.77+ | Scoring path, active thread |
| TC-04_Reopen_latent_thread.json | Latent thread with score >= reopen_threshold | nested | reopen_latent_thread | 0.67+ | D-16 fix: latent status → reopen not attach |
| TC-05_Create_new_thread.json | No candidates above threshold | flat | create_new_thread | 0.0 | Empty or low scores, fallback |
| TC-06_Ambiguous_candidate_set.json | Top 2 candidates within ambiguity_margin | nested | create_new_thread | 0.0 | Ambiguity rule fires, ambiguity_detected=true |
| TC-07_Invalid_input.json | Missing required field (normalized_content) | flat (invalid) | fail_invalid_input | 0.0 | Error path, missing_fields populated |
| TC-08_Deterministic_replay__scoring_path_.json | Same input, multiple runs | nested | Same (deterministic) | Same | resolution_id same every run |
| TC-09_Cross_tenant_isolation.json | Same message_id, two different tenant_ids | nested | Different results per tenant | Varies | Queries filter by tenant_id |
| TC-10_Content_class_behavior.json | Content class selection (MVP: always normalized_content) | nested | Attach or create | Varies | content_class_used="normalized_content" |
| TC-11_Whitespace_only_content.json | Content is only whitespace (invalid) | flat | fail_invalid_input | 0.0 | Validation rejects after trim |
| TC-12_Reply_to_thread_id_explicit_reference.json | Explicit reply_to_thread_id (no lookup) | nested | attach_existing_thread | 1.0 | Shortcircuit, confidence 1.0 |
| TC-13_Latent_thread_above_strict_attach_threshold.json | Latent thread with score 0.77 (> reopen threshold but not strictly "attach") | nested | reopen_latent_thread | 0.77 | D-16: latent status determines path, not score alone |
| TC-14_Active_thread_at_exact_boundary__score___0_75_.json | Active thread with score exactly 0.75 (= attach_threshold) | nested | attach_existing_thread | 0.75 | Threshold is inclusive (>= 0.75) |
| TC-15_Reply_to_message_with_no_thread_id.json | Reply_to_message_id points to message with no thread_id | nested | Scoring path used | Varies | Parent found but has no thread, continue to scoring |
| TC-16_Audit_write_error_path_verification.json | Error path with audit write | flat (invalid) | fail_invalid_input | 0.0 | TR_Write_Error_Audit called, idempotent |

### Test Data Setup

**File:** `fixtures/setup_test_data.sql`

Populates the following with test data:
- messages table: sample messages (various channels, directions, author types)
- threads table: 7 test threads (different statuses: active, waiting, blocked, latent)
- entities table: 2 test entities (person, organization)
- thread_resolution_audit table: (empty, audit-ready)

**Note:** UUID fixtures in setup_test_data.sql use non-hex characters (e.g., tttttttt, mmmmmmmm) which are **invalid UUIDs**. These must be replaced with valid UUIDs before running tests in production.

---

## 17. Post-Import Validation Steps

After importing WF-TR-01_Thread_Resolver.json into n8n, perform these checks:

### Step 1: Verify Node Count

```
n8n UI > Workflow > View Details
Expected: 19 nodes, 17 connections
```

### Step 2: Configure PostgreSQL Credentials

1. Open the workflow in n8n editor
2. Click on any Postgres node (e.g., TR_Load_Reply_Context)
3. In the node panel, click "PostgreSQL" credential selector
4. Select the correct PostgreSQL credential (must have access to Ucenicul database)
5. Repeat for all 5 Postgres nodes:
   - TR_Load_Reply_Context
   - TR_Load_Candidate_Threads
   - TR_Load_Entity_Hints
   - TR_Write_Audit
   - TR_Write_Error_Audit

### Step 3: Verify All Nodes Have Credentials

```
n8n UI > Workflow editor
For each Postgres node: Verify credential is set (not "No credentials selected")
```

### Step 4: Publish the Workflow

```
n8n UI > Top right: "Save" > "Activate" (or "Publish" depending on n8n version)
Expected: Workflow status becomes "Active"
```

### Step 5: Verify MCP Exposure

1. In n8n Settings > Integrations > MCP Server
2. Enable MCP Server feature
3. Workflow should appear in MCP tool registry as "WF-TR-01 Thread Resolver"

### Step 6: Test with TC-01 (Explicit Reference)

```bash
# Send minimal test request via MCP or n8n API
curl -X POST http://localhost:5678/webhook/some-endpoint \
  -H "Content-Type: application/json" \
  -d @fixtures/TC-01_Explicit_thread_reference.json

# Expected: status="success", decision="attach_existing_thread", confidence=1.0
```

### Step 7: Run Migration SQL

**CRITICAL:** Run the migration SQL as postgres superuser before any scoring tests:

```bash
psql -U postgres -d ucenicul < /path/to/migration.sql
```

Expected output:
```
ALTER TABLE
CREATE INDEX
CREATE INDEX
```

### Step 8: Test with TC-02 (Reply Lookup)

```bash
# This test requires thread_id column to exist
curl -X POST http://localhost:5678/webhook/some-endpoint \
  -H "Content-Type: application/json" \
  -d @fixtures/TC-02_Direct_reply_linkage.json

# Expected: status="success", decision="attach_existing_thread", confidence=0.95
```

### Step 9: Run Full Test Suite

```bash
cd workflows/scripts
npm test validate_contract.js
npm test validate_scoring.js
npm test lint_workflow.js
npm test verify_replay.js

# Expected: All tests pass
```

### Step 10: Verify Audit Trail

```sql
SELECT * FROM thread_resolution_audit ORDER BY resolved_at DESC LIMIT 5;

-- Expected: 5 rows (one per test run), all with status populated
```

---

## 18. Known Limitations (CRITICAL)

### BLOCKER: Missing messages.thread_id Column

**Severity:** CRITICAL — Workflow will not execute scoring path

**Symptom:** TR_Load_Reply_Context fails with "column m.thread_id does not exist"

**Root cause:** messages table schema does not include thread_id column. The table was created by postgres, and claude_mvp cannot alter it.

**Resolution:** postgres superuser must run migration SQL:
```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID;
```

**Timeline impact:** Blocking all scoring-based resolution (TC-02 through TC-06 will fail until fixed).

---

### BLOCKER: messages Table Schema Incomplete

**Severity:** CRITICAL — Multiple columns missing

**Missing columns:** channel, author_type, normalized_content, source_message_ref, author_entity_id, timestamp

**Root cause:** messages table was created by postgres for legacy use. Target architecture requires additional fields.

**Resolution:** postgres superuser must run:
```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel VARCHAR(50);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS author_type VARCHAR(20);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS normalized_content TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS source_message_ref VARCHAR(200);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS author_entity_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ;
```

---

### LIMITATION: MVP Content Class (Not a Blocker)

**Severity:** MEDIUM — Feature-complete but no privacy transformation

**Detail:** Phase 2 privacy features (raw_content / llm_safe_content / rag_safe_content transformation) are NOT implemented in MVP. TR_Select_Content_Class always returns normalized_content.

**Status:** Expected (documented as NO-OP in Phase 2 placeholder design).

**Future:** Phase 2 will implement actual privacy transforms. MVP behavior is correct.

---

### LIMITATION: Test Fixture UUIDs Invalid

**Severity:** LOW — Does not affect workflow logic, affects test data setup

**Detail:** setup_test_data.sql uses non-hex UUID characters (tttttttt, mmmmmmmm, iiiiiiii) which are not valid UUID format.

**Impact:** Test fixture data may not load into PostgreSQL UUID columns.

**Resolution:** Replace fixture UUIDs with valid ones:
```bash
# Before running setup_test_data.sql, replace:
sed -i "s/tttttttt/11111111/g" fixtures/setup_test_data.sql
sed -i "s/mmmmmmmm/22222222/g" fixtures/setup_test_data.sql
# etc.
```

---

### LIMITATION: Switch v2 value1 Implicit Storage

**Severity:** LOW — Does not affect execution

**Detail:** n8n switch nodes store the condition field (value1) in the node editor UI, not in the JSON export. This can make the condition field appear null in the JSON, but n8n restores it from UI.

**Impact:** None if exported/imported through n8n UI (recommended). May cause issues if manually editing JSON.

**Resolution:** Always import/export via n8n UI, not via direct JSON file manipulation.

---

### LIMITATION: Empty MCP Input Handling

**Severity:** LOW — Expected behavior

**Detail:** When invoked via MCP without input JSON, the manual trigger receives empty object `{}`. TR_Validate_Input correctly sets `_valid=false` and routes to error path.

**Status:** Expected behavior (not an error). MCP clients should send ThreadResolutionRequest JSON, not empty objects.

---

## 19. Architecture Compliance Checklist

| Requirement | Source | Status | Notes |
|---|---|---|---|
| Thread-first resolution | Architecture Spec v3 | Compliant | Resolution MUST complete before execution context creation |
| Resolver-only (no planning/response) | Architecture Spec v3 | Compliant | No plan or response composition in this workflow |
| Privacy boundary (content class) | Architecture Spec v3 + Thread Resolution Spec | MVP: Compliant, Phase 2: Placeholder | MVP uses normalized_content; Phase 2 placeholder for transforms |
| Module contract (explicit input/output) | Architecture Spec v3 | Compliant | Dual naming for backward compatibility |
| Deterministic IDs | Architecture Spec v3 | Compliant | resolution_id is hash-based, deterministic |
| Audit trail | Architecture Spec v3 | Compliant | Both success and error paths write audit records |
| Parameterized queries | n8n_Workflow_Mapping.md | Compliant | All Postgres nodes use $1, $2, $3 style |
| Cross-tenant isolation | Architecture Spec v3 | Compliant | All queries filter by tenant_id |
| Scoring algorithm | Thread Resolution Spec v2.0 | Compliant | 4-component scoring with entity/semantic/temporal/channel |
| Threshold-based decision | Thread Resolution Spec v2.0 | Compliant | Attach (0.75), reopen (0.65), ambiguity (0.05 margin, 0.60 floor) |
| Latent thread reopening | Thread Resolution Spec v2.0, D-16 fix | Compliant | Latent threads with score >= 0.65 reopen, not attach |
| Ambiguity rule | Thread Resolution Spec v2.0, D-18 fix | Compliant | Ambiguity floor 0.60, margin 0.05 |
| Divergence rule | Thread Resolution Spec v2.0, D-16 fix | Compliant | Entity-semantic conflict triggers new thread |
| Idempotent audit writes | Architecture Spec v3 | Compliant | ON CONFLICT (resolution_id) DO NOTHING |
| Dual contract fields | Module Contract, backward compat | Compliant | Both module_name + result_type AND resolution_action + status |
| MCP exposure | MCP Integration, n8n feature | Compliant | manualTrigger + MCP Server integration enabled |

---

## 20. Change Log / Revision Notes

### v3.0 (2026-04-16)

**Major rewrite:** Complete technical reference, authoritative for all WF-TR-01 operations.

**Sections added:**
- Comprehensive node-by-node responsibilities
- Full SQL query specifications (exact text from workflow)
- Migration SQL required (CRITICAL blocker items)
- Invariants and forbidden changes
- Fixture references and validation steps
- Architecture compliance checklist
- Known limitations with severity levels

**Key updates:**
- Documented BLOCKER: messages.thread_id missing (TR_Load_Reply_Context will fail)
- Documented BLOCKER: messages table schema incomplete
- Clarified latent thread reopening (D-16 fix)
- Clarified ambiguity floor (D-18 fix)
- Clarified divergence rule (entity vs semantic conflict)
- Added deterministic resolution_id algorithm
- Added output contract dual field names (backward compat)
- Documented ON CONFLICT DO NOTHING idempotency pattern

**Status:** Ready for production deployment (after migration SQL applied).

---

### v2.1-mcp (2026-04-16)

**Initial MCP exposure guide.** Covered MCP entry point and basic trigger configuration. Incomplete for full technical reference.

---

## 21. References and Related Documents

| Document | Canonicality | Purpose |
|---|---|---|
| `docs/Architecture_Spec_v3_Ucenicul.md` | Level 1 (Canonical) | System architecture and thread-first design |
| `docs/Thread_Resolution_Spec.md` | Level 2 (Subordinate) | Thread resolution algorithm, thresholds, scoring |
| `docs/n8n_Workflow_Mapping.md` | Level 2 (Subordinate) | n8n execution layout, PostgreSQL query policy |
| `docs/Module_Registry_Ucenicul.md` | Level 2 (Subordinate) | Module contracts and activation |
| `CLAUDE.md` | Level 3 (Subordinate) | Repo-level instructions for Claude (subordinate to Architecture Spec) |
| `workflows/contracts/ThreadResolutionContracts.md` | Level 3 (Reference) | Full input/output contract reference |
| `workflows/TEST_AFTER_IMPORT_WF-TR-01.md` | Level 3 (Reference) | Post-import validation procedures |
| `workflows/REMEDIATION_REPORT_WF-TR-01.md` | Level 3 (Reference) | Full remediation details for known issues |
| `db/README.md` | Level 3 (Operational) | Database schema and implementation status |
| `db/schema/README.md` | Level 3 (Operational) | Quick schema reference |

---

## 22. Document Metadata

| Property | Value |
|---|---|
| Document Title | WF-TR-01 Thread Resolver — MCP Technical Sheet |
| Version | 3.0 |
| Status | Complete Technical Reference |
| Date | 2026-04-16 |
| Author | Ucenicul Architecture Authority |
| Subordinate to | Architecture Spec v3, Thread Resolution Spec v2.0 |
| Audience | n8n operators, Claude, backend engineers, auditors |
| Language | English (tech terms only, no diacritics) |
| Canonicality | Level 3 (Subordinate operational reference) |
| Authority | This is the DEFINITIVE technical reference for WF-TR-01. All implementation decisions must align with this document. |
| Last updated | 2026-04-16 |
| Replaces | WF-TR-01_MCP_Technical_Sheet v2.1-mcp |

---

**END OF DOCUMENT**

> This document is the authoritative technical reference for WF-TR-01 Thread Resolver. It is subordinate to the Architecture Spec v3 and Thread Resolution Spec v2.0. All implementation, testing, and operational decisions must align with the specifications herein.

