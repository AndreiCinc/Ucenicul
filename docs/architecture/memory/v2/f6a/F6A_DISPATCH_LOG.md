# F6A Dispatch Log

Mission: `F6A-STORE-PATH-EMBEDDING-PRODUCER`
Append-only. Latest entries at the bottom.

Format per entry:
- `## [ISO date] — Phase N — one-line summary`
- Who (agent / operator)
- Actions (bullet list of the concrete steps taken)
- Artefacts written/updated
- MCP / live calls made (if any), with read/write classification
- Outcome / next-action

---

## 2026-04-23 — Phase 0/1 — Mission opened by operator directive

Who: agent
Actions:
- Received pack `F6A` (8 files: `00_READ_FIRST.md` through `07_OPERATOR_PROMPT_FOR_NEW_CHAT.md`), uploaded 2026-04-23.
- Operator confirmed: pack is the fresh directive lifting the "Must not open F6" / "Must not start the store-path embedding producer" interdictions in `CURRENT_TRUTH_POST_F5.md §4`, strictly for F6A.
- Operator confirmed autonomous execution through the entire mission: no intermediate confirmation between files; halt only on real blockers or scope-changing ambiguities.
- Read order per `00_READ_FIRST.md` executed: `CURRENT_TRUTH_POST_F5.md`, `AUTHORITY_AND_READ_ORDER.md`, `MEMORY_V2_STATE.md`, `SESSION_HANDOFF_NEXT.md`, `MEMORY_V2_CLOSEOUT.md`, F2 design + patch plan + apply evidence, `final_verification.md`, `protocol_operator_run_cli.md`, V2-014 / V2-OBS templates.
- Extracted live inventory via MCP `get_workflow` (read-only): versionId `96962424-a9b1-4b7d-aa58-33ccc9c2b6a6`, nodeCount 45, connectionCount 63, active true. Confirmed target Prep/Store_DB/Search_Embed shapes match pack-asserted baselines.

Artefacts:
- `F6A_MISSION_BRIEF.md` written.
- Auto-memory hook line in `/sessions/tender-amazing-franklin/mnt/.auto-memory/MEMORY.md` updated to reflect post-V2-OBS closures + F6A opening (hook line only; the anchor body was already current).

MCP / live calls:
- `mcp__n8n__get_workflow` on `uq26nh1grIpnHju0` — READ-ONLY.

Outcome: Phases 0 and 1 GREEN. Proceed to Phase 2.

---

## 2026-04-23 — Phase 2 — Design freeze + testing strategy committed

Who: agent
Actions:
- Answered design Q1–Q6 with explicit references to F2 precedent.
- Authored full Merge jsCode (mirror of `ME_Memory_Search_Embed_Merge` adapted to read from `ME_Memory_Store_Prep` and emit `__db.embedding_text`).
- Authored full before/after `ME_Memory_Store_DB.parameters.query` SQL with 14-bind form and `CASE WHEN $14::text IS NULL THEN NULL ELSE $14::vector(1536) END` guard.
- Enumerated 10 pre-apply diff-surface invariants.
- Authored 41-case local matrix (L1–L7) and 28-case live E2E matrix (E1–E6).
- Enumerated 7 DB invariants with exact SQL (DB-INV-1…DB-INV-7).
- Fixed idempotency namespace `mem-smoke-v2f6a-*` for E-matrix traffic.

Artefacts:
- `F6A_DESIGN_FREEZE.md`.
- `F6A_TESTING_STRATEGY.md`.
- `F6A_EXECUTION_PLAN.md` (10 phases, per-phase entry/exit criteria, owner, halt triggers).
- `F6A_BLOCKER_REGISTER.md` (open, no active blocker; 5 deliberate exclusions recorded: supersede mirror F6A-X-01, back-fill F6A-X-02, ivfflat retrain F6A-X-03, caller-supplied-embedding live proof F6A-X-04, store-prep hardcoded flags F6A-X-05).

MCP / live calls: none.

Outcome: Phase 2 GREEN. Proceed to Phase 3.

---

