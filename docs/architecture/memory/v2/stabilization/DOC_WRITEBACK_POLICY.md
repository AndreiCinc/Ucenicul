# DOC_WRITEBACK_POLICY.md

Frozen: 2026-04-24 (post-DOC-SYSTEM-COMPACTION-POST-V2-034).
Purpose: stop producing redundant writeback across 6–8 files after every micro-mission. This file is the authority on *where* documentation truth lives and *how little* needs to change after a mission.

Authority: subordinate to `MEMORY_V2_MISSION.md` (Level 3). Equal in weight to `CURRENT_TRUTH_POST_F5.md` for the writeback-procedure clause only; `CURRENT_TRUTH_POST_F5.md` remains the single source of current truth.

---

## 1. Active front door

- **`CURRENT_TRUTH_POST_F5.md` is the single front door for current truth.** A fresh session reads it first. All other control docs are subordinate.
- Other files (state, handoff, closeout, phase gates, historical) must not override `CURRENT_TRUTH_POST_F5.md`. If they drift, `CURRENT_TRUTH_POST_F5.md` wins and the drifted file is corrected to match.
- `SESSION_HANDOFF_NEXT.md` is a **handoff pointer + operator context**, not the primary source of current truth.

## 2. Minimal writeback rule

For a normal runtime/workflow mission, the *required* writeback is only these 5 touch-points:

1. **Mission-local folder** — complete `LIVE_RESULTS*.md` / `DESIGN_FREEZE*.md` / `APPLY_EVIDENCE*.md` etc. This is where the full detail lives.
2. **`MEMORY_V2_DECISION_LEDGER.md`** — one new row per closed mission (ID + date + decision + rationale). Append-only.
3. **`CURRENT_TRUTH_POST_F5.md`** — compact update: add the mission to the current-truth bullet list, update versionId if advanced, update lineage, update active-frontier line. Do not duplicate the mission-local closeout.
4. **`MEMORY_V2_STATE.md`** — one compact paragraph in `active frontier` + `status` + `just-closed frontier` + `Live context snapshot`. Do not duplicate.
5. **`SESSION_HANDOFF_NEXT.md`** — short pointer in §A + §H, with the new versionId and mission name. Do not duplicate the full closeout.

## 3. Files no longer updated by default

- **`MEMORY_V2_PHASE_GATES.md`** — only for major frontiers or multi-phase programs. Micro-missions (single mutation + probe, < 7 gates) do not need gate tables.
- **`HISTORICAL_VS_CURRENT.md`** — only when an authority policy changes or a current-pointer drifts. One-line entries per closed ledger ID is acceptable; full classification updates are not required per-mission.
- **`MEMORY_V2_CLOSEOUT.md`** — only as a short index of closed frontiers. Do not duplicate the full mission-local closeout into it.
- **Auto-memory anchors** (`/sessions/.../mnt/.auto-memory/`) — only when the operator explicitly asks, or when a major current-truth constant changes (versionId, active frontier, canonical channel). Not every micro-mission.

## 4. No duplication rule

Do not copy full closeout content into 5 places. Apply the role split:

- **Mission-local folder** = full detail (design freeze, local/live/SQL results, artifacts, sha256s).
- **Front-door (`CURRENT_TRUTH_POST_F5.md`)** = compact summary + pointer to mission-local.
- **Ledger (`MEMORY_V2_DECISION_LEDGER.md`)** = decision + rationale row (append-only).
- **Handoff (`SESSION_HANDOFF_NEXT.md`)** = pointer + current versionId + one-line note.
- **State (`MEMORY_V2_STATE.md`)** = compact snapshot (1 paragraph).

If you find yourself writing the same 10-line closeout paragraph in 4 files, stop and point to the mission-local folder instead.

## 5. Context budget rule

Every mission plan must declare its context budget upfront:

- **Layer 0** = mission-local files + the operator pack. Always read.
- **Layer 1** = front-door + state + handoff + ledger + closeout. Read when writing to them.
- **Layer 2** = `HISTORICAL_VS_CURRENT.md`, `MEMORY_V2_PHASE_GATES.md`, auto-memory anchors. Read only if updating them.
- **Layer 3** = historical mission folders (F1/F2/F3/F4/F5/F6A/F6A-FOLLOWUP/V2-014/V2-OBS-*/V2-031/V2-032). Read only on conflict that cannot be resolved from Layer 0–2.

The plan must list the exact files to read, when Claude is allowed to escalate a layer, and which files are forbidden without an explicit conflict.

## 6. Test-count rule

Do not inflate test counts artificially. Report direct checks at natural cardinality.

- **Runtime / workflow / DB work** — aim for 50 per load-bearing category (unit, live runtime, SQL). Deviations allowed if the problem does not admit 50.
- **Diff-surface / byte-identity / PP-INV lanes** — ship at natural cardinality (often 14, 8, 6, etc.). Do not pad to 50.
- **Doc-fix missions** — audit grep checks + textual assertions, not 50 synthetic tests.
- **Report direct checks GREEN**, not aspirational totals. Example: V2-033 = 166 (50 + 14 + 50 + 50 + 2), V2-034 = 164 (50 + 14 + 50 + 50), combined = 330. Never cite "200/200" or "400+" for these missions.
- The pack's `00_PROJECT_STANDING_RULE_50_TESTS.md` names a 4-category floor (unit/diff-surface/runtime/SQL) and that shape must be present, but lane cardinality follows the problem.

## 7. Closeout before next frontier

Do not open a new frontier if any of these is unresolved:

- Current live versionId is not propagated to front-door + state + handoff.
- Active frontier is not stated as NONE in front-door + state.
- Any closed mission still appears as open/candidate/pending.
- Canonical apply channel is ambiguous.
- `CURRENT_TRUTH_POST_F5.md` and `MEMORY_V2_STATE.md` drift on any current-truth constant.

If any of the above holds, run a DOC-WRITEBACK or DOC-SYSTEM-COMPACTION pass first. The new frontier waits.

---

## Quick reference

| Touch point | When | What |
|---|---|---|
| Mission-local folder | Every mission | Full detail (authoritative) |
| `MEMORY_V2_DECISION_LEDGER.md` | Every closed mission | 1 append-only row |
| `CURRENT_TRUTH_POST_F5.md` | Every closed mission | Compact summary + versionId + lineage update |
| `MEMORY_V2_STATE.md` | Every closed mission | 1-paragraph snapshot |
| `SESSION_HANDOFF_NEXT.md` | Every closed mission | Pointer + versionId + 1-line note |
| `MEMORY_V2_PHASE_GATES.md` | Major frontier only | Gate table |
| `HISTORICAL_VS_CURRENT.md` | Authority/policy change | Targeted line |
| `MEMORY_V2_CLOSEOUT.md` | Index only | 1-line mission-name + pointer |
| Auto-memory anchors | Major current-truth change or explicit operator ask | Anchor + MEMORY.md index update |

## Precedence

If this policy conflicts with an earlier procedure note buried in a historical closeout, this policy wins. If it conflicts with `MEMORY_V2_MISSION.md` or `CURRENT_TRUTH_POST_F5.md`, those win.
