# Skill 29 — Chain Contract Precedence Resolver

## Goal
Resolve the canonical chain graph and connector obligations.

## Procedure
1. Read precedence sources in order.
2. Extract explicit source → target edge statements.
3. Extract workflow-local callable and IO requirements.
4. Build a chain map.
5. Mark each edge:
   - canonical
   - provisional
   - rejected
6. Record evidence source for every edge.

## Output
A chain mapping record that the connector patcher and E2E orchestrator can consume.

## Guardrail
Do not infer all edges from workflow names alone.
