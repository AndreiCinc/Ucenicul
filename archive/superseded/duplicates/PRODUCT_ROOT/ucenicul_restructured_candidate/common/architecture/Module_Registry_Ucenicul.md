# Module Registry — Ucenicul

> **Canonicality: LEVEL 2 — CANONICAL SUBORDINATE**
> Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md`.

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
  "capabilities": ["create_task", "list_tasks", "update_task_status", "detect_task_duplicates"],
  "module_type": "executor",
  "inputs_expected": ["action", "description", "due_date", "priority"],
  "outputs_produced": ["task_id", "task_summary", "task_conflict_signal"],
  "can_read_from": ["execution_context", "threads", "tasks_db", "entities", "recent_memory"],
  "can_write_to": ["tasks_db"],
  "activation_rules": ["use when the message implies a user-owned action or a task query"],
  "status": "active",
  "privacy_profile": {
    "consumed_content_class": "normalized_content",
    "target_consumed_content_class": "llm_safe_content",
    "produces_pii_artifacts": false
  },
  "idempotency_requirements": "idempotency_key based on execution_context_id + step_id"
}
```

### reminder_module

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
  "status": "active",
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
  "description": "Composes one final user-facing response from aggregated module results.",
  "capabilities": ["compose_response", "format_response", "include_followup_prompts"],
  "module_type": "executor",
  "inputs_expected": ["thread_summary", "aggregated_module_results", "unresolved_followups", "output_boundary_rules"],
  "outputs_produced": ["final_response_text", "response_metadata"],
  "can_read_from": ["execution_context", "threads", "aggregated_results"],
  "can_write_to": [],
  "activation_rules": ["always called as final step after result aggregation"],
  "status": "active",
  "privacy_profile": {
    "consumed_content_class": "module_results_aggregated",
    "target_consumed_content_class": "module_results_aggregated + detokenized_at_outbound_boundary",
    "produces_pii_artifacts": true
  },
  "idempotency_requirements": "response composition is idempotent given same inputs"
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
