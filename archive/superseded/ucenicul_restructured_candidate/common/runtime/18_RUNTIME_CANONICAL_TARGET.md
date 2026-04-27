# Runtime Canonical Target

## Purpose

This file defines the permanent runtime north-star for Ucenicul.

Every stage, workflow, DB mutation, module contract, and orchestration choice must be judged against this runtime target.

## Canonical runtime chain

Message In
-> Thread Resolver
-> Execution Context Init
-> Orchestrator
-> Plan Builder
-> Dispatcher
-> Module Execution
-> Module Result Aggregator
-> State Update
-> Response Composer
-> Message Out

This chain is canonical.

Mandatory state-bearing layers may not be bypassed.

## Runtime layer definitions

### 1. Message In
Responsibilities:
- normalize inbound payload
- preserve source metadata
- preserve channel metadata
- preserve timestamp integrity

Forbidden:
- business execution
- direct memory write
- direct task/reminder mutation

### 2. Thread Resolver
Responsibilities:
- resolve thread identity
- detect explicit references
- evaluate continuity
- attach existing thread or open new thread

Forbidden:
- planning
- business execution
- final response generation

### 3. Execution Context Init
Responsibilities:
- create execution envelope
- preserve idempotency anchor
- bind trigger message to active execution

Forbidden:
- module execution
- memory promotion decisions
- final response generation

### 4. Orchestrator
Responsibilities:
- interpret execution need
- choose modules
- define execution order
- preserve deterministic control

Forbidden:
- direct business writes
- direct memory writes
- direct final response generation

### 5. Plan Builder
Responsibilities:
- convert intent into executable plan
- split compound requests into valid steps
- define dependencies and side effects

Forbidden:
- free-form execution
- module self-chaining

### 6. Dispatcher
Responsibilities:
- call modules in valid order
- preserve execution isolation
- stop invalid branches

Forbidden:
- reinterpret module meaning after execution
- generate user-facing text

### 7. Module Execution
Canonical modules:
- `task_module`
- `reminder_module`
- `memory_module`
- `improvement_module`
- `watcher_module_basic`

Rule:
- modules do not call each other directly
- orchestrator owns sequencing

### 8. Module Result Aggregator
Responsibilities:
- collect all module outputs
- normalize success/failure
- preserve partial execution visibility

Forbidden:
- direct user messaging
- hidden branch-level conclusion rewriting

### 9. State Update
Responsibilities:
- persist operational truth
- persist execution outcome
- persist audit metadata
- preserve source-of-truth boundaries

Canonical stores:
- relational operational tables
- execution-context structures
- audit tables
- memory metadata and semantic stores

Rule:
semantic memory never replaces relational operational truth.

### 10. Response Composer
Responsibilities:
- generate one final coherent response
- merge module outcomes
- preserve user clarity
- preserve privacy and channel safety

Rule:
one execution = one final response

### 11. Message Out
Responsibilities:
- send final response
- preserve channel-specific formatting only
- preserve delivery metadata

## Source-of-truth boundaries

### Relational DB owns
- tasks
- reminders
- threads
- messages
- execution contexts
- audits

### Semantic memory owns
- contextual facts
- validated patterns
- durable preferences
- durable constraints

### Semantic memory never owns
- pending tasks
- reminder status
- operational execution truth

## Privacy gates

Privacy gates must exist before:
- LLM prompting
- semantic memory write
- external API exposure

Rule:
LLM receives the minimum required data only.

## Runtime anti-drift rules

Forbidden:
- local shortcuts that bypass the canonical chain
- mixing planner and executor responsibilities
- memory as operational DB
- channel-specific business logic
- tool-driven architecture changes

Every runtime deviation requires:
- explicit written justification
- rollback path
- audit artifact

## Runtime scoring rule

Mandatory question for every stage:
Does this stage move the runtime closer to this canonical target?

If unclear:
- the stage is incomplete
