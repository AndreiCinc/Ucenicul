# N8N Sandbox Simulator: brain_main_inbound_mvp_v3

## Overview

`sandbox_full_flow.js` is a comprehensive n8n workflow simulator that tests the **ENTIRE message processing pipeline** from input to output WITHOUT requiring:

- Live n8n instance
- PostgreSQL database
- OpenAI API
- Telegram bot

The simulator faithfully reproduces all 61 nodes in the brain_main_inbound_mvp_v3_memory_write.json workflow, including:

1. Input normalization and privacy gating
2. Organization/tenant resolution (mocked)
3. Minimal context loading (mocked DB)
4. Brain LLM decision (deterministic mock for 18 test messages)
5. Parse & validate brain contract (real parser from parse_contract_final.js)
6. Intent routing and execution (all 11 primary intents + fallbacks)
7. Memory writes with embeddings (mocked OpenAI)
8. Privacy gating outbound
9. Outbound message insertion (mocked DB)
10. Telegram send (mocked)
11. Final output generation

## Quick Start

### Run All 18 Tests
```bash
node sandbox_full_flow.js
```

This runs all 18 diverse test messages covering every intent and edge case, printing a detailed step-by-step log for each message.

### Run a Single Test
```bash
node sandbox_full_flow.js 1     # Run test #1
node sandbox_full_flow.js 10    # Run test #10
node sandbox_full_flow.js 15    # Run test #15
```

## Test Coverage

The sandbox includes **18 diverse Romanian test messages** covering:

### Intent Coverage (11 of 14)
- ✓ `create_task` (4 tests) - Simple, urgent, with fallback rules
- ✓ `create_reminder` (2 tests) - With explicit time, day-after-tomorrow
- ✓ `list_tasks` (1 test) - Filter by today
- ✓ `list_reminders` (1 test) - Filter by tomorrow
- ✓ `cancel_task` (1 test) - Delete by semantic matching
- ✓ `cancel_reminder` (1 test) - Delete by semantic matching
- ✓ `save_improvement_request` (1 test) - With memory writes
- ✓ `search_memory` (1 test) - Explicit search
- ✓ `general_response` (2 tests) - Conversational, feedback request
- ✓ `clarify` (2 tests) - Ambiguous intent, task vs reminder ambiguity
- ✓ `none` (2 tests) - Light acknowledgments
- ✗ `update_task` - Can be added (placeholder)
- ✗ `complete_task` - Can be added (placeholder)
- ✗ `update_reminder` - Can be added (placeholder)

### Feature Coverage
- **Task CRUD**: Create (basic, urgent, with fallback), list, delete by title
- **Reminder CRUD**: Create (with explicit time), list, delete
- **Memory writes**: Single item, multiple items with categorization
- **Response types**: General response, clarification, none
- **Edge cases**: Informal Romanian (no diacritics), ambiguous requests, diacritical marks

## Test Message Details

| ID | Message | Intent | Notes |
|---|---|---|---|
| 1 | Creează un task "Finalizează brain-ul" | create_task | Basic task creation |
| 2 | Pune-mi un task urgent "Sună-l pe Ion mâine" | create_task | Task with priority & deadline |
| 3 | Trebuie să cumpăr hârtie igienică pentru că se termină. | create_task | Task with fallback rule (supply risk) |
| 4 | Adu-mi aminte mâine la 10 să sun furnizorul | create_reminder | Reminder with explicit time |
| 5 | Amintește-mi poimâine la 14 să verific apartamentul | create_reminder | Day-after-tomorrow reminder |
| 6 | Ce task-uri am azi? | list_tasks | Filter by today |
| 7 | Ce remindere am mâine? | list_reminders | Filter by tomorrow |
| 8 | Șterge task-ul "Finalizează brain-ul" | cancel_task | Delete by semantic matching |
| 9 | Șterge reminderul "Sună furnizorul" | cancel_reminder | Delete by semantic matching |
| 10 | Notează că Mihai vrea oferta până vineri | save_improvement_request | Improvement + memory writes (2 items) |
| 11 | Bună! Cum merg lucrurile? | general_response | Conversational greeting |
| 12 | Vreau să cresc afacerea | clarify | Ambiguous intent |
| 13 | OK | none | Light acknowledgment |
| 14 | Mulțumesc | none | Thanks response |
| 15 | Ce-mi amintești tu de clienți? | search_memory | Explicit memory search |
| 16 | trbuie s sun pe Ion | create_task | Informal Romanian (diacritics omitted) |
| 17 | Create task and reminder at same time | clarify | Task vs reminder ambiguity |
| 18 | Îți place cum funcționez? | general_response | Feedback request |

