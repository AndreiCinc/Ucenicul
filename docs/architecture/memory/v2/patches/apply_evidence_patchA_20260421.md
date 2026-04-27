# apply_evidence_patchA_20260421.md

Patch: **Patch A — `ME_Memory_Search_Result` bug fixes (BUG-V2-01 + BUG-V2-02)**
Applied: 2026-04-21 (n8n server clock shows 2026-04-20T22:04:36.362Z at PUT time — n8n runs in UTC and the calendar rolled on the client).

## Channel

- Tool: `n8n-patch.mjs patch-node` (canonical rollout channel).
- Command: `node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs patch-node uq26nh1grIpnHju0 ME_Memory_Search_Result --params docs/architecture/memory/v2/patches/artifacts/patchA_params.json`
- Exit: `{ id: "uq26nh1grIpnHju0", name: "WF-ME-01 Module Execution", patched: "ME_Memory_Search_Result", keys: ["jsCode"] }`.
- Snapshot: prepatch GET saved at `artifacts/WF-ME-01_prepatch_A.json`; patched snapshot stored by n8n-patch.mjs audit log.

## Version transition

| Field | Pre-patch | Post-patch |
|---|---|---|
| versionId | `da6d2573-ed85-4f1f-8c54-693364f9a432` | `c4a3b0d1-177e-457e-b710-f22bf78eb240` |
| nodeCount | 43 | 43 |
| connectionCount | 61 | 61 |
| active | `true` | `true` |
| updatedAt | prior | `2026-04-20T22:04:36.362Z` |
| `ME_Memory_Search_Result.parameters.jsCode` length | 1753 | 1857 |

## jsCode delta summary

| Concern | Pre | Post |
|---|---|---|
| Row filter | `$items().map(i => i.json)` — raw items included `{success:true}` placeholder | `.filter(r => r && typeof r.id === 'string')` — placeholder dropped |
| `used_embedding` | `!lexicalFallback && recall_results.length > 0` — logically misreads "no rows" and "lexical used" as "embedding used" | `rows.length > 0 && rows.some(r => r.lexical_fallback === false)` — reads the DB ground-truth marker |
| Status / summary / followup | same logic, but now evaluated against filtered `rows` so zero-hit case emits `success` + empty `recall_results` + no spurious followup | unchanged structurally |

No schema change, no node add/remove/reorder, no connection change.

## Verify (`mcp__n8n__verify_workflow` id=uq26nh1grIpnHju0)

- `nodeCount` = 43 ✓
- `ME_Memory_Search_Result.parameters.jsCode` exactly matches `artifacts/patchA_params.json` ✓ (compared byte-for-byte; the verify tool returned `pass:false` purely because the call passed no `equals:` value — the `got:` payload is the patched code).

## Smoke reruns

Live, active workflow, production executionMode, MCP `execute_workflow` via `chat` trigger (chatInput unwrap).
Shared execution_context row `d4f82a41-01cd-4fb7-9d70-573557348e74`.

| Run | Query | exec id | `used_embedding` | `recall_results` | `status` | Summary | Oracle |
|---|---|---|---|---|---|---|---|
| s2a | `Smoke V2 F1` | 1394 | `false` | 2 (supersede anchor + store anchor) | `partial` | "Memory search degraded to lexical fallback (embedding missing)." | Pass |
| s2b | `zzz_no_match_zzz` | 1403 | `false` | `[]` (empty, placeholder correctly filtered) | `success` | "Memory search completed." | **Pass — BUG-V2-01 fixed** |
| s2c | `Smoke V2 F1` (re-run) | 1412 | `false` | 2 (identical to s2a) | `partial` | same as s2a | Pass (idempotency) |

Each run's raw execution JSON is stored as `artifacts/runtime/exec_s2{a,b,c}_<execId>.json`.

### Pointwise oracle proofs

- **BUG-V2-01** — In s2b, `ME_Memory_Search_DB` emits the n8n Postgres zero-rows placeholder `{"success":true}` (observed in `exec_s2b_1403.json`). Under the pre-patch code that would have landed in `recall_results` as a fabricated row with `memory_id=undefined`. With Patch A the result node's filter (`typeof r.id === 'string'`) drops it; `recall_results` is the empty list `[]`. Verified.
- **BUG-V2-02** — In s2a and s2c, `lexicalFallback=true` across both returned rows; old code would still have set `used_embedding = !lexicalFallback = false` correctly for this case but would have been wrong when rows were absent. Post-patch, `usedEmbedding` is `rows.some(r => r.lexical_fallback === false)` which reads DB ground truth directly. In the zero-hit case (s2b), `rows.length === 0` so `usedEmbedding=false`. Verified.

## DB invariants (post-smoke)

```
SELECT id, content, category, tier, status, updated_at FROM public.memory_items
 WHERE tenant_id='aaaaaaaa-0000-0000-0000-000000000001'
   AND (category LIKE 'smoke_%' OR idempotency_key LIKE 'store_memory:d4f82a41%' OR idempotency_key LIKE 'supersede_memory:d4f82a41%');
```

Returns the same 2 rows (`6ceb9437-…` smoke_supersede, `a0909481-…` smoke_store) with `updated_at` unchanged from pre-patch → confirms search path is read-only.

## Rollback plan

Already captured. To revert, replay `n8n-patch.mjs patch-node uq26nh1grIpnHju0 ME_Memory_Search_Result --params <prev.json>` where `<prev.json>` contains the prepatch `jsCode` (extractable from `artifacts/WF-ME-01_prepatch_A.json`). Rollback is structurally safe: same 43-node graph, same connections.

## Outcome

- BUG-V2-01: **RESOLVED** (placeholder row no longer leaks into `recall_results`).
- BUG-V2-02: **RESOLVED** (`used_embedding` now reflects DB ground truth).
- D-M-010 logged in `DIVERGENCE_REGISTER_MEMORY.md`.
- No authority conflict (same-node code-only patch).
