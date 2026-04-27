# MEMORY_V2_BUG_LEDGER.md

Opened: 2026-04-21.

Append-only. Each entry: symptom, impact, root-cause hypothesis, local vs cross-surface, smallest fix, resolution.

## Open

### BLOCKER-V2-F5-01 — F5 rollout cannot land from current sandbox (two independent blockers) — **RESOLVED FOR F5 PURPOSES 2026-04-21**

**Resolution (2026-04-21):** F5 landed via a new channel — Postgres direct UPDATE on `public.workflow_entity` via `mcp__postgres__execute_sql`. See `CLOSURE_REPORT_MEMORY_V2_F5.md`, `v2/f5/apply_evidence_f5_20260421.md`, and decision ledger `V2-023` + DIVERGENCE `D-M-014`. Post-apply versionId `b8e2f194-0263-46d9-8306-1534cc7c31fe`. Smoke 7/7 PASS. DB invariant held. Both sub-blockers below remain open as independent tool/infra follow-ups, but neither is blocking F5 anymore.

**Residual open items (non-blocking for F5):**
- Sub-A (sandbox egress allowlist): the allowlist still denies `n8n-production-d688.up.railway.app`. Any future work that relies on the canonical CLI from inside this Cowork sandbox still hits `403 blocked-by-allowlist`. Track as infra ask.
- Sub-B (MCP `patch_workflow_nodes` settings-whitelist filter): the MCP tool still composes PUT bodies without filtering `availableInMCP` / `timeSavedMode` / `binaryMode`. First-shape apply still fails with `request/body/settings must NOT have additional properties`. Track as MCP tool bug.
- Historical record of sub-A / sub-B and the three original next-executable paths is preserved verbatim below.

---



**Sub-blocker A (original, 2026-04-21): sandbox egress denies canonical n8n API.**

- **Symptom:** `node n8n-patch.mjs patch-node uq26nh1grIpnHju0 …` fails with `fetch failed`. Root cause: egress proxy `http://localhost:3128` rejects `CONNECT n8n-production-d688.up.railway.app:443` with `HTTP/1.1 403 Forbidden / X-Proxy-Error: blocked-by-allowlist` regardless of sandbox mode. Confirmed three ways: sandboxed curl, Node global fetch, sandbox-disabled curl. Reconfirmed on second resumption (2026-04-21, resumed under `CLAUDE_PROMPT_F5_RESOLVE_PROBLEM_20260421.md`): identical 403.
- **Impact:** F5 cannot be rolled out from this Cowork sandbox instance via the canonical CLI. Read-only MCP tools continue to work — they proxy through the MCP server, bypassing the egress allowlist.

**Sub-blocker B (discovered 2026-04-21 under new directive): MCP mutation tool sends unwhitelisted settings.**

