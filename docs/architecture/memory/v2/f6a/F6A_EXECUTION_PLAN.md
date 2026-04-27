# F6A Execution Plan

Mission: `F6A-STORE-PATH-EMBEDDING-PRODUCER`
Opened: 2026-04-23 (operator directive via pack `F6A` uploaded 2026-04-23)
Channel: **autonomous agent-run local `n8n-patch` pack** (V2-028 canonical, 2026-04-23; supersedes V2-025 operator-run CLI on apply-ownership). Command form: `n8n-patch.mjs replace uq26nh1grIpnHju0 <post payload>`, run by the agent from the Cowork sandbox via `Bash`. Protocol doc: `docs/architecture/memory/v2/ops/protocol_agent_run_local_patch.md`.
Baseline live workflow: `versionId = 96962424-a9b1-4b7d-aa58-33ccc9c2b6a6`, nodeCount 45, connectionCount 63.
Target live workflow (planned): nodeCount 47, connectionCount 65.

The plan is split into 10 sequential phases. Each phase names its entry criteria, exit criteria, required artefacts, owner (agent vs. operator), and halt triggers.

> Rule: an open phase is the phase whose exit criteria are not yet all green. A later phase may not begin before the current phase's exit criteria are fully met. If a halt trigger fires, record it in `F6A_BLOCKER_REGISTER.md`, move cursor to BLOCKED, and stop.

---

## Phase 0 — Truth anchor

### Purpose
Establish that the reader of F6A docs has the same authoritative baseline as the opener.

### Entry criteria
- None. Phase 0 is always entered first.

### Required reads (exact order)
1. `docs/architecture/memory/v2/stabilization/CURRENT_TRUTH_POST_F5.md`
2. `docs/architecture/memory/v2/stabilization/AUTHORITY_AND_READ_ORDER.md`
3. `docs/architecture/memory/MEMORY_V2_STATE.md`
4. `docs/architecture/memory/SESSION_HANDOFF_NEXT.md`
5. `docs/architecture/memory/MEMORY_V2_CLOSEOUT.md`
6. `docs/architecture/memory/v2/f2/design_f2_embedding_producer.md`
7. `docs/architecture/memory/v2/f2/patch_plan_f2.md`
8. `docs/architecture/memory/v2/f2/apply_evidence_f2_20260421.md`
9. `docs/architecture/memory/final_verification.md`

### Exit criteria
- Reader can name: baseline versionId, baseline node/conn counts, reasons F6A is the scoped fix for the NULL-embedding gap, forbidden out-of-scope areas.
- Mission brief file exists: `F6A_MISSION_BRIEF.md`.

### Owner
Agent.

### Halt triggers
- Any contradiction surfaces between `CURRENT_TRUTH_POST_F5.md` and pack directive that is NOT explicitly lifted by the pack itself.
- Baseline live workflow observed via read-only MCP does not match the stated versionId (indicates drift between pack and live state).

### Status at opening
GREEN. `F6A_MISSION_BRIEF.md` written 2026-04-23.

---

## Phase 1 — Scope and out-of-scope freeze

### Purpose
Freeze the patch surface and named exclusions so no later phase can silently broaden the mission.

### Entry criteria
- Phase 0 exit criteria GREEN.

### Required artefacts
- `F6A_MISSION_BRIEF.md §Patch surface` (3 nodes: 2 new, 1 modified; 4 connection edits; net +2/+2 counts).
- `F6A_MISSION_BRIEF.md §Out of scope` (explicit exclusion of: supersede lane embedding, other workflows, brain_contract.json, module spec, other open missions, back-fill of existing NULL rows, ivfflat retrain, Path 5, caller-supplied-embedding live proof).

### Exit criteria
- Patch surface listed in exact node/connection terms (no free text "whatever needed").
- Each exclusion is stated with reason (why deferred) and follow-up owner (future mission id or "ops task").

### Owner
Agent.

### Halt triggers
- Any exclusion without justification.
- Any patch surface item without a named node and field.

### Status at opening
GREEN. Phase 1 artefacts inside the mission brief.

---

## Phase 2 — Design freeze

