# Skill 31 — Synthetic Case Generator

## Goal
Generate repeatable synthetic case sets for workflows and chain edges.

## Required counts
- 50 per workflow
- 50 per chain edge

## Generation pattern
Use 10 families × 5 cases.

## Output artifacts
- workflow case manifest
- chain case manifest
- JSON fixture files
- oracle annotations
- cleanup keys

## Quality rule
Do not generate 50 near-duplicates.  
The families must intentionally vary structure, route pressure, optionality, duplication, and persistence expectations.
