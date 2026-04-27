# n8n Workflow Mapping — Ucenicul

> **Canonicality: LEVEL 2 — CANONICAL SUBORDINATE**
> Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md`.
> This document governs n8n execution layout, node ownership, and the canonical PostgreSQL query policy.

---

## 1. Current-State Monolith Mapping (HISTORICAL / TRANSITIONAL)

> **Status: HISTORICAL REFERENCE ONLY.** This section documents the legacy workflow for understanding during migration. It is NOT the target architecture.

The current n8n workflow follows the legacy pattern:

1. Telegram webhook receives message
2. Brain node classifies intent (single intent per message)
3. Switch node routes to one branch based on intent
4. Branch executes domain logic (task CRUD, reminder CRUD, etc.)
5. Each branch may compose its own partial response text
6. Multi-action logic is patched after the fact
7. Memory writes occur ad hoc in unrelated branches
8. Response is sent back from branch or aggregated loosely

**Legacy anti-patterns present in current state:**

- One message -> one intent hard binding
- Per-branch response composition
- Hidden cross-node data grabs (nodes reading arbitrary upstream outputs)
- Memory writes in task/reminder branches
- No thread concept, no execution context, no plan object

---

## 2. Target-State Modular Mapping (CANONICAL)

The target n8n workflow follows the modular orchestration pattern:

| Step | n8n Node/Component | Responsibility |
|---|---|---|
| 1 | Input Gateway | Receive messages from Telegram / WhatsApp / Web |
| 2 | Normalize Message | Structural normalization, produce `normalized_content` |
| 3 | Privacy Gate Inbound | NO-OP in MVP; in Phase 2: produce `llm_safe_content` and `rag_safe_content` |
| 4 | Resolve Tenant/Organization | Identify tenant context |
| 5 | Thread Resolver | Resolve message to thread (attach, reopen, or create) |
| 6 | Execution Context Manager | Create/update execution context for this trigger message |
| 7 | Load Thread + Operational Context | Fetch thread history, entity info, active tasks/reminders |
| 8 | Load Memory Context | Fetch relevant recent and long-term memory |
| 9 | Orchestrator Planner | Generate execution Plan with steps |
| 10 | Plan Validator | Validate plan schema, dependency graph, module references |
| 11 | Dispatcher | Dispatch plan steps to registered modules in legal order |
| 12 | Module Sub-workflows | task_module, reminder_module, memory_module, improvement_module, watcher_module_basic |
| 13 | Result Aggregator | Collect all Module Results, check for replan triggers |
| 14 | Persistence Updater | Write operational DB updates (tasks, reminders, thread state) |
| 15 | Memory Promotion Handler | Process memory promotion candidates from module results |
| 16 | Response Composer | Compose one final user-facing response |
| 17 | Privacy Gate Outbound | NO-OP in MVP; in Phase 2: authorized detokenization |
| 18 | Output Gateway | Send response to user via appropriate channel |
| 19 | Observability / Audit Log | Log execution events, thread resolution, plan versions, module results |

---

## 3. Node/Function Ownership

| Node | Owner | Reads from | Writes to |
|---|---|---|---|
| Input Gateway | Infrastructure | External channels | Nothing (pass-through) |
| Normalize Message | Infrastructure | Raw input | Normalized message object |
| Privacy Gate Inbound | Privacy layer | Normalized content, SIMS | llm_safe_content, rag_safe_content |
| Thread Resolver | Orchestrator layer | Messages, threads DB, entities | Thread decision (audit log) |
| Execution Context Manager | Orchestrator layer | Thread, trigger message | execution_contexts DB |
| Orchestrator Planner | Orchestrator layer | Thread context, memory context, exec context | Plan object |
| Dispatcher | Orchestrator layer | Plan, module registry | Module Requests |
| task_module | Domain module | exec_context, threads, tasks_db | tasks_db |
| reminder_module | (Deferred -- see ADR-REMINDER-AS-TASK-LAYER) -- long-term Domain module | exec_context, threads, reminders_db | reminders_db (no canonical-chain writes in current stage; `create_reminder` requests route to `task_module.create_task` with `due_at`) |
| memory_module | Domain module | exec_context, threads, memory_store | memory_store |
| improvement_module | Domain module | exec_context, threads, improvements_db | improvements_db |
| watcher_module_basic | Domain module | exec_context, threads, recent_memory | Nothing (proposals only) |
| Result Aggregator | Orchestrator layer | Module Results | Aggregated results |
| Persistence Updater | Infrastructure | Aggregated results | Operational DB |
| Memory Promotion Handler | Orchestrator layer | Memory proposals | memory_store (via memory_module) |
| Response Composer | Orchestrator layer | Aggregated results, thread summary | Final response text |
| Privacy Gate Outbound | Privacy layer | Response text, SIMS | Detokenized response |
| Output Gateway | Infrastructure | Final response | External channels |

---

## 4. Request/Result Contract Boundaries

Every module sub-workflow MUST:

- Accept a standardized Module Request JSON as input
- Return a standardized Module Result JSON as output
- Not read from nodes outside its declared `can_read_from` scope
- Not write to targets outside its declared `can_write_to` scope
- Include `idempotency_key` in every write operation
- Declare `actions_executed` in its result

The Dispatcher MUST:

- Validate that each module_name in the plan is registered in the Module Registry
- Enforce dependency order (a step with `depends_on` references cannot execute until those steps complete)
- Pass only the inputs declared in the module's contract

---

## 5. Canonical n8n PostgreSQL Query Policy

> **This is the single authoritative policy for PostgreSQL queries in n8n workflows.**
> All subordinate documents (CLAUDE.md, db/README.md, workflow notes) must align to this policy.

### Rules

1. **Prefer parameterized queries using $1, $2, ... placeholders** for all queries that accept user-derived or variable input. This prevents SQL injection and ensures safety.

2. **When n8n expression syntax requires inline interpolation** (e.g., in certain n8n PostgreSQL node configurations where parameterized binding is not supported), the following rules apply:
   - All interpolated values MUST be explicitly sanitized or validated before interpolation
   - String values MUST be properly escaped
   - The query MUST be documented with a comment explaining why parameterized binding was not used

3. **The canonical preference order is:**
   - Parameterized queries ($1, $2) — always preferred
   - Prepared statements — when supported by the node
   - Sanitized inline interpolation — only when the n8n node does not support parameterized binding, with mandatory documentation

4. **Forbidden patterns:**
   - Raw string concatenation with unvalidated user input
   - Template literals with unescaped values
   - Dynamic table/column names from user input (use allowlists instead)

### Contradiction Resolution

Previous documents (legacy CLAUDE.md, workflow notes) may have stated "always use $1/$2 placeholders" or shown inline interpolation patterns without context. This policy supersedes both extremes. The canonical rule is: parameterized first, sanitized inline only when technically necessary, always documented.

---

## 6. Response Composition Ownership

The Response Composer node is the SOLE producer of user-facing text.

- No module sub-workflow may produce final user-facing response text
- Module results contain `summary` fields for the Response Composer to use
- The Response Composer aggregates all module summaries into one coherent response
- Branch-local response formatting from the legacy architecture is PROHIBITED

---

## 7. Module Dispatch Ownership

The Dispatcher node is the SOLE dispatcher of module execution.

- No node outside the Dispatcher may invoke a module sub-workflow
- The Dispatcher reads from the Plan object and Module Registry only
- Module execution order is determined by Plan step dependencies, not by n8n branch structure

---

## 8. Explicit Prohibition of Hidden Cross-node Coupling

**The following patterns are PROHIBITED in the target architecture:**

- Reading arbitrary output from upstream nodes by node name reference
- Passing data between modules through shared n8n variables outside the Module Request/Result contract
- Using n8n branch position to infer execution state
- Relying on node execution order that is not explicit in the Plan

**Required pattern:**

- All inter-node data flow must go through explicit contracts (Module Request, Module Result, Execution Context)
- If a module needs data from another module's output, the orchestrator must include it in the Module Request inputs

---

## 9. Preserve / Refactor / Delete Notes for Legacy Logic

| Current n8n Component | Action | Notes |
|---|---|---|
| Telegram webhook intake | Preserve | Wire to Input Gateway |
| Brain intent classifier | Refactor | Becomes input to Orchestrator Planner, not the routing mechanism |
| Switch/router node | Delete | Replaced by Thread Resolver + Plan + Dispatcher |
| Task branch logic | Refactor | Wrap behind task_module contract |
| Reminder branch logic | Refactor | Current stage: route to `task_module.create_task` with `due_at`/`due_date` per ADR-REMINDER-AS-TASK-LAYER. Long-term: a separate `REMINDER-DELIVERY-LAYER` will consume due tasks for proactive notifications. **2026-04-27 update: Phase 1 v1 of the REMINDER-DELIVERY-LAYER is implemented as a new canonical scheduler workflow `WF-RD-01_Reminder_Delivery_Scheduler` — see §11 below.** |
| Memory write nodes in branches | Delete | All memory writes go through memory_module |
| Per-branch response text nodes | Delete | Response Composer is sole producer |
| Cross-branch data grabs | Delete | Replaced by explicit execution context |

---

## 10. Current Workflow Notes — Historical Status

**All existing workflow notes, n8n documentation, and node descriptions that describe the legacy monolithic intent-routed pattern are classified as HISTORICAL / TRANSITIONAL ONLY.**

They may be referenced for understanding current implementation during migration. They MUST NOT be used as architectural direction for new development.

---

> **Level 2 — Canonical Subordinate.** Version: 1.0 | Last updated: 2026-04-15
---

## 11. REMINDER-DELIVERY-LAYER — Canonical Scheduler Workflow (added 2026-04-27)

The REMINDER-DELIVERY-LAYER frontier opened with Phase 0 (`docs/architecture/reminder_delivery_layer/phase0/REMINDER_DELIVERY_CLOSEOUT.md`) and the Phase 1 v1 implementation is now declared canonical here.

| Field | Value |
|---|---|
| Workflow name | `WF-RD-01_Reminder_Delivery_Scheduler` |
| n8n id | `nc7rTC3hjO9QqbXs` |
| Trigger nodes | `RD_Manual_Trigger` (manualTrigger), `RD_Schedule_Trigger` (scheduleTrigger; default cadence: every 5 minutes) |
| Active by default | **false** — operator must onboard a real `tenants.metadata.telegram_chat_id` and replace the `RD_Live_Send_PLACEHOLDER` NoOp with `n8n-nodes-base.telegram` before activation |
| `availableInMCP` | true (operator dry-run probes via MCP) |
| Source-of-truth ledger | `public.task_reminder_deliveries` (additive migration `db/migrations/20260427_add_task_reminder_deliveries.up.sql`, UNIQUE on `(tenant_id, task_id, due_occurrence_iso)`) |
| Reads from | `public.tasks`, `public.tenants`, `public.task_reminder_deliveries` |
| Writes to | `public.task_reminder_deliveries` (only). Phase 1 v1 explicitly does NOT write to `public.reminders`, `public.tasks`, or `public.outbound_delivery_ledger_claude_mcp`. |
| Outbound channel | Telegram (sub-workflow path: `RD_Live_Build_Body → RD_Live_Send_PLACEHOLDER → RD_Live_Mark_Sent`). Phase 1 v1 placeholder is `n8n-nodes-base.noOp` so accidental real sends are structurally impossible. |
| Idempotency key | `rd:` + sha256(`rd:${tenant_id}:${task_id}:${due_occurrence_iso_minute}`)[0:24] |
| Backlog throttle | tasks with `NOW() - due_at > INTERVAL '24 hours'` are classified `skipped_backlog` unless `metadata.reminder_delivery.force_send='true'` |
| Missing target | when `tenants.metadata.telegram_chat_id IS NULL` the candidate is classified `skipped_missing_target` and excluded from future ticks via the candidate query's `NOT IN (...)` clause |
| Mission lineage | Phase 0 → Phase 1 (this entry) → Phase 2 live-sandbox-probe (deferred) |

### Relationship to other workflows

- WF-RD-01 does **not** call `WF-MO-01`. MO requires
  `execution_context_id NOT NULL`, which a scheduler-driven fire does
  not have. The scheduler keeps its own audit ledger.
- WF-RD-01 does **not** duplicate any existing workflow. It is the
  single canonical home for time-based reminder delivery.
- WF-PL-01 / WF-ME-01 / WF-DI-01 / WF-OR-01 / WF-EC-01 / WF-TR-01 /
  WF-RA-01 / WF-SU-01 / WF-RC-01 / WF-MO-01 are all byte-identical
  post-WF-RD-01 introduction.

### Phase 1 v1 verdict

`REMINDER_DELIVERY_LAYER_PHASE1_READY_EXCEPT_LIVE_SANDBOX_PROBE = TRUE`.
See `docs/architecture/reminder_delivery_layer/phase1_schema_scheduler/CLOSEOUT.md`.
