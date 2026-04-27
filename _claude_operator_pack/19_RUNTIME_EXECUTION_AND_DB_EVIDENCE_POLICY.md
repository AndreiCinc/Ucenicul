# 19 — RUNTIME EXECUTION AND DB EVIDENCE POLICY

Static validation is not enough.
Runtime evidence is required.

## Mandatory runtime counts

### Workflow-local
- 10 runtime cases per workflow

### Chain-edge
- 10 runtime chain cases per canonical edge

### Full-primary-chain
- minimum 3 smoke cases after edge stability

## Runtime execution requirements

For every runtime batch, capture:
- selected case ids,
- why those cases were selected,
- execution references,
- final payload snapshots,
- important node observations where contract-visible,
- timing/failure notes if relevant,
- DB assertion results,
- cleanup confirmation.

## DB evidence rule

If a workflow or chain edge is expected to persist data, define explicit DB assertions before or alongside runtime execution.

At minimum each DB assertion set must state:
- touched tables,
- expected inserted / updated rows,
- expected key fields,
- allowed row count range,
- disallowed side effects,
- cleanup query or cleanup predicate.

## Synthetic DB namespace rule

Every synthetic runtime case must write a recognizable namespace marker, for example:
- `test_run_id`
- `synthetic_case_id`
- `origin = 'claude_test'`
- prefixed synthetic tenant/thread/message ids where safe

This allows:
- precise assertions,
- reliable cleanup,
- lower contamination risk.

## Cleanup rule

Cleanup is required after each runtime batch unless the evidence policy explicitly requires preserving a snapshot table for inspection.
If preservation is required, preserve only the minimal evidence rows and mark them clearly.

## Runtime truth rule

If a static contract assumption conflicts with actual runtime evidence:
- re-check the canonical precedence stack,
- repair the workflow or connector,
- update the generated oracle if the workflow was wrong but the contract was right,
- update the local test artifact if the original oracle was inferred and incorrect.

Do not let stale inferred expectations overrule runtime plus canonical docs.
