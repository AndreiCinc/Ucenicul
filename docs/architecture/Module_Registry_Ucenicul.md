# Module Registry — Ucenicul

> **Canonicality: LEVEL 2 — CANONICAL SUBORDINATE**
> Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md`.

> **Update 2026-04-27 (NEXT_3_FOLLOWUPS bundle):** two previously
> declared-but-unimplemented capabilities are now end-to-end live and
> user-ready through the canonical TR→…→MO chain:
>
> - `memory_module.recall_memory` — PL.intentMap now routes upstream
>   `intent='recall_memory'` to ME's real `ME_Memory_Recall_Prep/DB/Result`
>   chain (WF-PL-01 v2.5; WF-ME-01 byte-identical). Read-only,
>   tenant-scoped via `env.tenant_id`. PL late-binding injects
>   `source_thread_id` from `verify.thread_id` when no structural filter
>   is supplied so ME's `MISSING_REQUIRED_FIELDS` guard is not tripped.
> - `improvement_module.list_improvements` — WF-ME-01 gained a sub-action
>   router `ME_Route_Improvement_Action` plus a read-only list lane
>   `ME_Improvement_List_Prep/DB/Result` (WF-ME-01 +4 nodes / +7
>   connections; versionId `328b2b81…` → `d2197ed5…`). PL.intentMap
>   v2.6 routes `intent='list_improvements'` through this lane
>   (parameterised SELECT, tenant-scoped, default `limit=25`,
>   newest-first; `category`/`severity` filters documented as
>   unsupported because the schema lacks those columns). No schema
>   migration. Memory V2 NOT reopened. task_module byte-identical.
>
> Both lanes verified live (run-tags `mr-2026-04-27` and
> `il-2026-04-27`). Cross-tenant isolation verified for both.
> `public.reminders` baseline preserved (count=1, max=2026-04-13). See
> `docs/architecture/e2e/next_3_followups/NEXT_3_FOLLOWUPS_CLOSEOUT.md`.

---

## Registry Schema

Every module entry MUST contain the following fields:

| Field | Type | Description |
|---|---|---|
| `module_name` | string | Unique module identifier |
| `description` | string | What the module does |
| `capabilities` | array | List of specific capabilities |
| `module_type` | enum | `executor`, `analyzer`, `watcher` |
| `inputs_expected` | array | Required input fields from Module Request |
| `outputs_produced` | array | Output fields in Module Result |
| `can_read_from` | array | Data sources the module may read |
| `can_write_to` | array | Data targets the module may write |
| `activation_rules` | array | When the orchestrator should consider this module |
| `status` | enum | `active`, `planned`, `deprecated` |
| `privacy_profile` | object | Which content class consumed, privacy-sensitive outputs |
| `idempotency_requirements` | string | Idempotency key strategy |

---

## MVP Module Registry

### task_module

```json
{
  "module_name": "task_module",
  "description": "Creates, updates, lists, and closes operational tasks.",
  "capabilities": ["create_task", "list_tasks", "update_task", "complete_task", "delete_task"],
  "module_type": "executor",
  "inputs_expected": ["action", "description", "title", "task_id", "title_match", "priority", "due_type", "due_date", "due_at", "status_filter", "entity_id", "source", "metadata"],
  "outputs_produced": ["task_id", "task_summary", "tasks_list", "outcome", "candidates"],
  "can_read_from": ["execution_context", "threads", "tasks_db", "entities", "recent_memory"],
  "can_write_to": ["tasks_db"],
  "activation_rules": ["use when the message implies a user-owned action or a task query", "current-stage: also activated by reminder-like phrasings ('remind me to ...', 'don't let me forget ...') per ADR-REMINDER-AS-TASK-LAYER -- extract the temporal field into due_at/due_date", "delete is implemented as soft-cancel (status='cancelled'); no hard DELETE"],
  "status": "active, user-ready (TASK-MODULE-LIVE-EXECUTION 2026-04-25) -- current-stage canonical owner of reminder-like requests (see ADR-REMINDER-AS-TASK-LAYER)",
  "privacy_profile": {
    "consumed_content_class": "normalized_content",
    "target_consumed_content_class": "llm_safe_content",
    "produces_pii_artifacts": false
  },
  "idempotency_requirements": "idempotency_key based on execution_context_id + step_id"
}
```

### reminder_module

> **Current-stage status (2026-04-25, per `decisions/ADR-REMINDER-AS-TASK-LAYER.md`):**
> Deferred as a CRUD module. Reframed as a future `REMINDER-DELIVERY-LAYER`
> (scheduler + temporal trigger + MO delivery + sent/snooze/retry/audit), opened only
> when those capabilities are committed to. Until then:
> **reminder-like requests ("aminteste-mi ...", "remind me ...") route to `task_module.create_task`
> with extracted `due_at`/`due_date`** -- no parallel `reminders` CRUD path through the
> canonical chain. The contract block below is the long-term shape; treat it as
> deferred for the current implementation stage.
>
> **Update 2026-04-27 (REMINDER-DELIVERY-LAYER Phase 1):** The delivery
> half of the long-term `reminder_module` contract is now opened — but
> as a **scheduler workflow + audit ledger**, NOT as a CRUD module. New
> canonical workflow `WF-RD-01_Reminder_Delivery_Scheduler`
> (id `nc7rTC3hjO9QqbXs`, versionId `894ad514-7ce7-4b35-90d4-6c5190f01408`,
> 11 nodes / 14 connections, **active=false**, `availableInMCP=true`)
> consumes `public.tasks` rows whose `due_at <= NOW()` and audits per-
> occurrence delivery state in the new `public.task_reminder_deliveries`
> table (UNIQUE on `(tenant_id, task_id, due_occurrence_iso)`, FK ON
> DELETE CASCADE to `public.tasks`). `RD_Live_Send_PLACEHOLDER` is a
> `n8n-nodes-base.noOp` until the operator authorises a sandbox
> Telegram chat id. **`public.reminders` remains untouched** — the
> ADR invariant holds. The CRUD `{list_reminders, update_reminder,
> cancel_reminder}` capabilities below remain deferred. ~~Verdict:
> `REMINDER_DELIVERY_LAYER_PHASE1_READY_EXCEPT_LIVE_SANDBOX_PROBE = TRUE`.
> Next mission: `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE`.~~
>
> **2026-04-27 update:** `REMINDER_DELIVERY_LAYER_PHASE2_LIVE_SANDBOX_PROBE_GREEN = TRUE`
> — one Telegram message delivered live to operator's sandbox DM
> (chat 5101664726, message_id 546), one ledger row `sent` with
> `provider_message_ref='546'`, replay produced 0 duplicates,
> WF-RD-01 restored to byte-identical Phase 1 baseline
> (`RD_Live_Send_PLACEHOLDER` back to NoOp, `active=false`).
> Cosmetic `RD_AGGREGATE_RESULT_LIVE_SENT_COUNT_FIX` also CLOSED.
> WF-RD-01 final versionId: **`9744e3a6-6824-42fd-867c-91622b4722b4`**.
> Next mission: `REMINDER_DELIVERY_LAYER_PHASE3_TENANT_ONBOARDING_AND_PRODUCTION_GATE`
> (production gate / policies / false-sent guard — not a rollout).
> See `docs/architecture/reminder_delivery_layer/phase1_schema_scheduler/CLOSEOUT.md`,
> `docs/architecture/reminder_delivery_layer/phase2_live_sandbox_probe_authorised/CLOSEOUT.md`,
> `docs/architecture/reminder_delivery_layer/aggregate_counts_fix/CLOSEOUT.md`,
> and `docs/architecture/n8n_Workflow_Mapping.md` §11.

```json
{
  "module_name": "reminder_module",
  "description": "Creates, updates, lists, and triggers reminders.",
  "capabilities": ["create_reminder", "list_reminders", "update_reminder", "trigger_reminder"],
  "module_type": "executor",
  "inputs_expected": ["action", "description", "due_date", "time", "recurrence"],
  "outputs_produced": ["reminder_id", "reminder_summary", "reminder_conflict_signal"],
  "can_read_from": ["execution_context", "threads", "reminders_db", "entities"],
  "can_write_to": ["reminders_db"],
  "activation_rules": ["use when the message implies a time-based notification or reminder"],
  "status": "deferred -- see ADR-REMINDER-AS-TASK-LAYER",
  "privacy_profile": {
    "consumed_content_class": "normalized_content",
    "target_consumed_content_class": "llm_safe_content",
    "produces_pii_artifacts": false
  },
  "idempotency_requirements": "idempotency_key based on execution_context_id + step_id"
}
```

### memory_module

```json
{
  "module_name": "memory_module",
  "description": "Manages memory promotion, recall, and semantic search across memory tiers.",
  "capabilities": ["store_memory", "recall_memory", "promote_memory", "search_memory", "supersede_memory"],
  "module_type": "executor",
  "inputs_expected": ["action", "content", "memory_type", "source_context"],
  "outputs_produced": ["memory_id", "memory_summary", "recall_results", "promotion_decision"],
  "can_read_from": ["execution_context", "threads", "memory_store", "entities"],
  "can_write_to": ["memory_store"],
  "activation_rules": ["use when plan includes memory storage, recall, or promotion steps"],
  "status": "active",
  "privacy_profile": {
    "consumed_content_class": "normalized_content",
    "target_consumed_content_class": "llm_safe_content",
    "produces_pii_artifacts": true
  },
  "idempotency_requirements": "idempotency_key based on execution_context_id + step_id; supersede operations must check existing memory_id"
}
```

### improvement_module

```json
{
  "module_name": "improvement_module",
  "description": "Captures feedback, suggestions, and system improvement requests.",
  "capabilities": ["capture_feedback", "log_improvement_request", "list_improvements"],
  "module_type": "executor",
  "inputs_expected": ["action", "feedback_content", "category", "severity"],
  "outputs_produced": ["improvement_id", "improvement_summary"],
  "can_read_from": ["execution_context", "threads", "improvements_db"],
  "can_write_to": ["improvements_db"],
  "activation_rules": ["use when the message contains feedback, bug report, or improvement suggestion"],
  "status": "active",
  "privacy_profile": {
    "consumed_content_class": "normalized_content",
    "target_consumed_content_class": "llm_safe_content",
    "produces_pii_artifacts": false
  },
  "idempotency_requirements": "idempotency_key based on execution_context_id + step_id"
}
```

### watcher_module_basic

```json
{
  "module_name": "watcher_module_basic",
  "description": "Passive detection of patterns, anomalies, and operational signals.",
  "capabilities": ["detect_pattern", "detect_anomaly", "propose_memory", "propose_followup"],
  "module_type": "watcher",
  "inputs_expected": ["thread_summary", "recent_memory_context", "module_results_so_far"],
  "outputs_produced": ["observations", "proposals", "anomaly_signals"],
  "can_read_from": ["execution_context", "threads", "recent_memory", "entities"],
  "can_write_to": [],
  "activation_rules": ["may run on every execution as a passive observer if enabled"],
  "status": "active",
  "privacy_profile": {
    "consumed_content_class": "normalized_content",
    "target_consumed_content_class": "llm_safe_content",
    "produces_pii_artifacts": false
  },
  "idempotency_requirements": "watcher outputs are proposals only; no direct writes; idempotency not critical"
}
```

### response_module

```json
{
  "module_name": "response_module",
  "description": "Composes responses for user-facing output. Two capability families: (1) final-stage composition over aggregated module_results (canonical handler: WF-RC-01 Response Composer); (2) ME-stage no-write `respond_only` lane invoked when the plan has no domain side-effect (canonical handler: WF-ME-01 `ME_Response_Respond_Only_Result` v1.0; introduced 2026-04-26 by PL_BRIEFING_INTENT_MAPPING_FOLLOWUP).",
  "capabilities": ["compose_response", "format_response", "include_followup_prompts", "respond_only"],
  "module_type": "composer",
  "inputs_expected": ["thread_summary", "aggregated_module_results", "unresolved_followups", "output_boundary_rules", "user_message", "response_intent"],
  "outputs_produced": ["final_response_text", "response_metadata", "module_result.respond_only"],
  "can_read_from": ["execution_context", "threads", "aggregated_results"],
  "can_write_to": [],
  "activation_rules": [
    "compose_response/format_response/include_followup_prompts: always called as final step after result aggregation (WF-RC-01)",
    "respond_only: invoked by ME when PL emits {module_name:'response_module', action:'respond_only'} for response-only intents (e.g. briefing). No DB writes. Emits canonical module_result with domain_writes_performed=false and response_generation_allowed=true."
  ],
  "status": "active",
  "privacy_profile": {
    "consumed_content_class": "module_results_aggregated",
    "target_consumed_content_class": "module_results_aggregated + detokenized_at_outbound_boundary",
    "produces_pii_artifacts": true
  },
  "idempotency_requirements": "response composition is idempotent given same inputs; respond_only is no-op DB-wise so idempotency not critical"
}
```

---

## Future Modules (Not MVP)

| Module | Purpose | Status |
|---|---|---|
| `entity_resolution_module` | Advanced entity matching and deduplication | Planned |
| `social_media_module` | Social media monitoring and posting | Planned |
| `calendar_module` | Calendar event management | Planned |
| `crm_integration_module` | CRM data synchronization | Planned |
| `billing_invoice_module` | Billing and invoice management | Planned |

---

## Document Canonicality Footer

> **This document is Level 2 — Canonical Subordinate.**
> Version: 1.0 | Last updated: 2026-04-15
> Must conform to `docs/Architecture_Spec_v3_Ucenicul.md`.
