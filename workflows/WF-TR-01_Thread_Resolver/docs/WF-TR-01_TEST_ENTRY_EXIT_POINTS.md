# WF-TR-01 Thread Resolver — Test Entry & Exit Points (v2.0)

> **Status:** pre_live_ready (candidate, advance_allowed=false)  
> **Workflow Nodes:** 19 total (TR_Trigger through TR_Return_Error)  
> **Entry Points:** Manual via executeWorkflowTrigger; MCP via manual form trigger  
> **Exit Points:** TR_Return_Result (success) and TR_Return_Error (failure)

---

## 1. Workflow Node Architecture

WF-TR-01 is a **sub-workflow** (not independently activated). It is called by the orchestrator via `executeWorkflowTrigger`.

### Node Inventory (19 nodes)

| # | Node Name | Type | Role | Entry Point | Exit Point |
|---|---|---|---|---|---|
| 1 | TR_Trigger | trigger | Entry; receives ThreadResolutionRequest | **YES** | — |
| 2 | TR_Validate_Input | code | Validates required fields | — | — |
| 3 | TR_Route_Valid | switch | Routes valid/invalid requests | — | — |
| 4 | TR_Select_Content_Class | code | MVP: normalized_content | — | — |
| 5 | TR_Check_Explicit_Refs | code | Shortcircuit logic (priorities 1, 1b) | — | — |
| 6 | TR_Route_Shortcircuit | switch | Routes explicit vs scoring path | — | — |
| 7 | TR_Load_Reply_Context | postgres | Queries messages for reply_to_message_id | — | — |
| 8 | TR_Process_Reply_Result | code | Extracts thread_id from reply lookup | — | — |
| 9 | TR_Route_After_Reply | switch | Routes to scoring or return-decision | — | — |
| 10 | TR_Load_Candidate_Threads | postgres | Queries threads for scoring | — | — |
| 11 | TR_Load_Entity_Hints | postgres | Queries entities for entity match | — | — |
| 12 | TR_Score_Candidates | code | Computes entity + semantic + temporal + channel | — | — |
| 13 | TR_Apply_Decision_Policy | code | Applies thresholds & ambiguity rules | — | — |
| 14 | TR_Build_Result | code | Constructs ThreadResolutionResult contract | — | — |
| 15 | TR_Build_Error_Result | code | Constructs error result contract | — | — |
| 16 | TR_Write_Audit | postgres | Writes success/reopen/attach decisions to audit table | — | — |
| 17 | TR_Return_Result | output | Returns success result to caller | — | **YES** |
| 18 | TR_Return_Error | output | Returns error result to caller | — | **YES** |
| 19 | TR_Write_Error_Audit | postgres | Writes validation errors to audit table | — | — |

---

## 2. Entry Points

### Primary Entry: executeWorkflowTrigger (Sub-Workflow Mode)

**Path:** Main orchestrator → Execute Workflow node → WF-TR-01

**Invoked as:**
```
POST /workflows/{wf-tr-01-id}/execute
Body: ThreadResolutionRequest (flat or nested shape)
```

**Node:** TR_Trigger (executeWorkflowTrigger)

**Input Contract:** ThreadResolutionRequest (flat or nested)

**Validation:** TR_Validate_Input checks all required fields

**Expected Success Path:**
```
TR_Trigger → TR_Validate_Input → [valid]
  → TR_Route_Valid → [valid=true]
    → TR_Select_Content_Class
      → TR_Check_Explicit_Refs
        → [no explicit ref] → TR_Route_Shortcircuit → [shortcircuit=false]
          → TR_Load_Reply_Context
            → TR_Process_Reply_Result
              → TR_Route_After_Reply → [no reply match] → TR_Load_Candidate_Threads
                → TR_Load_Entity_Hints
                  → TR_Score_Candidates
                    → TR_Apply_Decision_Policy
                      → TR_Build_Result
                        → TR_Write_Audit
                          → TR_Return_Result (output)
```