## 2026-04-23 — Phase 3 — State ledger + cursor + dispatch

Who: agent
Actions:
- Wrote machine-readable state (`F6A_STATE.json`): phase=3 in progress, status=OPEN, next_action = Phase 4 builder.
- Wrote human cursor (`F6A_CURRENT_STAGE.md`): current phase, pending phases, immediate next action list for the next session.
- Opened this dispatch log with the three retrospective entries for Phases 0/1, 2, and 3.

Artefacts:
- `F6A_STATE.json`.
- `F6A_CURRENT_STAGE.md`.
- `F6A_DISPATCH_LOG.md` (this file).

MCP / live calls: none.

Outcome: Phase 3 GREEN at commit of this entry. Next session should resume at Phase 4 (deterministic builder + patch payload).

---

## 2026-04-23 — Phase 4 — Deterministic builder + payload

Who: agent
Actions:
- Read-only dump of `WF-ME-01` via `mcp__n8n__get_workflow uq26nh1grIpnHju0`. Baseline confirmed: versionId `96962424-a9b1-4b7d-aa58-33ccc9c2b6a6`, nodeCount 45, connectionCount 63, active true, name `WF-ME-01 Module Execution`.
- Wrote canonical pre snapshot `artifacts/WF-ME-01_pre_f6a.json` (202,751 bytes, sha256 `71a8c903584a1f0fac170a8ebce8daf1227f7a62c4f2ce0e47f2536216107c57`).
- Inspected reference templates `ME_Memory_Search_Embed` (HTTP, typeVersion 4.2, onError=continueRegularOutput, credential openAiApi `svM62oyFwPbaIeX4`) and `ME_Memory_Search_Embed_Merge` (Code, typeVersion 2).
- Inspected target `ME_Memory_Store_DB.parameters.query` (CTE `WITH ins AS (INSERT … RETURNING *, TRUE AS inserted) SELECT * FROM ins UNION ALL SELECT mi.*, FALSE AS inserted WHERE idempotency_key=$13 AND NOT EXISTS (…) LIMIT 1`) and confirmed 13-bind shape, replay-returning form.
- Confirmed `ME_Memory_Store_Prep.__db` already carries `content: inputs.content` — the Store_Embed HTTP node reads `$json.__db.content` directly, leaving Store_Prep unmodified (keeps patch surface strictly to the three nodes named in the mission brief).
- Wrote `artifacts/build_patch_f6a.mjs` deterministic builder enforcing all 10 BUILD-INV-* invariants; the builder refuses to emit if any invariant fails.
- Ran builder — all 10 invariants passed. Emitted `artifacts/WF-ME-01_post_f6a.json` (sha256 `8e775d5a5a982cd5b069b604a877dc52498f4e5224f0218d71eebab33c67624f`) and `artifacts/diff_summary_f6a.md` (sha256 `c393880d364f3677fdb318f741018ab355c72ea7614c8ff9f0f5c3ee017fddc4`).
- Determinism cross-check: ran builder twice, stdout identical, both output files reproduced byte-for-byte.
- Builder decisions that deserve to be remembered:
  - Store_Embed input field is `$json.__db.content` (not `content_for_embedding`) — leverages the existing Prep output; Prep unmodified.
  - Store_Embed_Merge emits `__db.embedding_text` (string form of the 1536-dim vector or null).
  - SQL guard is `CASE WHEN $14::text IS NULL THEN NULL ELSE $14::vector(1536) END`; pgvector accepts the JSON-array-string form directly.
  - `ME_Memory_Store_DB.position` shifted `[3008,1040] → [3128,1040]` so the new Merge can sit at `[3008,1040]` without overlap. Visual-layout-only change; noted in BUILD-INV-8.
  - `queryReplacement` extended 13→14 in both happy and error branches.
  - No `_error` guard change — inherited as-is from pre.

Artefacts:
- `artifacts/WF-ME-01_pre_f6a.json`
- `artifacts/build_patch_f6a.mjs`
- `artifacts/WF-ME-01_post_f6a.json`
- `artifacts/diff_summary_f6a.md`
- `F6A_STATE.json` updated: phase=5, phases.4_builder_and_payload=GREEN with sha256s.

