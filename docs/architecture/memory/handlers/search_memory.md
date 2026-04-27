# search_memory.md

## Role

Perform semantic retrieval over memory entries.

## Input

Required:
- `query`

Optional:
- `limit`
- `memory_type`
- `tier`
- `status` or `include_statuses`
- `source_thread_id`
- `entity_id`
- `category`

## Behavior

- generate query embedding
- search semantically against `memory_items.embedding`
- default scope is `status='active'`
- allow explicit override for other statuses

## Output

- `recall_results[]`
  - `memory_id`
  - `content`
  - `similarity`
  - `memory_type`
  - `tier`
  - `created_at`

## Notes

`search_memory` is semantic, not structural.
