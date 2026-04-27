# AUTHORITY_AND_READ_ORDER.md

> Frozen 2026-04-21. Read-order refreshed 2026-04-24 (post-DOC-SYSTEM-COMPACTION-ROLLOUT-CHANNEL-ALIGNMENT). Authority: subordinate to `MEMORY_V2_MISSION.md` and `CURRENT_TRUTH_POST_F5.md`. Consolidates the read order a fresh autonomous session must follow before taking any action on the memory module.
>
> **Post-V2-028 note:** the current canonical rollout protocol is `docs/architecture/memory/v2/ops/protocol_agent_run_local_patch.md` (autonomous agent-run local `n8n-patch` pack). `protocol_operator_run_cli.md` is historical / audit only and must not be read as the current apply procedure. Writeback procedure is governed by `docs/architecture/memory/v2/stabilization/DOC_WRITEBACK_POLICY.md`. Candidate lists anywhere in the tree are context only, not work queues.

## Purpose

Fix the exact order in which a fresh session reads memory-module documentation so that current truth anchors interpretation of every other document. Without a fixed read order, historical evidence docs (which correctly preserve context from a moment in time) can accidentally outweigh current control docs.

## Authority tiers

### Tier A — Current truth (read first; controls all interpretation)

1. `docs/architecture/memory/v2/stabilization/CURRENT_TRUTH_POST_F5.md` — **single front door for current truth; read before anything else**
2. `docs/architecture/memory/MEMORY_V2_STATE.md`
3. `docs/architecture/memory/v2/stabilization/DOC_WRITEBACK_POLICY.md` — **authority on writeback procedure (where closeouts land)**
4. `docs/architecture/memory/MEMORY_V2_MISSION.md`
5. `docs/architecture/memory/v2/ops/protocol_agent_run_local_patch.md` — **current canonical rollout protocol (V2-028)**
6. `docs/architecture/memory/MEMORY_V2_PHASE_GATES.md`
7. `docs/architecture/memory/MEMORY_V2_DECISION_LEDGER.md`
8. `docs/architecture/memory/CLOSURE_REPORT_MEMORY_V2_F5.md`
9. `docs/architecture/memory/v2/f5/apply_evidence_f5_20260421.md` (current-truth sections only; see HISTORICAL_VS_CURRENT.md for which)
10. `docs/architecture/memory/SESSION_HANDOFF_NEXT.md` — **pointer / operator context / audit trail, not the primary source of current truth** (read current-truth sections only; see HISTORICAL_VS_CURRENT.md)
11. `docs/architecture/memory/MEMORY_V2_BUG_LEDGER.md`
12. `docs/architecture/memory/DIVERGENCE_REGISTER_MEMORY.md`

`docs/architecture/memory/v2/ops/protocol_operator_run_cli.md` is **not** in Tier A. It is the historical / audit-only record of the prior operator-run CLI protocol (V2-025), superseded on apply-ownership by V2-028 on 2026-04-23. Classified `[HISTORICAL / SUPERSEDED]` in `HISTORICAL_VS_CURRENT.md`.

### Tier B — Supporting closure and policy context (read only after Tier A)

- `docs/architecture/memory/MODULE_CLOSEOUT.md` (v1 closeout)
- `docs/architecture/memory/MEMORY_V2_CLOSEOUT.md`
- `docs/architecture/memory/MEMORY_V2_F5_OPERATOR_DECISION_20260421.md`
- `docs/architecture/memory/final_verification.md`
- `docs/architecture/memory/WORK_LOG_MEMORY_V2_F5.md`
- `docs/architecture/memory/tests/results/family_batch_search_f2b_20260421.md`
- `docs/architecture/memory/tests/results/family_batch_recall_20260421.md`
- `docs/architecture/memory/tests/results/family_batch_supersede_20260421.md`
- `docs/architecture/memory/tests/results/family_batch_promote_20260421.md`

### Tier C — Implementation-support inventory (cross-reference only)

- `docs/architecture/memory/tests/fixtures/family_cases_seed.json`
- `docs/architecture/memory/tests/fixtures/fixture_manifest.json`
- `docs/architecture/memory/tests/scripts/*`
- `docs/architecture/memory/tests/walkers/*`
- `docs/architecture/memory/v2/f*/artifacts/**`
- `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs`

Use Tier C files only to confirm that a named asset exists. Never derive current state from them.

### Tier D — Historical / superseded material (audit only)

- Any `archive/**` or `archive/superseded/**` tree, if present.
- `docs/architecture/memory/v2/f5/BLOCKED_REPORT_MEMORY_V2_F5_20260421.md` (superseded by the F5 closure report).
- `docs/architecture/memory/SESSION_HANDOFF_NEXT.md §B` (v1 rollout record, 2026-04-20).
- `docs/architecture/memory/SESSION_HANDOFF_NEXT.md §D "F5 resumption — historical path menu"` (retired path menu preserved for audit).
- Duplicate / older handoff packs or prompts that predate post-F5 stabilization.

Historical material may be read for context but must **not** override any current-truth assertion from Tier A.

## Hard interpretation rules

