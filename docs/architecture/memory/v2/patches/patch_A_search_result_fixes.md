# Patch A — ME_Memory_Search_Result fixes (BUG-V2-01 + BUG-V2-02)

Opened: 2026-04-21.
Target workflow: `WF-ME-01 Module Execution` (n8n id `uq26nh1grIpnHju0`).
Target node: `ME_Memory_Search_Result` (id `me-phase11-me-memory-search-result`, type `n8n-nodes-base.code`).
Rollout channel: `n8n-patch.mjs replace` (full GET → mutate → PUT, audit tailed).

## Scope

- **BUG-V2-01** — filter out n8n `{success:true}` placeholder items before building `recall_results`.
- **BUG-V2-02** — compute `used_embedding` from DB ground truth (`lexical_fallback === false`) instead of negating `lexicalFallback`.

No schema changes, no new nodes, no connection changes. Pure Code-node `jsCode` swap. This patch is structurally safe to roll forward and rollback.

## Behavioural contract post-patch

| Case | `rows` post-filter | `lexicalFallback` | `recall_results` | `used_embedding` | `status` | `summary` |
|---|---|---|---|---|---|---|
| Zero hits, no embedding supplied | `[]` | `false` | `[]` | `false` | `success` | `Memory search completed.` |
| Zero hits, embedding supplied | `[]` | `false` | `[]` | `false` | `success` | `Memory search completed.` |
| Lexical hits, no embedding supplied | `N rows, all lexical_fallback=true` | `true` | `N entries` | `false` | `partial` | `Memory search degraded to lexical fallback (embedding missing).` |
| Semantic hits, embedding supplied | `N rows, all lexical_fallback=false` | `false` | `N entries` | `true` | `success` | `Memory search completed.` |

Compared with pre-patch behaviour, the only regressions eliminated are the two bug cases. No correct case changes.

## Patched `jsCode`

```js

const prep = $json;
if (prep && prep._error === true) {
  return [{ json: { _error: true, error_code: prep.error_code, error_message: prep.error_message, missing_fields: prep.missing_fields || [] }}];
}
const rows = $items()
  .map(i => i.json)
  .filter(r => r && typeof r.id === 'string');
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const lexicalFallback = rows.length > 0 && rows.every(r => r.lexical_fallback === true);
const usedEmbedding = rows.length > 0 && rows.some(r => r.lexical_fallback === false);
const recall_results = rows.map(r => ({
  memory_id: r.id,
  content: r.content,
  memory_type: r.memory_type,
  tier: r.tier,
  status: r.status,
  category: r.category,
  similarity: r.similarity === undefined ? null : r.similarity,
  created_at: r.created_at
}));
const followup_requests = lexicalFallback
  ? [{ type: 'generate_embedding', target: 'search_memory', query: step.inputs.query }]
  : [];
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  execution_context_id: env.execution_context_id,
  thread_id: env.thread_id,
  tenant_id: env.tenant_id,
  module_result: {
    module_name: 'memory_module',
    step_id: step.step_id,
    result_type: 'analysis',
    status: lexicalFallback ? 'partial' : 'success',
    summary: lexicalFallback ? 'Memory search degraded to lexical fallback (embedding missing).' : 'Memory search completed.',
    observations: [],
    proposals: [],
    actions_executed: [{ action: 'search_memory', details: {
      query: step.inputs.query,
      used_embedding: usedEmbedding,
      recall_results
    }}],
    artifacts: [],
    confidence: 1.0,
    needs_followup: followup_requests.length > 0,
    followup_requests
  },
  module_execution_started: true,
  domain_writes_performed: false,
  response_generation_allowed: false
}}];
```

## Smoke oracle (post-rollout)

Three runs against live, shared execution_context `d4f82a41-01cd-4fb7-9d70-573557348e74`, step ids `mem-smoke-v2f1:patchA-{s2a,s2b,s2c}`:

1. **s2a** — query = `Smoke V2 F1` (ILIKE match against S1's `Smoke V2 F1 — store path anchor.`).
   - Expect: 1 row, `lexical_fallback=true`, `used_embedding=false`, `status=partial`, `summary = "…lexical fallback…"`.
2. **s2b** — query = `zzz_no_match_zzz` (no content contains this).
   - Expect: 0 rows, `used_embedding=false`, `status=success`, `recall_results=[]` (no fabricated row).
3. **s2c** — same as s2a (re-run). Sanity / idempotency of search envelope.

No DB delta expected from any of the three (search is read-only).

## Audit trail target

- Pre-patch versionId (to be captured at GET): `da6d2573-ed85-4f1f-8c54-693364f9a432` (current live post-v1-rollout).
- `apply_evidence_patchA_{ts}.md` will record new versionId + before/after hashes + verify outcome.

## DIVERGENCE entry

Logged separately in `docs/architecture/memory/DIVERGENCE_REGISTER_MEMORY.md` as D-M-010 (bug remediation, same-node, code-only — no authority conflict).
