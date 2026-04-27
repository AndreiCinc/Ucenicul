# Import Instructions — WF-TR-01 Thread Resolver (v2.0)

## Prerequisites

1. **n8n instance running** (v1.30+ REQUIRED for Code node v2 and Postgres node v2.5 support) — D-24 fix: this is now a hard requirement, not a recommendation
2. **PostgreSQL database** accessible from n8n with the following tables created:
   - `tenants` (see `db/README.md` Section B for schema) — D-25 fix: tenants table now listed as prerequisite
   - `threads` (see `db/README.md` Section B for schema)
   - `entities` (see `db/README.md` Section B for schema)
   - `messages` (with `thread_id` column, see `db/README.md` Section B)
   - `thread_resolution_audit` (see audit table DDL below)
3. **PostgreSQL credential** configured in n8n (named or default)
4. **Idempotency support:** PostgreSQL version 9.5+ recommended for `ON CONFLICT DO NOTHING` support

## Audit Table DDL

Run this SQL in your PostgreSQL database before importing:

```sql
CREATE TABLE IF NOT EXISTS thread_resolution_audit (
    resolution_id VARCHAR(255) PRIMARY KEY,
    message_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    decision VARCHAR(50) NOT NULL,
    resolved_thread_id UUID,
    candidate_scores JSONB DEFAULT '[]',
    ambiguity_detected BOOLEAN DEFAULT FALSE,
    content_class_used VARCHAR(50) DEFAULT 'normalized_content',
    decision_reason TEXT,
    error JSONB,
    resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tra_tenant_id ON thread_resolution_audit(tenant_id);
CREATE INDEX idx_tra_message_id ON thread_resolution_audit(message_id);
CREATE INDEX idx_tra_resolved_thread_id ON thread_resolution_audit(resolved_thread_id);
CREATE INDEX idx_tra_resolved_at ON thread_resolution_audit(resolved_at);

-- D-27 fix: ON CONFLICT DO NOTHING ensures true idempotency
-- Duplicate resolution_id inserts are silently ignored
ALTER TABLE thread_resolution_audit
  ADD CONSTRAINT uq_tra_resolution_id UNIQUE(resolution_id)
  ON CONFLICT DO NOTHING;
```

## Import Steps

1. Open your n8n instance in the browser.
2. Go to **Workflows** in the left sidebar.
3. Click **Add workflow** (or the + button).
4. In the new empty workflow, click the three-dot menu (top right) and select **Import from file**.
5. Select the file `workflows/WF-TR-01_Thread_Resolver.json`.
6. The workflow will load with all 19 nodes (D-25 fix: added TR_Write_Error_Audit node) and their connections.
7. **Configure PostgreSQL credentials:**
   - Click on each PostgreSQL node (`TR_Load_Reply_Context`, `TR_Load_Candidate_Threads`, `TR_Load_Entity_Hints`, `TR_Write_Audit`, `TR_Write_Error_Audit`).
   - In the **Credential** dropdown, select your PostgreSQL credential.
   - If you don't have one, click **Create new** and enter your PostgreSQL connection details.
8. **Check alwaysOutputData flag** on all nodes (D-23 fix):
   - In each node's settings panel, verify the **Always Output Data** toggle is ON
   - This ensures error paths produce output for error audit
9. Click **Save** to save the workflow.
10. The workflow is a **sub-workflow** (triggered by executeWorkflowTrigger). It is called by the main orchestrator workflow, not activated independently.

## Configuration Notes

