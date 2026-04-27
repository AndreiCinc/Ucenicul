# OR PASSTHROUGH PLANNER CONTEXT INPUTS · Discovery

> Mission: `OR_PASSTHROUGH_PLANNER_CONTEXT_INPUTS_FOLLOWUP`
> Predecessor blocker tracked in `PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` §0.1.

---

## 1. Where envelope `metadata` lives

The chat envelope JSON sent to `WF-TR-01.TR_Chat_Trigger` contains a `metadata` object (e.g. `{memory_id, task_id, …}`). `WF-TR-01.TR_Validate_Input` v2.0 preserves it verbatim:
```js
metadata: msg.metadata || {},   // (nested shape)
metadata: req.metadata || {},   // (flat shape)
```

But `TR_Build_Result` (the canonical TR output node) does NOT include `metadata` in its output; nor does `TR_Build_EC_Envelope` (the adapter to EC). So the envelope metadata is silently dropped between TR and EC.

## 2. `public.messages` schema — no `metadata` column

```
columns: id, organization_id, tenant_id, content, raw_content_hash, direction,
         intent, created_at, updated_at, telegram_message_id, telegram_chat_id,
         thread_id, channel, author_type, normalized_content, source_message_ref,
         author_entity_id, timestamp
```

No JSONB `metadata` column. So OR's `OR_Load_Trigger_Message` SQL cannot read structured IDs from the messages row.

## 3. `public.execution_contexts` has unused jsonb columns

`execution_contexts` carries `pending_steps`, `completed_steps`, `module_results`, `working_notes`, `shared_artifacts`, `error_state`, `retry_state` as JSONB — but `EC_Upsert_Context` doesn't write to any of them. They are not used as a metadata transport today.

## 4. `OR_Build_Handoff_Payload` v1.4 (pre-mission)

Currently injects two fields into `planner_context`:
```js
plannerContext.user_message_text = msgRow.normalized_content
plannerContext.primary_intent    = msgRow.intent
```
No `inputs` field. So PL receives a planner context without any ID-style structured inputs.

## 5. PL v2.3 already consumes `plannerContext.inputs`

`WF-PL-01.PL_Build_Planner_Input` v2.3 (post `MEMORY_SUPERSEDE_PL_INTENTMAP_FOLLOWUP`) does:

```js
inputs: Object.assign({}, extractedInputs, plannerContext.inputs || {})
```

So if OR sets `planner_context.inputs.memory_id`, PL will merge it into the action's inputs. **PL needs no change.** A subsequent late-binding pass in PL also normalizes `inputs.memory_id → inputs.supersedes_memory_id` for the supersede action.

## 6. `supersede_memory` end-to-end requires `memory_id` reach ME

ME's `ME_Memory_Supersede_Prep` requires `supersedes_memory_id` (UUID). With this mission's plumbing, the chain is:

1. Chat envelope → `metadata.memory_id` UUID.
2. TR_Validate_Input keeps `metadata`.
3. TR_Build_EC_Envelope **(v1.1 in this mission)** reads `metadata` via `safeNode('TR_Validate_Input')` and surfaces it as `envelope_metadata` on the EC envelope.
4. EC_Validate_Input **(v1.1)** preserves `envelope_metadata`.
5. EC_Return_Result **(v1.1)** reads from `safeNode('EC_Validate_Input')` and forwards `envelope_metadata` to OR.
6. OR_Validate_EC_Result **(v1.2)** keeps `envelope_metadata` in `_normalized_ec_result.payload`.
7. OR_Extract_Handoff_Input **(v1.1)** carries it forward.
8. OR_Build_Handoff_Payload **(v1.5)** — the centerpiece — applies the **strict allowlist** below and writes `planner_context.inputs`.
9. PL v2.3 merges `plannerContext.inputs` into the per-action inputs and (for supersede) normalizes `memory_id → supersedes_memory_id`.
10. ME's supersede chain writes the new memory + marks the old superseded.

## 7. Allowlist contract

Only these keys flow from `envelope_metadata` into `planner_context.inputs`:

```
memory_id, target_memory_id, supersedes_memory_id,
task_id, entity_id, business_id,
source_thread_id, source_message_id
```

Each value must be a string matching the UUID regex `^[0-9a-fA-F]{8}-…-[0-9a-fA-F]{12}$`. Non-string, non-UUID, or non-allowlisted values are **dropped silently**. This guarantees:

- No private/large blob blind passthrough.
- No injection of arbitrary planner instructions.
- No shape drift across modules (PL only consumes the keys it knows; new keys must be added to PL too).

## 8. Patch surface

| File | Modification |
|---|---|
| `WF-TR-01.TR_Build_EC_Envelope` | jsCode v1.0 → v1.1 — reads `metadata` from TR_Validate_Input via `safeNode`, emits `envelope_metadata` field. |
| `WF-EC-01.EC_Validate_Input` | jsCode v1.0 → v1.1 — preserves `envelope_metadata` (object only). |
| `WF-EC-01.EC_Return_Result` | jsCode v1.0 → v1.1 — reads `envelope_metadata` via `safeNode('EC_Validate_Input')` and forwards it. |
| `WF-OR-01.OR_Validate_EC_Result` | jsCode v1.1 → v1.2 — preserves `envelope_metadata` in `_normalized_ec_result.payload` for both wrapped + flat shapes. |
| `WF-OR-01.OR_Extract_Handoff_Input` | jsCode v1.0 → v1.1 — carries `envelope_metadata` forward. |
| `WF-OR-01.OR_Build_Handoff_Payload` | jsCode v1.4 → v1.5 — allowlist + UUID validation, writes `planner_context.inputs`. |

**3 workflows touched** (TR, EC, OR). **6 jsCode rewrites.** **0 node delta.** **0 connection delta.** **0 schema mutation.** Memory V2, PL, task_module, improvement_module, reminder_module: not touched.

## 9. P0 stop conditions checked — none triggered

| Stop condition | Result |
|---|---|
| Broad rewrite required | ❌ no — 6 surgical 1-5 line additions |
| Metadata leaks arbitrary blob | ❌ no — strict allowlist + UUID regex |
| Wrong-tenant supersede succeeds | (verified post-apply: tenant A row stays `active`) |
| Schema migration | ❌ none |
| Workflow duplicate | ❌ none |
| Path 5 | ❌ not used |
| Memory V2 internals modified | ❌ no |
| Valid task/memory/improvement regress | (verified post-apply: all GREEN) |