### Purpose
Lock all design decisions (Q1–Q6) and produce the testing strategy before anyone writes the builder.

### Entry criteria
- Phase 1 exit criteria GREEN.

### Required artefacts
- `F6A_DESIGN_FREEZE.md` — answers to:
  - Q1 insertion point (between Prep and Store_DB, mirror of F2).
  - Q2 storage contract (vector(1536) nullable, pgvector literal via JSON.stringify).
  - Q3 idempotency (ON CONFLICT DO NOTHING unchanged; back-fill out of scope).
  - Q4 failure behavior (graceful degrade, embedding=NULL on HTTP fail).
  - Q5 diff surface (2 new nodes, 1 modified, 4 connection edits).
  - Q6 regression families to verify (store / search semantic / lexical fallback / non-target lanes).
- Full Merge jsCode verbatim.
- Full before/after Store_DB SQL with the `CASE WHEN $14::text IS NULL THEN NULL ELSE $14::vector(1536) END` guard.
- 10 pre-apply diff-surface invariants enumerated.
- `F6A_TESTING_STRATEGY.md` — 41 local cases (L1–L7), 28 live E2E cases (E1–E6), 7 DB invariants (DB-INV-1…DB-INV-7), idempotency namespace.
- This file (`F6A_EXECUTION_PLAN.md`).
- `F6A_BLOCKER_REGISTER.md` with initial "open" state and the §Known deliberate exclusion for supersede deferral.
- `F6A_STATE.json` with phase=2, status=OPEN.
- `F6A_CURRENT_STAGE.md` with cursor at end-of-Phase-2.
- `F6A_DISPATCH_LOG.md` with the opening entry.

### Exit criteria
- All five Phase-2 mandatory outputs present (`MISSION_BRIEF`, `DESIGN_FREEZE`, `TESTING_STRATEGY`, `EXECUTION_PLAN`, `BLOCKER_REGISTER`).
- State/cursor/dispatch trio present.
- `F6A_DESIGN_FREEZE.md` §Diff surface invariants is the single source of truth for what Phase 6 post-apply verification must check.

### Owner
Agent.

### Halt triggers
- Any Q1–Q6 answer that is vague or conditional.
- Any test case that cannot be run with the tools listed in the pack.
- Any DB invariant that requires a DDL mutation (F6A is data-plane only — `memory_items.embedding` column already exists, migration.sql:150).

### Status at opening
GREEN once this file and the blocker register are committed. Mission brief, design freeze, and testing strategy already landed 2026-04-23.

---

## Phase 3 — State ledger + cursor + dispatch

### Purpose
Give the next session (or the same session after a context break) an unambiguous "where are we" read without replaying all docs.

### Entry criteria
- Phase 2 exit criteria GREEN.

### Required artefacts
- `F6A_STATE.json` — machine-readable cursor.
- `F6A_CURRENT_STAGE.md` — human-readable cursor.
- `F6A_DISPATCH_LOG.md` — append-only log of what the agent did in each phase.
- Fix log (`F6A_FIX_LOG.md`) is **not** required until the first fix; created lazily.

### Exit criteria
- `F6A_STATE.json` validates as JSON.
- Cursor reflects the current phase, status, and next-action.
- Dispatch log has an opening entry dated 2026-04-23.

### Owner
Agent.

### Halt triggers
- Cursor points to a phase whose exit criteria are still RED.

### Status at opening
GREEN once the state/cursor/dispatch trio is written.

---

## Phase 4 — Deterministic builder + patch payload

### Purpose
Produce a byte-reproducible payload that the operator can apply via `n8n-patch.mjs replace`. No live mutation yet.

### Entry criteria
- Phase 3 exit criteria GREEN.

### Required artefacts
- `artifacts/build_patch_f6a.mjs` — deterministic builder. Inputs: the pre-apply workflow JSON dump (read-only MCP `get_workflow`). Outputs:
  - `artifacts/WF-ME-01_pre_f6a.json` — canonical pre-apply snapshot.
  - `artifacts/WF-ME-01_post_f6a.json` — full-workflow payload that `replace` channel will upload.
