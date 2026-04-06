# Testing

Test suites for validating workflow integrity, cross-artifact consistency, and message pipeline correctness.

## Test suites

| Test | Purpose |
|------|---------|
| Workflow JSON Validator | Structural checks on n8n workflow exports: unique names, connection integrity, JS syntax, SQL placeholders, credential consistency |
| Cross-Check Validator | Ensures brain_contract.json, parser, workflow SQL, and schema migrations stay aligned |
| Telegram Path Simulator | Simulates full Telegram → Brain → Execute → Respond pipeline for all 14 intents |

## Running tests

All tests run with plain Node.js — no test framework required:

```bash
node testing/test_workflow_json.js
node testing/test_cross_check.js
node testing/test_telegram_paths.js
```

## Design philosophy

Tests validate artifacts against each other rather than testing runtime behavior. This is intentional: since the execution engine is n8n (not custom code), the highest-value tests catch inconsistencies between the contract, parser, workflow, and schema before import.
