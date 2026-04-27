# F3.1 Harness Design

> Purpose-built sidecar harness for F3.1. Not a reuse of `tests/walkers/walker.mjs` (sandbox-unreadable — see `F31_BLOCKER_REGISTER.md F31-BLOCKER-001`).

---

## 1. Principles

- **Node process owns generation, oracle, and summarization.** No MCP or DB calls from Node.
- **The session owns MCP + Postgres calls.** Results flow back into Node via artifact files under `artifacts/runtime/`.
- **Artifact-first.** Every execution writes `exec_{case_id}_{timestamp}.raw.json` before oracle runs. Re-running the oracle on a frozen artifact is cheap and deterministic.
- **Case-level idempotency.** Case ids are stable; `idempotency_key` in workflow inputs is derived from `case_id`, not from a clock.
- **Zero-deletion.** Fixes regenerate; old artifacts stay as history.

## 2. Components

| File | Role |
|---|---|
| `f31_matrix_gen.mjs` | Deterministic generator → `matrix/f31_cases_150.json`. Includes `--check` mode. |
| `f31_runner.mjs` | Emits MCP payload for a single case; consumes the session-produced artifact; writes verdict. |
| `f31_oracle.mjs` | Pure predicates per family — input: `(case, rawResponse, dbState)`; output: `{verdict, reason, bucket}`. |
| `f31_summarize.mjs` | Folds `artifacts/runtime/verdict_*.json` into per-family and total summaries. |

## 3. Interaction model — session drives, harness validates

For each case:

1. **Harness emits payload**: `node f31_runner.mjs emit f31-search-001` prints a JSON blob containing:
   - The MCP `execute_workflow` `inputs` structure for `WF-ME-01`.
   - The pre- and post-execution SQL check queries.
   - Expected oracle shape.
2. **Session calls MCP**: I (Claude) call `mcp__f2e8be41-…__execute_workflow` with the emitted inputs.
3. **Session captures response**: I store the response + the DB checks into `artifacts/runtime/exec_{case_id}_{timestamp}.raw.json`.
4. **Harness applies oracle**: `node f31_runner.mjs verdict exec_{case_id}_{timestamp}.raw.json` reads the artifact, runs `f31_oracle.mjs`, writes `verdict_{case_id}.json` + appends to `family_{family}_index.json`.

This keeps the oracle deterministic and the execution transparent.

## 4. Cross-tenant seeding (edge)

Supersede Block E (4 cases) needs a row under a tenant other than the session tenant. F3.1 creates a single shared anchor row under tenant `bbbbbbbb-0000-0000-0000-000000000001` with a direct SQL `INSERT` before Block E executes:

```sql
INSERT INTO memory_items (
  id, tenant_id, memory_type, category, content, tier, status,
  source_thread_id, entity_id, corroboration_count,
  user_confirmed, evidence_validated, created_at, updated_at
) VALUES (
  '11111111-f31e-f31e-f31e-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
  'fact', 'smoke_store', 'F3.1 cross-tenant anchor',
  'recent', 'active', '77777777-0000-0000-0000-000000000008',
  'eeee0000-0000-0000-0000-000000000009', 1, false, false, now(), now()
) ON CONFLICT (id) DO NOTHING;
```

All 4 cross-tenant cases reuse the same `id` as their target. They never mutate it — the UPDATE under the session tenant scopes it out.

After Block E completes, the anchor can be left in place (it's harmless) or cleaned up with `DELETE FROM memory_items WHERE id = '11111111-f31e-f31e-f31e-000000000001';`.

This is the one documented exception to the rule "workflow is the only writer." It is scoped to Block E and to this single sentinel row.

## 5. Seed pool for promote and supersede

- Each non-missing, non-cross-tenant target case has a matching `*-seed` case in the matrix that runs `store_memory` with the block's preconditions.
- Seed execution is itself a runnable step — the harness emits seed payloads in the same shape as test cases.
- When a promote or supersede case uses `__RESOLVED_FROM_SEED__f31-…-seed`, the runner substitutes the `memory_id` from the seed's raw artifact at payload-emit time.

## 6. Error bucketing at the runner level

When oracle fails, the runner classifies:

- `inputs` or `expected_result_envelope` inconsistent with the action contract → `BAD_TEST_DEFINITION`.
- Response shape mismatch that only affects F3.1 parsing → `BAD_HARNESS`.
- Contract-conformant response but semantically wrong → `RUNTIME_WORKFLOW_BUG`.
- Tool error / timeout / auth failure → `EXTERNAL_BLOCKER`.

Bucket dictates the entry destination (`F31_FIX_LOG.md` vs `F31_BLOCKER_REGISTER.md` + `F31_DISPATCH_LOG.md`).

## 7. Rerun idempotency

Re-running a case is safe as long as:

- The case has no DB-mutating seed (search / recall cases).
- OR the seed is re-runnable under the same `idempotency_key` and the workflow returns the prior row (see F3-SU2 precedent).

For promote cases that already accepted the target (tier now `long_term`), a rerun yields `not_in_recent_tier` — that's the intended replay shape for Block F.
