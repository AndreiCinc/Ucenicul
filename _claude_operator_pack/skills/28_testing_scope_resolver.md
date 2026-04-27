# Skill 28 — Testing Scope Resolver

## Goal
Resolve and freeze the testing mission scope to the canonical 10 workflows.

## Inputs
- expected workflow manifest
- runtime canonical target docs
- workflow inventory
- live n8n discovery results

## Outputs
- frozen scope list
- excluded workflow list
- per-workflow inventory card:
  - id
  - label
  - local JSON path
  - local docs path
  - live workflow id
  - upstream edges
  - downstream edges
  - DB touchpoints
  - risk level

## Rules
- never expand beyond the canonical 10
- document out-of-scope live workflows but do not test them
- resolve duplicate folders by canonicality, not by recency
