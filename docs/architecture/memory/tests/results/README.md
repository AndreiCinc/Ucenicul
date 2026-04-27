# tests/memory/results

This folder stores generated outputs from walker runs.

## Expected result artifacts

At minimum:
- `walker_latest.json`
- `walker_summary.md`
- optional per-run timestamped JSON files

## Reporting rule

Every result set must summarize:
- total cases
- passed
- failed
- partial
- environment blockers
- connector-node failures, if multi-workflow implementation exists