- `artifacts/diff_summary_f6a.md` — human summary of the diff the builder produces: 2 added nodes, 1 modified node (SQL + queryReplacement), 4 edge changes, node/conn counts 45→47 / 63→65. This summary is what a reviewer looks at before the operator runs the CLI.

### Builder invariants (encoded as assertions inside the builder)
- `BUILD-INV-1` Only the three named nodes appear in the diff (add/add/modify). Every other node must be byte-identical to the pre dump.
- `BUILD-INV-2` Only four connection edits appear, exactly as spelled in `F6A_DESIGN_FREEZE.md §Q5` (remove Prep→DB; add Prep→Embed; add Embed→Merge; add Merge→DB). Every other connection must be byte-identical.
- `BUILD-INV-3` `ME_Memory_Store_Embed.parameters` equals `ME_Memory_Search_Embed.parameters` modulo the input field path (`$json.__db.query_text` → `$json.__db.content` — the existing `content` field already emitted by `ME_Memory_Store_Prep.__db`, so no change to Store_Prep is required) and the credential reference (`svM62oyFwPbaIeX4` reused).
- `BUILD-INV-4` `ME_Memory_Store_Embed_Merge.parameters.jsCode` matches the verbatim block in `F6A_DESIGN_FREEZE.md §Merge jsCode`.
- `BUILD-INV-5` `ME_Memory_Store_DB.parameters.query` starts with `INSERT INTO public.memory_items (` and the column list ends with `, embedding)`; the VALUES list contains exactly 14 positional binds, the 14th is `CASE WHEN $14::text IS NULL THEN NULL ELSE $14::vector(1536) END`.
- `BUILD-INV-6` `ME_Memory_Store_DB.parameters.options.queryReplacement` has exactly 14 elements; the first 13 are byte-identical to the pre dump; the 14th equals `={{ $json.__db.embedding_text }}`.
- `BUILD-INV-7` No credentials are added, removed, or renamed by the builder.
- `BUILD-INV-8` No node position changes except (a) the two new nodes receiving their own coordinates and (b) one deliberate single-column x-shift on `ME_Memory_Store_DB.position` from `[3008,1040]` to `[3128,1040]` so the new Store_Embed_Merge can occupy `[3008,1040]` and the two-lane layout (store / search) stays vertically aligned with the F2 search-lane offsets. This shift is visual-layout only; no downstream node moves; no behavior changes.
- `BUILD-INV-9` `settings`, `staticData`, `pinData`, `meta`, `triggerCount`, `tags`, and `name` of the workflow are byte-identical to the pre dump.
- `BUILD-INV-10` `active` is preserved exactly (expected: `true`).

### Exit criteria
- Pre and post payloads exist, are valid JSON, and the builder exits zero.
- All 10 builder invariants pass inside the builder's own self-check (the builder must refuse to emit if any invariant fails).
- `diff_summary_f6a.md` is written and matches `F6A_DESIGN_FREEZE.md §Q5`.

### Owner
Agent (builder) — no mutation. The operator does not run the builder in Phase 4; they run the CLI in Phase 5.

### Halt triggers
- Any builder invariant fails.
- Pre dump versionId does not equal `96962424-a9b1-4b7d-aa58-33ccc9c2b6a6`.
- Pre dump reveals the workflow diverged from the stated baseline (e.g., connection list mismatch vs. Phase 0 baseline).

---

## Phase 5 — Apply-command artefact + pre-apply verification

### Purpose
Hand the operator a single, exact command block to paste into their shell. Verify live state is still the baseline before applying.

### Entry criteria
- Phase 4 exit criteria GREEN.

### Required artefacts
- `F6A_APPLY_COMMAND.md` — the operator-run CLI command block, in this exact shape:
  - Pre-check: `cd` to the repo root, confirm node >= 20, confirm `artifacts/WF-ME-01_post_f6a.json` exists and matches expected sha256.
  - Version assertion: out-of-band via read-only `mcp__n8n__verify_workflow` (the CLI does not expose an `--expect-version` flag). Expected baseline: versionId `96962424-a9b1-4b7d-aa58-33ccc9c2b6a6`, nodeCount 45, connectionCount 63, active true.
  - Apply: `node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs replace uq26nh1grIpnHju0 docs/architecture/memory/v2/f6a/artifacts/WF-ME-01_post_f6a.json` (positional `<id> <file>` form — matches the F2 precedent in `v2/f2/patch_plan_f2.md §Rollout`; no `--reactivate` because `WF-ME-01` has no webhook triggers).
  - Post-apply: `mcp__n8n__get_workflow` (read-only) to capture the new versionId.