- The workflow uses `executeWorkflowTrigger` as its entry point. It is designed to be called from the main orchestrator via the "Execute Workflow" node.
- **Thresholds** (STRICT_ATTACH_THRESHOLD=0.75, REOPEN_THRESHOLD=0.65, AMBIGUITY_MARGIN=0.05, AMBIGUITY_MINIMUM=0.60) are hardcoded in the `TR_Apply_Decision_Policy` node. To change them, edit that Code node. Optionally, accept per-request `resolution_policy` parameter to override per-invocation.
- **Candidate window** (30 days) is defined in the SQL query in `TR_Load_Candidate_Threads`. Adjust the INTERVAL value to change it.
- **Semantic matching** uses Romanian-aware word-overlap in MVP (character trigram Jaccard similarity). For production, replace the `romanianSemanticMatch` function in `TR_Score_Candidates` with pgvector cosine similarity.
- **Idempotency:** resolution_id is computed as `tr_{message_id}_{hash(idempotency_key)}` using SHA-256 of the idempotency_key field. If idempotency_key is not provided, falls back to timestamp. Always provide idempotency_key for true idempotent replays.

## Calling This Workflow

From the main orchestrator workflow, use an "Execute Workflow" node configured to call this sub-workflow. Pass the ThreadResolutionRequest as the input JSON.

### Flat Shape (MVP backward compatibility):

```json
{
  "message_id": "uuid-of-message",
  "tenant_id": "uuid-of-tenant",
  "channel": "telegram",
  "direction": "inbound",
  "author_type": "user",
  "normalized_content": "The normalized message text",
  "timestamp": "2026-04-15T10:00:00Z",
  "source_message_ref": "telegram_msg_12345",
  "author_entity_id": "uuid-of-author-entity-or-null",
  "thread_id": null,
  "reply_to_message_id": null,
  "related_entity_ids": [],
  "metadata": {},
  "resolution_policy": {
    "attach_threshold": 0.75,
    "reopen_threshold": 0.65,
    "ambiguity_margin": 0.05,
    "ambiguity_minimum": 0.60,
    "max_candidate_threads": 50,
    "allow_latent_reopen": true,
    "allow_entity_assisted_match": true
  },
  "idempotency_key": "msg_uuid_timestamp"
}
```

### Nested Shape (Phase 2+ recommended):

```json
{
  "message": {
    "id": "uuid-of-message",
    "tenant_id": "uuid-of-tenant",
    "channel": "telegram",
    "direction": "inbound",
    "author_type": "user",
    "normalized_content": "The normalized message text",
    "timestamp": "2026-04-15T10:00:00Z",
    "source_message_ref": "telegram_msg_12345",
    "author_entity_id": "uuid-of-author-entity-or-null",
    "related_entity_ids": [],
    "metadata": {},
    "raw_content": "Raw PII message (not consumed by resolver, passed to downstream modules)"
  },
  "reply_to_thread_id": "uuid-or-null",
  "resolution_policy": { ... },
  "idempotency_key": "msg_uuid_timestamp"
}
```

The workflow returns a **ThreadResolutionResult**. See `workflows/contracts/ThreadResolutionContracts.md` for the full contract definition.

## Expected ThreadResolutionResult

On success, the workflow returns (status: success):

```json
{
  "module_name": "thread_resolver",
  "result_type": "resolution",
  "status": "success",
  "resolution_id": "tr_uuid_hash",
  "message_id": "uuid",
  "tenant_id": "uuid",
  "decision": "attach_existing_thread",
  "resolution_action": "attach_existing_thread",
  "resolved_thread_id": "uuid-or-null",
  "winning_reason": "High semantic match with entity confirmation",
  "decision_reason": "High semantic match with entity confirmation",
  "confidence": 0.85,
  "candidate_scores": [ ... ],
  "ambiguity_detected": false,
  "reopened_thread": false,
  "created_thread": false,
  "needs_followup": false,
  "followup_requests": [],
  "content_class_used": "normalized_content",
  "timestamp": "2026-04-15T10:00:00Z",
  "error": null
}
```

On validation error, the workflow returns (status: failed):

