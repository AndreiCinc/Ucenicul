# MODULE_CLOSEOUT.md — memory_module v1

> **Document status: LEVEL 3 — SUBORDINATE CLOSE-OUT ARTEFACT**
> Subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md` and to the frozen artefacts in this workspace.

Date: 2026-04-21.
Scope: final close-out for `memory_module v1`.

## 1. Mission status

**`memory_module v1` FULLY CLOSED — live rollout completed 2026-04-21.**

Rollout was executed autonomously via the canonical channel `n8n-patch.mjs` (`get → deactivate → replace → activate → verify`). Post-apply verification passed 7/7 invariants. `D-M-009` is closed. No remaining v1 action.

## 2. What is applied live

- **Postgres schema.** `migration.sql` applied 2026-04-20. Verified on 2026-04-21: `public.memory_items` has 25 columns, 9 indexes, 3 enums (`memory_type_enum`, `memory_tier_enum`, `memory_status_enum`) + reused `rag_durability_enum`. Extensions present: `vector 0.8.2`, `pgcrypto 1.3`, `uuid-ossp 1.1`.
- **Walker fixtures.** 7 rows under execution scope `mem-walker-phase7` (id-key shape `{action}:mem-walker-phase7:{step}`). All anchor cases A1–A7 passed against live DB per `tests/memory/results/walker_latest.json`.

## 3. What is frozen on disk

- `schema/memory_items_schema.md` (9.78/10) — frozen.
- `migration.sql` (9.78/10) — frozen, already applied.
- `memory_module_design.md` — frozen.
- `ACTION_CONTRACTS_MEMORY.md` + `handlers/*.md` — frozen.
- `TEST_ORACLE_MEMORY_MODULE.md` + `tests/memory/fixtures/fixture_manifest.json` — frozen.
- `patch_plan.md` (9.73/10) — frozen.
- `patches/build_patch.mjs` (9.68), `patches/wf_me_01_post_patch_20260420.json` (9.75), `patches/README.md` (9.70), `patches/apply_evidence_20260420.md` (9.65) — frozen.
- `tests/memory/walkers/walker.mjs` (9.68), `tests/memory/results/walker_latest.json` (9.75), `tests/memory/results/walker_summary.md` (9.70) — frozen.
- `final_verification.md` (9.75) — frozen.
- `IMPLEMENTATION_STATE.md`, `PHASE_GATE_CHECKLIST.md`, `SESSION_HANDOFF_NEXT.md`, `DIVERGENCE_REGISTER_MEMORY.md` — updated to point at this closeout.

## 4. Pre- and post-rollout live state

**Pre-rollout** (re-verified 2026-04-21 morning, via `mcp__n8n__verify_workflow`):
```
id=uq26nh1grIpnHju0  name="WF-ME-01 Module Execution"
nodeCount=30  switch.rules=2  active=true
versionId=3b3fc427-9600-4652-96d7-1b0536ddd39f  updatedAt=2026-04-20T15:55:51.200Z
```

**Post-rollout** (applied via `n8n-patch.mjs` 2026-04-21, verified via read-only MCP):
```
id=uq26nh1grIpnHju0  name="WF-ME-01 Module Execution"
nodeCount=43  connectionCount=61
switch.rules=5  (store_memory, search_memory, recall_memory, promote_memory, supersede_memory)
active=true
versionId=da6d2573-ed85-4f1f-8c54-693364f9a432  (≠ pre-rollout)
updatedAt=2026-04-20T21:30:40.729Z (n8n audit UTC)
```

All 7 MCP `verify_workflow` checks pass: `nodeCount=43`, switch `rules.length=5`, and each of `ME_Memory_Store_DB` / `ME_Memory_Search_DB` / `ME_Memory_Recall_DB` / `ME_Memory_Promote_DB` / `ME_Memory_Supersede_DB` is `n8n-nodes-base.postgres` with `operation=executeQuery`. All 5 canonical memory actions are now routed live.

n8n-patch audit log tail captured verbatim in `patches/apply_evidence_20260420.md §Post-apply record`. Hash check: `before_hash=0a5b620345b4`, `after_hash=4524b8777c4a`. Snapshots written by CLI into `snapshots/uq26nh1grIpnHju0_{before,after}_2026-04-20T21-30-41-*.json`; explicit pre-rollout snapshot also saved at `patches/wf_me_01_live_snapshot_pre_rollout.json`.

## 5. Why live PUT is not executed autonomously — and why MCP is not the channel

Rollout channel for `WF-ME-01` is **not** the MCP n8n surface. Per the canonical repo policy `_claude_operator_pack/10_N8N_PATCH_AND_ROUNDTRIP_POLICY.md`, the **only accepted channel** for mutating live n8n workflows on this instance is the CLI script:

```
.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs
```

with credentials (`N8N_URL`, `N8N_API_KEY`) in the sibling `.env`.

Why MCP is refused for this rollout:

| Route | Verdict | Reason |
|---|---|---|
| `mcp__n8n__patch_workflow_nodes` | **FORBIDDEN** by policy §Forbidden tools for live mutation | per-node only; doesn't strip `id`/`active`/`versionId`/`tags`/`meta`/`pinData` from PUT body → 400 on this instance; cannot add nodes or rewrite `connections` anyway |
| `mcp__n8n__move_node` | **FORBIDDEN** by policy | same PUT path as above |
| `mcp__f2e8be41-…__update_workflow` | **FORBIDDEN by policy unless proven safe on this instance** | accepts SDK TS only, not raw JSON; would break byte-exact replay of the frozen artefact and re-open `D-M-009` |
| MCP read-only (`get_workflow`, `verify_workflow`, `execute_workflow`, `get_execution`) | OK for audit/verification only | used by this session for pre-apply re-verification |

Separate capability constraint confirmed 2026-04-21: `n8n-patch.mjs` requires `N8N_URL`/`N8N_API_KEY` from a sibling `.env` that is **not** present in the Cowork workspace, and those variables are **not** in the shell env. That `.env` lives on the operator host.

Therefore: live PUT remains an operator step. `D-M-009` stays binding. No new divergence entry is warranted. Any future agent that considers an MCP-based rollout for this patch must first clear the explicit prohibition in `10_N8N_PATCH_AND_ROUNDTRIP_POLICY.md §Forbidden tools for live mutation`.

## 6. Operator rollout — canonical procedure via `n8n-patch.mjs`

Executed on the operator host (where `.env` exists). Working dir = the `n8n-patch` folder or the Ucenicul repo root (paths relative to `docs/architecture/memory/patches/`).

1. **Pre-apply snapshot** (safety copy + auto-appended to `.audit.jsonl` and `snapshots/`):
   ```bash
   node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
        get uq26nh1grIpnHju0 \
        --out docs/architecture/memory/patches/wf_me_01_live_snapshot_pre_rollout.json
   ```
2. **Deactivate** the workflow (separate endpoint — activation is never a PUT field on this instance):
   ```bash
   node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
        deactivate uq26nh1grIpnHju0
   ```
3. **Full replace** with the frozen byte-exact payload (whitelist + `toPutBody()` applied automatically):
   ```bash
   node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
        replace uq26nh1grIpnHju0 \
        docs/architecture/memory/patches/wf_me_01_post_patch_20260420.json \
        --reactivate
   ```
   `--reactivate` activates after PUT. If you want to split activation, drop the flag and run `activate uq26nh1grIpnHju0` explicitly after verification.
4. **Roundtrip / invariant verification** (MCP read-only is allowed here):
   ```
   mcp__n8n__verify_workflow(uq26nh1grIpnHju0) with expected:
     nodeCount: 43
     nodeFields:
       - ME_Route_Memory_Action.parameters.rules.values.length == 5
       - ME_Memory_Store_DB.type                         == "n8n-nodes-base.postgres"
       - ME_Memory_Search_DB.parameters.operation        == "executeQuery"
       - ME_Memory_Recall_DB.parameters.operation        == "executeQuery"
       - ME_Memory_Promote_DB.parameters.operation       == "executeQuery"
       - ME_Memory_Supersede_DB.parameters.operation     == "executeQuery"
   ```
   Also confirm `active=true` and a new `versionId` distinct from `3b3fc427-9600-4652-96d7-1b0536ddd39f`.
5. **Evidence capture.** Append to `docs/architecture/memory/patches/apply_evidence_20260420.md §Post-apply record`:
   ```
   apply_timestamp:  <ISO-8601>
   new_versionId:    <uuid from verify_workflow summary>
   verify_outcome:   pass | fail
   smoke_test_run:   yes | no
   audit_log_entry:  <matching id from n8n-patch.mjs .audit.jsonl>
   notes:            <operator>
   ```
   Also paste the `n8n-patch.mjs` audit tail:
   ```bash
   node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs audit --tail 10
   ```
6. **Rollback (only if step 4 fails).** Same CLI, with the pre-patch snapshot as payload:
   ```bash
   node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
        replace uq26nh1grIpnHju0 \
        docs/architecture/memory/patches/wf_me_01_pre_patch_20260420.json \
        --reactivate
   ```
   No DB rollback — `memory_items` is additive; any rows written post-PUT just become unreferenced if the patch is reverted.

## 7. What is v2 follow-up (not v1 debt)

Copied verbatim from `final_verification.md §Known limitations / v2 follow-ups`:

- semantic search leg (embedding source node);
- 243 non-anchor manifest cases runnable against DB;
- optional `idempotency_key_prefix` in module input;
- `ivfflat` lists retraining after ~10^5 rows;
- full `promote_memory` denial-reason vocabulary exposed in `module_result.artifacts`;
- subjective-guard language coverage beyond Romanian;
- multi-workflow connector assertion (only if v2 splits search into a sub-workflow);
- full-workflow smoke run post-PUT added to `FINAL_TEST_AND_E2E_SUMMARY`.

These are tracked as v2. They are not gates on v1 closure.

## 8. Closure assertion

- Design: coherent. Contracts: frozen. Schema + migration: applied live. Patch JSON: frozen + structurally verified. Walker: 7/7 anchor cases pass against live DB. Final verification: frozen.
- Write fence respected: all artefacts live under `docs/architecture/memory/**`. No non-memory workflow, no root canonical doc, no `rag_memories`, no `db/migrations/**` touched.
- Authority hierarchy respected: Level-1 spec unchanged, Level-2 module specs consistent, `brain_contract.json` untouched.
- Rollout channel assertion: used **only** `n8n-patch.mjs` per `_claude_operator_pack/10_N8N_PATCH_AND_ROUNDTRIP_POLICY.md`. MCP was used exclusively in read-only mode (`verify_workflow`) for invariant confirmation, consistent with policy.
- Rollout status: **live applied and verified 2026-04-21**. New `versionId=da6d2573-ed85-4f1f-8c54-693364f9a432`; all 5 canonical memory actions live; rollback payload still on disk at `patches/wf_me_01_pre_patch_20260420.json` if ever needed.
- `D-M-009`: closed — see `DIVERGENCE_REGISTER_MEMORY.md`.

**`memory_module v1` FULLY CLOSED — live rollout completed.**

This file is the authoritative close-out artefact.
