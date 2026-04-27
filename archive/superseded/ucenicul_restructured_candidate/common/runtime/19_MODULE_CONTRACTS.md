# Module Contracts

## Purpose

Defines strict execution contracts for canonical runtime modules.

No module may:
- invent responsibilities
- mutate foreign state
- bypass orchestrator
- emit uncontrolled final output

All modules are execution-bounded units.

## Universal module contract

Every module must declare:
- input contract
- output contract
- owned side effects
- forbidden side effects
- failure behavior
- retry behavior
- source of truth

If any is missing:
- module is incomplete

## Cross-module rule

Modules never call modules directly.
Only orchestrator may sequence modules.

Violation = runtime drift.

## Module failure rule

A failed module must return:
- exact failure source
- affected resource
- safe retry possibility
- rollback need
- machine-readable status
- human-readable summary

No silent failure allowed.

## Module score rule

Every module implementation must score strongly on:
- contract fidelity
- DB safety
- runtime usefulness
- isolation quality
- handoff readability

## 1. task_module

Purpose:
- owns operational task lifecycle only

Allowed responsibilities:
- create task
- list tasks
- update task
- complete task
- delete task

Required input:
- tenant_id
- execution_id
- thread_id
- action
- normalized task payload

Optional input:
- due_date
- due_at
- priority
- entity reference

Required output:
- success boolean
- affected task ids
- normalized task summary
- warnings
- DB evidence

Owned side effects:
- `tasks`
- task audit structure if introduced later

Forbidden:
- reminder writes
- memory writes
- thread writes
- final response generation

Source of truth:
- `tasks` table only

## 2. reminder_module

Purpose:
- owns reminder lifecycle only

Allowed responsibilities:
- create reminder
- list reminders
- update reminder
- cancel reminder

Required input:
- tenant_id
- execution_id
- thread_id
- reminder payload

Required output:
- success boolean
- reminder ids
- normalized schedule
- warnings
- DB evidence

Owned side effects:
- `reminders`

Forbidden:
- task writes
- memory writes
- thread writes
- final response generation

Source of truth:
- `reminders` table only

## 3. memory_module

Purpose:
- owns semantic business memory only

Allowed responsibilities:
- store durable fact
- store durable pattern
- retrieve relevant memory
- reject weak signals
- map evidence to memory confidence

Required input:
- tenant_id
- execution_id
- memory candidate
- confidence path
- source evidence reference

Required output:
- write/reject decision
- category
- confidence
- evidence
- warnings

Owned side effects:
- `rag_memories`
- memory metadata

Forbidden:
- task creation
- reminder creation
- thread mutation
- operational status ownership

Source of truth:
- semantic contextual knowledge only

## 4. improvement_module

Purpose:
- owns user improvement feedback capture only

Allowed responsibilities:
- store improvement request
- classify feedback
- de-duplicate obvious repeats
- return captured-feedback evidence

Required input:
- tenant_id
- execution_id
- thread_id
- feedback payload

Required output:
- success boolean
- improvement record id if written
- normalized feedback summary
- warnings

Owned side effects:
- improvement-request storage only

Forbidden:
- workflow mutation
- task/reminder mutation
- final response generation

Source of truth:
- improvement-request structure only

## 5. watcher_module_basic

Purpose:
- owns background observation and watch-signal generation only

Allowed responsibilities:
- produce watch signals
- surface operational observations
- propose follow-up needs
- emit no-action when evidence is weak

Required input:
- tenant_id
- execution_id
- thread context or scoped observation input
- evidence references

Required output:
- result status
- observation summary
- proposals
- confidence
- follow-up flag

Owned side effects:
- watcher observation storage if enabled
- no direct operational mutation by default

Forbidden:
- task/reminder writes unless another module is explicitly invoked by orchestrator
- final response generation
- uncontrolled memory promotion

Source of truth:
- watcher result structure only

## 6. orchestrator_module

Purpose:
- owns execution sequencing only

Allowed responsibilities:
- choose modules
- define order
- stop unsafe branch
- preserve determinism
- replan only when rules allow it

Forbidden:
- direct business writes
- direct memory writes
- direct final response generation

Required output:
- execution plan
- module order
- dependency graph
- blocker classification when unresolved

## 7. response_composer_layer

Purpose:
- transforms normalized module outputs into final response content

Allowed responsibilities:
- normalize module results
- collect warnings
- prepare final response payload

Forbidden:
- direct DB mutation
- hidden operational writes
- multiple final branch replies

Note:
This layer is not an independent business-state owner.
It is the final composition boundary above module results.
