# 16 — TEST AND E2E OPERATING MODEL

This extension adds a second operating mode on top of the base operator pack:

- **build-and-reconcile mode** already present in the pack
- **test-connect-repair mode** defined here

## Core idea

Testing is not a final audit phase.
Testing is an implementation mechanism.

The operator is expected to:
- infer canonical expectations,
- encode them into executable artifacts,
- run them,
- patch the workflows,
- rerun until the canonical expectation is achieved,
- leave durable evidence.

## Required outputs per workflow

For every in-scope workflow, produce:

1. a reconciled compact contract summary,
2. a 50-case synthetic case set,
3. a static validation result over the 50 cases,
4. a 10-case runtime execution record,
5. DB assertion evidence if relevant,
6. a remediation log if any failure occurred,
7. a done gate decision.

## Required outputs per canonical chain edge

For every canonical source → target edge, produce:

1. a chain mapping record,
2. a persistent connector decision,
3. pre-patch and post-patch workflow snapshots,
4. a 50-case synthetic chain case set,
5. a static source→target mapping validation result,
6. a 10-case runtime E2E execution record,
7. DB assertion evidence if relevant,
8. a remediation log if any failure occurred,
9. a done gate decision.

## Scaling strategy for >10 workflows

This pack is designed to scale without requiring the operator to load every raw workflow file into active context at the same time.

Use this pattern:

### 1. Inventory first
Create a small index per workflow with:
- canonical id,
- human label,
- local docs paths,
- local JSON path,
- live workflow id if present,
- upstream edges,
- downstream edges,
- DB touchpoints,
- risk rating,
- current readiness state.

### 2. Contract extraction second
Build a compact extracted contract summary for each workflow.
Do not carry full raw folders forward into active context once the compact summary exists.

### 3. Test generation third
Generate fixtures from the compact extracted contract summary rather than from the full raw corpus.

### 4. Graph execution fourth
Test only:
- each workflow individually,
- each canonical chain edge,
- the full primary chain after edge stability.

Do **not** do uncontrolled all-to-all workflow pairing.

## Runtime budget default

- Static validation: all 50 cases per workflow / per edge
- Runtime n8n execution: 10 cases per workflow / per edge
- Full-primary-chain smoke: minimum 3 cases after edge stability is achieved
- Full-primary-chain extended runtime: optional if execution cost is acceptable

## Mission state tracking

Maintain a small mission ledger with, at minimum:
- workflow status,
- edge status,
- blockers,
- last verified artifact path,
- last runtime evidence reference,
- cleanup state.

This prevents repeated work and lets a successor resume quickly.
