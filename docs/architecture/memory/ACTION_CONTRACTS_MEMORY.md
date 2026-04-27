# ACTION_CONTRACTS_MEMORY.md

This file is the concise contract sheet for the five canonical memory actions.

## Shared defaults

If caller does not provide values:

- `confidence = 0.8`
- `importance = 0.5`
- `durability = stable`

## Shared evidence shape

Each `evidence_ref` entry must support:

- `type`
- `ref`
- optional `thread_id`
- optional `message_id`
- optional `note`

## Shared rules

- `source_thread_id` is required for `store_memory`
- `source_message_id` is recommended but not universally required in v1
- `category` is controlled free-text:
  - lowercase
  - normalized
  - no arbitrary prose
- `search_memory` defaults to `status='active'`
- `promote_memory` only supports `recent -> long_term`
- recall filters intersect strictly
- subjective Romanian judgments are blocked in v1 for `observation` and `pattern`

## 1. store_memory

### Required
- `content`
- `memory_type`
- `category`
- `source_thread_id`

### Optional
- `source_message_id`
- `entity_id`
- `confidence`
- `importance`
- `durability`
- `evidence_refs`
- `metadata`

### Writes
- inserts a new `memory_items` row
- sets:
  - `tier = recent`
  - `status = active`
  - deterministic `idempotency_key`

### Errors
- missing required fields -> `failed`
- subjective Romanian judgment on `observation` / `pattern` -> `failed`
- duplicate idempotency -> return existing row, not duplicate

## 2. search_memory

### Required
- `query`

### Optional
- `limit`
- `memory_type`
- `tier`
- `status` or `include_statuses`
- `source_thread_id`
- `entity_id`
- `category`

### Reads
- semantic retrieval by embedding
- default search scope: `status='active'`

### Output
- `recall_results[]` with similarity

## 3. recall_memory

### Required
At least one of:
- `entity_id`
- `source_thread_id`
- `category`
- `memory_type`

### Optional
- `tier`
- `status` or `include_statuses`
- `limit`

### Reads
- structural recall without embeddings
- filters combine with strict intersection

### Output
- `recall_results[]` without similarity, sorted newest first

## 4. promote_memory

### Required
- `memory_id`
- `promotion_target`

### Optional
- `evidence_refs`
- `user_confirmed`
- `evidence_validated`

### Legal transition
- only `recent -> long_term`

### Acceptance rule
Promotion is accepted if at least one is true:
- corroboration count threshold met
- `user_confirmed = true`
- `evidence_validated = true`

### Output
- if accepted: `success`
- if denied by rule: `partial`
- if invalid transition: `failed`

## 5. supersede_memory

### Required
- `supersedes_memory_id`
- all fields required to create the new replacement memory

### Behavior
- old row becomes `superseded`
- new row becomes `active`
- new row stores `supersedes_memory_id`

### Errors
- old target missing -> `failed`
- old target already superseded -> `failed`
- no automatic chain guesswork in v1
