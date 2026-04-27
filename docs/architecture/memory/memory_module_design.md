# memory_module_design.md

## Status

Design freeze document for the new `memory_module` mission.
This document is the planning-level authority for the memory workspace after
contracts are frozen and before SQL / patch execution begins.

## 1. Design objective

Deliver a new modular memory subsystem that:

- implements all 5 canonical actions
- uses a new `memory_items` object
- stays thread-aware
- stays within a strict memory-only write fence
- can be implemented autonomously by Claude through explicit sub-processes
- does not depend on `rag_memories`

## 2. Design scope

### In scope

- `store_memory`
- `search_memory`
- `recall_memory`
- `promote_memory`
- `supersede_memory`
- schema rationale for `memory_items`
- migration SQL for new memory enums + `memory_items`
- `WF-ME-01` memory-path patch planning
- walker strategy and verification rules
- memory-specific ADRs and divergence tracking

### Out of scope

- adapting or extending `rag_memories`
- redesigning task / reminder / improvement / watcher behavior
- changing the global architecture spec
- changing privacy Phase 2 implementation beyond compatibility notes
- broad repo restructuring outside the memory subtree
- widening patch surface beyond `WF-ME-01` unless escalated and logged

## 3. Architectural position

The memory subsystem is a domain module under the target modular architecture.
It is not a compatibility wrapper over the historical RAG model. The design is
explicitly thread-aware and uses relational authority for durable memory
metadata, with embeddings as a semantic retrieval support layer.

This follows the canonical split:
- Operational DB owns authoritative durable memory rows
- Semantic/vector retrieval supports search and recall
- Working memory remains in execution context, not in durable storage

## 4. Core design choices

1. `memory_items` is a new table.
2. Working memory is not stored inside `memory_items`.
3. `tier` supports only:
   - `recent`
   - `long_term`
4. `store_memory` inserts into `recent`.
5. `search_memory` is semantic.
6. `recall_memory` is structural.
7. `promote_memory` is explicit and rule-gated.
8. `supersede_memory` is transactional and conservative.
9. `search_memory` defaults to `status='active'`, with explicit override.
10. `category` is controlled free-text, not enum.

## 5. Canonical action semantics

### 5.1 `store_memory`

Purpose:
Create a new durable recent memory row.

Required input:
- `content`
- `memory_type`
- `category`
- `source_thread_id`

Optional input:
- `source_message_id`
- `entity_id`
- `confidence`
- `importance`
- `durability`
- `evidence_refs`
- `metadata`

Behavior:
- validate required fields
- normalize `category`
- apply Romanian subjective-judgment heuristic if `memory_type` is
  `observation` or `pattern`
- apply defaults when omitted:
  - `confidence = 0.8`
  - `importance = 0.5`
  - `durability = stable`
- generate embedding for `content`
- insert into `memory_items`
- set:
  - `tier = recent`
  - `status = active`
  - deterministic `idempotency_key`

Result:
- success on first insert
- success with existing row on idempotent replay
- failed on missing fields / unsafe content / invalid category

### 5.2 `search_memory`

Purpose:
Semantic retrieval over memory rows using embeddings.

Required input:
- `query`

Optional input:
- `limit`
- `memory_type`
- `tier`
- `status` or `include_statuses`
- `source_thread_id`
- `entity_id`
- `category`

Behavior:
- generate embedding for query text
- query `memory_items.embedding`
- default filter is `status='active'`
- explicit override may include non-active statuses
- return ranked results with similarity

Result:
- success with `recall_results[]`
- success with empty `recall_results[]` if no match
- failed on invalid input or embedding failure

### 5.3 `recall_memory`

Purpose:
Structural retrieval without semantic search.

Required input:
At least one of:
- `entity_id`
- `source_thread_id`
- `category`
- `memory_type`

Optional input:
- `tier`
- `status` or `include_statuses`
- `limit`

Behavior:
- build strict filter query
- combine supplied filters by intersection
- default ordering newest first
- no embedding generation

Result:
- success with `recall_results[]`
- success with empty `recall_results[]` if no match
- failed when no structural filter is provided

### 5.4 `promote_memory`

Purpose:
Move a durable row from `recent` to `long_term` under explicit rules.

Required input:
- `memory_id`
- `promotion_target`

Optional input:
- `evidence_refs`
- `user_confirmed`
- `evidence_validated`

Legal transition:
- only `recent -> long_term`

Acceptance logic:
Promotion is accepted if at least one condition is true:
- stored corroboration threshold is met
- `user_confirmed = true`
- `evidence_validated = true`

Result:
- success if accepted
- partial if denied by rule
- failed if target row missing or transition invalid

### 5.5 `supersede_memory`

Purpose:
Replace an outdated memory while preserving auditability.

Required input:
- `supersedes_memory_id`
- all required creation inputs for the replacement row

Behavior:
- validate target row exists
- validate target row is not already superseded
- update old row to `status = superseded`
- insert new replacement row with:
  - `status = active`
  - `tier` determined by caller/default logic
  - `supersedes_memory_id = old id`
- perform as one transactional unit

Result:
- success on valid replacement
- failed if target missing
- failed if target already superseded
- no auto-chain inference in v1

## 6. Schema design intent

`memory_items` is the durable, thread-aware memory table for this module.
It must support:
- tenant scoping
- thread scoping
- optional message linkage
- optional entity linkage
- semantic retrieval
- structural recall
- promotion state
- supersede lineage
- safe retries via idempotency

### Required logical fields

