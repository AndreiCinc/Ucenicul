# EXECUTION CONTEXT EVOLUTION

## 1. Purpose

Defines how execution_contexts evolves from minimal stage-support table into canonical runtime execution envelope.

execution_contexts is not only a persistence artifact.

It becomes:
- runtime anchor
- retry anchor
- partial execution memory
- module coordination carrier
- recovery surface

---

## 2. Canonical role of execution_contexts

execution_contexts must always answer:

- what triggered execution
- which thread owns execution
- what modules were planned
- what modules ran
- what failed
- what remains pending
- whether retry is allowed

---

## 3. Minimal current contract

Current mandatory fields:

- tenant_id
- thread_id
- trigger_message_id
- idempotency_key
- resolution_method
- resolved_at

This is minimum acceptable stage contract.

No future reduction allowed.

---

## 4. Evolution target

execution_contexts must progressively contain:

### Identity layer
- execution_id
- tenant_id
- thread_id
- trigger_message_id

### Resolution layer
- resolution_method
- thread_confidence
- resolver_version

### Plan layer
- execution_plan
- module_sequence
- dependency_graph

### Runtime layer
- current_module
- completed_modules
- failed_modules
- pending_modules

### Retry layer
- retry_count
- retry_reason
- retry_allowed

### Outcome layer
- execution_status
- final_result_type
- final_response_ref

---

## 5. Runtime statuses

Canonical statuses:

- created
- planned
- executing
- partially_completed
- completed
- failed
- blocked

No free-text statuses allowed.

---

## 6. Retry rule

Retry allowed only when:

- idempotency preserved
- side effects known
- previous partial writes identifiable

Retry forbidden when:
- destructive uncertainty exists
- source-of-truth conflict unresolved

---

## 7. Module coordination rule

Each module execution must update execution_contexts only through controlled contract.

Allowed:
- append module result
- append failure metadata
- append timing

Forbidden:
- overwrite foreign module evidence

---

## 8. Failure anchoring

Every failure must preserve:

- failing module
- failing resource
- exact error class
- rollback need
- safe next action

No failure may remain implicit.

---

## 9. Recovery rule

If execution stops unexpectedly:

execution_contexts must allow restart without guessing.

This means:
- current module known
- previous writes known
- retry eligibility known

---

## 10. Human intervention minimization rule

execution_contexts must progressively reduce human need by preserving:

- exact runtime position
- exact blocker
- exact safe continuation point

---

## 11. DB safety rule

execution_contexts evolution must never break live runtime.

If live schema cannot evolve safely:
create parallel suffix table:
execution_contexts_next

Migration later.

---

## 12. Canonical decision rule

If local convenience conflicts with execution traceability:

execution traceability always wins.