## Output Format

Each test produces:

```
================================================================================
TEST #1: Simple task creation
Message: "Creează un task "Finalizează brain-ul""
Expected Intent: create_task
================================================================================

✓ PASS

Final Response: "Am creat task-ul "Finalizează brain-ul"."
Decision Branch: create_task
Memory Writes: 0
```

### Coverage Summary
Displays which intents were exercised and which were not:
```
Intents Exercised:
  ✓ create_task
  ✓ create_reminder
  ...
  ✗ update_task

Total Exercised: 11 / 14
```

### Test Statistics
Shows pass rate by intent:
```
Overall: 18/18 PASSED (100%)

By Intent:
  create_task: 4/4 (100%)
  general_response: 2/2 (100%)
  ...
```

## Pipeline Stages (Step-by-Step Simulation)

### Stage 1-3: Input Normalization
1. **Normalize Input** - Standardize inbound fields
2. **Privacy Gate Inbound** - NO-OP MVP (pass-through)
3. **Resolve Org + Tenant** - Mock database lookup

### Stage 4-5: Context Loading & Prep
4. **Load Minimal Context** - Mock database query returns fixture (tasks, reminders, memories)
5. **Build Brain Input** - Combine org, context, system prompt, user message

### Stage 6-7: LLM & Parsing
6. **Brain Decision** - Mock LLM returns deterministic response for known test messages
7. **Parse & Validate Brain Contract** - Real parser from `parse_contract_final.js`

### Stage 8-9: Message Tracking & Intent Routing
8. **Insert Inbound Message** - Mock database insert
9. **Route by Intent** - Execute one of 14 intent branches (create_task, list_tasks, etc.)

### Stage 10: Memory Writes (if applicable)
10a. **Prepare Embedding Batch** - Extract memory_writes content
10b. **Mock OpenAI Embedding** - Simulate embeddings (1536-dim vectors)
10c. **Build Memory Insert Items** - Map embeddings to DB items
10d. **Insert with Dedup** - Mock database insert with deduplication
10e. **Restore Context** - Merge memory write results back

### Stage 11-13: Outbound Processing
11. **Privacy Gate Outbound** - NO-OP MVP (pass-through)
12. **Insert Outbound Message** - Mock database insert (skipped if intent=none)
13. **Telegram Send** - Mock Telegram API call (skipped if test_mode=true)

### Stage 14: Final Output
14. **Final Output** - Report with routing, write IDs, response, memory count

## Mock Components

### Mock LLM (Deterministic)
The simulator includes hardcoded LLM responses for all 18 test messages. For any message not in the mock dictionary, it returns a clarify response. This allows reproducible testing without OpenAI API calls.

### Mock Database
- **Fixture context**: Loads from `fixtures/test_context.json` (5 tasks, 4 reminders, 4 memories)
- **Insert operations**: Simulate database inserts by generating mock IDs
- **Delete operations**: Simulate semantic matching against fixture data
- **List operations**: Return fixture data with filter applied

### Mock OpenAI Embedding
- Generates random 1536-dimensional vectors for each memory_write item
- Returns proper OpenAI API response structure
- Allows testing memory write pipeline without API costs

### Mock Telegram
- Always succeeds (ok=true)
- Generates mock message IDs
- Respects test_mode flag (skips actual send when test_mode=true)

## Parser Implementation

The sandbox includes the full **brain-decision-v1 contract parser** from `parse_contract_final.js`, which enforces:

- 14 valid intents (create_task, list_tasks, clarify, none, etc.)
- Structural normalization (trim, validate, null unused fields)
- List filter inference (azi → today, mâine → tomorrow)
- Task vs reminder disambiguation (task language takes priority)
- Intent-specific validation (create_task requires title, create_reminder requires remind_at)
- Memory writes validation (filter invalid, preserve valid)
- Fallback behavior (clarify on parse errors)

