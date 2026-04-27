# store_memory.md

## Role

Create a new recent memory entry.

## Input

Required:
- `content`
- `memory_type`
- `category`
- `source_thread_id`

Optional:
- `source_message_id`
- `entity_id`
- `confidence`
- `importance`
- `durability`
- `evidence_refs`
- `metadata`

## Behavior

- validate required fields
- apply Romanian subjective-judgment heuristic when `memory_type` is `observation` or `pattern`
- generate embedding
- insert into `memory_items`
- set `tier='recent'`
- set `status='active'`
- use deterministic idempotency

## Output

- `memory_id`
- `memory_summary`
- created metadata summary

## Failure cases

- missing required fields
- forbidden subjective judgment
- invalid normalized category