**Expected Error Path:**
```
TR_Trigger → TR_Validate_Input → [invalid]
  → TR_Route_Valid → [valid=false]
    → TR_Build_Error_Result
      → TR_Write_Error_Audit
        → TR_Return_Error (output)
```

**Expected Shortcircuit Path (explicit thread_id or reply_to_thread_id):**
```
TR_Trigger → TR_Validate_Input → [valid]
  → TR_Route_Valid → [valid=true]
    → TR_Select_Content_Class
      → TR_Check_Explicit_Refs
        → [explicit ref found] → TR_Route_Shortcircuit → [shortcircuit=true]
          → TR_Build_Result (decision=attach_existing_thread, confidence=1.0)
            → TR_Write_Audit
              → TR_Return_Result (output)
```

### Alternative Entry: MCP Form Trigger (Not Recommended)

**Current Status:** ⚠️ PARTIAL (manual trigger receives empty JSON; not production-recommended)

**Path:** MCP form invocation → manual trigger → WF-TR-01

**Node:** TR_Trigger (also used for manual test invocation)

**Issue (From HANDOFF_WF-TR-01_2026-04-16.md Section 8):**
- Manual/form trigger passes empty JSON by default
- TR_Validate_Input correctly rejects with fail_invalid_input
- Requires either pinned data or form-data passthrough trigger type

**Workaround:** Use executeWorkflowTrigger from orchestrator instead; or configure form-based trigger with pinned input data.

---

## 3. Exit Points

### Success Path Exit: TR_Return_Result (output node)

**Condition:** status = `success`, `partial`, or `no_action`

**Output Contract:** ThreadResolutionResult

```json
{
  "module_name": "thread_resolver",
  "result_type": "resolution",
  "status": "success",
  "resolution_id": "tr_...",
  "message_id": "...",
  "tenant_id": "...",
  "decision": "attach_existing_thread" | "reopen_latent_thread" | "create_new_thread",
  "resolution_action": "...",
  "resolved_thread_id": "..." | null,
  "winning_reason": "...",
  "decision_reason": "...",
  "confidence": 0.0-1.0,
  "candidate_scores": [...],
  "ambiguity_detected": true | false,
  "reopened_thread": true | false,
  "created_thread": true | false,
  "needs_followup": true | false,
  "followup_requests": [...],
  "content_class_used": "normalized_content",
  "timestamp": "ISO 8601",
  "error": null
}
```

**Routing:** TR_Return_Result receives input from:
- TR_Write_Audit (success path)
- TR_Write_Audit (reopen path)
- TR_Write_Audit (attach path)

**Idempotency:** Audit write uses ON CONFLICT DO NOTHING; same resolution_id produces identical result.

### Error Path Exit: TR_Return_Error (output node)

**Condition:** status = `failed`

**Output Contract:** Error ThreadResolutionResult

```json
{
  "module_name": "thread_resolver",
  "result_type": "resolution",
  "status": "failed",
  "resolution_id": "tr_...",
  "message_id": null | "...",
  "tenant_id": null | "...",
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
  "followup_requests": ["Provide valid message_id"],
  "content_class_used": "none",
  "timestamp": "ISO 8601",
  "error": {
    "code": "INVALID_INPUT",
    "message": "message_id is required",
    "missing_fields": ["message_id"]
  }
}
```

**Routing:** TR_Return_Error receives input from:
- TR_Write_Error_Audit (validation failure path)

**Audit Write:** Error audit written to thread_resolution_audit before return.

---

## 4. Test Entry Point Execution Modes

### Mode 1: Direct Workflow Invocation (POST /workflows/{id}/execute)

**When to use:** Automated testing, CI/CD integration

**Setup:**
1. Get n8n workflow ID for WF-TR-01
2. Prepare ThreadResolutionRequest JSON (flat or nested)
3. POST to n8n API with credentials

**Example:**
```bash
curl -X POST https://n8n-instance/api/v1/workflows/{wf-id}/execute \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d @tc-03-fixture.json
```

