# supersede_memory.md

## Role

Replace an outdated memory with a new active memory and preserve auditability.

## Input

Required:
- `supersedes_memory_id`
- all required creation fields for the new memory entry

## Behavior

- validate target exists
- validate target is not already superseded
- mark target as `superseded`
- insert new active row
- link new row through `supersedes_memory_id`

## Output

- `memory_id` for the new row
- `superseded_id` for the old row

## Failure cases

- target missing
- target already superseded
- invalid replacement payload
