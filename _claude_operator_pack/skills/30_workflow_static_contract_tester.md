# Skill 30 — Workflow Static Contract Tester

## Goal
Statically validate generated workflow-local cases against the extracted contract.

## Responsibilities
- load compact extracted contract summary
- validate required fields
- validate shape and type expectations
- validate expected route assertions where route logic is contract-visible
- validate DB assertion definitions are present when persistence is required
- classify negative tests correctly

## Output
A workflow-local static validation report over all 50 generated cases.
