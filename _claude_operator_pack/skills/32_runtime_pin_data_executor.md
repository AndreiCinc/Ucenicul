# Skill 32 — Runtime Pin-Data Executor

## Goal
Execute selected synthetic cases in n8n runtime with reviewable evidence.

## Preferred mechanics
- inject pin data or equivalent harness input into the workflow
- execute selected runtime cases
- capture execution IDs and final outputs
- capture node path or node-level checkpoints where useful
- record why each runtime case was selected

## Required runtime counts
- 10 workflow-local runtime cases per workflow
- 10 runtime chain cases per canonical edge
- minimum 3 full-primary-chain smoke cases after edge stability

## Output
A runtime execution record with:
- execution references
- case ids
- pass/fail
- selected-family coverage
- node observations
- final payload snapshots
- DB assertion result
- cleanup result
