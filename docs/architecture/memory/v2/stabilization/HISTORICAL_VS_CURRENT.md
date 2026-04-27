# HISTORICAL_VS_CURRENT.md

> Frozen 2026-04-21. Current-truth pointers refreshed 2026-04-24 (post-V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH + ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE closeout) — the structural classifications below remain as frozen; only the inline "current live versionId" pointer sentences are periodically refreshed to match live state.
>
> **Documentation-system note (2026-04-24):** `DOC_WRITEBACK_POLICY.md` is now the current authority on writeback procedure (where a closeout must land and where it should not duplicate). `CURRENT_TRUTH_POST_F5.md` remains the single front door for current truth. `SESSION_HANDOFF_NEXT.md` is a support/handoff pointer, not a front-door. This note does not alter the CURRENT/SUPPORT/HISTORICAL classifications below; it clarifies role, not authority. As of 2026-04-24 the current live versionId is `c2273980-fb36-420d-bab9-b9fc3edcb2d9` (49 nodes / 67 connections; lineage extended `… → 67cb8545 (V2-OBS-STORE-PREP-INPUT-PASSTHROUGH hot-fix / post-V2-031) → c2273980 (V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH / V2-033)`). V2-034 (ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE) was probe-only — no workflow mutation — so the versionId remains `c2273980-…` post-V2-034. Prior "current live" sentences referencing `67cb8545-…`, `13e8e767-…`, `c07fe923-…`, `96962424-…`, etc. are now historical checkpoints and must not be read as current live. Any candidate-list in Section §G of `MEMORY_V2_STATE.md` is support/context only, not a work queue. Authority: subordinate to `CURRENT_TRUTH_POST_F5.md` and `MEMORY_V2_MISSION.md`.

## Purpose

Classify each section of each memory-module document as **current truth**, **supporting context**, **historical audit trail**, or **ambiguous until this file resolves it**. A fresh session uses this file whenever it notices that two sections of two different files seem to disagree. The correct resolution is always: Tier-A current-truth sections win; historical-audit sections are read for context only.

This file does **not** rewrite history. It does not delete, amend, or edit the content of any historical-audit section. It simply labels which parts of which files are load-bearing for a fresh session and which parts are point-in-time evidence.

## Legend

- **[CURRENT]** — load-bearing today; a fresh session must respect this exactly.
- **[SUPPORT]** — still-current supporting context, but not the front-door source of truth.
- **[HISTORICAL]** — accurate at the time it was written; preserved for audit; superseded by a later current-truth assertion.
- **[AMBIGUOUS — resolved here]** — sentence that could be misread; the resolution is named inline.

## MEMORY_V2_STATE.md

- §Current phase line 7 `active frontier: (none; F5 CLOSED, awaiting operator direction on F6 vs v2 mission-close)` — **[CURRENT]**. Read as "none". The parenthetical names two candidate next missions; neither is open until the operator explicitly opens one.
- §Current phase line 8 `status:` — **[CURRENT]**.
- §Current phase line 9 `just-closed frontier: F5` — **[CURRENT]**.
- §Current phase lines 10–12 `earlier-closed frontier`, `just-landed patches` — **[CURRENT]** for the lineage strings; **[SUPPORT]** for the per-frontier commentary.
- §Current phase line 13 `next frontier on queue: none active. Candidates for next discrete mission (awaiting operator direction): …` — **[AMBIGUOUS — resolved here]**. Resolution: this is a candidate menu for operator reference, not a queue that Claude may pull from. A fresh session that reads this line **must not** open any listed candidate without a new operator prompt. See `AUTHORITY_AND_READ_ORDER.md §Hard interpretation rule 2` and `CURRENT_TRUTH_POST_F5.md §4`.
- §Completed in v2 workspace — **[CURRENT]** for the fact of completion; **[SUPPORT]** for per-item detail.
- §Live context snapshot — **[CURRENT]**.
- §Open items — **[SUPPORT]** (F3.1 walker, store-path embedding, corroboration axis, sub-A, sub-B).
- §Blockers — **[CURRENT]** (`BLOCKER-V2-F5-01` resolved for F5 purposes; sub-A and sub-B downgraded to non-blocking).
- §Resume instruction steps 1–4 — **[CURRENT]** (but see step 5 below).
- §Resume instruction step 5 `Resume the active frontier.` — **[AMBIGUOUS — resolved here]**. Resolution: there is no active frontier. A fresh session must not execute step 5 as written. Read step 5 as "if an active frontier is open per §Current phase, resume it; currently active frontier is none — stop here and read `CURRENT_TRUTH_POST_F5.md §3–§4` before any action."