- Pre-apply verification section of `F6A_APPLY_EVIDENCE_<date>.md`:
  - MCP `get_workflow` dump — node list, connection list, baseline versionId.
  - MCP `verify_workflow` output — ALL GREEN expected.
  - Assertion list from Phase 0 baseline (nodeCount=45, connectionCount=63, active=true, versionId=96962424).

### Exit criteria
- `F6A_APPLY_COMMAND.md` contains exactly one apply command line to run (positional form `replace <id> <file>`; no `--expect-version`, no `--reactivate`).
- Pre-apply verification is recorded, matches baseline, and is signed with timestamp.
- Operator has not yet run the command.

### Owner
Agent (writes the command and pre-state). Operator acts in Phase 6.

### Halt triggers
- `get_workflow` returns a versionId other than `96962424-a9b1-4b7d-aa58-33ccc9c2b6a6` — indicates the live workflow changed between Phase 0 and Phase 5. Stop, diff, and reconcile with the operator.
- `verify_workflow` returns any non-green item — stop and reconcile.

---

## Phase 6 — Agent apply + post-apply verification

### Purpose
Land the patch and prove the diff surface matches what was designed.

### Entry criteria
- Phase 5 exit criteria GREEN.
- User has approved the single apply command (one-sentence plain-language preamble + confirmation) per the approval-gated command-preamble feedback.

### Required artefacts
- Agent executes the exact command block from `F6A_APPLY_COMMAND.md` via `Bash`, using the local `n8n-patch` pack's `.env` for credentials (V2-028 canonical channel, `protocol_agent_run_local_patch.md`). CLI exit code, stdout, stderr are captured verbatim.
- Post-apply verification appended to `F6A_APPLY_EVIDENCE_<date>.md`:
  - CLI exit code + trimmed stdout/stderr (no credentials).
  - New versionId captured from `mcp__n8n__get_workflow` post-apply.
  - `get_workflow` post-dump: nodeCount=47, connectionCount=65, active=true, both new nodes present with the exact parameter fields from Phase 4, Store_DB SQL matches the 14-bind form.
  - `verify_workflow` post-run: ALL GREEN.
  - All 10 diff-surface invariants from `F6A_DESIGN_FREEZE.md` checked one-by-one with evidence lines.
  - `.audit.jsonl` tail snippet (append-only trail from the pack itself).

### Exit criteria
- CLI exit is zero.
- Live versionId differs from baseline (confirms the apply happened).
- All 10 invariants are GREEN with explicit quotes/counts.
- `verify_workflow` is GREEN.

### Owner
Agent (apply + verification; no operator hand-off). V2-028 channel rule.

### Halt triggers
- `replace` command fails (any non-zero exit).
- Post-dump does not match design (e.g., node count is not 47).
- Any invariant is RED — immediately enter Rollback Sub-phase 6.R.

### Rollback Sub-phase 6.R (only if triggered)
- Agent re-runs `replace` with `artifacts/WF-ME-01_pre_f6a.json` through the same local `n8n-patch` pack to restore the baseline.
- Agent captures the rollback versionId and logs the incident in `F6A_FIX_LOG.md`.
- Mission status becomes BLOCKED; closeout goes through `F6A BLOCKED_WITH_EVIDENCE`.

---

## Phase 7 — Local matrix

### Purpose
Prove the patch behaves correctly under isolated local runs before exercising live traffic.

### Entry criteria
- Phase 6 exit criteria GREEN.

### Required artefacts
- `F6A_LOCAL_RESULTS.md` with one row per test case in the 41-case matrix (L1–L7 from `F6A_TESTING_STRATEGY.md`).
- Any helper scripts live under `docs/architecture/memory/v2/f6a/artifacts/local/`.

