# Skill 34 — DB Side-Effect Auditor

## Goal
Assert that runtime executions caused the required database effects.

## Responsibilities
- derive expected touched tables from workflow contract
- execute assertion queries
- compare observed rows to expected side effects
- detect missing, extra, or malformed writes
- run cleanup queries for synthetic rows

## Required evidence
- query used
- observed row counts
- sample key fields
- cleanup confirmation
