# Independent Workflow Validation Audit — WF-TR-01 Thread Resolver

**Audit date:** 2026-04-15
**Auditor role:** Independent second-pass validator
**Workflow version:** 1.1
**Overall verdict:** NOT APPROVED

---

# 1. Audit Scope Summary

## Artifacts Received

| # | Artifact | Role | Status |
|---|---|---|---|
| 1 | `WF-TR-01_Thread_Resolver.json` | Workflow JSON (18 nodes) | PRESENT |
| 2 | `contracts/ThreadResolutionContracts.md` | Contract spec | PRESENT |
| 3 | `docs/Thread_Resolution_Spec.md` | Technical/algorithm spec | PRESENT |
| 4 | `IMPORT_WF-TR-01.md` | Import instructions | PRESENT |
| 5 | `TEST_AFTER_IMPORT_WF-TR-01.md` | Post-import test guide | PRESENT |
| 6 | `TEST_REPORT_WF-TR-01.md` | Internal test report | PRESENT |
| 7 | `fixtures/TC-01..TC-10` (10 JSON files) | Test fixtures | PRESENT |
| 8 | `fixtures/setup_test_data.sql` | DB setup SQL | PRESENT |
| 9 | `scripts/validate_contract.js` | Contract validator | PRESENT |
| 10 | `scripts/lint_workflow.js` | Static linter | PRESENT |
| 11 | `scripts/verify_replay.js` | Replay verifier | PRESENT |
| 12 | `scripts/generate_fixtures.js` | Fixture generator | PRESENT |
| 13 | `docs/Architecture_Spec_v3_Ucenicul.md` | Canonical architecture | PRESENT |
| 14 | `docs/n8n_Workflow_Mapping.md` | n8n execution mapping | PRESENT |
| 15 | `docs/Module_Registry_Ucenicul.md` | Module registry | PRESENT |
| 16 | User-provided canonical anchor test cases (5) | Anchor test fixtures | PRESENT |

**Minimum package:** All required artifacts present. Package is auditable.

**Scope audited:** WF-TR-01 Thread Resolver workflow package only, as specified. Cross-referenced against Architecture Spec v3, Thread Resolution Spec, n8n Workflow Mapping, and user-provided anchor fixtures.

---

# 2. Step-by-Step Validation Table

## STEP 1 — ARTIFACT INVENTORY

**Score: 9/10 — NOT VALIDATED**

**What was checked:** Presence and classification of all artifacts in the delivery package.

**How validated:** File listing, cross-reference against import instructions manifest, comparison with audit requirements.

**Defects found:**

- **D-01 (MINOR):** The `setup_test_data.sql` file does not insert into the `tenants` table. The post-import test guide includes a `tenants` INSERT, but the auto-generated SQL from `generate_fixtures.js --sql` omits it. This creates a gap between the two SQL sources. If the DB has foreign key constraints from threads/entities/messages to tenants, the fixture SQL will fail.

**Required fix:** Add `INSERT INTO tenants (id) VALUES ('aaaaaaaa-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;` to `setup_test_data.sql` and to `generate_fixtures.js`.

---

## STEP 2 — STATIC FILE INTEGRITY

**Score: 10/10 — VALIDATED**

**What was checked:** JSON structure validity, script readability, completeness, placeholders, truncation, internal coherence.

**How validated:**
- Parsed `WF-TR-01_Thread_Resolver.json` — valid JSON, 18 nodes, complete connections block, settings, tags, meta.
- All 4 scripts execute successfully: `validate_contract.js` 10/10, `lint_workflow.js` 20/20, `verify_replay.js` 9/9.
- All 10 fixture files are valid JSON with id, name, description, request, and expected fields.
- No placeholder text ("TODO", "to be completed", etc.) found anywhere.
- No truncation detected.
- File naming is consistent: `TC-##_Description.json`, `TR_` node prefix, script names match their purpose.

**Defects found:** None.

---

## STEP 3 — CONTRACT VALIDATION

**Score: 7/10 — NOT VALIDATED**

**What was checked:** ThreadResolutionRequest and ThreadResolutionResult contracts — field clarity, required/optional/forbidden classification, allowed statuses, error shape, idempotency, field ownership.

**How validated:** Contract doc review, cross-reference with workflow code, cross-reference with user-provided anchor fixtures, cross-reference with Architecture Spec.

**Defects found:**

- **D-02 (CRITICAL):** The user-provided canonical anchor fixtures use a fundamentally different contract shape than what the workflow implements. The user fixtures wrap the message inside `request.message` with nested `reply_context` and `resolution_policy` objects. The workflow expects flat fields (`message_id`, `tenant_id`, `channel`, etc.). This means the workflow cannot be tested with the user-provided fixtures without a normalization/adapter layer.

  **Specific mismatches:**
  - User input: `request.message.id` → Workflow: `message_id`
  - User input: `reply_context.reply_to_thread_id` → No equivalent in workflow contract
  - User input: `resolution_policy.attach_threshold` (0.82) → Workflow: hardcoded 0.75
  - User input: `resolution_policy.reopen_threshold` (0.72) → Workflow: hardcoded 0.65
  - User input: `request.message.raw_content` → Workflow: FORBIDDEN
  - User input: `request.message.llm_safe_content`, `rag_safe_content`, `status` → Not in request contract

  **User expected output vs. workflow output:**
  - User: `resolution_action` → Workflow: `decision`
  - User: `winning_reason` → Workflow: `decision_reason`
  - User: `confidence` → Workflow: does not produce
  - User: `module_name`, `result_type`, `status`, `reopened_thread`, `created_thread`, `needs_followup`, `followup_requests` → Workflow: does not produce
  - Workflow: `resolution_id`, `ambiguity_detected`, `content_class_used`, `error` → User: does not expect

- **D-03 (CRITICAL):** The `resolution_id` format `tr_{message_id}_{unix_timestamp_ms}` uses `Date.now()`, making every invocation produce a unique ID. The contract claims audit write idempotency via PK constraint on `resolution_id`, but since the PK changes on every call, duplicate audit rows are created on replay. The idempotency claim is false.

- **D-04 (MAJOR):** The `reply_to_thread_id` field used in user anchor fixture TR_CASE_01 (as `reply_context.reply_to_thread_id`) has no equivalent in the workflow contract. The workflow uses `thread_id` for explicit thread reference (priority 1). The user fixture places the explicit reference in `reply_context.reply_to_thread_id`, suggesting a different priority-resolution model where the explicit reference is separate from the reply context. This creates ambiguity about what constitutes an "explicit thread reference" vs. a "reply linkage."

