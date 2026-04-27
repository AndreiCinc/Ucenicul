# OR PASSTHROUGH PLANNER CONTEXT INPUTS · Execution Log

> Mission: `OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_FOLLOWUP`
> Repo root: `C:\Users\andre\Projects\Ucenicul`
> Started: `2026-04-26T02:06:08Z`

---

## 0. Predecessor verdicts (carried in)

- `MEMORY_SUPERSEDE_PL_INTENTMAP_READY = TRUE`
- `AMBIGUOUS_CONTENT_GUARDS_READY = TRUE`
- `F14_STORE_MEMORY_INTENTMAP_READY = TRUE`
- `IMPROVEMENT_MODULE_LIVE_EXECUTION_READY_FOR_E2E = TRUE`
- `TASK_MODULE_LIVE_EXECUTION_READY_FOR_E2E = TRUE`
- F9 telemetry-only (not a gate)
- Memory V2 closed
- C4 supersede unblocked-via-direct-PL but not via canonical chain (this mission's target)

## 1. Workflow live versions (pre/post)

| WF | id | versionId before | versionId after |
|---|---|---|---|
| WF-TR-01 | `wI8hpSROxQI0zC9f` | `89b783f8…` | `ce336539-c3c1-4397-8b2e-a174c4e72464` (then re-patched after the v1.1 safeNode fix; current value reflects the post-fix patch) |
| WF-EC-01 | `v9jih4jqeXpOJOiH` | `78569035…` | `d25e4316-f584-4f2b-ba83-423ff82d749b` |
| WF-OR-01 | `KhGmNpi0ZDmrnz8W` | `2d37a1f3…` | `f4925ede-35c5-41a1-baff-54c9a2de8101` |
| (other 7 canonical workflows) | — | unchanged | unchanged |

## 2. Discovery summary

- `public.messages` schema has **no** `metadata` column. ID-style fields present: `author_entity_id`, `thread_id`, `telegram_chat_id`, `telegram_message_id`. None of these is `memory_id` or `task_id`.
- The chat envelope DOES carry a `metadata` object (`{memory_id, task_id, …}` is what UIs would emit), and `TR_Validate_Input` preserves it (`metadata: req.metadata || {}`).
- The chain drops envelope metadata at **`TR_Build_EC_Envelope`** (current output: `{tenant_id, thread_id, trigger_message_id, resolution_method, resolved_at, idempotency_key}` — no `metadata`).
- `execution_contexts` schema has `working_notes jsonb` and similar columns but they are unused by the EC upsert SQL today.
- `OR_Load_Trigger_Message` SQL only selects 4 message columns (id, normalized_content, content, intent).
- `OR_Build_Handoff_Payload` v1.4 only injects `user_message_text` and `primary_intent` from msgRow into `planner_context`; it does not touch upstream fields.
- `WF-PL-01.PL_Build_Planner_Input` v2.3 (post-MSS) already consumes `plannerContext.inputs` and merges it into the per-action `inputs`. **PL needs no change.**

## 3. Patch surface decision

Plumb envelope `metadata` (renamed to `envelope_metadata` for clarity) **in-memory** through TR → EC → OR via 6 surgical jsCode rewrites:

1. `WF-TR-01.TR_Build_EC_Envelope` — propagate `envelope_metadata: src.metadata || {}`.
2. `WF-EC-01.EC_Validate_Input` — preserve `envelope_metadata`.
3. `WF-EC-01.EC_Return_Result` — read `envelope_metadata` via `$('EC_Validate_Input')` and include in return.
4. `WF-OR-01.OR_Validate_EC_Result` — keep `envelope_metadata` in `_normalized_ec_result.payload`.
5. `WF-OR-01.OR_Extract_Handoff_Input` — pass through `envelope_metadata`.
6. `WF-OR-01.OR_Build_Handoff_Payload` — apply ALLOWLIST and write into `planner_context.inputs`.

NO schema mutation. NO new node. NO new connection. NO new workflow. NO Path 5. Memory V2 untouched. PL untouched.

Allowlisted keys (write-through to `planner_context.inputs` only): `memory_id`, `target_memory_id`, `supersedes_memory_id`, `task_id`, `entity_id`, `business_id`, `source_thread_id`, `source_message_id`. Each value validated as UUID-shaped string before passthrough; non-UUID values are dropped silently. Unrecognized keys are dropped.

## 4. Final verdict

**`OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_READY = TRUE`** — see `OR_PASSTHROUGH_CLOSEOUT.md`.

End-to-end canonical-chain supersede verified live (exec 9732); 11/11 invariants GREEN; 5 regressions GREEN; tenant isolation enforced; reminders unchanged; Memory V2 untouched; PL untouched.
