# F6A-FOLLOWUP-SUPERSEDE-EMBED — Testing Strategy

Test layers (oracles are defined in pack artifacts; this doc maps them to execution):

| Layer | Count | Artifacts | Pass criterion |
|---|---|---|---|
| Preflight | 7 (PF-1..PF-7) | none (already executed Phase 0) | all GREEN |
| Merge unit (local) | 9 (MU-1..MU-9) | `tests/local/run_merge_unit_tests.mjs` + `harness/supersede_merge_candidate.mjs` (we generate from design-freeze jsCode) | 9/9 PASS |
| Diff-surface (local) | 14 (WD-1..WD-14 == DS-INV-1..14) | `tests/local/run_workflow_diff_tests.mjs` + `artifacts/WF-ME-01_{pre,post}_f6a_followup.json` | 14/14 PASS |
| Integration-style (local, mocked) | 8 (LI-1..LI-8) | custom mini-harness over builder outputs; merge candidate + mocked DB semantics | 8/8 PASS |
| Live E2E | 6 (E1..E6) | `tests/live/e2e_matrix_f6a_followup_supersede_embed.json` + MCP `execute_workflow` | 6/6 PASS |
| DB invariants | 8 (DB-1..DB-8) | `tests/sql/select_invariants_f6a_followup_supersede_embed.sql` | 8/8 PASS |

**Total oracles:** 52 (7 PF done + 9 MU + 14 WD + 8 LI + 6 E1..E6 + 8 DB).

## Merge candidate generation (Phase 4)

Per `tests/README_TESTS.md`, we export a pure function module:

`harness/supersede_merge_candidate.mjs`:

```js
// Candidate derived from the final Code-node jsCode with $() lookup replaced
// by prep parameter. Semantically equivalent; harness-importable.
export default function mergeSupersedeEmbedding(prep, httpResp) {
  if (prep && prep._error === true) {
    return [{ json: prep }];
  }

  let embeddingText      = prep.__db.embedding_text || null;
  let usedEmbedding      = prep.passthrough && prep.passthrough.used_embedding === true;
  let embeddingAttempted = false;
  let embeddingError     = null;

  if (!embeddingText) {
    embeddingAttempted = true;
    const vec = httpResp
      && httpResp.data
      && Array.isArray(httpResp.data)
      && httpResp.data[0]
      && Array.isArray(httpResp.data[0].embedding)
      ? httpResp.data[0].embedding
      : null;

    if (vec && vec.length === 1536) {
      embeddingText = JSON.stringify(vec);
      usedEmbedding = true;
    } else if (httpResp && httpResp.error) {
      embeddingError = 'embedding_http_error: '
        + (httpResp.error.message || httpResp.error.code || JSON.stringify(httpResp.error));
    } else if (httpResp && typeof httpResp.statusCode === 'number' && httpResp.statusCode >= 400) {
      embeddingError = 'embedding_http_' + httpResp.statusCode;
    } else {
      embeddingError = 'embedding_response_unusable';
    }
  }

  return [{ json: {
    __db: { ...prep.__db, embedding_text: embeddingText },
    passthrough: {
      ...prep.passthrough,
      used_embedding:      usedEmbedding,
      embedding_attempted: embeddingAttempted,
      embedding_error:     embeddingError
    }
  }}];
}
```

Note the match to the final n8n Code node jsCode: only the first 3 lines (`const prep = $('ME_Memory_Supersede_Prep').first().json;` + `if (prep && prep._error === true) { return [{ json: prep }]; }` + `const httpResp = $json;`) are inlined into the pure function signature `(prep, httpResp)`. Every other byte is byte-identical to the jsCode.

This makes the harness copy a strict subset of the live jsCode, so MU-1..MU-9 results apply to the live node.

## Live E2E run plan

Namespace: `mem-smoke-f6a-followup-supersede-embed-<caseid>-<n>`.

- **E1-seed**: `store_memory` with distinctive content (axis-aligned for E3 search).
- **E1-supersede**: `supersede_memory` against E1-seed id with new replacement content.
- **E2-replay**: replay E1-supersede with same `step.step_id`.
- **E3**: `search_memory` by axis-aligned replacement content.
- **E4**: `supersede_memory` against a known-non-active id; expect error.
- **E5**: `store_memory` regression.
- **E6**: `recall_memory` (or `promote_memory`) smoke on unrelated fixture.

Dispatcher envelope: the same shape proven in F6A (`status_kind=success, result_type=dispatch, execution_context_id, thread_id, tenant_id, dispatcher_input:{…, step:{step_id, module_name, purpose, inputs, execution_mode}}`). `execution_mode='execute'` for writeful cases.

## Acceptance gates

- Before Phase 6 apply: PF + MU + WD + LI all GREEN.
- After Phase 6 apply: post-verify (`nodeCount=49`, `connectionCount=67`, `active=true`, versionId advanced, DS-INV-11 byte-identical non-target nodes).
- After Phase 7: E1..E6 all GREEN; DB-1..DB-8 all GREEN.

No partial-success acceptance. If any required oracle fails, the mission stops with BLOCKED or rolls back to the pre snapshot.
