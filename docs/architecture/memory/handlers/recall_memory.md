# recall_memory.md

## Role

Perform structural retrieval without embeddings.

## Input

At least one required:
- `entity_id`
- `source_thread_id`
- `category`
- `memory_type`

Optional:
- `tier`
- `status` or `include_statuses`
- `limit`

## Behavior

- build a strict-filter query
- combine supplied filters by intersection
- order newest first

## Output

- `recall_results[]`
  - `memory_id`
  - `content`
  - `memory_type`
  - `tier`
  - `status`
  - `created_at`

## Notes

`recall_memory` is structural, not semantic.
