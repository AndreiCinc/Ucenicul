# MODULE CONTRACTS

## 1. Purpose

Defines strict execution contracts for all canonical runtime modules.

No module may:
- invent responsibilities
- mutate foreign state
- bypass orchestrator
- emit uncontrolled output

All modules are execution-bounded units.

---

## 2. Universal module contract

Every module must declare:

- input contract
- output contract
- owned side effects
- forbidden side effects
- failure behavior
- retry behavior
- source of truth

If one is missing:
module is incomplete.

---

# 3. TASK MODULE

## Purpose

Owns operational task lifecycle only.

## Allowed responsibilities

- create task
- list tasks
- update task
- complete task
- delete task

## Input contract

Required:
- tenant_id
- execution_id
- thread_id
- action
- normalized task payload

Optional:
- due_date
- due_at
- priority
- entity reference

## Output contract

Must return:

- success boolean
- affected task ids
- normalized task summary
- warnings
- db evidence

## Owned side effects

Allowed tables:
- tasks
- task audit table (future)

## Forbidden side effects

Forbidden:
- reminders writes
- memory writes
- thread writes
- response generation

## Failure behavior

On failure:
- preserve DB evidence
- return structured failure
- never partially claim success

## Retry rule

Allowed only if idempotency key preserved.

## Source of truth

tasks table only

RAG never owns task truth.

---

# 4. REMINDER MODULE

## Purpose

Owns reminder lifecycle only.

## Allowed responsibilities

- create reminder
- list reminders
- update reminder
- cancel reminder

## Input contract

Required:
- tenant_id
- execution_id
- thread_id
- reminder payload

## Output contract

Must return:
- success boolean
- reminder ids
- normalized schedule
- warnings

## Owned side effects

Allowed tables:
- reminders

## Forbidden side effects

Forbidden:
- tasks writes
- memory writes
- thread writes

## Source of truth

reminders table only

---

# 5. MEMORY MODULE

## Purpose

Owns semantic business memory only.

## Allowed responsibilities

- store durable fact
- store durable pattern
- retrieve relevant memory
- reject weak signals

## Input contract

Required:
- tenant_id
- execution_id
- memory candidate
- confidence path

## Output contract

Must return:
- write / reject decision
- category
- confidence
- evidence

## Owned side effects

Allowed:
- rag_memories
- memory metadata

## Forbidden side effects

Forbidden:
- task creation
- reminder creation
- thread mutation

## Source of truth

Semantic memory only for contextual knowledge.

Never operational truth.

---

# 6. ORCHESTRATOR MODULE

## Purpose

Owns execution sequencing only.

## Allowed responsibilities

- choose modules
- define order
- stop unsafe branch
- preserve determinism

## Forbidden responsibilities

Forbidden:
- direct business writes
- direct memory writes
- direct task writes
- direct reminder writes

## Output contract

Must return:
- execution plan
- module order
- dependency graph

## Failure rule

If ambiguity unresolved:
stop and produce structured blocker

---

# 7. RESPONSE SUPPORT MODULE

## Purpose

Transforms module outputs into response ingredients.

## Allowed responsibilities

- normalize module results
- collect warnings
- prepare response payload

## Forbidden

Forbidden:
- final user message send
- DB mutation

---

# 8. CROSS-MODULE RULE

Modules never call modules directly.

Only orchestrator may sequence modules.

Violation = runtime drift.

---

# 9. MODULE FAILURE RULE

A failed module must return:

- exact failure source
- affected resource
- safe retry possibility
- rollback need

No silent failure allowed.

---

# 10. MODULE SCORE RULE

Every module implementation must score:

- contract fidelity
- DB safety
- runtime usefulness
- isolation quality

Any score under 10 requires correction before stage closure.