MCP / live calls:
- `mcp__n8n__get_workflow` on `uq26nh1grIpnHju0` — READ-ONLY.

Outcome: Phase 4 GREEN. Proceed to Phase 5.

---

## 2026-04-23 — Phase 5 — Apply command + pre-apply verification

Who: agent
Actions:
- Checked `n8n-patch.mjs --help`; confirmed the `replace <id> <file.json> [--reactivate]` sub-command. No `--expect-version` flag exists in the CLI — version assertion is done out-of-band via `mcp__n8n__verify_workflow`.
- Checked F2 precedent `v2/f2/patch_plan_f2.md §Rollout`: `replace` without `--reactivate` (no webhook triggers on `WF-ME-01`, chat + executeWorkflowTrigger only). Matched the F2 command shape.
- Wrote `F6A_APPLY_COMMAND.md` with: sha256 pre-checks, pre-apply version assertion, single apply command block, post-apply verification checklist, rollback command, forbidden alternatives.
- Ran `mcp__n8n__verify_workflow` on `uq26nh1grIpnHju0` with asserted `nodeCount=45, connectionCount=63`, full-string equality on `ME_Memory_Store_DB.parameters.query` (13-bind pre form), and `ME_Memory_Search_Embed.parameters.nodeCredentialType == openAiApi`. Result: `allPass:true`. Live versionId at verify time: `96962424-a9b1-4b7d-aa58-33ccc9c2b6a6`. `updatedAt`: `2026-04-22T20:34:16.289Z`. Unchanged since pack was uploaded.
- Wrote `F6A_APPLY_EVIDENCE_20260423.md` with §Pre-state filled in full; §Post-state scaffolded with TBDs for the operator-apply round-trip.
- Updated `F6A_STATE.json`: phase=6; phases.5_apply_command_preverify=GREEN with verify_workflow allPass note.
- Updated `F6A_CURRENT_STAGE.md` to reflect the agent→operator hand-off.

Artefacts:
- `F6A_APPLY_COMMAND.md`
- `F6A_APPLY_EVIDENCE_20260423.md` (§Pre-state)

MCP / live calls:
- `mcp__n8n__verify_workflow` on `uq26nh1grIpnHju0` — READ-ONLY.

Outcome: Phase 5 GREEN. **Hand-off to operator for Phase 6 apply.** Agent cannot proceed until the operator runs the command block and acknowledges the CLI result.

*Note (retroactively superseded 2026-04-23 by V2-028 protocol correction — see next entry): the "hand-off to operator" step was corrected to "agent runs apply via local pack" without rewriting this Phase 5 entry, per the audit-preservation rule.*

---

## 2026-04-23 — Protocol correction — Canonical channel refined to autonomous agent-run local patch pack (V2-028)

