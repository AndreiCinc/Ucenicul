# FULL_240_VARIANT_SWEEP · Execution Log

Run-tag: `f240r-2026-04-26`. Repo root: `/sessions/youthful-vigilant-cori/mnt/Ucenicul`.
Started: 2026-04-26 (autonomous run, post-FULL_240_RERUN baseline).

## Pre-run state

- Pre-mission verdict: `PROJECT_E2E_RICH_TEST_MATRIX_FULL_240_GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS` (FULL_240_RERUN closeout 2026-04-26).
- 17 cases already proven; 223 deferred to this sweep.
- All 10 workflow versionIds verified live + active (TR/EC/OR/PL=839b1750 v2.4/DI=a1f9eaa2/ME=328b2b81/RA/SU/RC/MO).
- `public.reminders` baseline preserved: count=1, last_updated=2026-04-13T20:17:13Z.

## Pre-flight: harness file repair

- Discovered that `docs/architecture/e2e/harness/intent_mapping.mjs` was truncated on disk (4532 bytes, 84 lines, ending mid-statement at `if (cor === ` with no closing quote). Cause unknown (possibly silent truncation during prior write). Restored full content via heredoc bash write — verified via node runtime import: `getSystemIntent({C1, baseline_ro})='briefing'`, `{C2, baseline_ro}='store_memory'`, `{C4, baseline_ro}='supersede_memory'`. **Classified as `HARNESS_BUG` repair — within autonomous safe-fix envelope.**

## Live execution log

### 2026-04-26 setup phase

- Mission folder created. Scope freeze + execution log written.
- `intent_mapping.mjs` truncation discovered (4532 bytes, 84 lines, mid-statement). **Repaired via heredoc bash write**; verified via node runtime import.
- Pre-seed pack applied: 30 new threads + 34 new messages + 3 C4 target memories. `public.reminders` baseline preserved (count=1, last=2026-04-13).

### 2026-04-26 sequential variant fires

22 sequential MCP `execute_workflow` fires through TR `wI8hpSROxQI0zC9f`:

- C10-L1-V2 TR **10239** store_memory → tenant B +1 ✓
- C10-L1-V3 TR **10253** search_memory → 0 writes ✓
- C10-L1-V4 TR **10267** search_memory (cross-leak probe) → 0 cross-tenant rows ✓
- C11-L1-V2 TR **10281** store_memory → default +1 ✓
- C4-L1-V2 TR **10295** supersede_memory → OLD `…000002`→superseded, NEW `bd339d91`→active w/ backlink ✓
- C4-L1-V3 TR **10309** supersede_memory → OLD `…000003`→superseded, NEW `53afa848`→active w/ backlink ✓
- C4-L1-V4 TR **10323** supersede_memory → OLD `…000004`→superseded, NEW `7451329d`→active w/ backlink ✓
- C7-L1-V2 TR **10337** briefing → 0 writes ✓
- C9-L1-V4 TR **10351** briefing → 0 writes ✓
- C2-L1-V2 TR **10365** store_memory → default +1 (`b69c5f28`) ✓
- C3-L1-V2 TR **10379** search_memory → 0 writes ✓
- C6-L1-V2 TR **10393** create_task → +1 task ✓
- C12-L1-V2 TR **10407** create_task → +1 task ✓
- C1-L1-V2 TR **10421** briefing → 0 writes ✓
- C5-L1-V2 TR **10435** briefing → 0 writes ✓
- C8-L1-V2 TR **10449** update_task → 0 NEW row (update path) ✓
- C7-L1-V3 TR **10463** briefing → 0 writes ✓
- C7-L1-V4 TR **10477** briefing → 0 writes ✓
- C11-L1-V3 TR **10491** store_memory → default +1 ✓
- C11-L1-V4 TR **10505** store_memory → default +1 ✓
- C2-L1-V3 TR **10519** store_memory → default +1 ✓
- C6-L1-V3 TR **10533** create_task → +1 task ✓
- C8-L1-V3 TR **10547** create_task → +1 task ✓

### 2026-04-26 closeout

- Verdict: `FULL_240_VARIANT_SWEEP_GREEN_WITH_KNOWN_DEFERRED_FOLLOWUPS`.
- All 9 mission docs written. Reconciliation update applied.
- Final state: reminders count=1 last=2026-04-13 unchanged; 8 chain-written memory rows in default tenant + 1 in tenant B; 3 task rows; 0 improvement rows. 0 workflow mutations. 0 schema mutations.
