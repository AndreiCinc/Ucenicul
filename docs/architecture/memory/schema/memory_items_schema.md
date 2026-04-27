# memory_items_schema.md

> **Canonicality: LEVEL 3 — MISSION ARTIFACT**
> Subordinate to `Memory_Model_Spec.md`, `Module_Spec_Memory.md`, and `memory_module_design.md`.
> This document is the **Phase-4 frozen schema rationale** for the new `memory_items` table.
> It pairs with `docs/architecture/memory/migration.sql` (the executable DDL).

---

## 0. Freeze header

- Phase: **4 — schema + migration freeze**
- Status: **FROZEN** (any later change requires `DIVERGENCE_REGISTER_MEMORY.md` entry + explicit reopen)
- Mission: new `memory_items` architecture, separate from `rag_memories`
- DB environment verified live on 2026-04-20:
  - `public.tenants.id` — uuid PK ✓
  - `public.messages.id` — uuid PK ✓
  - `public.threads.id` — uuid PK ✓
  - `public.entities.id` — uuid PK ✓
  - extensions: `vector 0.8.2`, `pgcrypto 1.3`, `uuid-ossp 1.1` ✓
  - `memory_items`, `memory_type_enum`, `memory_tier_enum`, `memory_status_enum` — do NOT exist (clean slate) ✓

---

## 1. Purpose

`memory_items` is the durable, thread-aware memory store for the new `memory_module`.

It serves four orthogonal workloads:

| Workload | Primary support |
|---|---|
| `store_memory` | row insertion with deterministic idempotency, defaults, and Romanian subjective-content guard |
| `search_memory` | semantic retrieval via `vector(1536)` embedding + ivfflat cosine index |
| `recall_memory` | structural retrieval via btree indexes on `entity_id`, `source_thread_id`, `category`, `memory_type` |
| `promote_memory` / `supersede_memory` | explicit lifecycle — `tier`/`status` transitions + `supersedes_memory_id` chain |

Working memory (execution-context scope) is **not** stored here. `tier ∈ {recent, long_term}` only.

---

## 2. Enum contracts

Three new enums are introduced. All belong to `public` schema.

### 2.1 `memory_type_enum`

Values (per `Memory_Model_Spec.md` §6 and `Module_Spec_Memory.md` input contract):

| Value | Meaning |
|---|---|
| `fact` | Stable, verifiable statement |
| `observation` | Single observed behavior or event |
| `pattern` | Multi-corroboration durable pattern |
| `inference` | Derived conclusion with operational framing |
| `preference` | User-stated durable preference |
| `constraint` | Operational limit or rule |

**Rationale:** frozen set — exactly the six values required by the canonical Level-2 specs. No extensions in v1.

### 2.2 `memory_tier_enum`

Values:

| Value | Meaning |
|---|---|
| `recent` | Default tier on `store_memory` — supportive episodic memory, ~7–30 days per Memory_Model_Spec §2.2 |
| `long_term` | Durable tier reached only via `promote_memory` |

**Rationale:** working memory is explicitly excluded (decision M-003 / D-M-003). Any attempt to insert or promote outside this set fails at enum level.

### 2.3 `memory_status_enum`

Values:

| Value | Meaning |
|---|---|
| `active` | Default — visible in `search_memory` / `recall_memory` without override |
| `superseded` | Set on old row by `supersede_memory` action |
| `expired` | Set when `valid_until < now()` (background job — not part of v1 handlers) |
| `archived` | Manual soft-drop flag (not part of v1 handlers; reserved for v2 lifecycle) |

**Rationale:** `active` + `superseded` are the two statuses `supersede_memory` mutates in v1. `expired` and `archived` are reserved lifecycle sinks so future code does not require another enum migration. Search/recall default filter is `status='active'` (decision M-003).

---

## 3. Table specification

