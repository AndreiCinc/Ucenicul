# Executable Test Pack — F6A-FOLLOWUP-SUPERSEDE-EMBED

This folder turns the test plan into concrete artifacts Claude must use before and after apply.

## Required order

1. Run/complete preflight checks from the operator prompt.
2. Create the candidate Supersede Embed Merge function and run `tests/local/run_merge_unit_tests.mjs`.
3. Build pre/post workflow JSON and run `tests/local/run_workflow_diff_tests.mjs`.
4. Apply only through V2-028 local `n8n-patch.mjs`.
5. Run the live E2E matrix in `tests/live/e2e_matrix_f6a_followup_supersede_embed.json`.
6. Run SELECT-only DB invariant queries from `tests/sql/select_invariants_f6a_followup_supersede_embed.sql`.
7. Write evidence and closeout.

## Non-negotiables

- No Path 5.
- No `mcp__n8n__patch_workflow_nodes` writes.
- No direct Postgres INSERT/UPDATE/DELETE.
- No backfill.
- No ivfflat rebuild.
- No secret exposure.

## Harness contract

The merge unit test harness expects Claude to export a pure function from the candidate merge module:

```js
export default function mergeSupersedeEmbedding(prep, httpResp) {
  // returns either { json: ... } or [{ json: ... }] or plain json
}
```

Claude may generate this pure function from the final n8n Code node jsCode. The n8n node may still use `$()` internally; the harness copy must be pure and semantically equivalent for deterministic unit testing.