### Exit criteria
- All 41 cases PASS or explicitly marked NOT-APPLICABLE with justification.
- DB invariants DB-INV-1…DB-INV-7 checked and recorded (each has an explicit SQL and expected result in `F6A_TESTING_STRATEGY.md`).

### Owner
Agent (run + record; `mcp__postgres__execute_sql` is SELECT-only, so no mutation occurs outside the store-path traffic itself).

### Halt triggers
- Any case that should PASS fails and cannot be reconciled with the design (i.e., a real regression, not a test-rig bug).

---

## Phase 8 — Live E2E matrix

### Purpose
Exercise the patch in the live workflow, including the one thing the local matrix can't fully simulate: the real `replace` path end-to-end.

### Entry criteria
- Phase 7 exit criteria GREEN.

### Required artefacts
- `F6A_E2E_RESULTS.md` with one row per test case in the 28-case matrix (E1–E6 from `F6A_TESTING_STRATEGY.md`).
- Idempotency namespace `mem-smoke-v2f6a-*` used for every row; namespace is documented in `F6A_TESTING_STRATEGY.md`.

### Exit criteria
- All 28 cases PASS or explicitly marked NOT-APPLICABLE with justification.
- At least one case in E3 produces hard evidence of semantic retrieval returning a row that was unreachable before the patch (this is Success criterion #9 from the mission brief).
- DB invariants DB-INV-1…DB-INV-7 re-checked against the rows produced in E1–E6.
- Non-target lane coverage (E6) shows no regression in search lexical fallback, recall, supersede, promote.

### Owner
Agent (invoke via `mcp__f2e8be41-…__execute_workflow` + `mcp__postgres__execute_sql` SELECT).

### Halt triggers
- Any E-case with a real regression in a non-target lane.
- Semantic benefit evidence cannot be produced (would mean the patch did not achieve its purpose).

---

## Phase 9 — Reconciliation

### Purpose
Classify every anomaly, prove that no unresolved regression remains on any family.

### Entry criteria
- Phase 8 exit criteria GREEN.

### Required artefacts
- `F6A_RECONCILIATION.md` with one section per family (store / search semantic / search lexical fallback / recall / supersede / promote / observability envelope).
- Each section lists: cases run, cases passed, cases failed, classification of failures (real regression vs. test-rig artefact vs. intended change), and disposition.

### Exit criteria
- No unresolved regression remains.
- Any "intended change" (e.g., search semantic now returns post-patch rows that were previously unreachable) is explicitly called out.
- Success criterion #11 from the mission brief is met.

### Owner
Agent.

### Halt triggers
- Any real regression in a non-target family.

---

## Phase 10 — Closeout + writeback

### Purpose
Fold F6A into the project's current-truth layer so that future sessions treat the store-path embedding producer as frozen.

### Entry criteria
- Phase 9 exit criteria GREEN.

### Required artefacts
- `F6A_FINAL_STATUS.md` — single line verdict: exactly `F6A SUCCESS — STORE-PATH EMBEDDING PRODUCER LANDED` or `F6A BLOCKED_WITH_EVIDENCE`.
- Writebacks (exact, minimal):
  - `docs/architecture/memory/MEMORY_V2_STATE.md` — phase table entry + live versionId update.
  - `docs/architecture/memory/MEMORY_V2_PHASE_GATES.md` — F6A row moves to CLOSED with evidence pointer.
  - `docs/architecture/memory/MEMORY_V2_CLOSEOUT.md` — F6A closeout block.
  - `docs/architecture/memory/SESSION_HANDOFF_NEXT.md` — §A current-truth update; §G next-candidate list update (supersede-lane mirror becomes F6E follow-up).
  - `docs/architecture/memory/v2/stabilization/CURRENT_TRUTH_POST_F5.md` §4 — remove the store-path-embedding interdiction (it's landed, not forbidden); add a line pointing to F6A closure.
  - `docs/architecture/memory/MEMORY_V2_DECISION_LEDGER.md` — new ledger entry at the next free ledger id (inspect the current ledger immediately before writeback and pick the lowest unused `V2-NNN`) recording the store-path embedding producer decision.
- Auto-memory anchor update — `/sessions/tender-amazing-franklin/mnt/.auto-memory/project_memory_module_post_f5_anchor.md` updated to mention F6A CLOSED and the new live versionId.
- Auto-memory hook in `MEMORY.md` updated accordingly (single-line edit).

### Exit criteria
- All 13 success criteria from `F6A_MISSION_BRIEF.md §Success criteria` hold.
- All 6 control docs are updated with non-duplicating pointers.
- `F6A_FINAL_STATUS.md` verdict is written.

### Owner
Agent.

### Halt triggers
- Any of the 13 success criteria fails — verdict must be `F6A BLOCKED_WITH_EVIDENCE` and the failed criterion must be named.

---

## Phase gate summary

| Phase | Title | Entry | Owner | Mutates live? |
|---|---|---|---|---|
| 0 | Truth anchor | — | Agent | No |
| 1 | Scope freeze | P0 | Agent | No |
| 2 | Design freeze | P1 | Agent | No |
| 3 | State + cursor + dispatch | P2 | Agent | No |
| 4 | Builder + payload | P3 | Agent | No |
| 5 | Apply command + pre-verify | P4 | Agent | No |
| 6 | Agent apply + post-verify | P5 | Agent | **Yes** (agent via local pack) |
| 7 | Local matrix | P6 | Agent | SELECT only |
| 8 | Live E2E matrix | P7 | Agent | Live traffic via `execute_workflow` |
| 9 | Reconciliation | P8 | Agent | No |
| 10 | Closeout + writeback | P9 | Agent | Doc commits only |

Only Phase 6 mutates workflow structure. Phase 8 generates new rows in `memory_items` via the live store-path — those rows are the smoke traffic and are expected.

---

## Hand-off points (user ↔ agent)

Under V2-028 the agent owns every mutation step, so there are no hand-offs to a human apply actor. The remaining gates are approval/review gates, not channel hand-offs:

1. **Phase 5 → Phase 6.** Agent emits a one-sentence plain-language preamble describing the exact apply command (`n8n-patch.mjs replace uq26nh1grIpnHju0 docs/architecture/memory/v2/f6a/artifacts/WF-ME-01_post_f6a.json`) and waits for user approval. On approval the agent runs the command itself and proceeds directly to post-apply verification.
2. **Phase 6.R (rollback).** If post-apply verification is RED, the agent runs the rollback `replace` (re-applying `WF-ME-01_pre_f6a.json`) through the same local pack, captures the rollback versionId, and writes the incident into `F6A_FIX_LOG.md`. Mission status flips to BLOCKED; closeout goes through `F6A BLOCKED_WITH_EVIDENCE`.
3. **Phase 10 writeback.** Agent writes to docs directly; the user reviews and either commits or asks for an amendment.

No other hand-off points exist. Every phase (0–10, including Phase 6 apply) is agent-executed.

---

## Forbidden actions in every phase

- Using `mcp__n8n__patch_workflow_nodes` on `WF-ME-01` (blocked per sub-B).
- Using Path 5 as a default channel (retired per V2-025; only V2-026's 8-condition escape hatch remains, and F6A does not invoke it).
- Using the superseded operator-run CLI protocol (V2-025 / `protocol_operator_run_cli.md`) — handing the apply off to a human operator is no longer the canonical channel.
- Editing `brain_contract.json`.
- Editing any node in `WF-ME-01` except the three in scope.
- Editing any workflow other than `WF-ME-01`.
- Back-filling `memory_items.embedding` for existing NULL rows (out of scope — future ops task).
- Retraining or rebuilding the `ivfflat` index (F6C candidate; no code change here).
- Applying the supersede-lane mirror (deliberately deferred to F6E).

---

## Status at end of Phase 2 (document commit time)

- Phases 0, 1, 2 GREEN.
- Phase 3 pending — needs `F6A_STATE.json` + `F6A_CURRENT_STAGE.md` + `F6A_DISPATCH_LOG.md`.
- Phase 4 pending — builder not yet written.
- No blocker. Supersede-lane exclusion recorded in `F6A_BLOCKER_REGISTER.md §Known deliberate exclusion`.