### 3.1 Column map

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK, `pgcrypto` |
| `tenant_id` | uuid | NO | — | FK → `public.tenants(id)` ON DELETE CASCADE |
| `memory_type` | memory_type_enum | NO | — | enum §2.1 |
| `category` | text | NO | — | normalized free-text; CHECK regex §4.1 |
| `content` | text | NO | — | human-readable memory body |
| `confidence` | numeric(4,3) | NO | `0.800` | CHECK 0 ≤ confidence ≤ 1 |
| `importance` | numeric(4,3) | NO | `0.500` | CHECK 0 ≤ importance ≤ 1 |
| `durability` | rag_durability_enum | NO | `'stable'` | reuses existing enum (already in live DB) |
| `tier` | memory_tier_enum | NO | `'recent'` | `store_memory` inserts `recent`; `promote_memory` → `long_term` |
| `status` | memory_status_enum | NO | `'active'` | `supersede_memory` sets `superseded` on old row |
| `source_thread_id` | uuid | NO | — | FK → `public.threads(id)` ON DELETE RESTRICT |
| `source_message_id` | uuid | YES | — | FK → `public.messages(id)` ON DELETE SET NULL |
| `entity_id` | uuid | YES | — | FK → `public.entities(id)` ON DELETE SET NULL |
| `evidence_refs` | jsonb | NO | `'[]'::jsonb` | array per §4.2 evidence shape |
| `metadata` | jsonb | NO | `'{}'::jsonb` | free-form caller metadata |
| `embedding` | vector(1536) | YES | — | nullable — populated at store or deferred; index §5.5 |
| `corroboration_count` | integer | NO | `1` | CHECK ≥ 1; increments on repeat observation |
| `user_confirmed` | boolean | NO | `false` | promote_memory acceptance condition |
| `evidence_validated` | boolean | NO | `false` | promote_memory acceptance condition |
| `last_reconfirmed_at` | timestamptz | YES | — | set on `promote_memory` success |
| `valid_until` | timestamptz | YES | — | optional TTL hint (expiry job outside v1) |
| `supersedes_memory_id` | uuid | YES | — | self-FK → `memory_items(id)` ON DELETE SET NULL |
| `idempotency_key` | text | NO | — | UNIQUE; format §4.3 |
| `created_at` | timestamptz | NO | `now()` | insertion timestamp |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger §6.1 |

**Why `source_thread_id` NOT NULL with ON DELETE RESTRICT:** decision M-005 / D-M-005 — thread-aware memory is core to the new design. A `SET NULL` action would be incompatible with the NOT NULL column (Postgres would raise a not-null violation at delete time), so we declare the intent explicitly as `RESTRICT`: a thread with memory rows cannot be hard-deleted until the app layer archives or deletes those rows first. This matches GDPR-style deletion semantics where thread erasure must be an explicit, auditable cleanup rather than a silent cascade.

**Why `embedding` nullable:** decision C2. `recall_memory` is structural and does not require an embedding. Embedding generation is an external step (§5.5 indexing) and may fail or be deferred without blocking a `store_memory` success that the caller explicitly marks as structural-only. Search over NULL embeddings is naturally skipped by the partial index.

**Why `durability` reuses `rag_durability_enum`:** the enum already exists in the live DB (observed during FK live-verification). Creating a second, parallel enum would fragment the durability ontology. `rag_durability_enum` is not scope-creep into `rag_memories` — enums are schema-level types, not row-level coupling.

### 3.2 Primary key + uniqueness

- `PRIMARY KEY (id)`
- `UNIQUE (idempotency_key)` — global uniqueness across tenants, per decision E1.

### 3.3 Foreign keys

| FK | Target | ON DELETE |
|---|---|---|
| `tenant_id` | `public.tenants(id)` | `CASCADE` |
| `source_thread_id` | `public.threads(id)` | `RESTRICT` |
| `source_message_id` | `public.messages(id)` | `SET NULL` |
| `entity_id` | `public.entities(id)` | `SET NULL` |
| `supersedes_memory_id` | `public.memory_items(id)` | `SET NULL` |

**Rationale:** `CASCADE` on tenant hard-delete is the only acceptable behavior — memory for a destroyed tenant must not linger. `source_thread_id` uses `RESTRICT` because the column is NOT NULL (decision M-005); deletion of a thread must be an explicit app-layer cleanup, not a silent cascade. Non-tenant nullable FKs (`source_message_id`, `entity_id`, `supersedes_memory_id`) use `SET NULL` so message/entity re-indexing or GDPR-triggered deletions do not destroy the memory row itself — the row remains useful for supersede lineage and audit even if a source pointer is lost.

---

## 4. Constraint layer

### 4.1 `category` regex CHECK

```
CHECK (category ~ '^[a-z][a-z0-9_]{0,63}$')
```

Enforces decision #9 / M-009 / D3 at DB level:

- lowercase only
- starts with a letter
- snake_case simple (`[a-z0-9_]`)
- no spaces, no punctuation
- max 64 characters

**Rationale:** controlled free-text means the DB rejects obviously malformed categories rather than relying on handler goodwill. Keeps `GROUP BY category` reports stable.

