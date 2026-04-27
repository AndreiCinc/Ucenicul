# STABILIZATION_REPORT_20260421.md

> Frozen 2026-04-21. Documentation-only stabilization pass on the post-F5 memory-module control surface.
> Mission brief: `CLAUDE_NEXT_BOUNDED_MISSION_PROMPT.md` + `CLAUDE_NEXT_BOUNDED_MISSION_RUNBOOK.md` + `MEMORY_V2_EXECUTIVE_STAGE_ASSESSMENT.md` + `MEMORY_V2_AUTHORITY_AND_READ_ORDER.md`.

## 1. Mission type

Documentation stabilization only. Not implementation. Not F3.1. Not F6. Not a store-path embedding mission. Not a rollout-policy change.

## 2. What was ambiguous before this pass

The project's runtime truth is stable post-F5, but several locations in the control surface preserved historical material in a shape that a fresh autonomous session could misread as current instruction. The specific ambiguities:

1. **Active-frontier ambiguity in `MEMORY_V2_STATE.md`.**
   - §Current phase line 7 correctly says "active frontier: none", but §Resume instruction step 5 still reads "Resume the active frontier." A fresh session reading the resume instruction first could assume an active frontier must exist.
   - §Current phase line 13 lists candidate next missions (F6, F3.1 walker, store-path embedding, accept-via-corroboration, sub-A, sub-B, v2 mission-close). Phrased as "Candidates for next discrete mission (awaiting operator direction)" — correct phrasing, but a fresh session could misread the list as a work queue.

2. **Historical-vs-current blur in `SESSION_HANDOFF_NEXT.md §D`.**
   - §D preserves the full "F5 resumption — historical path menu" (Path 1 CLI, Path 2 MCP tool side-fix, Path 3 scope-broadening MCP apply). A retired-banner blockquote (line 64) and an italic preamble (line 62) correctly mark the material historical. The underlying step-by-step rollout commands, however, remain inline and could be executed by a fresh session that skips the banner.
   - §G.2 "Possible next missions (non-blocking, pick one if assigned)" — the qualifier "if assigned" is load-bearing; without it, the list reads like an authorized menu.

3. **Residual blocker language in `MEMORY_V2_BUG_LEDGER.md §Open BLOCKER-V2-F5-01`.**
   - The top banner (lines 9–16) declares the blocker resolved for F5 and downgrades sub-A / sub-B to non-blocking. The body below preserves the original "Next executable path (exact)" 6-step list and "Scope-broadening fix (requires explicit operator authorization)" procedure. Both are historical; a fresh session might reach those steps before internalizing the top banner.

4. **Policy-open language in `apply_evidence_f5_20260421.md`.**
   - The evidence doc preserves the in-session debate about whether Path 5 should become a permanent channel. `V2-025` and `protocol_operator_run_cli.md` have since retired Path 5, but the evidence doc is an append-only record and still carries the pre-retirement language.

5. **Self-authorization risk.**
   - Across `MEMORY_V2_STATE.md` and `SESSION_HANDOFF_NEXT.md`, the candidate lists + the phrase "Resume the active frontier" together create a surface where a model with weak read-order discipline could self-authorize F6 or the store-path embedding producer.

## 3. Files added by this pass

All additive, all under `docs/architecture/memory/v2/stabilization/`. No historical content was deleted or rewritten.

| Path | Role |
|---|---|
| `v2/stabilization/CURRENT_TRUTH_POST_F5.md` | Single front-door current-truth doc. Names the verbatim-preserve truth constants (F5 closed, versionId `b8e2f194-…`, smoke 7/7, DB invariant, settings set, F6 not opened, F3.1 deferred, Path 5 retired, operator-run CLI canonical). States explicitly what a fresh session may and may not do without a new mission. |
| `v2/stabilization/AUTHORITY_AND_READ_ORDER.md` | Authority tiers (A current / B support / C inventory / D historical) + Pass 1–5 read sequence + hard interpretation rules + per-hazard neutralization map. |
| `v2/stabilization/HISTORICAL_VS_CURRENT.md` | Per-document section-level classification: **[CURRENT]**, **[SUPPORT]**, **[HISTORICAL]**, **[AMBIGUOUS — resolved here]**. Names specific lines in `MEMORY_V2_STATE.md`, `SESSION_HANDOFF_NEXT.md`, `MEMORY_V2_BUG_LEDGER.md`, and `apply_evidence_f5_20260421.md` that a fresh session must read through this lens. |
| `v2/stabilization/STABILIZATION_REPORT_20260421.md` | This file. Summarizes the ambiguity audit, the additive doc set, the pointer updates, and the remaining intentionally-open items. |

## 4. Minimal pointer updates

Applied in-place, with no history rewriting. Each update adds a pointer to the stabilization subtree and (where needed) disambiguates a load-bearing line.

- `MEMORY_V2_STATE.md` — added a front-matter "Anti-drift pointer" note at the top directing fresh sessions to `v2/stabilization/CURRENT_TRUTH_POST_F5.md` and `v2/stabilization/AUTHORITY_AND_READ_ORDER.md` before reading the rest of the file; and disambiguated §Resume instruction step 5 by adding the conditional "only if §Current phase names an active frontier; currently none — stop and read the stabilization subtree" qualifier.
- `SESSION_HANDOFF_NEXT.md` — added an "Anti-drift pointer" note at the top of §A directing fresh sessions to the stabilization subtree before interpreting §D historical menus or §G.2 candidate lists.