## MEMORY_V2_MISSION.md

- §Scope — **[CURRENT]**.
- §Write fence (v2) — **[CURRENT]**.
- §Roles — **[CURRENT]**.
- §Freeze-gate / Close-out conventions — **[CURRENT]**.
- §Rollout channel (post-F5) — **[CURRENT]**. This paragraph is the front-door statement of rollout policy; it supersedes any channel language in historical evidence docs.

## protocol_operator_run_cli.md

Entire file — **[HISTORICAL / SUPERSEDED]**. This was the canonical rollout protocol from V2-025 (2026-04-21) until V2-028 (2026-04-23) superseded the apply-ownership clause. Retained as audit trail. The operator-run CLI handshake is no longer the canonical rollout channel; the agent does not hand the apply step off to the operator. The file's Path 5 retirement is still load-bearing; the operator-run apply procedure is not.

## protocol_agent_run_local_patch.md

Entire file — **[CURRENT]**. This is the canonical rollout protocol since V2-028 (2026-04-23). Autonomous agent-run local `n8n-patch` pack from the Cowork sandbox, no operator hand-off on the apply step. Path 5 retirement (V2-025) and V2-026 escape-hatch conditions remain in force. Demonstrated channel for V2-014, V2-OBS, F6A, F6A-FOLLOWUP, V2-031 closures.

## MEMORY_V2_PHASE_GATES.md

- F1 / F2 / F3 / F4 / F5 gate rows all `done (2026-04-21)` — **[CURRENT]**. These rows are the authoritative per-frontier closure markers.

## CLOSURE_REPORT_MEMORY_V2_F5.md

- §1 Summary — **[CURRENT]**.
- §2 Live workflow state (post-F5) — **[CURRENT]**.
- §3 Prep-node surface — **[CURRENT]**.
- §4 Smoke 7/7 PASS — **[CURRENT]**.
- §5 Gate outcomes — **[CURRENT]**.
- §6 Blocker / bug status — **[CURRENT]**.
- §7 Artefact inventory — **[SUPPORT]** (inventory, not a work queue).
- §8 What this doesn't close — **[SUPPORT]** (names deferred follow-ups; not a work queue).
- §9 Authority — **[CURRENT]**.

## apply_evidence_f5_20260421.md

- Pre-state sections (§1, §2) — **[HISTORICAL]**. They describe the workflow at the moment before F5 applied.
- Apply SQL and diff-surface proof (§3) — **[HISTORICAL]** as an audit trail. The Path 5 channel it documents is **retired** for future use; see `MEMORY_V2_DECISION_LEDGER.md V2-025` and `protocol_operator_run_cli.md`.
- Smoke summary (§4–§5) — **[HISTORICAL]**. Evidence for §1 of `CURRENT_TRUTH_POST_F5.md`.
- Any section that asks a future-policy question about whether Path 5 should become permanent — **[HISTORICAL]**. Superseded by `V2-025` and `protocol_operator_run_cli.md`. Do not revive that policy question without an explicit operator prompt.

## SESSION_HANDOFF_NEXT.md