### 4.2 `evidence_refs` shape

Minimum per-item shape (decision #10 / M-010):

```
{
  "type": "string",           // required — e.g. "thread", "message", "user_confirmation", "pattern_obs"
  "ref":  "string",           // required — opaque reference id / url / locator
  "thread_id":  "uuid?",
  "message_id": "uuid?",
  "note":       "string?"
}
```

The shape is **not enforced by a `CHECK jsonb_path_match`** in v1 — Postgres `jsonb_path_exists` validation per-element would complicate inserts and bloat the migration. Handler-layer validation + contract tests enforce shape. V2 may add a trigger-based validator.

`evidence_refs` default `'[]'::jsonb` so structural queries can safely `jsonb_array_length(evidence_refs)` without a null guard.

### 4.3 `idempotency_key` format

Format (decision E1):

```
{action}:{execution_context_id}:{step_id}
```

Applied on `store_memory` and `supersede_memory` (the two actions that create rows). Example:

```
store_memory:b1d2e3f4-...:step_07
supersede_memory:b1d2e3f4-...:step_12
```

Uniqueness is global — this is intentional. If the same execution context replays the same step, the handler returns the existing row rather than inserting a duplicate (per `Module_Spec_Memory.md` idempotency clause).

For actions that do NOT create rows (`search_memory`, `recall_memory`, `promote_memory`), no new row is written, so idempotency is the handler's concern, not the table's. `promote_memory` mutates an existing row in place and therefore does not need an idempotency key on `memory_items` — replaying the promotion is naturally idempotent.

### 4.4 Numeric bounds

- `CHECK (confidence BETWEEN 0 AND 1)` — scalar probability
- `CHECK (importance BETWEEN 0 AND 1)` — scalar priority
- `CHECK (corroboration_count >= 1)` — every stored row is at least one observation

---

## 5. Index plan

All indexes target either recall filters or search ranking. No speculative indexes.

### 5.1 `idx_memory_items_tenant_thread_created`

```
BTREE (tenant_id, source_thread_id, created_at DESC)
WHERE status = 'active'
```

Primary recall path: "recent memory in this thread for this tenant". Partial on `active` because recall default is `active`.

### 5.2 `idx_memory_items_tenant_entity_created`

```
BTREE (tenant_id, entity_id, created_at DESC)
WHERE status = 'active' AND entity_id IS NOT NULL
```

Entity-scoped recall. Partial skips NULL entity rows.

### 5.3 `idx_memory_items_tenant_category`

```
BTREE (tenant_id, category, created_at DESC)
WHERE status = 'active'
```

Category-scoped recall.

### 5.4 `idx_memory_items_tenant_type_tier`

```
BTREE (tenant_id, memory_type, tier, created_at DESC)
WHERE status = 'active'
```

`memory_type` + `tier` intersection (supports strict-intersection recall per M-007).

### 5.5 `idx_memory_items_embedding_cos`

```
IVFFLAT (embedding vector_cosine_ops)
WITH (lists = 100)
WHERE embedding IS NOT NULL AND status = 'active'
```

Semantic search index per decision C3. Partial on `embedding IS NOT NULL` so rows without embeddings don't waste index space. `lists=100` is a reasonable seed; to be retuned when row count > ~10k.

### 5.6 `idx_memory_items_supersedes`

```
BTREE (supersedes_memory_id)
WHERE supersedes_memory_id IS NOT NULL
```

Fast lookup "what row replaced X". Supports supersede lineage walks.

### 5.7 `idx_memory_items_idempotency`

Implicit via `UNIQUE (idempotency_key)`. No separate index needed.

### 5.8 `idx_memory_items_valid_until`

```
BTREE (valid_until)
WHERE valid_until IS NOT NULL AND status = 'active'
```

Supports future expiry-sweeper job. Zero cost when `valid_until` is NULL.

---

## 6. Triggers

### 6.1 `trg_memory_items_set_updated_at`

`BEFORE UPDATE` trigger that sets `NEW.updated_at = now()` unconditionally. Reuses a generic helper function `public.set_updated_at()` (created in migration if absent).

No other triggers in v1. Transactional supersede (two writes in one tx) is handler-side.

---

## 7. Relationship to canonical specs

| Canonical doc | Clause | This schema |
|---|---|---|
| `Memory_Model_Spec.md` §6 Required fields | `id, tenant_id, memory_type, category, content, confidence, importance, durability, source_message_id, source_thread_id, created_at, updated_at` | ✓ all present; `source_message_id` nullable per M-006 |
| `Memory_Model_Spec.md` §6 Optional fields | `entity_id, evidence_refs, status, supersedes_memory_id` | ✓ all present |
| `Memory_Model_Spec.md` §2 tiers | working (NOT in DB), recent, long_term | ✓ enum excludes working |
| `Memory_Model_Spec.md` §9 superseding | old.status='superseded'; new.supersedes_memory_id=old.id; both preserved | ✓ supported by columns; transactional write is handler-side |
| `Module_Spec_Memory.md` Input Contract | action, content, memory_type, source_context, query, memory_id, promotion_target, supersedes_memory_id | ✓ all inputs map to columns or handler args |
| `Module_Spec_Memory.md` Idempotency | `execution_context_id + step_id` | ✓ `idempotency_key` format locked |
| `Module_Spec_Memory.md` Promotion rules | recent → long_term only; denial → `partial` | ✓ `memory_tier_enum` restricts; handler enforces partial |

No canonical conflict. No divergence opened by this schema.

---

## 8. What this schema does NOT do

Explicit non-goals for Phase 4 (protect against scope creep):

- Does not touch `rag_memories`. The legacy table continues to exist untouched.
- Does not create a shared view that unifies old and new memory. Callers must target `memory_items` by table name.
- Does not implement the expiry sweeper for `valid_until` — only the supporting index exists.
- Does not implement row-level security or tenant-scoped policies — deferred until operational DB tenant-isolation policy is formalized.
- Does not add `jsonb` shape CHECKs on `evidence_refs` or `metadata` — handler-layer validation is the v1 contract.
- Does not pre-create tuned ivfflat parameters based on dataset size — `lists=100` is the seed. Retune is a Phase-9 ops concern.

---

## 9. Migration ordering requirements

The migration file (`migration.sql`) must perform steps in this order to be safe:

1. `CREATE EXTENSION IF NOT EXISTS pgcrypto` (guard; already installed)
2. `CREATE EXTENSION IF NOT EXISTS vector` (guard)
3. Create the three new enums guarded by `DO $$ ... END $$` existence checks
4. Create `public.set_updated_at()` helper if absent
5. `CREATE TABLE public.memory_items` with all columns + constraints
6. Create indexes (5.1 – 5.8)
7. Attach trigger 6.1

Indexes are created after the table, not inline, to keep rollback cleaner. Each `CREATE INDEX` is `IF NOT EXISTS`-guarded.

---

## 10. Rollback contract

`migration.sql` ships a `-- ROLLBACK` block (commented out) that drops artifacts in reverse order:

1. Drop trigger
2. Drop indexes
3. Drop table
4. Drop enums (only if unused elsewhere — guarded)

**Not included** in the rollback:
- `DROP FUNCTION public.set_updated_at()` — shared helper, intentionally left untouched
- `DROP EXTENSION vector` — shared with other tables
- `DROP EXTENSION pgcrypto` — shared infrastructure

Rollback is intentionally conservative: it removes this migration's artifacts without touching shared infrastructure.

---

## 11. Live-verification record

Captured 2026-04-20 via `mcp__postgres__execute_sql`:

```
public.tenants.id      uuid  NOT NULL  PRIMARY KEY   ✓
public.messages.id     uuid  NOT NULL  PRIMARY KEY   ✓
public.threads.id      uuid  NOT NULL  PRIMARY KEY   ✓
public.entities.id     uuid  NOT NULL  PRIMARY KEY   ✓

pg_extension vector    0.8.2  installed             ✓
pg_extension pgcrypto  1.3    installed             ✓
pg_extension uuid-ossp 1.1    installed             ✓

to_regtype('public.memory_items')        NULL  → table does not exist ✓
to_regtype('public.memory_type_enum')    NULL  → enum does not exist  ✓
to_regtype('public.memory_tier_enum')    NULL  → enum does not exist  ✓
to_regtype('public.memory_status_enum')  NULL  → enum does not exist  ✓
```

All FK targets exist with UUID PK. Clean slate for new enums + table.

---

## 12. Phase-4 freeze declaration

This schema rationale is frozen as of 2026-04-20. Any subsequent change requires:

1. Entry in `DIVERGENCE_REGISTER_MEMORY.md`
2. Explicit phase reopen via `PHASE_GATE_CHECKLIST.md`
3. Updated version stamp at the bottom of this file

---

> **Level 3 — Mission Artifact.** Version: 1.0 | Phase: 4 frozen | Last updated: 2026-04-20
