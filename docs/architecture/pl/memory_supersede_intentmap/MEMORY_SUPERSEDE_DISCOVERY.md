# MEMORY SUPERSEDE PL INTENTMAP · Discovery

> Mission: `MEMORY_SUPERSEDE_PL_INTENTMAP_FOLLOWUP`
> Predecessor blocker: tracked as such in
> `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` §0.1.

---

## 1. Workflow live versions (pre-mission)

| WF | id | versionId | nodes | conns |
|---|---|---|---|---|
| WF-PL-01 | `RwToPLa1ErHl2tUi` | `dce0febe-1bc0-42e3-a44a-a41e6737e1e7` | 16 | 16 |
| WF-ME-01 | `uq26nh1grIpnHju0` | `4fd95689-39f9-4dff-8ed2-6d0ccb5270de` | 61 | 79 |

## 2. PL routing gap proven

`grep -c "supersede_memory" PL_Build_Planner_Input.pre.js` → **0**.

The live `PL_Build_Planner_Input` v2.2 jsCode:
- `intentMap` lacks `supersede_memory`.
- `actionToModule` lacks `supersede_memory`.
- `extractInputsForAction` has no `supersede_memory` branch.
- No late-binding pass touches `supersede_memory`.

Result: any upstream `messages.intent='supersede_memory'` falls through PL routing — it does not match `intentMap[primaryIntent]`, so PL emits `INSUFFICIENT_PLANNING_CONTEXT` (or routes to default `multi_action_request` if `requestedActions` is empty). The canonical `ME_Memory_Supersede_*` chain is unreachable.

## 3. ME supersede chain (real — Memory V2)

Five nodes confirmed live in WF-ME-01:

- `ME_Memory_Supersede_Prep` (Code v2)
- `ME_Memory_Supersede_Embed` (LLM/embedding helper)
- `ME_Memory_Supersede_Embed_Merge`
- `ME_Memory_Supersede_DB` (Postgres v2.4 — parameterized)
- `ME_Memory_Supersede_Result` (Code v2)

### 3.1 Required inputs (from `ME_Memory_Supersede_Prep`)

```js
const required = ['supersedes_memory_id', 'content', 'memory_type', 'category', 'source_thread_id'];
const VALID_TYPES = ['fact','observation','pattern','inference','preference','constraint'];
```

| Field | Type | Source / default |
|---|---|---|
| `supersedes_memory_id` | uuid | **MUST** be caller-provided (the OLD memory_items.id) |
| `content` | text | new fact / replacement content |
| `memory_type` | enum | `fact` default |
| `category` | slug | `general` default |
| `source_thread_id` | uuid | from `verify.thread_id` (PL late-binding) |
| `source_message_id` | uuid | from `verify.trigger_message_id` (PL late-binding); optional |
| `entity_id`, `confidence`, `importance`, `durability`, `tier`, `metadata`, `evidence_refs`, `locale` | various | optional |

### 3.2 DB behavior (from `ME_Memory_Supersede_DB`)

```sql
WITH old_row AS (SELECT * FROM public.memory_items WHERE id=$1::uuid AND tenant_id=$2::uuid FOR UPDATE),
     guard   AS (SELECT 1 FROM old_row WHERE status='active'),
     marked  AS (UPDATE public.memory_items SET status='superseded' WHERE id=$1::uuid AND EXISTS (SELECT 1 FROM guard) RETURNING id AS old_id),
     inserted AS (INSERT INTO public.memory_items (..., supersedes_memory_id, status, ...)
                  SELECT $2::uuid, ..., $1::uuid, 'active', ... FROM marked
                  ON CONFLICT (idempotency_key) DO NOTHING
                  RETURNING *, TRUE AS new_insert)
SELECT * FROM inserted
UNION ALL
SELECT mi.*, FALSE AS new_insert FROM public.memory_items mi WHERE mi.idempotency_key=$14::text AND NOT EXISTS (SELECT 1 FROM inserted)
LIMIT 1;
```