- **D-05 (MAJOR):** User fixtures include per-request `resolution_policy` with configurable thresholds (`attach_threshold=0.82`, `reopen_threshold=0.72`). The workflow uses hardcoded thresholds (0.75/0.65). The contract spec also lists 0.75/0.65. The Thread Resolution Spec says these "are configurable per tenant" but the workflow provides no mechanism for per-request or per-tenant threshold override. This is a feature gap, and the user's test fixtures expect different thresholds than the workflow applies.

- **D-06 (MINOR):** The `TR_Build_Result` node does not explicitly set `error: null` for non-error results. The `TR_Return_Result` node handles this with `result.error || null`, but the intermediate result object lacks the field. This is a contract compliance gap in the intermediate data.

**Required fixes:**
- D-02: Either update the workflow to accept the user's contract shape (with an adapter layer), or produce a formal contract reconciliation document that maps user fixture fields to workflow fields. Until resolved, the user-provided fixtures cannot validate the workflow.
- D-03: Change `resolution_id` to use a deterministic key: `tr_{message_id}` (without timestamp). For uniqueness across re-resolutions, use `tr_{message_id}_{version}` with version tracking, or accept that re-resolution creates a new audit row (and document this explicitly, removing the idempotency claim).
- D-04: Add `reply_to_thread_id` to the contract as an optional field that enables explicit thread reference via reply context, or document clearly why the user fixture's model is not supported.
- D-05: Add resolution_policy support (at least threshold override) to the workflow, or document the gap as a known limitation and update user test expected outputs to use 0.75/0.65 thresholds.
- D-06: Add `error: null` to `TR_Build_Result` output.

---

## STEP 4 — THEORY ALIGNMENT

**Score: 9/10 — NOT VALIDATED**

**What was checked:** Whether the workflow respects target architecture: thread-first, resolver-only, no planning, no response composition, no legacy intent-first, privacy-ready.

**How validated:** Node-by-node review against Architecture Spec v3, comparison with n8n Workflow Mapping step 5 (Thread Resolver), drift watchdog checks.

**Findings:**
- Thread Resolver is correctly positioned as step 5 in the canonical flow, before Execution Context Manager.
- The workflow does NOT perform planning, response composition, or module dispatching. It is resolver-only.
- No intent classification, no brain_contract.json references, no legacy route-by-intent patterns.
- Privacy contract respected: normalized_content consumed, raw_content forbidden.
- No module-to-module calls.
- No branch-owned final response logic.
- Content class tracking present.

**Defects found:**

- **D-07 (MAJOR):** The error path (fail_invalid_input) does NOT write an audit record. The connection graph routes TR_Build_Error_Result → TR_Return_Error, bypassing TR_Write_Audit entirely. The Thread Resolution Spec Section 8 states "For every thread resolution, the following MUST be logged." The `fail_invalid_input` is one of the four defined resolution decisions. Omitting audit for error cases violates the auditability requirement and creates a gap in the audit trail.

**Required fix:** Add a connection from TR_Build_Error_Result to a new TR_Write_Error_Audit node (or route through TR_Write_Audit) before TR_Return_Error. Alternatively, add an explicit exclusion in the spec if error cases should not be audited (with documented justification).

---

## STEP 5 — NODE-BY-NODE AUDIT

**Score: 8/10 — NOT VALIDATED**

See Section 3 (Node-by-Node Audit Table) below for the full table.

**Summary of node-level defects:**

- **D-08 (MAJOR):** `TR_Route_Valid` switch node compares `$json._valid` against string `"true"/"false"`. The `_valid` field is a JavaScript boolean (`true`/`false`). In n8n switch v3, the expression `={{ $json._valid }}` is evaluated and compared against the string `"true"`. n8n's switch node performs loose comparison, so boolean `true` compared to string `"true"` may or may not match depending on n8n version. This is a fragile comparison pattern that could silently misroute valid requests to the error path.

- **D-09 (MINOR):** `TR_Load_Reply_Context` executes a DB query even when `_check_reply_linkage` is false (no `reply_to_message_id`). The query runs with `$1 = null/undefined`, producing `WHERE m.id = NULL` which returns 0 rows. This is functionally correct but wasteful — an unnecessary DB roundtrip on every non-reply message.

- **D-10 (MINOR):** `TR_Load_Entity_Hints` uses a dummy UUID `00000000-0000-0000-0000-000000000000` as fallback for null `author_entity_id`. This is a code smell; a SQL COALESCE/conditional approach would be cleaner and avoid phantom entity lookups.

- **D-11 (MINOR):** `TR_Build_Result` includes non-contract fields in its output (`channel`, `author_entity_id`, `normalized_content`, `source_message_ref`). While `TR_Return_Result` strips these, the intermediate data leaks non-contract fields through the audit write path. The audit node writes these extra fields to the DB? No — the audit INSERT only maps the 10 defined columns. But the principle of clean contract data at each node boundary is violated.

**Required fixes:**
- D-08: Change the switch comparison to use boolean-safe evaluation: either set `_valid` as a string in TR_Validate_Input, or use an IF node instead of switch, or verify that n8n switch v3 handles boolean-to-string comparison correctly for your n8n version. Document the assumption.
- D-09: Add a code-level bypass or route for messages without `reply_to_message_id` that skips the DB query.
- D-10: Use `COALESCE($2, '00000000-0000-0000-0000-000000000000'::uuid)` in SQL or add a NULL check in the WHERE clause.
- D-11: Remove non-contract fields from `TR_Build_Result` output, or move them to a separate metadata object.

---

## STEP 6 — DATA FLOW AND COUPLING AUDIT

**Score: 8/10 — NOT VALIDATED**

**What was checked:** Data traceability across the workflow, hidden coupling, fragile $json usage, branch safety.

**How validated:** End-to-end trace of critical values: tenant_id, message_id, normalized_content, reply context, candidate threads, candidate scores, resolution action, resolved_thread_id.

**Traceable values:**

