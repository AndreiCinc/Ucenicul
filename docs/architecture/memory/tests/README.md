# tests/memory/README.md

This subtree contains memory-specific testing assets.

## Structure

- `walkers/` — execution walkers and verification scripts
- `fixtures/` — test fixtures and seeded inputs
- `results/` — saved outputs and verification artifacts

## Testing policy

The memory workspace uses persisted, clearly labeled fixtures instead of aggressive cleanup.
This improves rerun stability and debugging.