No edits were made to `MEMORY_V2_BUG_LEDGER.md`, `apply_evidence_f5_20260421.md`, `MEMORY_V2_MISSION.md`, `protocol_operator_run_cli.md`, `MEMORY_V2_DECISION_LEDGER.md`, `DIVERGENCE_REGISTER_MEMORY.md`, `CLOSURE_REPORT_MEMORY_V2_F5.md`, `MEMORY_V2_PHASE_GATES.md`, `MEMORY_V2_CLOSEOUT.md`, or `MODULE_CLOSEOUT.md`. Their content is load-bearing as-is and the stabilization subtree resolves any misread risk by pointing at the right sections.

## 5. Ambiguity removed after this pass

- A fresh session can now reach "F5 is done" from `CURRENT_TRUTH_POST_F5.md §1` without having to reconcile `MEMORY_V2_STATE.md §Current phase line 7` against §Resume instruction step 5.
- A fresh session can now reach "Path 5 is retired" from `CURRENT_TRUTH_POST_F5.md §1` + `AUTHORITY_AND_READ_ORDER.md §Hard interpretation rule 3` without having to reconcile `D-M-014` against `V2-025` against `apply_evidence_f5_20260421.md`.
- A fresh session can now reach "operator-run CLI is canonical" from `CURRENT_TRUTH_POST_F5.md §1` without having to decide between `protocol_operator_run_cli.md`, `V2-025`, and historical channel menus.
- A fresh session can now reach "no frontier is open" from `CURRENT_TRUTH_POST_F5.md §2` without having to interpret the candidate list in `MEMORY_V2_STATE.md §Current phase line 13`.
- A fresh session can now reach "F3.1 is deferred, not opened" from `CURRENT_TRUTH_POST_F5.md §1` + `MEMORY_V2_PHASE_GATES.md §F3.1 pending`.
- A fresh session can now reach "F6 is not opened" from `CURRENT_TRUTH_POST_F5.md §1` + `MEMORY_V2_CLOSEOUT.md` top paragraph.
- A fresh session can now reach "no implementation may begin without a new mission" from `CURRENT_TRUTH_POST_F5.md §3–§4`.

## 6. What remains intentionally open for a future explicit mission

The following items remain candidates for a future, operator-opened mission. They are not opened by this stabilization pass. Listing them here is context only, not a work queue:

- F3.1 walker harness (150-case combinatorial expansion).
- Store-path embedding producer (required for semantic retrieval to return non-empty rows).
- Accept-via-corroboration acceptance-signal probe.
- Sub-A (sandbox egress allowlist) and sub-B (MCP `patch_workflow_nodes` settings-whitelist filter).
- `idempotency_key_prefix` module-input nicety, `ivfflat` retrain policy, multi-workflow connector-assertion rule.
- Formal v2 mission-close, if the operator decides to close v2 rather than open F6.

## 7. What was NOT done (forbidden by mission scope)

- No workflow JSON was modified.
- No database row was modified (no INSERT, UPDATE, DELETE — all Postgres interaction in this pass was introspective reads of existing docs, not the DB itself).
- No test harness, walker, or fixture file was modified.
- F6 was not opened.
- F3.1 was not started.
- Store-path embedding work was not started.
- Rollout policy was not changed.
- No historical content was deleted.
- Path 5 was not re-interpreted as current policy.
- No new frontier was chosen by the agent.

## 8. Self-check against the runbook §6 exit criteria

1. Can a fresh session identify current truth in under five minutes? — Yes. `CURRENT_TRUTH_POST_F5.md §1` is a single paragraph-plus-bullet-list answer.
2. Can a fresh session see that Path 5 is historical-only? — Yes. `CURRENT_TRUTH_POST_F5.md §1` + `AUTHORITY_AND_READ_ORDER.md §Hard interpretation rule 3` + the cited `V2-025` and `protocol_operator_run_cli.md`.
3. Can a fresh session see that no frontier is open? — Yes. `CURRENT_TRUTH_POST_F5.md §2`.
4. Can a fresh session see that F3.1 is deferred, not opened? — Yes. `CURRENT_TRUTH_POST_F5.md §1` + `MEMORY_V2_PHASE_GATES.md §F3.1`.
5. Can a fresh session see that F6 is not opened? — Yes. `CURRENT_TRUTH_POST_F5.md §1` + `MEMORY_V2_CLOSEOUT.md` top paragraph.
6. Can a fresh session see that implementation is out of scope for this mission? — Yes. `CURRENT_TRUTH_POST_F5.md §3–§4`.

## 9. Verdict

The documentation surface is now stable enough for a fresh autonomous session to read the front door (`CURRENT_TRUTH_POST_F5.md`), internalize the read order (`AUTHORITY_AND_READ_ORDER.md`), apply the historical-vs-current lens (`HISTORICAL_VS_CURRENT.md`), and not drift into reopening F5, reviving Path 5, opening F6, executing F3.1, or self-authorizing any other frontier.

Stop condition met. No leftover time will be spent on implementation or on opening the next mission.