| Value | Origin | Path | Fragile? |
|---|---|---|---|
| `tenant_id` | TR_Trigger input | Flows through all nodes via spread operator | No |
| `message_id` | TR_Trigger input → TR_Validate_Input | Present in all code nodes | No |
| `normalized_content` | TR_Trigger input | → content_for_resolution via TR_Select_Content_Class | No |
| `reply_to_message_id` | TR_Trigger input | → TR_Load_Reply_Context $1 param | Minor: null value handling |
| `candidate threads` | TR_Load_Candidate_Threads output | → TR_Score_Candidates via `$('TR_Load_Candidate_Threads').all()` | See D-12 |
| `entity hints` | TR_Load_Entity_Hints output | → TR_Score_Candidates via `$('TR_Load_Entity_Hints').all()` | See D-12 |
| `scored candidates` | TR_Score_Candidates output | → TR_Apply_Decision_Policy via `$input` | No |
| `resolution action` | TR_Apply_Decision_Policy output | → TR_Build_Result via `$input` | No |
| `resolved_thread_id` | Various nodes set `_resolved_thread_id` | → TR_Build_Result | No |

**Defects found:**

- **D-12 (MAJOR):** `TR_Score_Candidates` references upstream nodes using `$('TR_Process_Reply_Result').all()[0].json` and `$('TR_Load_Candidate_Threads').all()` and `$('TR_Load_Entity_Hints').all()`. These cross-node references work in n8n because all three nodes are on the same execution path. However, the `$('nodeName')` pattern creates hidden coupling: if the node is renamed, the reference breaks silently. Additionally, if n8n's execution model changes the availability of non-direct-upstream node data, these references could fail. The architectural principle states "no hidden cross-node coupling." While this is standard n8n practice, it creates fragile references that are not self-documenting.

- **D-13 (MINOR):** `TR_Return_Result` references `$('TR_Build_Result').all()[0].json` instead of using `$input.all()[0].json`. The direct input to TR_Return_Result comes from TR_Write_Audit, but the code reaches back to TR_Build_Result. This works because n8n makes all upstream node data available, but it means TR_Return_Result is coupled to TR_Build_Result by name, not by connection topology.

