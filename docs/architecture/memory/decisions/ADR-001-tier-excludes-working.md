# ADR-001 — `memory_items.tier` excludes working memory

## Decision

`memory_items.tier` supports only:
- `recent`
- `long_term`

## Reason

Working memory belongs to execution context, not to durable memory storage.

## Consequence

- `store_memory` writes into `recent`
- promotion moves from `recent` to `long_term`
- no `working` tier exists in this table
