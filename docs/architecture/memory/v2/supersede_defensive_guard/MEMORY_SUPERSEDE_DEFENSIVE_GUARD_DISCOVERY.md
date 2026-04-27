# MEMORY V2 SUPERSEDE EMBED · Defensive Guard · Discovery

> Mission: `MEMORY_V2_SUPERSEDE_EMBED_DEFENSIVE_GUARD_FOLLOWUP`

---

## 1. Crash trace summary (pre-patch)

When `ME_Memory_Supersede_Prep` returns `{ _error: true, error_code: 'MISSING_REQUIRED_FIELDS' }` (e.g., because the chat envelope didn't carry a `memory_id`), the next node `ME_Memory_Supersede_Embed` evaluates:

```
={{ JSON.stringify({ model: 'text-embedding-3-small', input: $json.__db.content }) }}
```

Property access `$json.__db.content` throws TypeError because `$json.__db` is undefined. n8n's expression evaluator catches it and the resolved jsonBody becomes the literal string `"undefined"`, which `parseJsonParameter` rejects with `NodeOperationError: The value in the "JSON Body" field is not valid JSON`. The whole chain crashes at this node.

## 2. Why Embed_Merge can't help

`ME_Memory_Supersede_Embed_Merge` ALREADY has the canonical `_error` short-circuit:

```js
const prep = $('ME_Memory_Supersede_Prep').first().json;
if (prep && prep._error === true) {
  return [{ json: prep }];
}
```

So if `Embed` did not crash, `Embed_Merge` would correctly propagate the Prep's `_error` envelope through `DB` → `Result` → user-safe error. The bug is purely in Embed: it crashes BEFORE Merge gets to run.

## 3. Why DB and Result are already safe

- `ME_Memory_Supersede_DB.parameters.options.queryReplacement` evaluates `$json._error ? [null × 16] : [...]` — when the upstream `_error` path is taken, the SQL gets all-null params; the supersede CTE's `WHERE id=$1::uuid AND tenant_id=$2::uuid` finds nothing → no row inserted; no row updated.
- `ME_Memory_Supersede_Result` reads `prep` via `$('ME_Memory_Supersede_Prep').first().json` and short-circuits on `prep._error===true`. If the chain reaches Result, the user-facing envelope is correct.

## 4. Patch decision (smallest possible)

**Modify `ME_Memory_Supersede_Embed.parameters.jsonBody` to a defensive ternary that never dereferences `__db.content` when missing**, AND add `continueOnFail: true` + `alwaysOutputData: true` for belt-and-suspenders. Result:

```
={{ ($json && $json.__db && typeof $json.__db.content === 'string')
      ? JSON.stringify({ model: 'text-embedding-3-small', input: $json.__db.content })
      : JSON.stringify({ model: 'text-embedding-3-small', input: 'noop' }) }}
```

When the Prep returns `_error`, Embed sends a "noop" embedding request (cost: one wasted OpenAI call for the negative path), receives a normal embeddings response (or a 400 — `continueOnFail` swallows it), Embed_Merge then short-circuits via the existing `_error` check, DB writes nothing, Result emits the canonical `_error` envelope.

**No node added. No connection added. No schema mutation. No change to Prep / Embed_Merge / DB / Result. No PL / OR / TR / EC / DI / RA / SU / RC / MO change.** The other Memory V2 chains (store / search / recall / promote) are untouched.

## 5. Stop conditions evaluated

| Condition | Result |
|---|---|
| Positive supersede regresses | ❌ no — defensive ternary still emits the canonical embedding payload when `__db` is present |
| Missing memory_id still crashes | ❌ no — ternary never dereferences `__db.content` when `__db` is missing |
| Wrong-tenant supersede succeeds | ❌ no — Memory V2 SQL `WHERE id=$1 AND tenant_id=$2` already enforces |
| Replay duplicates | ❌ no — Memory V2 idempotency_key UNIQUE held |
| Memory V2 store/search regress | ❌ no — those chains untouched |
| task/improvement/reminder regress | ❌ no — those modules untouched |
| Schema migration | ❌ none |
| Broad Memory V2 rewrite | ❌ no — single node parameters change, 0 node delta |
| Workflow duplicate | ❌ no |
| Path 5 | ❌ not used |
