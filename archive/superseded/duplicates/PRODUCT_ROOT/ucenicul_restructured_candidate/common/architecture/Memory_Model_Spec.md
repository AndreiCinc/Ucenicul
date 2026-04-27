# Memory Model Spec — Ucenicul

> **Canonicality: LEVEL 2 — CANONICAL SUBORDINATE**
> Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md`.

---

## 1. Overview

Memory in Ucenicul is a three-tier supportive semantic layer. Memory is NEVER authoritative for operational state. The Operational DB is authoritative for tasks, reminders, threads, entities, and messages.

Memory exists to provide contextual recall, learned patterns, and continuity awareness to modules and the orchestrator.

---

## 2. Memory Tiers

### 2.1 Working Memory

- **Scope:** current execution only
- **Lifetime:** dies when execution context completes, fails, or expires
- **Storage:** lives inside the Execution Context object
- **Contains:** current plan, temporary module results, step outputs, transient notes, shared artifacts

**Must NOT contain:**

- Long-term profile conclusions
- Full message history dumps
- Arbitrary raw RAG copies

### 2.2 Recent Episodic Memory

- **Scope:** approximately 7 to 30 days (configurable per tenant)
- **Storage:** pgvector + relational metadata in PostgreSQL
- **Contains:** recent operational episodes, thread summaries, repeated observations not yet promoted to long-term, recent watcher findings, short narrative continuity

### 2.3 Long-term Memory

- **Scope:** persistent (no automatic expiry)
- **Storage:** pgvector + relational metadata in PostgreSQL
- **Contains only:** stable facts, validated patterns, durable preferences, durable constraints, operational inferences that passed the evidence threshold

---

## 3. Promotion Rules

| Transition | Condition | Notes |
|---|---|---|
| Working -> Recent | Useful beyond current execution, after execution closes | Not all working memory is promoted; only items with operational or contextual value |
| Recent -> Long-term | Confirmed, repeated, or explicitly validated by user | Requires either: repeated observation (2+ corroborations), explicit user confirmation, or evidence-based validation |
| Working -> Long-term | **FORBIDDEN** unless explicitly confirmed by user | No direct jump from one raw message to strong long-term inference |

---

## 4. Inference Safety Rules

### Forbidden

- Subjective character judgments (e.g., "Cristina este neserioasa")
- Strong personality conclusions from single interactions
- Emotional assessments stored as facts

### Allowed

- Operationally framed observations (e.g., "Cristina trimite frecvent informatii cu intarziere")
- Behavioral patterns with multiple supporting episodes (e.g., "Cristina necesita follow-up mai atent pentru coordonare")

---

## 5. Observation -> Pattern Rules

| Stage | Criteria | Memory Type |
|---|---|---|
| Single observation | One instance detected | `observation` — stored in recent episodic memory |
| Pattern candidate | Two or more corroborating observations | `pattern` candidate — may be promoted to long-term after validation |
| Confirmed pattern | Validated by repetition, user confirmation, or operational evidence | `pattern` — stored in long-term memory |

A pattern MUST NOT be stored after a single observation unless the user explicitly states it as an enduring truth.

---

## 6. Memory Item Schema

Defined in `docs/Architecture_Spec_v3_Ucenicul.md` Section F.9.

Required fields: `id`, `tenant_id`, `memory_type`, `category`, `content`, `confidence`, `importance`, `durability`, `source_message_id`, `source_thread_id`, `created_at`, `updated_at`

Optional fields: `entity_id`, `evidence_refs`, `status`, `supersedes_memory_id`

Allowed memory_type values: `fact`, `observation`, `pattern`, `inference`, `preference`, `constraint`

---

## 7. Memory and Privacy

- In MVP: memory content stores `normalized_content`-derived data
- In Phase 2: memory_module consumes `llm_safe_content` and `rag_safe_content`; entity references use tokens, not raw PII
- Memory items that contain entity-identifying information must support tokenization in Phase 2
- The memory_module declares `produces_pii_artifacts: true` because memory content may reference entities

---

## 8. Memory vs Operational DB Boundary

| Question | Answer | Source |
|---|---|---|
| Is task X completed? | Operational DB (tasks table) | NEVER memory |
| When was reminder Y triggered? | Operational DB (reminders table) | NEVER memory |
| What does the user prefer for meeting times? | Long-term memory (preference) | NOT operational DB |
| What patterns have been observed about entity Z? | Long-term memory (pattern) | NOT operational DB |
| What was discussed in the last thread? | Recent episodic memory (thread summary) | NOT operational DB directly |

---

## 9. Superseding Rules

- When a new fact contradicts an existing stored fact, the memory_module MUST use the `supersede_memory` action
- The old memory item's `status` is set to `superseded`
- The new memory item's `supersedes_memory_id` points to the old item
- Both items are preserved for audit trail; neither is deleted

---

> **Level 2 — Canonical Subordinate.** Version: 1.0 | Last updated: 2026-04-15
