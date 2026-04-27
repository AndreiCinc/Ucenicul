# smoke_plan_f1.md — Memory v2 / F1 Runtime Smoke

Opened: 2026-04-21.
Workflow under test: `WF-ME-01 Module Execution` (n8n id `uq26nh1grIpnHju0`, versionId `da6d2573-ed85-4f1f-8c54-693364f9a432`).
Channel: MCP read-only — `execute_workflow` (production mode, live active workflow) + `get_execution` for result fetch.

## Trigger shape (F1.1 confirmed)

- Entry node: `ME_Input` — `n8n-nodes-base.executeWorkflowTrigger` (no required parameters). Whatever the dispatcher sends is `$json`.
- Downstream validator (`ME_Validate_Dispatcher_Result`) requires the following envelope shape. Missing / wrong fields return `INVALID_DISPATCH_INPUT` instead of proceeding to the action branches.

```jsonc
{
  "status_kind":         "success",         // must equal "success"
  "result_type":         "dispatch",        // must equal "dispatch"
  "execution_context_id":"<uuid>",           // must exist in public.execution_contexts
  "thread_id":           "<uuid>",           // must match execution_contexts.thread_id
  "tenant_id":           "<uuid>",           // must match execution_contexts.tenant_id
  "idempotency_key":     "<string>",         // optional — defaults to dispatch:{step.step_id}

  "dispatcher_input": {
    "dispatch_allowed":            true,    // must be true
    "module_execution_started":    false,   // must be false
    "response_generation_allowed": false,   // must be false
    "domain_writes_performed":     false,   // must be false
    "step": {
      "step_id":        "<string>",
      "module_name":    "memory_module",    // routed by ME_Route_Module_Name
      "purpose":        "<string>",
      "execution_mode": "<string>",
      "inputs":         { "action": "<store|search|recall|promote|supersede>_memory", ... }
    }
  }
}
```

Invocation pattern: call `execute_workflow` with `inputs.type = "webhook"` and `inputs.webhookData.body = <envelope>` (webhook is the closest mapping to a generic executeWorkflowTrigger call from the MCP test harness). If the MCP tool rejects `webhook` for a non-webhook trigger, fall back to `inputs.type = "chat"` with `chatInput = JSON.stringify(envelope)`; the validator supports that path via its `chatInput` unwrap.

## Smoke scope

- Tenant: `aaaaaaaa-0000-0000-0000-000000000001` (test tenant).
- Thread: `77777777-0000-0000-0000-000000000007` (active task thread).
- Execution context: one dedicated smoke row inserted at `d4f82a41-01cd-4fb7-9d70-573557348e74` (see Pre-run DB setup below).
- Trigger message id: `319664e7-ca37-4e78-ab05-ef02288dfb77`.
- Idempotency scope (per V2-004): `mem-smoke-v2f1` — every action's `idempotency_key` expands to `{action}:mem-smoke-v2f1:{step}` inside the prep layer (the step id I send is just the step label; the prep layer prefixes action + execution_context_id). **Note:** the prep layer actually builds the key as `{action}:{execution_context_id}:{step_id}`, so to get the human-friendly `mem-smoke-v2f1:{step}` shape we use `execution_context_id = d4f82a41-...` (kept verbatim) and `step_id = mem-smoke-v2f1:s{n}`. Queryability is preserved: filter `idempotency_key LIKE '%:mem-smoke-v2f1:%'`.
- `source_thread_id` on inputs = `77777777-0000-0000-0000-000000000007`.

## Pre-run DB setup

Single insert, before F1.3:

```sql
INSERT INTO public.execution_contexts
  (id, tenant_id, thread_id, trigger_message_id, status, pending_steps, completed_steps, module_results, working_notes, shared_artifacts, idempotency_key, created_at, updated_at)
VALUES
  ('d4f82a41-01cd-4fb7-9d70-573557348e74',
   'aaaaaaaa-0000-0000-0000-000000000001',
   '77777777-0000-0000-0000-000000000007',
   '319664e7-ca37-4e78-ab05-ef02288dfb77',
   'initialized', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb,
   'mem-smoke-v2f1', now(), now());
```

`trigger_message_id` is arbitrary (no FK on messages table within this workflow path). The `idempotency_key` column here is on `execution_contexts`, not on `memory_items`.

## Payloads (F1.2)

Every envelope shares the five top-level fields:

```
status_kind="success", result_type="dispatch",
execution_context_id="d4f82a41-01cd-4fb7-9d70-573557348e74",
thread_id="77777777-0000-0000-0000-000000000007",
tenant_id="aaaaaaaa-0000-0000-0000-000000000001",
dispatcher_input.dispatch_allowed=true,
dispatcher_input.module_execution_started=false,
dispatcher_input.response_generation_allowed=false,
dispatcher_input.domain_writes_performed=false,
step.module_name="memory_module",
step.purpose="smoke v2 F1",
step.execution_mode="module"
```

### S1 — store_memory