1. If a Tier A file says F5 is closed and a Tier D section preserves F5 rollout menus, the menus are historical only.
2. If a Tier A file says no active frontier is open and any Tier A or Tier D file enumerates candidate next missions, the active-frontier state is **none**. A candidate list is not a mission.
3. Any sentence that can be read as "Path 5 is a future standard path" loses to `protocol_agent_run_local_patch.md` and `MEMORY_V2_DECISION_LEDGER.md V2-025 / V2-026 / V2-028`. Path 5 is retired as a default; it survives only as the V2-026 last-resort DB-bypass escape hatch under 8 strict conditions.
4. Any sentence that can be read as "Claude may choose the next frontier" is rejected unless a current Tier A file explicitly authorizes that specific frontier by name. Reading a candidate list does not satisfy that requirement.
5. Rollout policy is decided in `protocol_agent_run_local_patch.md` (V2-028 canonical) and `MEMORY_V2_MISSION.md §Rollout channel (post-F5)`. Historical evidence docs (e.g. `apply_evidence_f5_20260421.md`, `protocol_operator_run_cli.md`) may contain language from a moment when operator-run CLI was the canonical channel — that language is superseded by the two files named here. `protocol_operator_run_cli.md` is audit-only and must not be read as current procedure.
6. Do not infer a mission opening from the existence of a fixture, walker, or artifact file.
7. If any file contradicts `CURRENT_TRUTH_POST_F5.md`, trust `CURRENT_TRUTH_POST_F5.md` and flag the contradiction back to the operator; do not silently act on the older doc.

## Required read sequence (before any non-read-only action)

### Pass 1 — anchor current truth

1. `CURRENT_TRUTH_POST_F5.md` (this subtree) — single front door
2. `MEMORY_V2_STATE.md`
3. `DOC_WRITEBACK_POLICY.md` (this subtree) — writeback procedure authority
4. `MEMORY_V2_MISSION.md`
5. `protocol_agent_run_local_patch.md` — current canonical rollout protocol (V2-028)
6. `MEMORY_V2_PHASE_GATES.md`

(`protocol_operator_run_cli.md` is **not** read in Pass 1. It is consulted only if an audit trail question arises about the prior operator-run CLI protocol, and then only under Pass 5 / HISTORICAL_VS_CURRENT.md guidance.)

### Pass 2 — validate closure and policy

6. `CLOSURE_REPORT_MEMORY_V2_F5.md`
7. `MEMORY_V2_DECISION_LEDGER.md`
8. `DIVERGENCE_REGISTER_MEMORY.md`

### Pass 3 — reconcile handoff and residual blockers

9. `SESSION_HANDOFF_NEXT.md` (read `§A`, `§C`, `§E`, `§H` as current; `§B`, `§D "F5 resumption — historical path menu"`, `§G.2 candidate list` as Tier D)
10. `MEMORY_V2_BUG_LEDGER.md`
11. `MEMORY_V2_CLOSEOUT.md`
12. `MODULE_CLOSEOUT.md`

### Pass 4 — inventory only

13. `final_verification.md`
14. `WORK_LOG_MEMORY_V2_F5.md`
15. `docs/architecture/memory/tests/**`
16. `docs/architecture/memory/v2/**`

### Pass 5 — consult if contradictions surface

17. `docs/architecture/memory/v2/stabilization/HISTORICAL_VS_CURRENT.md` — per-doc classification
18. `docs/architecture/memory/v2/stabilization/STABILIZATION_REPORT_20260421.md` — what was ambiguous and how this subtree resolves it

## Known drift hazards explicitly neutralized by this subtree

- `MEMORY_V2_STATE.md §Resume instruction line 52` reads "Resume the active frontier" even though §Current phase line 7 says active frontier is none. `CURRENT_TRUTH_POST_F5.md §4` and the pointer note at the top of `MEMORY_V2_STATE.md` close this ambiguity.
- `MEMORY_V2_STATE.md §Current phase line 13` lists candidate next missions. Readers must treat this as a candidate menu, not a work queue — see Hard interpretation rule 2.
- `SESSION_HANDOFF_NEXT.md §D "F5 resumption — historical path menu"` preserves Path 1 / Path 2 / Path 3 rollout text. That section's retired-banner (line 64) and the `CURRENT_TRUTH_POST_F5.md §4` forbidden-actions list are what a fresh session must follow.
- `SESSION_HANDOFF_NEXT.md §G.2` lists possible next missions with the phrase "pick one if assigned". The qualifier "if assigned" is load-bearing — see Hard interpretation rule 4.
- `MEMORY_V2_BUG_LEDGER.md §Open BLOCKER-V2-F5-01` preserves "Next executable path (exact)" step-by-step F5 apply instructions with the `RESOLVED FOR F5 PURPOSES` banner at the top. The steps themselves are historical. See HISTORICAL_VS_CURRENT.md §MEMORY_V2_BUG_LEDGER.md.
- `apply_evidence_f5_20260421.md` contains policy-open language from the moment before V2-025 landed. That language is superseded by `V2-025` and `protocol_operator_run_cli.md`.

## Outcome

After applying this read order, a fresh session must be able to answer, in under five minutes:

1. What is current state? — `CURRENT_TRUTH_POST_F5.md §1`
2. What is frozen? — `CURRENT_TRUTH_POST_F5.md §1` (phase gates, versionId, settings)
3. What is deferred? — `CURRENT_TRUTH_POST_F5.md §1` (F3.1 walker, store-path embedding, sub-A/sub-B, corroboration axis)
4. What channel is allowed for future rollout? — `protocol_agent_run_local_patch.md` (V2-028); answer is autonomous agent-run local `n8n-patch` pack from the Cowork sandbox. The prior operator-run CLI protocol is superseded on apply-ownership and retained only as audit. Path 5 is retired as a default (V2-025); it survives only as the V2-026 last-resort DB-bypass escape hatch. MCP `patch_workflow_nodes` is non-canonical for WF-ME-01 until sub-B is fixed.
5. What is the exact next decision point, if any? — None until the operator opens a new mission. Active frontier is **NONE**. Candidate lists are context, not a work queue. See `CURRENT_TRUTH_POST_F5.md §2`.
