# ADR-002 — Promotion v1 is explicit-input driven

## Decision

Promotion in v1 does not rely on hidden automatic corroboration logic.
It uses explicit evidence supplied through the request and explicit stored counters / flags.

## Reason

This is easier to reason about, easier to debug, and safer for autonomous execution.

## Consequence

`promote_memory` returns:
- `success` when accepted
- `partial` when denied by rule
- `failed` when the transition itself is invalid