## Adding More Tests

To add new test messages, edit the `TEST_MESSAGES` array and `MOCK_LLM_RESPONSES` object:

```javascript
// Add to MOCK_LLM_RESPONSES
'Your new message': {
  version: 'brain-decision-v1',
  intent: 'create_task',
  domain: 'general',
  response: 'Your response here',
  debug_summary: 'debug summary',
  // ... rest of contract
}

// Add to TEST_MESSAGES
{
  id: 19,
  message: 'Your new message',
  expectedIntent: 'create_task',
  description: 'What it tests'
}
```

## Performance

- **Startup time**: ~500ms (parser initialization)
- **Per test time**: ~10-50ms (depending on logging)
- **Full suite (18 tests)**: ~2-3 seconds

## Limitations

The sandbox is **intentionally limited** to enable fast iteration:

1. **No real database** - All CRUD operations are mocked
2. **No real LLM** - Uses deterministic mock responses for 18 known messages
3. **No OpenAI embedding** - Random 1536-dim vectors
4. **No Telegram** - Mocked send (always succeeds)
5. **No multi-tenant isolation testing** - Uses single test fixture
6. **No error handling variants** - Success paths only

For testing error scenarios, network failures, or edge cases not in the 18 test messages, you would need integration tests against real services.

## File Structure

```
/testing/
├── sandbox_full_flow.js          (Main simulator - 1400 lines)
├── fixtures/
│   └── test_context.json         (Mock context: tasks, reminders, memories)
├── SANDBOX_README.md             (This file)
└── test_*.js                     (Other existing tests)
```

## Usage Examples

### Run everything with verbose output
```bash
node sandbox_full_flow.js
```

### Test a specific feature (e.g., reminder creation)
```bash
node sandbox_full_flow.js 4    # Test #4: Reminder creation
node sandbox_full_flow.js 5    # Test #5: Day-after-tomorrow reminder
```

### Test edge cases
```bash
node sandbox_full_flow.js 16   # Test #16: Informal Romanian (no diacritics)
node sandbox_full_flow.js 17   # Test #17: Task vs reminder ambiguity
```

### Test memory writes
```bash
node sandbox_full_flow.js 10   # Test #10: Save improvement request with memory writes
```

## Integration with CI/CD

The simulator can be used in CI/CD pipelines:

```bash
# Run all tests
node sandbox_full_flow.js > test_results.log

# Check exit code (not yet implemented, but can be added)
# Exit code 0 if all tests pass, 1 if any fail
```

## Extending the Simulator

To test additional intents or scenarios:

1. Add mock LLM response to `MOCK_LLM_RESPONSES`
2. Add test message to `TEST_MESSAGES`
3. Optionally add new branch logic to `stepRouteByIntent()`
4. Run: `node sandbox_full_flow.js`

## Debugging

The simulator logs each step:
```
1. Normalize Input
2. Privacy Gate Inbound (NO-OP MVP)
3. Resolve Organization and Tenant
4. Load Minimal Context
5. Build Brain Input
6. Brain Decision (Mock LLM)
7. Parse and Validate Brain Contract
8. Insert Inbound Message
9. Route by Intent: create_task
10. Memory Writes: SKIPPED (empty)
...
```

Add more logging by modifying the `addLog()` calls in each step.

## Future Enhancements

- [ ] Test update_task, complete_task, update_reminder intents (add to mock responses)
- [ ] Add error scenario testing (parse errors, validation failures)
- [ ] Add multi-tenant isolation validation
- [ ] Generate test coverage report
- [ ] Add benchmarking (latency per stage)
- [ ] Add snapshot testing (compare outputs to golden files)
- [ ] Create CI/CD integration
- [ ] Add exit codes for test success/failure

---

**Created**: 2026-04-03
**Workflow**: brain_main_inbound_mvp_v3_memory_write.json (61 nodes)
**Parser**: parse_contract_final.js (brain-decision-v1 contract)
**Test Coverage**: 18 messages, 11 of 14 intents