```json
{
  "module_name": "thread_resolver",
  "result_type": "resolution",
  "status": "failed",
  "resolution_id": "tr_uuid_hash",
  "message_id": "uuid-or-null",
  "tenant_id": "uuid-or-null",
  "decision": "fail_invalid_input",
  "resolution_action": "fail_invalid_input",
  "resolved_thread_id": null,
  "winning_reason": "Request validation failed",
  "decision_reason": "Request validation failed",
  "confidence": 0.0,
  "candidate_scores": [],
  "ambiguity_detected": false,
  "reopened_thread": false,
  "created_thread": false,
  "needs_followup": true,
  "followup_requests": ["Provide valid message_id", "Provide valid tenant_id"],
  "content_class_used": "none",
  "timestamp": "2026-04-15T10:00:00Z",
  "error": {
    "code": "INVALID_INPUT",
    "message": "message_id is required",
    "missing_fields": ["message_id"]
  }
}
```

## Pre-import Validation (Optional)

Before importing, you can run the validation scripts to verify the workflow file:

```bash
# Static lint of the workflow JSON
node workflows/scripts/lint_workflow.js

# Contract conformance tests (all test fixtures)
node workflows/scripts/validate_contract.js all

# Replay/idempotency verification (11 anchor fixtures with scoring paths)
node workflows/scripts/verify_replay.js

# Generate test fixtures and SQL
node workflows/scripts/generate_fixtures.js --file
node workflows/scripts/generate_fixtures.js --sql > workflows/fixtures/setup_test_data.sql

# Validate scoring across Romanian test cases
node workflows/scripts/validate_scoring.js domain_fixtures
```

All scripts exit with code 0 on success, 1 on failure.

## Package Contents

| File | Purpose |
|---|---|
| `workflows/WF-TR-01_Thread_Resolver.json` | The n8n workflow (import this) |
| `workflows/contracts/ThreadResolutionContracts.md` | Formal contract definitions (v2.0) |
| `workflows/scripts/validate_contract.js` | Contract validation script |
| `workflows/scripts/lint_workflow.js` | Static workflow linter |
| `workflows/scripts/verify_replay.js` | Replay/idempotency verifier (11 anchor fixtures) |
| `workflows/scripts/validate_scoring.js` | Scoring validator for Romanian test cases |
| `workflows/scripts/generate_fixtures.js` | Test fixture generator |
| `workflows/fixtures/*.json` | Pre-generated test fixtures (11 anchor cases + domain fixtures) |
| `workflows/fixtures/setup_test_data.sql` | Complete test data setup SQL (all tenants, all domains) |
| `workflows/IMPORT_WF-TR-01.md` | This file (v2.0) |
| `workflows/TEST_AFTER_IMPORT_WF-TR-01.md` | Post-import testing guide (v2.0) |
| `workflows/TEST_REPORT_WF-TR-01.md` | Test report with honest scoring (v2.0) |

---

## Troubleshooting

### PostgreSQL Connection Error

- Verify PostgreSQL is running and accessible from n8n
- Check PostgreSQL credential has correct host, port, username, password
- Test connection: `psql -h host -U user -d database` from n8n server

### Audit Write Fails

- Ensure `thread_resolution_audit` table exists with PRIMARY KEY on `resolution_id`
- Ensure `ON CONFLICT DO NOTHING` syntax is supported (PostgreSQL 9.5+)
- Check PostgreSQL logs for constraint violation details

### Workflow Hangs or Timeout

- Verify `alwaysOutputData` is ON for all nodes (especially error paths)
- Check n8n execution timeout setting (default 30s may be too low for large candidate thread sets)
- Increase `CANDIDATE_WINDOW_DAYS` limit if you're loading too many threads

### Incorrect Resolution Decision

- Verify test data is loaded (run `setup_test_data.sql`)
- Check threshold values in `TR_Apply_Decision_Policy` node
- Enable debug logging in each node to trace score computation
- Run `validate_scoring.js` to verify Romanian semantic matching is correct

---

> **Version: 2.0** | Last updated: 2026-04-15
