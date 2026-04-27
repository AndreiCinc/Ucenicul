# Skill 35 — Chain E2E Orchestrator

## Goal
Run edge-by-edge E2E validation across the canonical graph.

## Procedure
1. load confirmed chain map
2. ensure connector exists
3. ensure target is callable
4. generate chain cases
5. run static mapping validation
6. execute 10 runtime chain cases
7. verify target contract
8. verify DB side effects
9. repair and rerun if needed

## Note
Primary focus is canonical edges, not arbitrary pairwise combinations.