**Expected:** Returns ThreadResolutionResult JSON via HTTP response

### Mode 2: n8n UI Manual Trigger

**When to use:** Manual verification, visual debugging

**Setup:**
1. Open WF-TR-01 in n8n editor
2. Click "Execute Workflow" or trigger manually
3. Provide test input JSON in pinned data or form

**Expected:** Execution visible in "Executions" tab; result in output panel

### Mode 3: Orchestrator Invocation (Execute Workflow node)

**When to use:** Production orchestrator → WF-TR-01 call

**Setup:**
1. Configure Execute Workflow node in orchestrator workflow
2. Point to WF-TR-01
3. Pass ThreadResolutionRequest as input

**Expected:** Result returned to orchestrator for downstream processing

---

## 5. Node-Level Entry/Exit per Test Phase

### Phase 1: Input Validation

**Entry:** TR_Trigger (receives raw JSON)

**Nodes:** TR_Trigger → TR_Validate_Input

**Exit Condition:**
- If valid: proceed to TR_Route_Valid (output valid=true)
- If invalid: exit to TR_Build_Error_Result

**Test Points:**
- TC-01: Message_id missing → fail_invalid_input
- TC-11: Whitespace-only normalized_content → fail_invalid_input
- TC-07: Missing tenant_id → fail_invalid_input
- TC-09: Invalid direction enum → fail_invalid_input

### Phase 2: Content Class Selection

**Entry:** TR_Select_Content_Class (receives validated input)

**Nodes:** TR_Select_Content_Class → output content_class="normalized_content"

**Exit Condition:** Always succeeds; routes to next phase

**Test Points:**
- TC-10: nested shape with raw_content present → normalized_content selected
- All other tests: flat shape → normalized_content selected

### Phase 3: Explicit Reference Shortcircuit (Priorities 1 & 1b)

**Entry:** TR_Check_Explicit_Refs (receives validated content)

**Logic:**
1. Check for explicit thread_id (Priority 1)
2. Check for reply_to_thread_id (Priority 1b)
3. If either present: set shortcircuit=true, return thread_id
4. If neither: proceed to reply linkage lookup

**Exit Condition:**
- If shortcircuit=true: exit to TR_Route_Shortcircuit → TR_Build_Result (confidence=1.0)
- If shortcircuit=false: exit to reply linkage phase

**Test Points:**
- TC-01: thread_id=tttttttt-0001-0000-0000-000000000001 → shortcircuit (attach)
- TC-12: reply_to_thread_id provided → shortcircuit (attach)
- TC-03: no explicit ref → proceed to scoring

### Phase 4: Reply Linkage Lookup (Priority 2)

**Entry:** TR_Load_Reply_Context (if no shortcircuit)

**Nodes:** TR_Load_Reply_Context → TR_Process_Reply_Result

**Query:** SELECT thread_id FROM messages WHERE id=$1 AND tenant_id=$2

**Exit Condition:**
- If reply_to_message_id exists and message found with thread_id: attach to that thread
- If reply_to_message_id exists but message not found or no thread_id: proceed to scoring
- If no reply_to_message_id: proceed to scoring

**Test Points:**
- TC-02: reply_to_message_id points to existing message with thread_id → attach
- TC-15: reply_to_message_id points to message with no thread_id → create_new
- TC-03: no reply_to_message_id → proceed to scoring

**Known Limitation:** messages.thread_id column missing (blocker from HANDOFF). Migration script required.

### Phase 5: Candidate Scoring (Priorities 3-5)

**Entry:** TR_Load_Candidate_Threads (if no explicit ref, no reply match)

**Nodes:**
- TR_Load_Candidate_Threads (query threads)
- TR_Load_Entity_Hints (query entities)
- TR_Score_Candidates (compute scores)
- TR_Apply_Decision_Policy (apply thresholds)

**Query 1 (Candidates):** SELECT * FROM threads WHERE tenant_id=$1 AND status IN ('active','waiting','blocked','latent') AND last_activity_at > NOW() - INTERVAL '30 days' LIMIT 50