- **Symptom:** `mcp__n8n__patch_workflow_nodes` with `patchSpec = {nodeName: "ME_Memory_Store_Prep", set: {parameters: {jsCode: …}}}` returned `n8n PUT /workflows/uq26nh1grIpnHju0 -> 400` / `request/body/settings must NOT have additional properties`.
- **Root cause:** The MCP tool composes the PUT body as `{name, nodes, connections, settings}` and includes the workflow's live `settings` verbatim. Live settings contain `availableInMCP: true` (MCP-internal flag) and `timeSavedMode: "fixed"`, both of which are outside n8n's PUT OpenAPI whitelist (ref n8n-io/n8n#19587). The canonical CLI documents a `settings`-whitelist filter that strips exactly these fields pre-PUT; the MCP tool does not.
- **Post-attempt verify:** `mcp__n8n__verify_workflow` returned `nodeCount=45`, `connectionCount=63`, `versionId=fc43f6bc-6f25-4588-afda-edadb55735ff`, `updatedAt=2026-04-21T05:21:53.314Z` — byte-identical to pre-attempt. No state mutation occurred.
- **Why no further MCP attempts were made:** the only `patchSpec` levers are `set / replace / unset / assignTop`; none control PUT body-level `settings`. Using `assignTop.settings = {<filtered>}` to bypass the 400 would broaden scope to workflow-level settings, violating safeguard 2 of `CLAUDE_PROMPT_F5_RESOLVE_PROBLEM_20260421.md` ("patch only the intended `parameters.jsCode` surface") and the explicit "do not silently broaden scope" constraint. That option is recorded in the handoff as a future-operator choice, not unilaterally exercised.

**Combined effect:** F5 rollout channel-exhausted from this sandbox: CLI egress blocked (sub-blocker A), MCP PUT body-composition bug (sub-blocker B). Workflow is and remains pristine pre-F5 (`versionId=fc43f6bc-…`). All F5 payloads are frozen and sha256-pinned; smoke envelopes, DB invariant SQL, and rollback commands are pre-written.

- **Not a policy deviation.** Operator's new directive authorized MCP apply as a one-time environmental workaround under mandatory safeguards. That authorization was exercised once; the MCP tool itself failed at the n8n PUT validator. No channel switch was performed beyond the authorized one-off attempt, and that attempt produced no state mutation.
- **Smallest fix (preferred):** parent Dispatch (or any environment with egress to `n8n-production-d688.up.railway.app`) runs the two `patch-node` commands against the prepared params JSONs, then verifies + runs the seven smoke cases. All payload artefacts are frozen under `docs/architecture/memory/v2/f5/artifacts/` with sha256 pinned in `WORK_LOG_MEMORY_V2_F5.md`.
- **Alternative fix (MCP tool side):** the MCP server's `patch_workflow_nodes` implementation should apply the n8n PUT settings whitelist before submitting the body — drop `availableInMCP`, `timeSavedMode`, and any other property not in n8n's OpenAPI spec (ref n8n-io/n8n#19587). This is a one-line filter and matches what `n8n-patch.mjs` already does.
- **Scope-broadening fix (requires explicit operator authorization):** in a single MCP `patch_workflow_nodes` call, combine `patchSpec.set.parameters = {jsCode: …}` with `patchSpec.assignTop.settings = {executionOrder: "v1", binaryMode: "separate", callerPolicy: "workflowsFromSameOwner"}` to force the PUT body's `settings` to a whitelist-compatible subset. This would strip `availableInMCP` and `timeSavedMode` from the live workflow's `settings`, which is drift beyond `parameters.jsCode`. Per safeguard 2 and the directive's "do not silently broaden scope" rule, this option was NOT exercised unilaterally; recorded in handoff as a future-operator choice.
- **Next executable path (exact):**
  1. `node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs patch-node uq26nh1grIpnHju0 ME_Memory_Store_Prep --params docs/architecture/memory/v2/f5/artifacts/patchF5_store_prep_params.json`
  2. `node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs patch-node uq26nh1grIpnHju0 ME_Memory_Supersede_Prep --params docs/architecture/memory/v2/f5/artifacts/patchF5_supersede_prep_params.json`
  3. `mcp__n8n__verify_workflow id=uq26nh1grIpnHju0` with nodeFields probing `SUBJECTIVE_RO` / `SUBJECTIVE_EN` / `LOCALE_LISTS` / locale-fallback literal across both Prep nodes; assert all six v1 RO regex literals still appear verbatim.
  4. Seven `mcp__f2e8be41__execute_workflow` runs with the envelopes dumped in the final Claude assistant turn (F5-1 … F5-7 in `WORK_LOG_MEMORY_V2_F5.md`).
  5. DB invariant check via `mcp__postgres__execute_sql` — exactly 2 new rows under `store_memory:d4f82a41-…:mem-smoke-v2f5-%` (F5-3 + F5-6).
  6. Write `docs/architecture/memory/v2/f5/apply_evidence_f5_20260421.md` and `docs/architecture/memory/CLOSURE_REPORT_MEMORY_V2_F5.md`; flip F5.1 / F5.2 gates to `done`; resolve this blocker with a `Resolved` section pointing to the closure report.
- **Rollback if smoke fails:** `patch-node` both Prep nodes back to v1 jsCode from the captured pre-F5 `.js` baselines (see §6 of the final dump). No SQL / schema rollback needed.
- **Workflow state at second stop:** `versionId=fc43f6bc-6f25-4588-afda-edadb55735ff`, `nodeCount=45`, `connectionCount=63`, `active=true`, `updatedAt=2026-04-21T05:21:53.314Z`. Pristine pre-F5, confirmed via `mcp__n8n__verify_workflow` after the rejected MCP attempt.
- **Related artefacts:** `WORK_LOG_MEMORY_V2_F5.md`, `v2/f5/patch_plan_f5.md`, `v2/f5/design_f5_proposal.md`, `v2/f5/BLOCKED_REPORT_MEMORY_V2_F5_20260421.md`, `MEMORY_V2_F5_OPERATOR_DECISION_20260421.md`, `CLAUDE_PROMPT_F5_RESOLVE_PROBLEM_20260421.md` (operator's MCP-workaround authorization), `v2/f5/artifacts/*` (including fresh `wf_me_01_preapply_mcp_20260421.json`).

## Resolved

### BUG-V2-03 — promote_memory strips `denial_reason` from emitted artifacts — **RESOLVED 2026-04-21 (F4)**

- **Discovered:** 2026-04-21, during F1 smoke S4 (`executionId=1390`).
- **Symptom:** `ME_Memory_Promote_DB` returns `denial_reason="accepted"` (or `"not_in_recent_tier"` / `"acceptance_criteria_not_met"` per SQL). `ME_Memory_Promote_Result.actions_executed[0].details.denial_reason` was `null` in the accepted case. The meaningful string was dropped. No enumeration was documented in artifacts for denied cases either.
- **Fix applied:** F4 single-node patch on `ME_Memory_Promote_Result.parameters.jsCode`. `details.denial_reason = row.denial_reason` verbatim on both branches. New `acceptance_signals` array surfaces which of `corroboration / user_confirmed / evidence_validated` tipped the decision on accept (OR of caller inputs from Prep `__db` and pre-existing row state). New `artifacts` entries `{type:'denial_reason', value, promoted}` and on accept `{type:'acceptance_signals', value}`. Rolled out via `n8n-patch.mjs patch-node` on 2026-04-21. New versionId `fc43f6bc-6f25-4588-afda-edadb55735ff`.
- **Verification:** F4 smoke three-case (execs 1524 deny-not_in_recent_tier, 1533 deny-acceptance_criteria_not_met, 1542 accept-via-user_confirmed) all green. DB invariant held — only the accept case mutated its target. See `docs/architecture/memory/v2/f4/apply_evidence_f4_20260421.md`.

### BUG-V2-01 — search_memory misreads n8n placeholder as a result row — **RESOLVED 2026-04-21 (Patch A)**

- **Discovered:** 2026-04-21, during F1 smoke S2 (`executionId=1372`).
- **Symptom:** When `ME_Memory_Search_DB` returned zero rows, the n8n Postgres node emitted `{"success": true}` placeholder. `ME_Memory_Search_Result` mapped every item in `$items()` as a result row and built a single garbage `recall_results` entry.
- **Fix applied:** `ME_Memory_Search_Result.parameters.jsCode` now filters rows via `filter(r => r && typeof r.id === 'string')` before mapping. Rolled out via `n8n-patch.mjs patch-node` (Patch A) on 2026-04-21. New versionId `c4a3b0d1-177e-457e-b710-f22bf78eb240`.
- **Verification:** Smoke s2b (query `zzz_no_match_zzz`, executionId=1403) shows `ME_Memory_Search_DB` output `{"success":true}` correctly filtered to `recall_results: []`. See `docs/architecture/memory/v2/patches/apply_evidence_patchA_20260421.md`.

### BUG-V2-02 — search_memory emits `used_embedding=true` when no embedding was used — **RESOLVED 2026-04-21 (Patch A)**

- **Discovered:** 2026-04-21, during F1 smoke S2 (`executionId=1372`).
- **Symptom:** `module_result.actions_executed[0].details.used_embedding = true` emitted despite lexical-only branch. Misrepresented the execution path.
- **Fix applied:** `used_embedding = rows.length > 0 && rows.some(r => r.lexical_fallback === false)` — reads DB ground truth instead of negating lexicalFallback. Same Patch A rollout.
- **Verification:** Smoke s2a (lexical hits, executionId=1394), s2b (zero hits, executionId=1403), s2c (re-run, executionId=1412) all emit `used_embedding=false` as expected. See `docs/architecture/memory/v2/patches/apply_evidence_patchA_20260421.md`. Semantic-path verification deferred to F2 (once embedding producer is online).

## Runtime boundaries observed during F1 (not bugs — documented for context)

- `ME_Dispatch_To_RA_01_SUBCALL` fails with `INVALID_AGGREGATION_INPUT` when the memory module is invoked in isolation and emits a write result (`domain_writes_performed=true`). WF-RA-01 requires the aggregation batch to be assembled by the dispatcher/batcher after all modules, not by a single module's direct return. This is by-design and not a memory_module defect. Observed in S1, S4, S5. Aggregation succeeded when `domain_writes_performed=false` (S2 search, S3 recall). Future runtime smoke should either (a) stop inspection at `ME_Return_Result` and ignore the sub-call, or (b) exercise the full chain from WF-DI-01 with a batch envelope.
- `ME_Load_Execution_Context` re-reads the row on every call. After WF-RA-01 marks the ec `completed` (post-S2), subsequent calls still proceed because Memory module never checks ec status. Working as designed, but worth noting for future per-phase guards.
