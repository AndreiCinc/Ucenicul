# F6A Apply Evidence — 2026-04-23

Mission: `F6A-STORE-PATH-EMBEDDING-PRODUCER`
Target workflow: `WF-ME-01 Module Execution` (id `uq26nh1grIpnHju0`).
Channel: **autonomous agent-run local `n8n-patch` pack (V2-028 canonical, 2026-04-23)**. The prior reference to V2-025 operator-run CLI on this document is retained below only as historical hand-off framing; actual Phase 6 apply was run by the agent under V2-028.

This document is append-only. Pre-state is filled by the agent before Phase 6. Post-state is filled by the agent after the **agent runs the apply command from the sandbox** (V2-028).

---

## Pre-state (captured 2026-04-23 by agent, before apply)

### Source of evidence
- Read-only MCP `mcp__n8n__get_workflow` on id `uq26nh1grIpnHju0` (captured earlier in session at 2026-04-23; raw result saved under the session's tool-results directory).
- Read-only MCP `mcp__n8n__verify_workflow` on id `uq26nh1grIpnHju0` with the asserted baseline shape.

### Baseline shape (asserted and confirmed)

| Field | Expected | Observed | Pass |
|---|---|---|---|
| `id` | `uq26nh1grIpnHju0` | `uq26nh1grIpnHju0` | Y |
| `name` | `WF-ME-01 Module Execution` | `WF-ME-01 Module Execution` | Y |
| `versionId` | `96962424-a9b1-4b7d-aa58-33ccc9c2b6a6` | `96962424-a9b1-4b7d-aa58-33ccc9c2b6a6` | Y |
| `active` | `true` | `true` | Y |
| `nodeCount` | `45` | `45` | Y |
| `connectionCount` | `63` | `63` | Y |
| `updatedAt` | ≤ 2026-04-23 | `2026-04-22T20:34:16.289Z` | Y |

### Spot-check node-field assertions

| Path | Expected | Observed | Pass |
|---|---|---|---|
| `ME_Memory_Store_DB.parameters.query` | 13-bind `INSERT INTO public.memory_items` with no `embedding` column in the list (verbatim 13-column form) | matches verbatim | Y |
| `ME_Memory_Search_Embed.parameters.nodeCredentialType` | `openAiApi` | `openAiApi` | Y |

The `verify_workflow` MCP returned `allPass: true` for all four assertions above. The `ME_Memory_Store_DB.parameters.query` equality check is itself proof that the store-path DB node has not yet received the F6A INSERT. If this check had returned `pass: false`, F6A would already be partially landed and apply must halt.

### Required patch-surface nodes are present (pre)

| Node | Present? | Role at apply |
|---|---|---|
| `ME_Memory_Store_Prep` | Y | upstream source of `__db.content`; edge to `ME_Memory_Store_DB` will be rewired |
| `ME_Memory_Store_DB` | Y | target of SQL modification |
| `ME_Memory_Search_Embed` | Y | reference template for new `ME_Memory_Store_Embed` |
| `ME_Memory_Search_Embed_Merge` | Y | reference template for new `ME_Memory_Store_Embed_Merge` |

### Forbidden-new-name check (pre)

| Node name | Must be absent? | Absent? |
|---|---|---|
| `ME_Memory_Store_Embed` | yes (introduced by F6A) | Y |
| `ME_Memory_Store_Embed_Merge` | yes (introduced by F6A) | Y |

If either had been present, F6A would already be at least partially applied, and apply must halt for triage.

### Artefact hashes (pre)

| File | sha256 |
|---|---|
| `artifacts/WF-ME-01_pre_f6a.json` | `71a8c903584a1f0fac170a8ebce8daf1227f7a62c4f2ce0e47f2536216107c57` |
| `artifacts/WF-ME-01_post_f6a.json` | `8e775d5a5a982cd5b069b604a877dc52498f4e5224f0218d71eebab33c67624f` |

Both hashes were emitted by the deterministic builder `build_patch_f6a.mjs` during this session, 2026-04-23. Re-running the builder on the same pre snapshot reproduces byte-identical outputs (determinism-check ran twice; stdout identical).

### Builder self-checks (pre)

All 10 `BUILD-INV-*` invariants passed inside the builder itself. The builder exits non-zero if any invariant fails, so the existence of `WF-ME-01_post_f6a.json` with the recorded sha256 is proof of all ten passing:

- BUILD-INV-1 only three named nodes appear in the diff (2 added, 1 modified).
- BUILD-INV-2 only the four expected connection edits appear.
- BUILD-INV-3 Store_Embed mirrors Search_Embed except for the jsonBody input field (input `$json.__db.content`).
- BUILD-INV-4 Store_Embed_Merge reads Store_Prep, emits `__db.embedding_text`, guards 1536-dim.
- BUILD-INV-5 SQL column list ends with `idempotency_key, embedding`; CASE guard present on `$14`.
- BUILD-INV-6 queryReplacement has 14 elements happy-path and 14 nulls error-path; 14th is `$json.__db.embedding_text`.
- BUILD-INV-7 no credential changes anywhere; Store_Embed uses the shared OpenAI credential `svM62oyFwPbaIeX4` (reused from Search_Embed).
- BUILD-INV-8 positions unchanged on all untouched nodes; Store_DB shifted by exactly one column (visual-only; `[3008,1040] → [3128,1040]`) to avoid overlap with new Merge at `[3008,1040]`.
- BUILD-INV-9 workflow-level metadata (`name`, `settings`, `staticData`, `pinData`, `meta`, `triggerCount`, `tags`) byte-identical to pre.
- BUILD-INV-10 `active` preserved (`true`).

### Pre-state verdict

GREEN. Baseline matches the snapshot the post payload was built against. Hand off to operator for Phase 6 apply. No ambiguity.

---

## Post-state (filled by agent 2026-04-23 after V2-028 agent-run apply)

### Apply execution

| Field | Value |
|---|---|
| Commanded by | Agent (V2-028 — autonomous agent-run local `n8n-patch` pack) |
| Command | `node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs replace uq26nh1grIpnHju0 docs/architecture/memory/v2/f6a/artifacts/WF-ME-01_post_f6a.json` |
| CLI exit code | `0` |
| CLI stdout | `{ "id": "uq26nh1grIpnHju0", "name": "WF-ME-01 Module Execution" }` |
| CLI audit log line (verbatim tail) | `{"ts":"2026-04-23T12:01:42.753Z","op":"replace","id":"uq26nh1grIpnHju0","name":"WF-ME-01 Module Execution","before_hash":"959111fc0f55","after_hash":"df1a3ac1da72","before_snapshot":".../snapshots/uq26nh1grIpnHju0_before_2026-04-23T12-01-41-297Z.json","after_snapshot":".../snapshots/uq26nh1grIpnHju0_after_2026-04-23T12-01-42-678Z.json"}` |
| Timestamp (agent clock) | 2026-04-23T12:01:42.753Z |

### New live shape (post)

| Field | Expected after apply | Observed | Pass |
|---|---|---|---|
| `versionId` | ≠ `96962424-a9b1-4b7d-aa58-33ccc9c2b6a6` | `c07fe923-76eb-4901-b53b-14039536df55` | Y |
| `active` | `true` | `true` | Y |
| `nodeCount` | `47` | `47` | Y |
| `connectionCount` | `65` | `65` | Y |
| `updatedAt` | ≥ 2026-04-23T12:01Z | `2026-04-23T12:01:40.209Z` | Y |

### Diff-surface invariants re-checked on live (post)

The 10 invariants from `F6A_DESIGN_FREEZE.md §Diff surface invariants` were re-checked one-by-one with live evidence:

1. DS-INV-1 — exactly two new nodes `ME_Memory_Store_Embed`, `ME_Memory_Store_Embed_Merge`. **PASS** (live nodeCount 47 = baseline 45 + 2; both new names present per `get_workflow` node list).
2. DS-INV-2 — exactly one modified node `ME_Memory_Store_DB`. **PASS** (44-node sort_by(.name) hash of all nodes excluding the three store-lane diff-surface nodes matches pre-snapshot byte-exactly: sha256 `b29acb6e0c08e30d48b7fb6475db20a24ca1ed643f3ef4696c256c5314ef4222`).
3. DS-INV-3 — exactly four connection edits (remove Store_Prep→Store_DB; add Store_Prep→Store_Embed, Store_Embed→Store_Embed_Merge, Store_Embed_Merge→Store_DB). **PASS** (connections outside the three store-lane origin keys hash-match pre-snapshot: sha256 `cad0d03aecb2c0ec88f3b961887ad9491732f88b711e707ffc590d8381f3b758`; connection count 63→65 net).
4. DS-INV-4 — `ME_Memory_Store_Embed.parameters` matches Search_Embed except `jsonBody` (`content` vs `query_text`). **PASS** (`verify_workflow` confirmed `url`, `nodeCredentialType`, and `jsonBody=…input: $json.__db.content}…` byte-exact; `onError="continueRegularOutput"` at top level confirmed via `get_workflow`).
5. DS-INV-5 — `ME_Memory_Store_Embed_Merge.parameters.jsCode` matches design freeze. **PASS** (live jsCode sha256 `4f546fe2f711dea9da6723c9c03bcab7b4b60e6b849bd27bcf5c6b94bab022bc` = staged payload jsCode sha256).
6. DS-INV-6 — SQL column list ends with `idempotency_key, embedding`. **PASS** (live SQL contains `idempotency_key, embedding\n  )` — n8n server-side collapsed the authored `idempotency_key,\n    embedding\n  )` whitespace to single-line `idempotency_key, embedding\n  )`; semantics byte-equivalent).
7. DS-INV-7 — SQL has `CASE WHEN $14::text IS NULL THEN NULL ELSE $14::vector(1536) END`. **PASS** (literal substring present in live SQL).
8. DS-INV-8 — `queryReplacement` has 14 happy-path refs and 14 error-path nulls. **PASS** (`verify_workflow` equals check byte-exact against 14-element design).
9. DS-INV-9 — credentials unchanged workflow-wide. **PASS** (untouched-nodes hash match in DS-INV-2; `ME_Memory_Store_Embed.credentials.openAiApi.id=svM62oyFwPbaIeX4` reuses the existing credential).
10. DS-INV-10 — `active=true`, `settings`/`staticData`/`pinData`/`meta` unchanged. **PASS** (live `settings={binaryMode:"separate",callerPolicy:"workflowsFromSameOwner",availableInMCP:true,executionOrder:"v1"}`, `staticData=null`, `pinData={}`, `meta={templateCredsSetupCompleted:true}`, `triggerCount=1`, `tags=[]` — all byte-identical to pre).

Store_DB position shift asserted: live `ME_Memory_Store_DB.position=[3128,1040]` (was `[3008,1040]` pre) — one column to the right, matching BUILD-INV-8 / design-freeze §Q5.

### Non-semantic whitespace note

The n8n server normalizes SQL whitespace on write. The authored post payload had `idempotency_key,\n    embedding` on two lines; live comes back as `idempotency_key, embedding` on one line. This is the same normalization observed on previous F2 / V2-014 applies and is strictly presentation — the CASE guard, the `vector(1536)` cast, the 14-parameter binding, and the UNION ALL branch are all byte-preserved. Classified as non-regression; no action required.

### Ivfflat index baseline (DB-INV-7 pre-Phase-8 capture)

```sql
indexname | idx_memory_items_embedding_cos
indexdef  | CREATE INDEX idx_memory_items_embedding_cos ON public.memory_items USING ivfflat (embedding vector_cosine_ops) WITH (lists='100') WHERE ((embedding IS NOT NULL) AND (status = 'active'::memory_status_enum))
```

Unchanged from pre-F6A. Will be re-checked in Phase 8 DB verification pack.

### Non-mutation baseline (DB-INV-6 pre-Phase-8 capture)

`MAX(updated_at)` across all rows outside `mem-smoke-v2f6a-*` namespace at Phase 6 close: `2026-04-22T21:05:14.380Z`.

### Post-state verdict

**GREEN.** All 10 diff-surface invariants PASS; new `versionId=c07fe923-76eb-4901-b53b-14039536df55`; 47/65/active; untouched-node and untouched-connection hashes match pre-snapshot byte-exactly. Proceed to Phase 7 local matrix.

---

## Notes

- This document is filled from the Pre-state down. Post-state is expected to be filled in the same session only if the operator runs the apply command in that session. Otherwise, the next session picks up from §Post-state.
- The operator does **not** edit this file. The agent records both sides of the Phase 6 hand-off here.
