# F14 — PL `store_memory` IntentMap Fix · Execution Log

> **Mission:** `F14-PL-MEMORY-INTENTMAP-STORE-MEMORY-FIX`
> Subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md`,
> `docs/architecture/n8n_Workflow_Mapping.md`,
> `docs/architecture/Module_Registry_Ucenicul.md`.

## 1. Run identity

| Field | Value |
|---|---|
| Start timestamp (session) | 2026-04-25 |
| Repo root (host) | `C:\Users\andre\Projects\Ucenicul` |
| Repo root (sandbox) | `/sessions/clever-magical-wozniak/mnt/Ucenicul` |
| Predecessor mission | `E2E-RECONCILIATION-DOC-NORMALIZATION-AFTER-F9` (closed; F9 reclassified as telemetry-only) |

## 2. Live workflow versions (pre-mission)

| Workflow | id | versionId | nodes | active |
|---|---|---|---|---|
| WF-TR-01 | `wI8hpSROxQI0zC9f` | `89b783f8…` | 24 | ✅ |
| WF-EC-01 | `v9jih4jqeXpOJOiH` | `78569035…` | 11 | ✅ |
| WF-OR-01 | `KhGmNpi0ZDmrnz8W` | `2d37a1f3…` | 13 | ✅ |
| WF-PL-01 | `RwToPLa1ErHl2tUi` | **`898fa273-68d3-4443-b6f9-9990d1739bb2`** | 16 | ✅ |
| WF-DI-01 | `abqYINcXr3JAhGGk` | `8b10a865…` | 16 | ✅ |
| WF-ME-01 | `uq26nh1grIpnHju0` | `3804ec0e…` | 59 | ✅ |
| WF-RA-01 | `5RcNLtxNjAHJsZPE` | `4a2be8b4…` | 16 | ✅ |
| WF-SU-01 | `ENiYNfL3ul8AmmCB` | `4e7bc0d1…` | 18 | ✅ |
| WF-RC-01 | `TClXgmO8H8zsSwMb` | `6d3f5208…` | 18 | ✅ |
| WF-MO-01 | `OooZdC0DgsDR6gm0` | `4e0163b2…` | 18 | ✅ |

DB baselines:

- `public.reminders`: 1 row, `last_updated=2026-04-13T20:17:13Z` (pre-mission).
- `public.rag_memories` for tenant `eee0e2e0-…0001`: 0 rows.

## 3. Layer-0 docs read

- `docs/architecture/e2e/PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` (post-F9 normalized; §0.1 lists F14 as the smallest, highest-leverage next frontier).
- `docs/architecture/e2e/E2E_RECONCILIATION_DOC_NORMALIZATION_AFTER_F9.md`.
- `docs/architecture/or/live_execution_gating/F9_OR_GATING_CLOSEOUT.md` — confirms F9 is telemetry-only and not a gate.
- Memory current-state: `docs/architecture/memory/MEMORY_V2_CLOSEOUT.md` (read compactly: `MEMORY_100_FOR_CURRENT_STAGE = TRUE`; F5 write-fence; ME memory store + supersede + recall + search are real DB-backed handlers; idempotency by `idempotency_key` column UNIQUE on `public.rag_memories`).

## 4. Layer-1 docs read

- `docs/architecture/Module_Registry_Ucenicul.md` — `memory_module` entry confirms `store_memory` as a canonical capability with idempotency contract.
- `docs/architecture/n8n_Workflow_Mapping.md` — apply policy + parameterized SQL policy.
- `WF-PL-01` workflow JSON (live, versionId `898fa273…`) — `PL_Build_Planner_Input` v2.0 source code captured.
- `WF-ME-01` workflow JSON (live, versionId `3804ec0e…`) — `ME_Route_Memory_Action` switch + `ME_Memory_Store_Prep` jsCode captured (real DB-backed pipeline; required fields `content`, `memory_type`, `category`, `source_thread_id`; idempotency_key built from `execution_context_id + step_id`).

## 5. Discovery findings (preliminary; full detail in `F14_STORE_MEMORY_DISCOVERY.md`)

**PL gap confirmed.** `WF-PL-01.PL_Build_Planner_Input` v2.0 jsCode comment
explicitly admits: *"F14 store_memory gap is OUT OF SCOPE for this mission
— left as in v1.3."* The two routing maps both miss the entry:

- `intentMap`: has `search_memory: 'search_memory'` and `save_suggestion:
  'capture_feedback'`, but **no `store_memory`**.
- `actionToModule`: has `search_memory: 'memory_module'` and
  `capture_feedback: 'improvement_module'`, but **no `store_memory`**.
- `extractInputsForAction(action, goalText)`: handles `search_memory`,
  `capture_feedback`, `observe`, but has **no `store_memory`** clause.

**ME store handler is fully real and contract-aligned.**

- `ME_Route_Memory_Action` switch has `store_memory` as its first output
  (when `step.inputs.action === 'store_memory'`).
- `ME_Memory_Store_Prep` validates required inputs (`content`,
  `memory_type ∈ {fact,observation,pattern,inference,preference,constraint}`,
  `category` matching `^[a-z][a-z0-9_]{0,63}$`, `source_thread_id`),
  emits `idempotency_key = 'store_memory:' + execution_context_id + ':' + step_id`,
  and writes through `ME_Memory_Store_Embed` → `ME_Memory_Store_Embed_Merge`
  → `ME_Memory_Store_DB` to `public.rag_memories`.
- Idempotency is enforced via the existing `rag_memories.idempotency_key`
  UNIQUE constraint with `ON CONFLICT (idempotency_key) DO NOTHING`.

So the gap is **purely PL-side**: ME and the chain downstream of ME are
ready to execute store_memory, but PL never produces a plan step that
routes to it. The fix is one jsCode rewrite on `PL_Build_Planner_Input`.

## 6. Patch design (preview; full detail in `F14_STORE_MEMORY_PATCH_EVIDENCE.md`)

Minimal additive changes to `PL_Build_Planner_Input.parameters.jsCode`:

1. `intentMap.store_memory = 'store_memory'`.
2. `actionToModule.store_memory = 'memory_module'`.
3. New `extractInputsForAction('store_memory', goalText)` clause that
   strips Romanian/English memory-write verb prefixes ("ține minte că…",
   "remember that…", "noteaz[ăa] că…") and emits `content`, plus
   safe-default `memory_type='fact'` and `category='general'` (callers
   may override via `plannerContext.inputs`).
4. A late-binding pass after `requestedActions` is built that injects
   `source_thread_id`, `source_message_id`, `memory_type`, `category`
   defaults for any action whose name is `store_memory` — the
   `extractInputsForAction` function does not see `verify.thread_id`,
   so this defaulting must happen at the request-actions level.

Surface counts:

- 1 jsCode rewrite on `PL_Build_Planner_Input`.
- 0 node delta.
- 0 connection delta.
- 0 schema mutation.

## 7. Apply channel (V2-028)

`node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs replace RwToPLa1ErHl2tUi <patched.json>` — same canonical local CLI used by predecessor missions. Pre-snapshot saved to the n8n-patch tool's `snapshots/` plus
`docs/architecture/pl/f14_store_memory_intentmap/artifacts/WF-PL-01.pre.json`.

## 8. Probe plan

Sequential, scoped by tenant + thread + fire_iso. Run-tag `f14probe-2026-04-25`.

| # | intent | goal |
|---|---|---|
| 1 | `store_memory` | Confirm a real `rag_memories` row is written under tenant default. |
| 2 | `store_memory` (replay, same envelope) | Confirm the `idempotency_key` UNIQUE constraint deduplicates — exactly 1 row. |
| 3 | `search_memory` | Confirm Memory V2 search regression smoke (read-only path unchanged). |
| 4 | `create_task` | Confirm task path still writes a row (no regression on the predecessor mission). |
| 5 | `create_reminder` | Confirm reminder→task re-route still produces a task row + 0 reminders writes. |

After probes, restate the global invariants (reminders unchanged; cross-tenant zero; memory store row count delta = 1 per case for new keys).

## 9. Decisions / declarations

- **No workflow other than `WF-PL-01` will be patched.** `WF-ME-01` is byte-frozen. Memory V2 internals are not modified.
- **No Path 5.** No duplicate workflows. No unauthorized MCP write.
- **No schema migration.**
- **task_module is not modified.**
- The patch is a single jsCode rewrite via the V2-028 canonical local CLI.