- `id`
- `tenant_id`
- `memory_type`
- `category`
- `content`
- `confidence`
- `importance`
- `durability`
- `source_thread_id`
- `created_at`
- `updated_at`

### Optional / operational fields

- `source_message_id`
- `entity_id`
- `evidence_refs`
- `status`
- `supersedes_memory_id`
- `embedding`
- `tier`
- `idempotency_key`
- `metadata`
- `corroboration_count`
- `user_confirmed`
- `evidence_validated`
- `last_reconfirmed_at`

## 7. Status / tier model

### Tier
- `recent`
- `long_term`

### Status
Recommended v1 status set:
- `active`
- `superseded`
- `expired`
- `archived`

Behavioral defaults:
- search defaults to `active`
- recall may include other statuses only if requested
- supersede marks old row `superseded`

## 8. Error model

### Shared error classes

- `MISSING_REQUIRED_FIELDS`
- `INVALID_CATEGORY`
- `INVALID_PROMOTION_TARGET`
- `PROMOTION_RULE_NOT_MET`
- `SUPERSEDE_TARGET_INVALID`
- `SUBJECTIVE_JUDGMENT_FORBIDDEN`
- `EMBEDDING_GENERATION_FAILED`
- `DB_WRITE_FAILED`
- `DB_READ_FAILED`

### Result semantics

- `success` for completed legal operations
- `partial` only for promotion denied by rule
- `failed` for invalid inputs, invalid transitions, unsafe content, missing targets, or DB failures

## 9. Embedding architecture

For v1, embedding generation must be separated from pure handler reasoning.
The design assumes an embedding-capable sub-step or dedicated node used by the
memory path rather than mixing semantic generation with unrelated handler logic.

Design goal:
- easy provider swap later
- easy debugging
- clean retry boundaries
- deterministic failure handling

## 10. Category normalization policy

`category` remains free-text in v1, but must be controlled:
- lowercase
- trimmed
- normalized to machine-friendly form
- no prose paragraphs
- no unstable human-formatted labels

The system should reject obviously invalid categories rather than silently store
high-entropy labels.

## 11. Evidence policy

Each `evidence_ref` item must support this minimum shape:
- `type`
- `ref`
- optional `thread_id`
- optional `message_id`
- optional `note`

V1 keeps the evidence ontology intentionally light.
Richer evidence semantics are deferred to v2.

## 12. Subjective-content safety policy

V1 implements a lightweight Romanian lexical heuristic for `observation` and
`pattern` writes. If clearly subjective judgment terms are detected, the store
operation fails with `SUBJECTIVE_JUDGMENT_FORBIDDEN`.

This is intentionally conservative and intentionally limited:
- Romanian-focused in v1
- lexical, not model-based
- documented as a v1 guardrail, not a complete classifier

## 13. Touch surface and write fence

Primary design surface:
- `docs/architecture/memory/**`
- `tests/memory/**`
- `migration.sql`
- `patch_plan.md`
- `final_verification.md`

Controlled implementation surface:
- only the memory path inside `WF-ME-01`

Forbidden by default:
- task / reminder / improvement / watcher handlers
- non-memory workflows
- `rag_memories`
- global canonical docs

## 14. Patch strategy

Patch scope in `WF-ME-01`:
- replace current `ME_Memory_Store_Result` placeholder
- replace current `ME_Memory_Search_Result` placeholder
- add:
  - `ME_Memory_Recall_Result`
  - `ME_Memory_Promote_Result`
  - `ME_Memory_Supersede_Result`

No other ME handler paths may be changed in this mission by default.

## 15. Testing strategy

The walker/oracle layer must cover 7 cases:

1. `store_memory` happy path
2. `search_memory` happy path
3. `recall_memory` happy path
4. `promote_memory` accepted happy path
5. `promote_memory` denied -> partial
6. `supersede_memory` happy path
7. `store_memory` refused -> failed on subjective judgment

Each case must validate both:
- workflow result semantics (`aggregated_result.status`)
- DB state semantics

## 16. Operating model for autonomous execution

Claude must execute this mission through explicit sub-process roles:
- `memory-architect`
- `postgres-migrator`
- `n8n-patcher`
- `walker-tester`
- `document-auditor`

Claude must also maintain mission-control files:
- `IMPLEMENTATION_STATE.md`
- `DECISION_LEDGER_MEMORY.md`
- `BUG_LEDGER_MEMORY.md`
- `PHASE_GATE_CHECKLIST.md`

The module must be buildable without relying on conversation memory.

## 17. Deliverables map

- contracts -> `ACTION_CONTRACTS_MEMORY.md`
- schema rationale -> `schema/memory_items_schema.md`
- per-action handler docs -> `handlers/*.md`
- architecture decisions -> `decisions/*.md`
- SQL -> `migration.sql`
- patch plan -> `patch_plan.md`
- walker -> `tests/memory/walkers/walker.mjs`
- final verification -> `final_verification.md`

## 18. Acceptance gate

The design phase is complete only when:
- all 5 actions have stable semantics
- schema intent is unambiguous
- patch touch surface is explicit
- testing oracle is explicit
- bug handling protocol is explicit
- no dependency remains on remembering the whole chat

## 19. Known intended v1 limitations

- Romanian-only subjective-content heuristic
- controlled free-text category instead of taxonomy enum
- explicit-input promotion logic instead of automatic corroboration inference
- no auto-chain supersede logic
- search defaults to active, requiring explicit override for non-active statuses

These must be carried into final verification as explicit v2 follow-ups.