Behavior:
- Locks the OLD row by `id + tenant_id`.
- `guard` requires the OLD row to be `status='active'` — already-superseded rows are no-ops.
- Marks OLD as `status='superseded'`.
- INSERTs a NEW row with `supersedes_memory_id` pointing to the OLD `id`, fresh `id`, `status='active'`.
- ON CONFLICT (idempotency_key) DO NOTHING + UNION ALL fallback handles same-key replay.

### 3.3 Result envelope (from `ME_Memory_Supersede_Result`)

Emits canonical `module_result` with `actions_executed[0].details = { old_memory_id, new_memory_id, tier, status, created_at, idempotency_reused }` and `module_name='memory_module'`. Already handles `_error` short-circuit via `$json._error === true` check (continueOnFail passthrough — same propagation pattern proven by F14, ACG, and Improvement closeouts).

### 3.4 Failure cases ME already handles

- `MISSING_REQUIRED_FIELDS` — any of supersedes_memory_id / content / memory_type / category / source_thread_id missing.
- `INVALID_CATEGORY` — category fails `^[a-z][a-z0-9_]{0,63}$` after normalization.
- `SUBJECTIVE_JUDGMENT_FORBIDDEN` — for `observation`/`pattern` memory types, content matches subjective regex.
- `SUPERSEDE_TARGET_INVALID` (from Result) — old row not found or already superseded (guard CTE returned empty).

## 4. Decision: explicit memory_id only

**Required from caller**: `supersedes_memory_id` (the OLD memory's UUID).

PL **cannot safely** derive `supersedes_memory_id` from text alone — that would require:

(a) a 2-step plan: first call `memory_module.search_memory` to find candidate(s), then call `memory_module.supersede_memory` with the resolved id. This is outside the current single-step PL contract.

(b) an ME-side composite handler `ME_Memory_Search_And_Supersede` that takes a textual target and resolves internally. That does not exist and would require touching Memory V2 (out of scope).

The canonical contract for this mission is **explicit `memory_id` only**. Routing is sufficient when:
- Upstream emits `requested_actions[i].inputs.memory_id` (or `supersedes_memory_id`), e.g., from a UI flow that already shows a list of memories the user is amending; or
- Upstream emits `plannerContext.inputs.memory_id` for a `primary_intent='supersede_memory'` envelope.

**Textual-only supersede ("schimbă culoarea preferată")** is documented as a future enhancement (`MEMORY_SUPERSEDE_TEXTUAL_RESOLVER_FOLLOWUP`); without resolved id, ME's Prep correctly returns `MISSING_REQUIRED_FIELDS` — that is the safe failure mode. Per pack policy: "If ME requires explicit `memory_id` and PL cannot derive it safely, do not fake it" — confirmed.

## 5. Patch surface decision

**WF-PL-01.PL_Build_Planner_Input** — single jsCode rewrite v2.2 → v2.3. **0 node delta. 0 connection delta. 0 schema delta.**

Changes (mirror F14 shape):

1. `intentMap.supersede_memory = 'supersede_memory'`.
2. `actionToModule.supersede_memory = 'memory_module'`.
3. New `extractInputsForAction('supersede_memory', goalText)` clause:
   - Strips supersede verb prefix (Romanian `schimbă/actualizează/înlocuiește/modifică` + English `update/replace/change/supersede`) to derive `content` (new fact). `memory_type='fact'`, `category='general'` defaults.
   - Does NOT attempt to derive `supersedes_memory_id` from text.
4. New late-binding pass `requestedActions.map(...)` for any `action='supersede_memory'`:
   - If upstream provided `inputs.memory_id` but not `inputs.supersedes_memory_id`, copy `memory_id` → `supersedes_memory_id` (canonical key for ME).
   - Inject `source_thread_id = verify.thread_id` if missing.
   - Inject `source_message_id = verify.trigger_message_id` if missing.
   - Inject `memory_type='fact'`, `category='general'` defaults if missing.
   - Set `module_name='memory_module'`.

Memory V2 internals stay closed. WF-ME-01 untouched. DB schema untouched. Path 5 not used. No duplicate workflow.

## 6. Apply channel

V2-028 canonical local CLI `n8n-patch.mjs replace`. Same pattern as F14 / Task / Improvement / ACG missions. **No `mcp__n8n__patch_workflow_nodes` write.**
