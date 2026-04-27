# Skill 37 — Autonomous Test Repair Loop

## Goal
Repair workflows, mappings, SQL, or oracles until tests pass.

## Procedure
1. collect failure evidence
2. use minimal reproducer
3. select smallest canonical fix
4. patch
5. rerun reproducer
6. rerun affected runtime batch
7. update evidence and artifacts

## Allowed fixes
- node parameter fixes
- mapping fixes
- connector fixes
- callable-as-sub refactor
- SQL fixes
- stale local doc fixes
- stale inferred oracle fixes
