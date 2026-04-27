# promote_memory.md

## Role

Promote a memory from `recent` to `long_term`.

## Input

Required:
- `memory_id`
- `promotion_target`

Optional:
- `evidence_refs`
- `user_confirmed`
- `evidence_validated`

## Behavior

- accept only `promotion_target='long_term'`
- validate current row is `recent`
- accept promotion when at least one rule passes:
  - corroboration threshold
  - user confirmation
  - evidence validation
- denied rule case returns `partial`

## Output

- `promotion_decision`
  - `accepted`
  - `reason`
  - `new_tier`
  - `corroboration_count_after`

## Failure cases

- missing memory
- invalid transition
- invalid target