Who: agent
Actions:
- User flagged that the current documentation modelled Phase 6 apply as operator-owned (V2-025). That did not match the real operating model: the local `n8n-patch` pack at `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/` has its own `.env` with egress-capable n8n API credentials, and was in fact the channel used by the agent for V2-014 (2026-04-22T15:30Z) and V2-OBS (2026-04-22) closures from the same sandbox.
- Documentation-only protocol correction performed. No workflow mutation. Baseline live state unchanged at `versionId = 96962424-a9b1-4b7d-aa58-33ccc9c2b6a6`.
- Added ledger entry `V2-028` to `MEMORY_V2_DECISION_LEDGER.md`: "Canonical apply channel refined: autonomous agent-run local n8n-patch pack supersedes operator-run CLI (V2-025) as the default rollout channel for WF-ME-01 structural mutations." V2-025's retirement of Path 5 preserved; V2-026 escape-hatch preserved.
- Bannered `docs/architecture/memory/v2/ops/protocol_operator_run_cli.md` as SUPERSEDED 2026-04-23 with a forward pointer to the new rule doc. Body retained verbatim for audit.
- Created `docs/architecture/memory/v2/ops/protocol_agent_run_local_patch.md` as the new FROZEN canonical rule doc (V2-028).
- Updated `docs/architecture/memory/v2/stabilization/CURRENT_TRUTH_POST_F5.md` §header status / §1 channel assertion / §2 active frontier (F6A is open) / §3 authorized writes (F6A + documentation writeback) / §4 interdictions (F6A lift + V2-028 channel rule) / §5 authoritative sources.
- Updated `docs/architecture/memory/SESSION_HANDOFF_NEXT.md` §header / §A next executable frontier (F6A open, V2-028 channel) / §Canonical apply channel policy (V2-028 current, V2-025 superseded, V2-026 escape hatch) / §G.2 (F6A entry point) / §G.3 (channel-selection reminder) / §H closing assertion.
- Updated F6A mission brief `§Channels` to V2-028.
- Updated F6A execution plan header channel note, Phase 6 section (Owner: Agent; approval-gated via preamble; rollback by agent re-running `replace` on pre snapshot), phase-gate summary table (row 6), hand-off points (no more channel hand-offs; Phase 5→6 gate is approval-only), and forbidden-actions list.
- Updated `F6A_APPLY_COMMAND.md` framing from "operator runs the apply command" to "agent runs the apply command via Bash after user-approved preamble" (pre/post verification, rollback, forbidden-alternatives all reworded accordingly).
- Updated `F6A_CURRENT_STAGE.md` §Where we are / §Phases pending / §Immediate next action / §Forbidden actions / §Hand-off state.
- Updated `F6A_STATE.json` `authority_source`, `channel`, `phases.6_agent_apply_postverify` (renamed from `6_operator_apply_postverify`; owner: agent; approval_gate noted), `forbidden_actions` (added "hand the apply off to the operator"), and `next_action` (agent runs Bash after one-sentence preamble + user approval). JSON validated post-edit.
- Task list: renamed task #3 from "Phase 6 — Operator apply + post-apply verification" to "Phase 6 — Agent apply via local patch pack + post-apply verification"; added new task #8 tracking this correction (now marked completed at end of this entry).

Artefacts written/updated:
- `docs/architecture/memory/MEMORY_V2_DECISION_LEDGER.md` — V2-028 appended.
- `docs/architecture/memory/v2/ops/protocol_operator_run_cli.md` — SUPERSEDED banner added (body preserved verbatim).
- `docs/architecture/memory/v2/ops/protocol_agent_run_local_patch.md` — NEW, FROZEN current rule.
- `docs/architecture/memory/v2/stabilization/CURRENT_TRUTH_POST_F5.md` — §header, §1, §2, §3, §4, §5 updated.
- `docs/architecture/memory/SESSION_HANDOFF_NEXT.md` — §header, §A, §Canonical apply channel policy, §G.2, §G.3, §H updated.
- `docs/architecture/memory/v2/f6a/F6A_MISSION_BRIEF.md` — §Channels updated.
- `docs/architecture/memory/v2/f6a/F6A_EXECUTION_PLAN.md` — header, Phase 6, phase-gate table, hand-off points, forbidden actions updated.
- `docs/architecture/memory/v2/f6a/F6A_APPLY_COMMAND.md` — header + sections updated.
- `docs/architecture/memory/v2/f6a/F6A_CURRENT_STAGE.md` — sections updated.
- `docs/architecture/memory/v2/f6a/F6A_STATE.json` — updated, JSON valid.
- `docs/architecture/memory/v2/f6a/F6A_DISPATCH_LOG.md` — this entry appended.

MCP / live calls: none. No mutation of the live workflow. No workflow read calls either — baseline is unchanged since the Phase 5 pre-apply `verify_workflow`.

Outcome: Protocol correction complete. Rule in force: V2-028 (autonomous agent-run local `n8n-patch` pack is the canonical apply channel). F6A is unblocked to continue autonomously from Phase 6 — once the user approves the one-sentence preamble for the `replace` command, the agent runs it itself and proceeds through post-apply verification and the remaining phases without further hand-off.

---
