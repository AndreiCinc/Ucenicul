# Module Spec: memory_module

> **Canonicality: LEVEL 2 — CANONICAL SUBORDINATE**
> Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md`, `docs/Module_Registry_Ucenicul.md`, and `docs/Memory_Model_Spec.md`.

---

## Purpose

The memory_module manages all memory operations: storage, recall, promotion between memory tiers, semantic search, and superseding of outdated memory items. It is the sole owner of memory write operations.

## Scope

- Store new memory items (working -> recent -> long-term tiers)
- Recall memory items by query, entity, thread, or category
- Promote memory items between tiers per promotion rules
- Search memory semantically via pgvector
- Supersede outdated memory items

## Input Contract (Module Request)

| Input field | Type | Required | Description |
|---|---|---|---|
| `action` | enum | yes | `store_memory`, `recall_memory`, `promote_memory`, `search_memory`, `supersede_memory` |
| `content` | string | for store | Memory content to store |
| `memory_type` | enum | for store | `fact`, `observation`, `pattern`, `inference`, `preference`, `constraint` |
| `source_context` | object | for store | Source thread_id, message_id, entity_id |
| `query` | string | for recall/search | Search query |
| `memory_id` | string | for promote/supersede | Target memory item ID |
| `promotion_target` | enum | for promote | `recent`, `long_term` |
| `supersedes_memory_id` | string | for supersede | ID of memory being replaced |

Standard Module Request fields always required.

## Output Contract (Module Result)

| Output field | Type | Description |
|---|---|---|
| `memory_id` | string | Created or affected memory item ID |
| `memory_summary` | string | Human-readable summary |
| `recall_results` | array | For recall/search: matching memory items |
| `promotion_decision` | object | For promote: whether promotion was accepted and why |

Standard Module Result fields always included.

## Read Scope

- `execution_context`, `threads`, `memory_store` (all tiers), `entities`

## Write Scope

- `memory_store` ONLY (relational metadata + pgvector embeddings)

## Idempotency

- Key: `execution_context_id + step_id`
- Duplicate store requests with same key return existing memory_id
- Supersede operations check that target memory_id exists before replacement

## Privacy Profile

| Field | MVP | Target |
|---|---|---|
| Consumed content class | `normalized_content` | `llm_safe_content` + `rag_safe_content` |
| Produces PII artifacts | Yes (memory content may contain entity references) | Yes (tokenized entity references) |

## Promotion Rules Enforcement

The memory_module MUST enforce promotion rules as defined in `docs/Memory_Model_Spec.md`:

- No direct jump from working memory to long-term without passing through recent
- No pattern storage after single observation (unless user explicitly confirms)
- Subjective character judgments are forbidden
- Only operationally framed observations are stored

## Error Handling

- Storage failures: return `failed` status
- Empty recall: return `success` with empty `recall_results`
- Promotion denied (rules not met): return `partial` with explanation in `promotion_decision`

## Transitional Notes

- Current scattered memory writes in n8n branches must be refactored to go through this module
- Direct pgvector access from other modules is prohibited in target architecture

---

> **Level 2 — Canonical Subordinate.** Version: 1.0 | Last updated: 2026-04-15