**Query 2 (Entities):** SELECT * FROM entities WHERE tenant_id=$1 AND id IN (SELECT unnest($2::uuid[]))

**Scoring:** entity_match + semantic_match + temporal_proximity + channel_relevance

**Decision Policy:**
1. If score >= attach_threshold (0.75): attach_existing_thread
2. Else if thread_status=latent AND score >= reopen_threshold (0.65): reopen_latent_thread
3. Else if top 2 scores within ambiguity_margin (0.05): create_new_thread (ambiguity)
4. Else: create_new_thread (no match)

**Exit Condition:**
- Decision computed (attach, reopen, create_new, or error)
- Exit to TR_Build_Result

**Test Points:**
- TC-03: score=0.90 (0.30+0.35+0.15+0.10) >= 0.75 → attach
- TC-04: latent thread, score=0.70 >= 0.65 → reopen
- TC-06: top 2 scores differ by 0.03 < 0.05 → ambiguity → create_new
- TC-14: score exactly 0.75 >= 0.75 → attach
- TC-13: latent thread, score=0.80 >= 0.75 (attach) but status=latent → reopen (not attach)

### Phase 6: Result Construction & Audit

**Entry:** TR_Build_Result (success path) or TR_Build_Error_Result (error path)

**Nodes (Success):**
- TR_Build_Result → constructs ThreadResolutionResult contract
- TR_Write_Audit → INSERT to thread_resolution_audit (ON CONFLICT DO NOTHING)
- TR_Return_Result → output

**Nodes (Error):**
- TR_Build_Error_Result → constructs error result contract
- TR_Write_Error_Audit → INSERT to thread_resolution_audit (error record)
- TR_Return_Error → output

**Exit Condition:** Result returned to caller

**Test Points:**
- TC-08: deterministic replay → same resolution_id (ON CONFLICT DO NOTHING prevents duplicate audit)
- TC-16: error path → error audit written
- All tests: audit table contains one row per resolution_id

---

## 6. Cross-Node Data Flow (n8n Implementation Detail)

**Important:** WF-TR-01 uses **implicit cross-node references** via `$('nodeName').json` syntax. This is documented but not ideal per architecture spec.

### Critical Cross-Node Dependencies

| From | To | Data | Purpose |
|---|---|---|---|
| TR_Validate_Input | TR_Route_Valid | `_valid` field (string) | Routes valid/invalid |
| TR_Check_Explicit_Refs | TR_Route_Shortcircuit | `_shortcircuit` field (boolean) | Routes shortcircuit/scoring |
| TR_Load_Reply_Context | TR_Process_Reply_Result | Query result | Extracts thread_id |
| TR_Process_Reply_Result | TR_Route_After_Reply | `thread_id` / null | Routes to scoring or return |
| TR_Load_Candidate_Threads | TR_Score_Candidates | Candidate thread array | Input to scoring |
| TR_Load_Entity_Hints | TR_Score_Candidates | Entity hints | Input to entity match |
| TR_Score_Candidates | TR_Apply_Decision_Policy | Scored candidates array | Input to decision policy |
| TR_Apply_Decision_Policy | TR_Build_Result | Decision + metadata | Constructs result |
| TR_Build_Result | TR_Write_Audit | Result contract | Writes to audit table |
| TR_Build_Result | TR_Return_Result | Result contract | Returns to caller |

**Each implicit reference validated by workflow linter.**

---

## 7. Test Entry Point Availability

### Tests That Can Run Immediately (No DB Setup)

| Test | Entry | Prerequisites |
|---|---|---|
| TC-01 Explicit thread | POST /execute + fixture | WF-TR-01 imported, n8n running |
| TC-05 Create new | POST /execute + fixture | WF-TR-01 imported, n8n running |
| TC-07 Invalid input | POST /execute + fixture | WF-TR-01 imported, n8n running |
| TC-09 Cross-tenant | POST /execute + fixture | WF-TR-01 imported, n8n running |
| TC-10 Content class | POST /execute + fixture | WF-TR-01 imported, n8n running |
| TC-11 Whitespace only | POST /execute + fixture | WF-TR-01 imported, n8n running |