- §A Current execution truth — **[CURRENT]**.
- §B Rollout outcome (v1, 2026-04-20) — **[HISTORICAL]**. This section describes the v1 rollout at `versionId=da6d2573-…`. Current live versionId is `c2273980-fb36-420d-bab9-b9fc3edcb2d9` (post-V2-033 / V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH apply 2026-04-24; V2-034 probe-only did not advance it) — see §A. Historical checkpoints preserved in §B (and in §E/§G.4) at `b8e2f194-…` (F5 close) / `279a8628-…` (V2-014 close) / `96962424-…` (V2-OBS close) / `c07fe923-…` (F6A close) / `13e8e767-…` (F6A-FOLLOWUP close) / `0bf42f1b-…` (V2-031 initial) / `67cb8545-…` (V2-031 hot-fix) are frozen snapshots, not current truth.
- §C Saved artefacts — current — **[CURRENT]** for "these files exist"; **[SUPPORT]** for per-file commentary.
- §D Open executable frontier — top paragraph (first four bullets F2 / F3 first-batch / F4 / F5) — **[CURRENT]**.
- §D F5 resumption — historical path menu — **[HISTORICAL]**. The retired-banner at line 64 (`**Retired — D-M-014 scoped to F5 only, see V2-025.**`) is the load-bearing line. The Path 1 / Path 2 / Path 3 procedural text underneath is audit material; its step-by-step commands must not be executed as standing instruction.
- §D v2 follow-ups still open — **[SUPPORT]**. Candidate list, not a work queue. Same rule as `MEMORY_V2_STATE.md §Current phase line 13`.
- §E Frozen boundaries — **[CURRENT]** for current live state; **[HISTORICAL]** for the v1-frozen snapshot.
- §F Rollback path — **[CURRENT]**. Use only if a production regression surfaces; not a standing instruction.
- §G First instruction for next session — step 1 **[CURRENT]**; step 2 **[AMBIGUOUS — resolved here]** "pick one if assigned" means "if the operator has assigned one; otherwise no mission is open"; step 3 **[CURRENT]** (canonical rollout channel = **autonomous agent-run local `n8n-patch` pack per V2-028**; operator-run CLI superseded on apply-ownership; Path 5 retired except for V2-026 escape hatch); steps 4–5 **[CURRENT]**.
- §H Closing assertion — **[CURRENT]**.

## MEMORY_V2_DECISION_LEDGER.md

- All rows through V2-022 — **[SUPPORT]** (historical decisions; context for later rows).
- V2-023 — **[CURRENT]** (F5 Path 5 channel authorization; scoped to F5).
- V2-024 — **[CURRENT]** (settings-strip correction: preserve `availableInMCP`, strip `timeSavedMode` only).
- V2-025 — **[CURRENT for the Path 5 retirement clause; SUPERSEDED by V2-028 for the apply-ownership clause]**. The "Path 5 retired" half remains in force. The "operator-run CLI canonical" half is superseded by V2-028 (2026-04-23): canonical channel is now autonomous agent-run local `n8n-patch` pack. Any apparent conflict resolves: Path 5 retirement → V2-025; apply-ownership → V2-028.
- V2-028 — **[CURRENT]** (autonomous agent-run local `n8n-patch` pack canonical for `WF-ME-01` mutations; supersedes V2-025 apply-ownership; preserves V2-025 Path-5 retirement and V2-026 escape-hatch conditions).
- V2-029 — **[CURRENT]** (F6A-STORE-PATH-EMBEDDING-PRODUCER closed SUCCESS 2026-04-23).
- V2-030 — **[CURRENT]** (F6A-FOLLOWUP-SUPERSEDE-EMBED closed SUCCESS 2026-04-24).
- V2-031 — **[CURRENT]** (V2-OBS-STORE-PREP-INPUT-PASSTHROUGH closed SUCCESS 2026-04-24; lineage `13e8e767 → 0bf42f1b → 67cb8545`).
- V2-032 — **[CURRENT]** (ACCEPT-VIA-CORROBORATION-PROBE closed SUCCESS 2026-04-24; resolves V2-018 deferral).
- V2-033 — **[CURRENT]** (V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH closed SUCCESS 2026-04-24; lineage `67cb8545 → c2273980`; 166 direct checks GREEN — not 200/200).
- V2-034 — **[CURRENT]** (ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE closed SUCCESS 2026-04-24; probe-only — no workflow mutation, versionId remains `c2273980-…`; 164 direct checks GREEN; live proof exec 6453 `acceptance_signals:['evidence_validated']`; combined V2-033+V2-034 = 330 direct checks, not 400+).

