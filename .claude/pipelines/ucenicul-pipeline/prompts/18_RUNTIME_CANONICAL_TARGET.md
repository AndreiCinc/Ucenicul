# RUNTIME CANONICAL TARGET

## 1. Purpose

This file defines the canonical runtime target for Ucenicul.

It is the permanent architectural north-star used to evaluate:
- every new workflow
- every DB mutation
- every execution stage
- every orchestration decision
- every module contract

No stage is considered strategically correct if it does not move the system toward this runtime.

---

## 2. Canonical runtime chain

Message In  
→ Thread Resolver  
→ Execution Context Init  
→ Orchestrator  
→ Plan Builder  
→ Dispatcher  
→ Module Execution  
→ Module Result Aggregator  
→ State Update  
→ Response Composer  
→ Message Out

This chain is canonical.

No shortcut may bypass mandatory state-bearing layers.

---

## 3. Runtime layer definitions

### 3.1 Message In

Accepted channels:
- Telegram
- WhatsApp (target)
- future API/web channels

Responsibilities:
- normalize inbound payload
- preserve source metadata
- preserve channel metadata
- preserve timestamp integrity

Forbidden:
- business logic
- direct task execution
- direct memory writes

---

### 3.2 Thread Resolver

Responsibilities:
- resolve thread identity
- detect explicit references
- score contextual continuity
- attach existing thread or open new thread

Source of truth:
- threads
- messages
- entities
- thread_resolution_audit

Forbidden:
- planning
- execution
- response generation

---

### 3.3 Execution Context Init

Responsibilities:
- create execution envelope
- preserve runtime idempotency
- bind trigger message to active execution

Source of truth:
- execution_contexts

Minimum contract:
- tenant_id
- thread_id
- trigger_message_id
- idempotency_key
- resolution_method
- resolved_at

Forbidden:
- module execution
- memory decisions

---

### 3.4 Orchestrator

Responsibilities:
- interpret execution need
- decide required modules
- sequence execution order
- preserve deterministic flow

Orchestrator does not directly mutate business state.

Forbidden:
- direct DB business writes
- final user response generation

---

### 3.5 Plan Builder

Responsibilities:
- convert intent into executable plan
- split compound requests
- define execution sequence

Output:
structured execution plan

Each plan step must contain:
- target module
- action type
- dependency
- expected side effect

Forbidden:
- free-form execution

---

### 3.6 Dispatcher

Responsibilities:
- call modules in correct order
- preserve execution isolation
- stop invalid branches

Forbidden:
- reinterpret module output

---

### 3.7 Module Execution

Canonical modules:
- task_module
- reminder_module
- memory_module
- improvement_module
- response_support_module

Future modules:
- watcher_module
- daily_briefing_module
- analytics_module

Rule:
modules do not call each other directly

Only orchestrator controls sequencing.

---

### 3.8 Module Result Aggregator

Responsibilities:
- collect all module outputs
- normalize success/failure
- preserve partial execution visibility

Forbidden:
- direct user messaging

---

### 3.9 State Update

Responsibilities:
- persist business truth
- persist execution outcome
- persist audit metadata

Canonical stores:
- relational tables
- audit tables
- memory metadata

Rule:
semantic memory never replaces relational truth

---

### 3.10 Response Composer

Responsibilities:
- generate single final response
- merge module outcomes
- preserve user clarity

Rule:
one execution = one final response

Forbidden:
- multiple independent branch responses

---

### 3.11 Message Out

Responsibilities:
- send final response
- preserve channel format
- preserve delivery metadata

---

## 4. Canonical source-of-truth boundaries

### Relational DB owns:
- tasks
- reminders
- threads
- messages
- execution contexts
- audits

### Semantic memory owns:
- contextual facts
- business observations
- durable patterns

### Semantic memory never owns:
- operational truth
- pending tasks
- reminder status

---

## 5. Privacy gates

Privacy gates must exist before:
- LLM prompting
- semantic memory write
- external API exposure

Sensitive data classes:
- personal names
- addresses
- phone numbers
- apartment identifiers
- invoices
- payment references

Rule:
LLM receives only minimum required data.

---

## 6. Runtime scoring rule

Every stage must be scored against runtime alignment.

Mandatory question:
Does this stage move the runtime closer to canonical target?

If answer is unclear:
stage is incomplete.

---

## 7. Runtime anti-drift rules

Forbidden:
- adding local shortcuts that bypass canonical chain
- mixing planner and executor responsibilities
- using memory as operational DB
- creating channel-specific business logic

All runtime deviations require:
- explicit written justification
- rollback path
- audit artifact

---

## 8. WhatsApp target readiness

The runtime must remain channel-independent.

Telegram is temporary operational interface.

No business logic may remain Telegram-coupled.

WhatsApp adoption must require only gateway replacement.

---

## 9. Product readiness rule

Runtime is considered product-capable only when:
- compound requests execute deterministically
- thread continuity is stable
- execution context survives retries
- task/reminder/memory modules cooperate cleanly
- one final response is always produced

---

## 10. Canonical decision rule

When local execution success conflicts with runtime architecture:

runtime architecture always wins.
