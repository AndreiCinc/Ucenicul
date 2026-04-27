# FULL_240_VARIANT_SWEEP · Safe Fixes Applied

Run-tag: `f240r-2026-04-26`.

## Safe-fix #1 — `intent_mapping.mjs` file repair

### Class

`HARNESS_BUG` — file truncation on disk.

### Why

At mission startup, `node docs/architecture/e2e/harness/seed_fixtures.mjs --run-tag f240r-2026-04-26` failed with `SyntaxError: Unexpected end of input` at line 79 of `intent_mapping.mjs`. Direct inspection confirmed the file was 4532 bytes / 84 lines, ending mid-statement at `if (cor === ` (truncation point). Cause unknown (silent file-write truncation in a prior session).

### Patch

Re-wrote the full `intent_mapping.mjs` content via bash heredoc with the canonical post-FULL_240_RUN harness mappings:
- `CORRIDOR_DEFAULT.{C1,C5,C7,C8}=briefing`
- `CORRIDOR_DEFAULT.{C2,C10,C11}=store_memory`
- `CORRIDOR_DEFAULT.C3=search_memory`, `C9=search_memory`
- `CORRIDOR_DEFAULT.C4=supersede_memory`
- `CORRIDOR_DEFAULT.{C6,C12}=create_task`
- C9 thread_A_seed → store_memory; thread_B_durable_recall → search_memory; operational_continue / ambiguous_reference → briefing
- C10 tenant_A/B_seed → store_memory; tenant_A_recall, tenant_B_cross_leak_probe → search_memory
- C11 → store_memory
- C8 message_2_followup_same_thread → update_task
- C12 negative_or_boundary → briefing
- `expectsDomainWrite` updated to recognise store_memory + supersede_memory
- `SYSTEM_INTENTS` includes store_memory + supersede_memory

### Verified via

```js
node -e 'import("./docs/architecture/e2e/harness/intent_mapping.mjs").then(m => console.log(m.getSystemIntent({corridor_id:"C2",variant:"baseline_ro"})))'
// → 'store_memory' ✓
```

### Rollback

The full pre-truncation content is implicitly captured by the post-FULL_240_RUN harness fix design. No rollback needed beyond restoring the broken truncated state.

## Safe-fix #2 — N/A (none other taken)

No PL workflow patch, no DI patch, no ME patch, no OR patch, no DB query fix taken in this sweep. The variant sweep was purely test-runtime, not workflow-bug-fixing.

Workflow mutation count: **0**.
Schema mutation count: **0**.
Memory V2 reopen: **NO**.
Task module change: **NO**.
Improvement module change: **NO**.
Reminder module change: **NO**.