## DIVERGENCE_REGISTER_MEMORY.md

- D-M-001 … D-M-013 — **[SUPPORT]** (historical divergences, all CLOSED).
- D-M-014 — **[CURRENT for F5-only scope; the "prefer canonical CLI" sentence is HISTORICAL — superseded by V2-028]**. The F5-only scope of the Path 5 use is still in force (Path 5 is not a default channel). The clause "future structural patches must still prefer canonical CLI (Path 1)" is now superseded: V2-028 establishes the canonical apply channel as autonomous agent-run local `n8n-patch` pack from the Cowork sandbox, not operator-run CLI. Read this DIVERGENCE row only as F5 audit + Path 5 scoping; do not read it as the current channel rule.

## MEMORY_V2_BUG_LEDGER.md

- §Open BLOCKER-V2-F5-01 — **[CURRENT]** for the resolution banner (lines 9–16: resolved for F5; sub-A and sub-B residual non-blocking).
- §Open BLOCKER-V2-F5-01 sub-blocker A / B detail — **[HISTORICAL]** as evidence.
- §Open BLOCKER-V2-F5-01 `Next executable path (exact)` steps 1–6 — **[HISTORICAL]**. These commands were the step-by-step F5 apply list preserved before V2-025 closed the channel question. They must not be executed as standing instruction. F5 is closed; there is no "next executable path" to run.
- §Open BLOCKER-V2-F5-01 `Scope-broadening fix (requires explicit operator authorization)` — **[HISTORICAL]**. The scope-broadening option was never exercised and is now off the table by `V2-025`.
- §Resolved BUG-V2-01 / 02 / 03 — **[SUPPORT]** (resolved via Patch A and F4).
- §Runtime boundaries observed during F1 — **[SUPPORT]**.

## MEMORY_V2_CLOSEOUT.md

- Entire file — **[CURRENT]**. Each frontier bullet is a pointer to the authoritative closeout artefact for that frontier.

## MODULE_CLOSEOUT.md

- §1 Mission status — **[CURRENT]** for v1 closure.
- §2–§4 — **[CURRENT]** for v1 frozen state; **[SUPPORT]** for live live-state snapshot (which has since advanced to v2 F5 — see §A of this file's §SESSION_HANDOFF_NEXT.md entry).

## final_verification.md

- Entire file — **[HISTORICAL]** as a point-in-time verification record; **[SUPPORT]** as inventory of v1 frozen artefacts. The "Known limitations / v2 follow-ups" section is the seed that became the v2 frontiers (F1–F6) — it is historical context, not a work queue.

## WORK_LOG_MEMORY_V2_F5.md

- Entire file — **[HISTORICAL]** as an audit trail of the F5 session; preserves per-attempt logs including the blocked CLI / MCP attempts before Path 5 landed. Read for context only.

## v2/f5/ artifacts

- Entire subtree — **[HISTORICAL]** as evidence; **[SUPPORT]** as payloads that prove the F5 surface landed byte-identically. Do not rebuild these payloads.

## v2/patches/, v2/f2/, v2/f3/, v2/f4/ artifacts

- Entire subtrees — **[HISTORICAL]** as evidence for closed frontiers.

## v2/ops/protocol_operator_run_cli.md (duplicate header — see line 40)

- Entire file — **[HISTORICAL / SUPERSEDED]** since V2-028 (2026-04-23). Retained as audit-only. Current canonical rollout protocol is `protocol_agent_run_local_patch.md` (V2-028). See classification at line 40 above.

## v2/ops/protocol_agent_run_local_patch.md

- Entire file — **[CURRENT]**. Canonical rollout protocol since V2-028 (2026-04-23).

## Global rule

Whenever a fresh session is about to act and the action is sourced from a section labelled **[HISTORICAL]** above, the session **must stop** and re-read `CURRENT_TRUTH_POST_F5.md §3–§4` before deciding whether the action is authorized. If the action is not authorized by a current Tier A source, the session must wait for a new operator prompt.