```jsonc
step.step_id = "mem-smoke-v2f1:s1"
step.inputs = {
  "action":            "store_memory",
  "content":           "Smoke V2 F1 — store path anchor.",
  "memory_type":       "fact",
  "category":          "smoke_store",
  "source_thread_id":  "77777777-0000-0000-0000-000000000007",
  "confidence":        0.85,
  "importance":        0.5,
  "durability":        "stable",
  "evidence_refs":     [],
  "metadata":          { "smoke": "v2f1", "step": "s1" }
}
```
- **Expected oracle:** `module_result.status_kind = "success"`, artifacts contain a new `memory_id` (uuid); idempotency_key emitted = `store_memory:d4f82a41-01cd-4fb7-9d70-573557348e74:mem-smoke-v2f1:s1`.
- **DB delta:** one new row in `public.memory_items` with `tier='recent'`, `status='active'`, category `smoke_store`.

### S2 — search_memory

```jsonc
step.step_id = "mem-smoke-v2f1:s2"
step.inputs = {
  "action":            "search_memory",
  "query":             "smoke v2 f1 store path anchor",
  "limit":             10,
  "include_statuses":  ["active"]
}
```
- **Expected oracle:** `status_kind = "success"`; artifacts contain a non-empty `results` array that includes the row created by S1 (if S2 runs after S1). Lexical path only — embedding absent.
- **DB delta:** none.

### S3 — recall_memory

```jsonc
step.step_id = "mem-smoke-v2f1:s3"
step.inputs = {
  "action":            "recall_memory",
  "category":          "smoke_store",
  "include_statuses":  ["active"],
  "limit":             25
}
```
- **Expected oracle:** `status_kind = "success"`; artifacts contain at least the row from S1; `applied_filters` in passthrough = `["category"]`.
- **DB delta:** none.

### S4 — promote_memory

Target: existing walker fixture `7b03cd9c-0e3e-45ea-bad6-6fc4adc774f5` (category `promote_test`, tier `recent`, status `active`). We flip `user_confirmed=true` to satisfy the `accept.ok` guard in promote_db regardless of corroboration_count.

```jsonc
step.step_id = "mem-smoke-v2f1:s4"
step.inputs = {
  "action":            "promote_memory",
  "memory_id":         "7b03cd9c-0e3e-45ea-bad6-6fc4adc774f5",
  "promotion_target":  "long_term",
  "user_confirmed":    true,
  "evidence_validated":false
}
```
- **Expected oracle:** `status_kind = "success"`; artifacts contain `promoted=true`, `denial_reason="accepted"`, `tier="long_term"`.
- **DB delta:** `memory_items.tier` for that id flips `recent → long_term`, `last_reconfirmed_at=now()`, `user_confirmed=true`.

### S5 — supersede_memory

Target old row: walker fixture `adbad490-121d-4f17-81cd-622fdf507d45` (category `anchor_test`, tier `recent`, status `active` — not touched by earlier walker supersede, since that used `28c3a392-...`). We mark it superseded and write a new replacement.

```jsonc
step.step_id = "mem-smoke-v2f1:s5"
step.inputs = {
  "action":                "supersede_memory",
  "supersedes_memory_id":  "adbad490-121d-4f17-81cd-622fdf507d45",
  "content":               "Smoke V2 F1 — supersede replacement anchor.",
  "memory_type":           "fact",
  "category":              "smoke_supersede",
  "source_thread_id":      "77777777-0000-0000-0000-000000000007",
  "confidence":            0.88,
  "importance":            0.6,
  "durability":            "stable",
  "tier":                  "recent",
  "evidence_refs":         [],
  "metadata":              { "smoke": "v2f1", "step": "s5" }
}
```
- **Expected oracle:** `status_kind = "success"`; artifacts contain `new_memory_id`, `old_memory_id`; idempotency_key emitted = `supersede_memory:d4f82a41-...:mem-smoke-v2f1:s5`.
- **DB delta:** old row → `status='superseded'`; one new row inserted with `superseded_by = old_id` (confirmed via DB query after).

## Post-conditions / global oracle (F1.5)

After all 5 runs, the following invariants must hold:

1. Rows tagged with `idempotency_key LIKE '%:mem-smoke-v2f1:%'`: expected 2 (S1 store + S5 new replacement).
2. `7b03cd9c-...` row: `tier='long_term'`, `last_reconfirmed_at > '2026-04-21'`.
3. `adbad490-...` row: `status='superseded'`.
4. No other walker fixture should change.

## Idempotency re-run rule

Per V2-004, the smoke idempotency scope is `mem-smoke-v2f1`. Re-running the same envelope must hit the per-action idempotency branch (upsert / no-op) without duplicating DB rows. Re-run is only performed if a divergence from the oracle needs to be isolated.

## Evidence layout

- Per-run raw JSON: `docs/architecture/memory/v2/runtime/exec_s{n}.json` (from `get_execution`).
- Combined summary MD: `docs/architecture/memory/v2/runtime/smoke_report_f1.md`.
- If any action fails: append `MEMORY_V2_BUG_LEDGER.md` entry before the next run is attempted (per advancement rule in MEMORY_V2_PHASE_GATES.md).
