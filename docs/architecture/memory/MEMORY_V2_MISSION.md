# MEMORY_V2_MISSION.md

> **Document status: LEVEL 3 — SUBORDINATE MISSION CONTRACT (memory_module v2)**
> Subordinate to `Architecture_Spec_v3_Ucenicul.md` (Level 1) and to the frozen v1 closeout (`MODULE_CLOSEOUT.md`).

Mission opened: 2026-04-21.
Predecessor: `memory_module v1` — FULLY CLOSED; live rollout completed on `WF-ME-01` at `versionId=da6d2573-ed85-4f1f-8c54-693364f9a432`.

## Scope — v2 frontiers (from `final_verification.md §Known limitations / v2 follow-ups`)

Ordered by impact / risk:

1. **F1 — full-workflow smoke runtime** for all 5 canonical actions against live `WF-ME-01`. Walker proved SQL-layer behaviour; v2 F1 proves the live workflow chain `Route → *_Prep → *_DB → *_Result → ME_Return_Result`.
2. **F2 — semantic search leg** for `search_memory`: add an embedding producer (prep-layer HTTP or external node) so the semantic CTE runs with a real `q_vec`; walker exercised only the lexical fallback.
3. **F3 — 243 non-anchor manifest cases** from `tests/memory/fixtures/fixture_manifest.json` expanded deterministically from `(action, family, index)` tuples and run live with family roll-up (walker already exports `manifestRollup()`).
4. **F4 — `promote_memory` denial-reason vocabulary** exposed in `module_result.artifacts` (`insufficient_corroboration`, `already_long_term`, `status_guard`, …).
5. **F5 — subjective-guard multi-language**: RO guard is v1. v2 adds language detection and per-language token lists.
6. **F6 — remaining** v2 items (`idempotency_key_prefix` input nicety, `ivfflat` retrain policy, multi-workflow connector-assertion rule) — only after F1–F4 stabilised.

## Write fence (v2)

Allowed:
- `docs/architecture/memory/v2/**` (new subtree for v2-only artefacts; if not yet created, may be created as needed)
- `docs/architecture/memory/tests/memory/**` (fixtures, results, walkers — additive only; do not rewrite v1 frozen walker)
- `docs/architecture/memory/MEMORY_V2_*.md` (control docs at memory root, co-located with v1 for cross-linking)
- additive patches on `WF-ME-01` ONLY when an authorised mission requires it; canonical channel is `n8n-patch.mjs`, run as the **autonomous agent-run local `n8n-patch` pack** (`docs/architecture/memory/v2/ops/protocol_agent_run_local_patch.md`, per `V2-028` — supersedes V2-025 operator-run CLI on the apply-ownership clause; the operator-run CLI protocol is retained at `protocol_operator_run_cli.md` as audit-trail record only); any node addition requires a new DIVERGENCE entry + new patch plan artefacts

Forbidden:
- modifying any v1 frozen artefact without a new DIVERGENCE entry (`MEMORY_V2_DECISION_LEDGER.md` or extension of v1 `DIVERGENCE_REGISTER_MEMORY.md`)
- touching non-memory workflows, root canonical docs, `rag_memories`, `db/migrations/**`, or `brain_contract.json`
- MCP-based n8n mutation (forbidden by `_claude_operator_pack/10_N8N_PATCH_AND_ROUNDTRIP_POLICY.md`); MCP read-only + `execute_workflow` + `get_execution` remain allowed

## Roles (used explicitly during v2)

- `state-reader` — read minimum context from frozen artefacts + state docs.
- `memory-v2-architect` — design decisions for v2 paths.
- `n8n-runtime-tester` — drive live executions via `execute_workflow` + `get_execution`.
- `postgres-architect` — DB-side extensions, indexes, any DML / DDL.
- `embedding-path-architect` — design and wire the embedding producer for F2.
- `test-architect` — oracle extensions, fixture expansion, walker deltas.
- `state-keeper` — update `MEMORY_V2_STATE.md` + `MEMORY_V2_PHASE_GATES.md` each phase.
- `review-critic` — score each artefact on authority / coherence / completeness / implementability; demand redo if total < 9.6/10.

## Freeze-gate convention

Same rule as v1: no advancement without updating the state file + checking bug ledger + confirming no authority conflict. Phase-gate rows live in `MEMORY_V2_PHASE_GATES.md`.

## Close-out convention

When a v2 frontier is fully closed, produce a pointer in `MEMORY_V2_CLOSEOUT.md` (one per closed frontier). v2 mission overall remains open until user declares it closed or F1–F4 all land.

## Rollout channel (post-F5)

Canonical rollout for structural patches on `WF-ME-01` is the **autonomous agent-run local `n8n-patch` pack**, frozen in `docs/architecture/memory/v2/ops/protocol_agent_run_local_patch.md` (per `V2-028` in `MEMORY_V2_DECISION_LEDGER.md`, 2026-04-23). The agent in the Cowork sandbox runs `node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs <replace|patch-node> uq26nh1grIpnHju0 …` directly via `Bash`, using the pack's local `.env` as the credential source; MCP is reserved for read / verify / analysis / smoke / SELECT (`verify_workflow`, `execute_workflow`, `get_execution`, `get_workflow`, `mcp__postgres__execute_sql` SELECT-only). No operator hand-off on the apply step. The prior **operator-run CLI protocol** (`docs/architecture/memory/v2/ops/protocol_operator_run_cli.md`, opened under `V2-025` on 2026-04-21) is **superseded on the apply-ownership clause by V2-028** and retained verbatim as an audit-trail record. It is not the current rule; new work must not invoke it.

**Retired — D-M-014 scoped to F5 only, see V2-025.** Path 5 (Postgres direct UPDATE on `public.workflow_entity` via `mcp__postgres__execute_sql`) is retired as a default rollout channel. It was used once under `D-M-014` for F5 and is not a default for future structural patches; it survives only as the `V2-026` last-resort DB-bypass escape hatch under its 8 strict conditions. MCP `patch_workflow_nodes` writes against WF-ME-01 are also non-canonical until sub-B (settings-whitelist filter) is fixed at the MCP tool level (V2-022).

Future sessions must not infer rollout channel from the decision ledger — the canonical handshake is codified in `v2/ops/protocol_agent_run_local_patch.md` and that file is the entry point. Every new mission still requires an explicit operator directive before any apply is attempted.