**Required fixes:**
- D-12: Document all cross-node `$('nodeName')` references in the workflow notes. Consider adding a linter check that validates all `$('...')` references match existing node names.
- D-13: This is intentional (reading from Build_Result not Write_Audit to ensure audit failure doesn't block result). Document this explicitly in the node notes.

---

## STEP 7 — DATABASE / QUERY POLICY AUDIT

**Score: 9/10 — NOT VALIDATED**

**What was checked:** Every DB query node for tenant isolation, parameterization, query policy compliance, Postgres node assumptions.

**How validated:** Inspected all 4 Postgres nodes, verified parameter sources, checked SQL correctness.

| Query Node | Parameterized | Tenant Isolated | Parameters Source | Issue |
|---|---|---|---|---|
| TR_Load_Reply_Context | $1, $2 | Yes (tenant_id=$2) | reply_to_message_id, tenant_id | D-09: runs on null input |
| TR_Load_Candidate_Threads | $1 | Yes (tenant_id=$1) | tenant_id | Clean |
| TR_Load_Entity_Hints | $1, $2, $3 | Yes (tenant_id=$1) | tenant_id, author_entity_id, related_entity_ids array | D-10: dummy UUID |
| TR_Write_Audit | $1-$10 | Yes (tenant_id=$3) | All result fields | Clean |

**Defects found:**

- **D-14 (MINOR):** `TR_Load_Entity_Hints` constructs the third parameter as a Postgres array literal via string concatenation in the n8n expression: `={{ '{' + ($json.related_entity_ids || []).join(',') + '}' }}`. While this is cast to `uuid[]` in SQL, the array construction happens in the expression layer, not via proper parameterization. If a related_entity_id contained a `}` or `,` character (unlikely for UUIDs but technically possible with malformed input), this could produce malformed SQL. This is a minor parameterization policy concern.

- **D-15 (MINOR):** No Postgres nodes set `alwaysOutputData: true`. While n8n Postgres v2.5 typically outputs metadata even on 0-row results, this behavior is version-dependent. Explicitly setting `alwaysOutputData` would prevent silent flow interruption if a query returns no rows and the n8n version doesn't auto-emit.

**Required fixes:**
- D-14: Use n8n's built-in array parameter handling or validate UUID format before constructing the array literal.
- D-15: Add `"alwaysOutputData": true` to the options of all four Postgres nodes.

---

## STEP 8 — PRIVACY AND CONTENT-CLASS AUDIT

**Score: 10/10 — VALIDATED**

**What was checked:** Content class usage, privacy-readiness, no Phase 2 overclaims.

**How validated:** Inspected TR_Select_Content_Class code, all scoring code, result output, contract doc, and all code node scripts.

**Findings:**
- TR_Select_Content_Class explicitly selects `normalized_content` for MVP and sets `content_class_used: 'normalized_content'`.
- `raw_content` is listed as FORBIDDEN in the contract; the lint script verifies no code node references it.
- `content_class_used` is tracked in every result and written to the audit table.
- Phase 2 upgrade path is documented: swap content class in TR_Select_Content_Class.
- No false claim that Phase 2 pseudonymization is active.
- Entity references use entity_id, not raw names.

**Defects found:** None.

---

## STEP 9 — RESOLUTION LOGIC AUDIT

**Score: 8/10 — NOT VALIDATED**

**What was checked:** Decision model, threshold logic, ambiguity handling, reopen behavior, candidate score auditability.

**How validated:** Traced the scoring algorithm and decision policy code against the Thread Resolution Spec, verified with numerical simulations.

**Findings:**

Priority order implementation:
1. Explicit thread reference (`thread_id` in request) → shortcircuit in TR_Check_Explicit_Refs ✓
2. Direct reply linkage (`reply_to_message_id` → DB lookup) → shortcircuit in TR_Process_Reply_Result ✓
3. Entity + semantic match → scored in TR_Score_Candidates ✓
4. Semantic match alone → scored in TR_Score_Candidates ✓
5. Latent thread reopen → decided in TR_Apply_Decision_Policy ✓
6. Create new thread → default in TR_Apply_Decision_Policy ✓

Scoring components verified against spec:
- entity_match_score: 0.0-0.3 ✓ (0.3 for primary match, 0.15 for related match)
- semantic_match_score: 0.0-0.4 ✓ (Jaccard × 0.8, capped at 0.4)
- temporal_proximity_score: 0.0-0.2 ✓ (0.2/0.15/0.1/0.05 decay)
- channel_relevance_score: 0.0-0.1 ✓

**Defects found:**

- **D-16 (CRITICAL):** The decision policy has a logic gap in the interaction between active-thread attach and latent-thread scoring. The spec pseudocode (Thread_Resolution_Spec.md Section 3) says:

  ```
  if best and best.score >= STRICT_ATTACH_THRESHOLD:
      return best.thread_id
  if best and best.score >= REOPEN_THRESHOLD and best.status == "latent":
      return reopen_thread(best.thread_id)
  ```

  The spec checks STRICT_ATTACH_THRESHOLD first regardless of status. If a latent thread scores 0.85 (above attach threshold), the spec would return it without distinguishing attach vs. reopen. The workflow code instead checks `activeStatuses.includes(best.thread_status)` first, then checks latent separately. This means:

  - Spec: latent thread scoring 0.85 → "return thread_id" (ambiguous action)
  - Workflow: latent thread scoring 0.85 → reopen_latent_thread (explicit action)

  The workflow's behavior is actually **more correct** than the spec pseudocode for the latent case, but it constitutes a deviation from the spec. The spec should be updated to match the workflow's clearer logic, or this deviation should be formally documented.

- **D-17 (MAJOR):** The decision policy contains a redundant catch-all block at the end:

  ```javascript
  if (best.score >= STRICT_ATTACH_THRESHOLD) {
    return attach_existing_thread;
  }
  ```

  This fires after the active-status and latent checks. It catches threads with status not in `['active', 'waiting', 'blocked', 'latent']` — but the candidate SQL only loads those four statuses. This block is dead code. Dead code in decision logic creates confusion about intended behavior and should be removed or documented.

- **D-18 (MAJOR):** The ambiguity check applies a minimum score condition (`best.score >= REOPEN_THRESHOLD`). The spec says "If multiple threads are plausible and no single candidate dominates (top two scores within 0.05 of each other)." The spec does not specify a minimum score for ambiguity. While the behavior is correct (low-scoring ties would create new thread anyway), the additional condition is an undocumented implementation choice.

**Required fixes:**
- D-16: Update Thread_Resolution_Spec.md Section 3 pseudocode to explicitly separate the active-attach and latent-reopen paths, matching the workflow logic.
- D-17: Remove the redundant catch-all block, or add a comment explaining it's defensive code for unexpected statuses.
- D-18: Document the minimum score condition for ambiguity in both the contract spec and Thread_Resolution_Spec.md.

---

## STEP 10 — TEST FIXTURE AUDIT

**Score: 6/10 — NOT VALIDATED**

**What was checked:** Whether fixtures cover all mandatory test cases, whether payloads match contracts, whether expected results are explicit.

**How validated:** Mapped each fixture to required behavior, cross-referenced against user-provided anchor fixtures, verified expected outputs against workflow logic.

**Mandatory Test Case Matrix:**

| # | Required Case | Package Fixture | User Anchor | Status | Issue |
|---|---|---|---|---|---|
| 1 | Explicit thread reference | TC-01 | TR_CASE_01 | COVERED | Contract shape mismatch (D-02) |
| 2 | Direct reply linkage | TC-02 | — | COVERED | No user anchor for this case |
| 3 | Attach by entity + semantic | TC-03 | — | COVERED | No user anchor for this case |
| 4 | Reopen latent thread | TC-04 | TR_CASE_02 | COVERED | Contract shape mismatch (D-02) |
| 5 | Create new thread | TC-05 | TR_CASE_03 | COVERED | Contract shape mismatch (D-02) |
| 6 | Ambiguous candidate set | TC-06 | TR_CASE_05 | PARTIAL | See D-19 |
| 7 | Invalid input | TC-07 | TR_CASE_04 | COVERED | Contract shape mismatch (D-02) |
| 8 | Deterministic replay | TC-08 | — | PARTIAL | See D-20 |
| 9 | Cross-tenant isolation | TC-09 | — | COVERED | — |
| 10 | Content-class behavior | TC-10 | — | PARTIAL | See D-21 |

**Defects found:**

- **D-19 (MAJOR):** TC-06 (Ambiguous candidate set) relies on two ambiguity test threads being present in the DB (THREAD_AMBIG_1 and THREAD_AMBIG_2). The fixture JSON itself does not contain the candidate thread data — it depends on `setup_test_data.sql`. But the fixture's expected output assumes both threads score within the ambiguity margin. Verified by simulation: both threads score exactly 0.70 with 0.00 gap. However, the fixture does not specify the expected `candidate_scores` array content. A proper fixture should specify expected scores to enable verification. Additionally, the user-provided TR_CASE_05 fixture includes inline `candidate_threads_fixture` data, while the package fixture does not — the package relies entirely on DB state, making the test non-self-contained.

- **D-20 (MAJOR):** TC-08 (Deterministic replay) simply repeats TC-01 with a different message_id. It tests that the same shortcircuit decision occurs, but it does NOT test deterministic replay of the scoring path. Scoring replay (same candidate threads, same scores, same decision) is the interesting deterministic property. The fixture should replay TC-03 or TC-04 (which go through scoring) twice, not TC-01 (which shortcircuits and never scores).

  Furthermore, the `resolution_id` includes `Date.now()`, so even "deterministic" replays produce different resolution_ids. The test only checks `decision` and `resolved_thread_id` equality, not full result equality. This limitation should be documented.

- **D-21 (MINOR):** TC-10 (Content class behavior) only verifies that `content_class_used = 'normalized_content'`. It does not verify that `raw_content` was never consumed or that switching to `llm_safe_content` would work. A more thorough content-class test would supply both `normalized_content` and `llm_safe_content` with different values and verify the resolver uses the correct one.

**Self-generated additional test cases needed:**

| # | Case | Gap Covered | Expected Result |
|---|---|---|---|
| SG-01 | Message with `reply_to_message_id` pointing to message with no thread_id | Reply linkage fails, falls through to scoring | `create_new_thread` or scored resolution |
| SG-02 | Latent thread above STRICT_ATTACH_THRESHOLD (0.85) | Spec/workflow deviation verification (D-16) | `reopen_latent_thread` (not attach) |
| SG-03 | Active thread at exactly 0.75 threshold boundary | Boundary condition | `attach_existing_thread` |
| SG-04 | Two latent threads within ambiguity margin, both above REOPEN | Latent ambiguity | `create_new_thread`, `ambiguity_detected: true` |
| SG-05 | Empty `normalized_content` (whitespace only) | Edge case: validator should reject | Depends: currently passes validation (string is non-empty if whitespace) — potential defect |
| SG-06 | Message with `direction: outbound` | Non-inbound message resolution | Valid input, should resolve normally |
| SG-07 | Message with `author_type: system` or `bot` | System/bot message handling | Valid input, should resolve normally |
| SG-08 | Audit table temporarily unavailable | Audit write failure | Resolution should succeed, audit failure logged |

**Required fixes:**
- D-19: Add expected `candidate_scores` to TC-06 fixture. Consider making fixtures self-contained with inline candidate data.
- D-20: Add a true scoring-path replay test case (e.g., replay TC-03 twice) and document the resolution_id non-determinism.
- D-21: Expand content-class test to verify content isolation.

---

## STEP 11 — TEST REPORT AUDIT

**Score: 7/10 — NOT VALIDATED**

**What was checked:** Whether the internal test report (TEST_REPORT_WF-TR-01.md) actually proves the claimed results.

**How validated:** Cross-referenced test report claims against workflow code, fixture set, script outputs, and audit findings.

**Defects found:**

- **D-22 (CRITICAL):** The test report claims "10/10 across all 8 dimensions" and "all gates pass." This audit has identified 5 CRITICAL or MAJOR defects (D-02, D-03, D-07, D-16, D-20) that the test report does not acknowledge. The test report represents a self-assessment by the workflow designer, not an independent validation. Its 10/10 claim is not supported by the evidence this audit has found. Specific overclaims:

  - "Anti-hallucination precision: 10/10" — The user-provided anchor fixtures use a different contract shape, which means the claimed precision has never been validated against the user's actual expectations.
  - "Testability: 10/10" — The deterministic replay test (TC-08) tests the trivial shortcircuit path, not the scoring path. The audit write idempotency claim is false (D-03).
  - "Import readiness: 10/10" — True for the workflow file itself, but the test data SQL is incomplete (D-01).

- **D-23 (MAJOR):** The test report claims "Gate 8: n8n-tester — PASS (design-level)" for all 10 test cases. But "design-level" means the tests were traced through the code mentally, not executed in n8n. The report does not distinguish between design-level (theoretical) and runtime (actual) test results. A test report that presents theoretical traces as test evidence without qualification creates false confidence.

**Required fixes:**
- D-22: Revise test report to acknowledge known defects, lower scores to reflect reality, and distinguish between self-assessment and independent audit.
- D-23: Clearly label all test results as "design-level trace" vs "runtime execution." Add a section listing untested-at-runtime scenarios.

---

## STEP 12 — IMPORT READINESS AUDIT

**Score: 9/10 — NOT VALIDATED**

**What was checked:** Import instructions completeness, credential setup, environment assumptions, operational details.

**How validated:** Walked through the import instructions step by step.

**Findings:**
- Import steps are explicit: open n8n → add workflow → import file → configure credentials → save.
- Credential configuration is documented per Postgres node.
- Audit table DDL is provided.
- Pre-import validation scripts documented with usage commands.
- Package contents table is provided.
- Sub-workflow calling pattern documented with example JSON.

**Defects found:**

- **D-24 (MINOR):** The import instructions reference n8n v1.30+ but do not specify what happens with older versions. Postgres node v2.5 features (queryParams) may not be available in older n8n versions. A minimum version requirement should be stated as a hard prerequisite, not a recommendation.

- **D-25 (MINOR):** The import instructions do not mention the `tenants` table as a prerequisite. Step 2 lists `threads`, `entities`, `messages`, and `thread_resolution_audit` but omits `tenants`. If foreign keys exist, the import user cannot set up the test data.

**Required fixes:**
- D-24: Change "v1.30+ recommended" to "v1.30+ required" with explanation of dependent features.
- D-25: Add `tenants` table to the prerequisites list.

---

## STEP 13 — POST-IMPORT TEST GUIDE AUDIT

**Score: 8/10 — NOT VALIDATED**

**What was checked:** Whether the post-import test guide enables a real user to verify correct behavior.

**How validated:** Walked through each test case, compared expected outputs against workflow contract, checked for vague steps.

**Findings:**
- 10 test cases defined, covering all 4 decision types.
- Setup SQL provided (includes tenants INSERT, which is good).
- Instructions for setting up a test workflow with Manual Trigger → Set → Execute Workflow.
- Verification checklist at the end.

**Defects found:**

- **D-26 (MAJOR):** Test 6 (Ambiguous Candidate Set) is vague: "Set up two threads with very similar summaries and same entity, then send a message that matches both equally. Expected: `create_new_thread` with `ambiguity_detected: true`." This does not provide specific input JSON, does not specify which threads, and does not specify exact expected output fields. The user cannot execute this test without guessing. The setup SQL does create ambiguity threads, but the test guide doesn't reference them or provide the test input payload.

- **D-27 (MINOR):** Test 10 (Deterministic Replay) says "Run Test 1 and Test 5 twice each" but does not specify exactly what to verify beyond decision and resolved_thread_id. The resolution_id will differ (Date.now()), so the user needs to know which fields should match and which are allowed to differ.

**Required fixes:**
- D-26: Provide explicit input JSON for Test 6 (same as TC-06 fixture content), explicit expected output, and reference to the ambiguity test threads in setup SQL.
- D-27: List exact fields that must be identical across replays and fields that may differ (resolution_id, timestamp).

---

## STEP 14 — DEFECT CLASSIFICATION

See Section 6 (Defect Register) below for the complete classified list.

**Score: N/A — classification step**

---

## STEP 15 — FINAL VERDICT

See Section 8 (Final Verdict) below.

---

# 3. Node-by-Node Audit Table

| # | Node Name | Type | Intended Role | Observed Role | Validation | Defect(s) |
|---|---|---|---|---|---|---|
| 1 | TR_Trigger | executeWorkflowTrigger v1 | Entry point for sub-workflow | Entry point, passes raw JSON | PASS | — |
| 2 | TR_Validate_Input | code v2 | Validate ThreadResolutionRequest | Validates required fields, enums, defaults optionals | PASS | — |
| 3 | TR_Route_Valid | switch v3 | Route valid/invalid | Routes on `_valid` boolean | FAIL | D-08: boolean vs string comparison |
| 4 | TR_Select_Content_Class | code v2 | Privacy-aware content selection | Sets content_for_resolution = normalized_content | PASS | — |
| 5 | TR_Check_Explicit_Refs | code v2 | Check priority 1 (explicit) and flag priority 2 (reply) | Correct: shortcircuits on thread_id, flags reply_to_message_id | PASS | — |
| 6 | TR_Route_Shortcircuit | switch v3 | Route shortcircuit vs continue | Routes on _shortcircuit boolean | WARN | Same boolean/string pattern as D-08 |
| 7 | TR_Load_Reply_Context | postgres v2.5 | Look up thread_id of replied-to message | Correct: parameterized, tenant-isolated | WARN | D-09: runs on null input; D-15: no alwaysOutputData |
| 8 | TR_Process_Reply_Result | code v2 | Process reply lookup, decide shortcircuit | Correct: checks _check_reply_linkage + result | PASS | D-12: cross-node $() reference |
| 9 | TR_Route_After_Reply | switch v3 | Route reply-resolved vs continue | Routes on _shortcircuit boolean | WARN | Same boolean/string pattern as D-08 |
| 10 | TR_Load_Candidate_Threads | postgres v2.5 | Load candidate threads from DB | Correct: parameterized, tenant-isolated, status-filtered, 30-day window, LIMIT 50 | PASS | D-15: no alwaysOutputData |
| 11 | TR_Load_Entity_Hints | postgres v2.5 | Load entity data for scoring | Correct: parameterized, tenant-isolated | WARN | D-10: dummy UUID; D-14: array construction; D-15: no alwaysOutputData |
| 12 | TR_Score_Candidates | code v2 | Score candidates using 4-component algorithm | Correct: all 4 components, correct ranges, deterministic | PASS | D-12: cross-node references |
| 13 | TR_Apply_Decision_Policy | code v2 | Apply thresholds, ambiguity, decide outcome | Correct for all paths; has dead code (D-17) | WARN | D-16: spec deviation; D-17: dead code; D-18: undocumented condition |
| 14 | TR_Build_Result | code v2 | Construct ThreadResolutionResult | Correct, but includes extra fields and missing error:null | WARN | D-06: missing error:null; D-11: extra fields |
| 15 | TR_Build_Error_Result | code v2 | Construct error result | Correct error shape | PASS | — |
| 16 | TR_Write_Audit | postgres v2.5 | Write audit record | Correct: parameterized, all 10 audit columns | PASS | D-15: no alwaysOutputData |
| 17 | TR_Return_Result | code v2 | Return clean result to caller | Correct: strips internal fields, clean contract output | PASS | D-13: reads from Build_Result not input |
| 18 | TR_Return_Error | code v2 | Return clean error result | Correct error output | WARN | D-07: no audit write on error path |

---

# 4. Contract Audit

## ThreadResolutionRequest Review

| Field | Req/Opt | In Contract | In Workflow | In User Fixtures | Status |
|---|---|---|---|---|---|
| message_id | Required | Yes | Yes | Yes (as message.id) | MISMATCH shape |
| tenant_id | Required | Yes | Yes | Yes | OK |
| channel | Required | Yes | Yes | Yes (as message.channel) | MISMATCH shape |
| direction | Required | Yes | Yes | Yes (as message.direction) | MISMATCH shape |
| author_type | Required | Yes | Yes | Yes (as message.author_type) | MISMATCH shape |
| normalized_content | Required | Yes | Yes | Yes (as message.normalized_content) | MISMATCH shape |
| timestamp | Required | Yes | Yes | Yes (as message.timestamp) | MISMATCH shape |
| source_message_ref | Required | Yes | Yes | Yes (as message.source_message_ref) | MISMATCH shape |
| author_entity_id | Optional | Yes | Yes | Yes (as message.author_entity_id) | MISMATCH shape |
| thread_id | Optional | Yes | Yes | Yes (as message.thread_id) | MISMATCH shape |
| reply_to_message_id | Optional | Yes | Yes | Yes (as reply_context.reply_to_message_id) | MISMATCH shape |
| related_entity_ids | Optional | Yes | Yes | Yes (as message.related_entity_ids) | MISMATCH shape |
| metadata | Optional | Yes | Yes | No | — |
| raw_content | Forbidden | Yes | Yes (enforced) | PRESENT in user fixtures | VIOLATION |
| reply_to_thread_id | — | NOT in contract | NOT in workflow | PRESENT in user fixtures | MISSING from contract |
| resolution_policy | — | NOT in contract | NOT in workflow | PRESENT in user fixtures | MISSING from contract |
| idempotency_key | — | NOT in request | NOT in workflow | PRESENT in user fixtures | MISSING from contract |
| llm_safe_content | — | NOT in request | NOT in workflow | PRESENT in user fixtures | Unnecessary for request |
| rag_safe_content | — | NOT in request | NOT in workflow | PRESENT in user fixtures | Unnecessary for request |
| message.status | — | NOT in request | NOT in workflow | PRESENT in user fixtures | Unnecessary for request |

## ThreadResolutionResult Review

| Field | In Contract | In Workflow | In User Fixtures | Status |
|---|---|---|---|---|
| resolution_id | Yes | Yes | No | Not expected by user |
| message_id | Yes | Yes | No | Not expected by user |
| tenant_id | Yes | Yes | No | Not expected by user |
| decision | Yes | Yes | No (uses resolution_action) | RENAMED |
| resolved_thread_id | Yes | Yes | Yes | OK |
| candidate_scores | Yes | Yes | Yes (different shape) | SHAPE DIFF |
| ambiguity_detected | Yes | Yes | No | Not expected by user |
| content_class_used | Yes | Yes | No | Not expected by user |
| decision_reason | Yes | Yes | No (uses winning_reason) | RENAMED |
| timestamp | Yes | Yes | No | Not expected by user |
| error | Yes | Yes (null for success) | No | Not expected by user |
| module_name | No | No | Yes | MISSING from workflow |
| result_type | No | No | Yes | MISSING from workflow |
| status | No | No | Yes | MISSING from workflow |
| confidence | No | No | Yes | MISSING from workflow |
| reopened_thread | No | No | Yes | MISSING from workflow |
| created_thread | No | No | Yes | MISSING from workflow |
| needs_followup | No | No | Yes | MISSING from workflow |
| followup_requests | No | No | Yes | MISSING from workflow |
| winning_reason | No | No | Yes | MISSING (renamed to decision_reason) |
| resolution_action | No | No | Yes | MISSING (renamed to decision) |

## Summary

The contract is internally consistent between the contract spec document and the workflow implementation. However, there is a **fundamental mismatch** between the user's expected contract (as evidenced by the anchor test fixtures) and the implemented contract. This is the most significant finding of this audit.

---

# 5. Test Coverage Audit

## Mandatory Test Matrix

| # | Required Behavior | Package Coverage | User Anchor | Gap |
|---|---|---|---|---|
| 1 | Explicit thread reference | TC-01 ✓ | TR_CASE_01 | Contract shape mismatch |
| 2 | Direct reply linkage | TC-02 ✓ | — | No user anchor |
| 3 | Attach by entity + semantic match | TC-03 ✓ | — | No user anchor |
| 4 | Reopen latent thread | TC-04 ✓ | TR_CASE_02 | Contract shape mismatch |
| 5 | Create new thread | TC-05 ✓ | TR_CASE_03 | Contract shape mismatch |
| 6 | Ambiguous candidate set | TC-06 PARTIAL | TR_CASE_05 | Vague expected output (D-19), no inline candidate data |
| 7 | Invalid input | TC-07 ✓ | TR_CASE_04 | Contract shape mismatch |
| 8 | Deterministic replay | TC-08 PARTIAL | — | Tests shortcircuit only (D-20) |
| 9 | Cross-tenant isolation | TC-09 ✓ | — | — |
| 10 | Content-class behavior | TC-10 PARTIAL | — | Minimal verification (D-21) |

## Missing Self-Generated Test Cases

| ID | Case | Gap | Expected Result | Why Added |
|---|---|---|---|---|
| SG-01 | Reply to message with no thread_id | Reply linkage fallthrough to scoring | Scored resolution or create_new | Tests fallthrough when reply target has no thread |
| SG-02 | Latent thread scoring above STRICT_ATTACH (0.85) | Spec deviation boundary (D-16) | `reopen_latent_thread` (not attach) | Verifies workflow correctly reopens latent even above attach threshold |
| SG-03 | Active thread at exact 0.75 boundary | Threshold boundary condition | `attach_existing_thread` (>= is inclusive) | Tests >= vs > threshold semantics |
| SG-04 | Two latent threads within ambiguity margin | Latent-specific ambiguity | `create_new_thread`, `ambiguity_detected: true` | Tests ambiguity for latent candidates (not just active) |
| SG-05 | Whitespace-only normalized_content | Validation edge case | Should `fail_invalid_input` but currently passes | Tests validator completeness |
| SG-06 | Outbound message | Non-inbound resolution | Valid resolution | Tests direction does not affect resolution logic |
| SG-07 | System/bot author_type | Non-user author | Valid resolution with no entity match | Tests author_type edge case |
| SG-08 | Concurrent resolution of same message | Audit PK collision | Second write should be gracefully rejected | Tests audit idempotency (currently fails per D-03) |

---

# 6. Defect Register

| ID | Severity | Artifact | Location | Issue | Impact | Exact Fix |
|---|---|---|---|---|---|---|
| D-01 | MINOR | setup_test_data.sql / generate_fixtures.js | SQL script | Missing tenants table INSERT | FK constraint failure on test data setup | Add `INSERT INTO tenants` to both SQL and script |
| D-02 | CRITICAL | Contract / User fixtures | Cross-artifact | User anchor fixtures use different contract shape than workflow | Workflow cannot be tested with user-provided fixtures; contract version disagreement | Produce formal contract reconciliation or add adapter layer |
| D-03 | CRITICAL | TR_Build_Result / Contract | resolution_id generation | resolution_id uses Date.now(), making audit write non-idempotent | False idempotency claim; duplicate audit rows on replay | Use deterministic key `tr_{message_id}` or remove idempotency claim |
| D-04 | MAJOR | Contract | ThreadResolutionRequest | reply_to_thread_id field in user fixtures has no contract equivalent | User's explicit-ref model is not supported | Add field to contract or document exclusion |
| D-05 | MAJOR | Contract / Workflow | Thresholds | User fixtures expect 0.82/0.72 thresholds; workflow uses 0.75/0.65 | Test results would differ; user expectations not met | Add per-request threshold support or reconcile thresholds |
| D-06 | MINOR | TR_Build_Result | Code line ~25 | Missing `error: null` in non-error result | Intermediate contract incompleteness | Add `error: null` to result object |
| D-07 | MAJOR | Workflow connections | Error path | Error path bypasses audit write | No audit trail for invalid inputs | Route error path through audit write node |
| D-08 | MAJOR | TR_Route_Valid (also TR_Route_Shortcircuit, TR_Route_After_Reply) | Switch node config | Boolean-to-string comparison in switch rules | Potential silent misrouting depending on n8n version | Use string values or IF node; verify n8n behavior |
| D-09 | MINOR | TR_Load_Reply_Context | Query execution | Unnecessary DB query when reply_to_message_id is null | Wasted DB roundtrip per non-reply message | Add routing bypass or early return |
| D-10 | MINOR | TR_Load_Entity_Hints | queryParams expression | Dummy UUID fallback for null author_entity_id | Code smell; phantom entity lookup | Use SQL COALESCE or conditional WHERE |
| D-11 | MINOR | TR_Build_Result | Code output | Non-contract fields in intermediate result | Principle violation; no runtime impact | Remove extra fields or document purpose |
| D-12 | MAJOR | TR_Score_Candidates, TR_Process_Reply_Result | Cross-node `$()` refs | Hidden coupling via named node references | Fragile; breaks silently on rename | Add linter check; document all cross-refs |
| D-13 | MINOR | TR_Return_Result | Code reference | Reads from TR_Build_Result instead of $input | Intentional but undocumented coupling | Document the design choice in node notes |
| D-14 | MINOR | TR_Load_Entity_Hints | queryParams $3 | Array literal constructed via string concatenation in expression | Minor parameterization concern | Use n8n array handling or validate UUID format |
| D-15 | MINOR | All 4 Postgres nodes | Node options | Missing alwaysOutputData: true | Version-dependent flow interruption risk | Add option to all Postgres nodes |
| D-16 | CRITICAL | TR_Apply_Decision_Policy / Thread_Resolution_Spec | Decision logic | Spec pseudocode doesn't separate active-attach from latent-reopen | Spec/workflow deviation for latent threads above attach threshold | Update spec pseudocode to match workflow logic |
| D-17 | MAJOR | TR_Apply_Decision_Policy | Code block (end) | Dead code: redundant attach check after latent check | Confusion about intended behavior | Remove or document as defensive code |
| D-18 | MAJOR | TR_Apply_Decision_Policy | Ambiguity condition | Ambiguity requires best.score >= REOPEN_THRESHOLD (undocumented) | Undocumented implementation choice | Document in contract and spec |
| D-19 | MAJOR | TC-06 fixture | Expected output | Missing expected candidate_scores; non-self-contained | Cannot verify scoring correctness from fixture alone | Add expected scores; add inline candidate data |
| D-20 | MAJOR | TC-08 fixture | Test design | Tests shortcircuit replay, not scoring replay | False determinism coverage | Add scoring-path replay test |
| D-21 | MINOR | TC-10 fixture | Test scope | Only checks content_class_used field | Minimal content-class verification | Expand to test content isolation |
| D-22 | CRITICAL | TEST_REPORT_WF-TR-01.md | Entire report | Claims 10/10 across all dimensions; defects not acknowledged | False confidence in package quality | Revise to reflect actual defect state |
| D-23 | MAJOR | TEST_REPORT_WF-TR-01.md | Gate 8 section | Design-level traces presented as test evidence without qualification | Misleading test report | Label clearly as design-level, not runtime |
| D-24 | MINOR | IMPORT_WF-TR-01.md | Prerequisites | n8n version listed as "recommended" not "required" | Users may attempt import on unsupported versions | Change to "required" |
| D-25 | MINOR | IMPORT_WF-TR-01.md | Prerequisites list | tenants table not listed as prerequisite | Test data setup may fail | Add tenants table to list |
| D-26 | MAJOR | TEST_AFTER_IMPORT_WF-TR-01.md | Test 6 | Vague test case without specific input/output | User cannot execute this test | Provide explicit input JSON and expected output |
| D-27 | MINOR | TEST_AFTER_IMPORT_WF-TR-01.md | Test 10 | Does not specify which fields must match across replays | User cannot determine pass/fail | List matching vs non-matching fields |

**Defect counts:**
- CRITICAL: 4 (D-02, D-03, D-16, D-22)
- MAJOR: 12 (D-04, D-05, D-07, D-08, D-12, D-17, D-18, D-19, D-20, D-23, D-26)
- MINOR: 11 (D-01, D-06, D-09, D-10, D-11, D-13, D-14, D-15, D-21, D-24, D-25, D-27)

---

# 7. Final Scorecard

| Dimension | Score | Justification |
|---|---|---|
| Architectural correctness | 9/10 | Thread-first, resolver-only, no legacy patterns, correct pipeline position. -1 for error path missing audit write (D-07) and spec deviation (D-16). |
| Contract clarity | 6/10 | Internal contract is well-defined. But fundamental mismatch with user-expected contract shape (D-02). Threshold mismatch (D-05). Missing fields (D-04). False idempotency claim (D-03). |
| Node-level correctness | 8/10 | All 18 nodes functional with correct logic. -2 for boolean/string switch fragility (D-08), dead code (D-17), cross-node coupling (D-12). |
| Anti-hallucination precision | 7/10 | Scoring components and thresholds match spec. -3 for undocumented ambiguity condition (D-18), spec pseudocode deviation (D-16), and untested boundary cases. |
| Testability | 6/10 | 10 fixtures present and scripts pass. -4 for contract shape mismatch with user fixtures (D-02), weak replay test (D-20), vague ambiguity test (D-19), overclaimed test report (D-22). |
| Import readiness | 9/10 | Clear instructions, DDL provided, credential setup documented. -1 for missing tenants prerequisite (D-25) and soft version requirement (D-24). |
| Post-import verification quality | 7/10 | 10 tests with setup SQL. -3 for vague Test 6 (D-26), weak replay guidance (D-27), and no runtime test evidence (D-23). |
| Auditability | 8/10 | Candidate scores stored, audit table well-defined. -2 for false idempotency (D-03) and missing error-path audit (D-07). |

**Overall weighted score: 7.5/10**

---

# 8. Final Verdict

## VERDICT: NOT APPROVED

## Exact Blockers to Approval

1. **D-02 (CRITICAL):** The user-provided canonical anchor fixtures use a fundamentally different contract shape. The workflow's ThreadResolutionRequest/Result contracts do not match what the user expects. Until a formal contract reconciliation is completed, the workflow cannot be validated against the user's requirements.

2. **D-03 (CRITICAL):** The audit write idempotency claim is false. `resolution_id` includes `Date.now()`, producing unique keys on every call. This contradicts the contract's idempotency guarantee and allows unbounded audit row growth on replay.

3. **D-16 (CRITICAL):** The decision policy deviates from the Thread Resolution Spec pseudocode for latent threads above STRICT_ATTACH_THRESHOLD. While the workflow's behavior is arguably better, it is not documented or reconciled with the spec. Spec and implementation must agree.

4. **D-22 (CRITICAL):** The internal test report claims 10/10 across all dimensions, which is not supported by the evidence. A test report that overstates quality cannot be trusted for implementation handoff.

## Exact Next Corrections Required for Approval

**Mandatory (must complete all):**

1. Produce a formal contract reconciliation document that maps user fixture fields to workflow contract fields, or update the workflow to accept the user's contract shape.
2. Fix the `resolution_id` generation to be deterministic (remove `Date.now()`) or explicitly remove the idempotency claim from the contract.
3. Update Thread_Resolution_Spec.md Section 3 pseudocode to match the workflow's active/latent decision separation.
4. Route the error path through audit write (or explicitly exclude errors from audit in the spec).
5. Revise TEST_REPORT_WF-TR-01.md to reflect the defects identified in this audit.
6. Fix or document the boolean-to-string switch comparison pattern (D-08).
7. Remove dead code from TR_Apply_Decision_Policy (D-17).
8. Document the ambiguity minimum-score condition (D-18).
9. Fix TC-08 to test scoring-path determinism, not just shortcircuit.
10. Provide explicit input/output for Test 6 in the post-import guide (D-26).

**Recommended (not blocking but should be addressed):**

11. Add `alwaysOutputData: true` to all Postgres nodes.
12. Add tenants table to prerequisites and fixture SQL.
13. Add `error: null` to TR_Build_Result.
14. Add linter check for `$('nodeName')` cross-references.
15. Expand content-class test coverage.
16. Add self-generated test cases SG-01 through SG-08.

---

> **Audit completed:** 2026-04-15 | **Auditor:** Independent workflow validation auditor | **Verdict: NOT APPROVED**