### Tests That Require setup_test_data.sql

| Test | Entry | Prerequisites |
|---|---|---|
| TC-02 Reply linkage | POST /execute + fixture | setup_test_data.sql loaded + messages.thread_id migration |
| TC-03 Entity + semantic | POST /execute + fixture | setup_test_data.sql loaded |
| TC-04 Latent reopen | POST /execute + fixture | setup_test_data.sql loaded |
| TC-06 Ambiguous set | POST /execute + fixture | setup_test_data.sql loaded |
| TC-08 Deterministic replay | POST /execute 2x | setup_test_data.sql loaded |
| TC-12 reply_to_thread_id | POST /execute + fixture | setup_test_data.sql loaded |
| TC-13 Latent above attach | POST /execute + fixture | setup_test_data.sql loaded |
| TC-14 Exact boundary | POST /execute + fixture | setup_test_data.sql loaded |
| TC-15 Reply no thread_id | POST /execute + fixture | setup_test_data.sql loaded + messages.thread_id migration |
| TC-16 Error audit path | POST /execute + fixture | setup_test_data.sql loaded |

---

## 8. Known Blockers & Workarounds

### Blocker 1: messages.thread_id Column Missing

**Impact:** TC-02, TC-12, TC-15 cannot fully execute reply linkage path

**Source:** HANDOFF_WF-TR-01_2026-04-16.md Section 7

**Workaround:** Run `MIGRATION_messages_for_WF-TR-01.sql` as postgres superuser before runtime tests

**Status:** Documented; migration script provided

### Blocker 2: MCP Form Trigger Empty JSON

**Impact:** MCP invocation receives empty JSON; TR_Validate_Input rejects

**Source:** HANDOFF_WF-TR-01_2026-04-16.md Section 8

**Workaround:** Use executeWorkflowTrigger from orchestrator or configure form trigger with pinned data

**Status:** Documented; use executeWorkflowTrigger recommended

---

## 9. Exit Point Verification Checklist

After each test execution, verify exit point:

### Success Path (TC-01, TC-03, TC-04, TC-05 via shortcircuit)

- [ ] HTTP response received from TR_Return_Result
- [ ] status = "success"
- [ ] module_name = "thread_resolver"
- [ ] result_type = "resolution"
- [ ] resolution_id non-empty and deterministic
- [ ] decision field present and valid
- [ ] resolved_thread_id is UUID or null (matching decision)
- [ ] confidence is 0.0-1.0
- [ ] error is explicitly null
- [ ] timestamp is ISO 8601

### Error Path (TC-07, TC-11, TC-16)

- [ ] HTTP response received from TR_Return_Error
- [ ] status = "failed"
- [ ] module_name = "thread_resolver"
- [ ] result_type = "resolution"
- [ ] decision = "fail_invalid_input"
- [ ] error.code is non-empty
- [ ] error.missing_fields is array (may be empty)
- [ ] confidence = 0.0
- [ ] resolved_thread_id = null
- [ ] content_class_used = "none"

### Audit Verification (All Paths)

- [ ] thread_resolution_audit table has one row per resolution_id
- [ ] Replay (TC-08) produces zero duplicate rows (ON CONFLICT DO NOTHING)
- [ ] All decision values present in audit
- [ ] candidate_scores is JSONB in audit
- [ ] timestamp field populated

---

## Versioning

| Version | Date | Status |
|---|---|---|
| 1.0 | 2026-04-15 | Superseded |
| 2.0 | 2026-04-16 | CURRENT (with blockers documented) |

**Last Updated:** 2026-04-16  
**Evidence Sources:** HANDOFF_WF-TR-01_2026-04-16.md Section 8 (MCP test), TEST_AFTER_IMPORT_WF-TR-01.md (test entry), workflow JSON (node inventory)
