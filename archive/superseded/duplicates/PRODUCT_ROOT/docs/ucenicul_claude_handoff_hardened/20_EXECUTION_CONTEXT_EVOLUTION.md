# Execution Context Evolution

## Purpose

Defines how `execution_contexts` evolves from a minimal stage-support table into the canonical runtime execution envelope.

`execution_contexts` is not just a persistence artifact.
It becomes:
- runtime anchor
- retry anchor
- partial execution memory
- module coordination carrier
- recovery surface

## Canonical role of execution contexts

An execution-context structure must be able to answer:
- what triggered execution
- which thread owns it
- what modules were planned
- what ran
- what failed
- what remains pending
- whether retry is allowed

## Minimal current contract

Current mandatory fields for the active stage:
- tenant_id
- thread_id
- trigger_message_id
- idempotency_key
- resolution_method
- resolved_at

No future reduction is allowed.

## Current live-stage operating model

The current stage may encounter a live schema status set such as:
- `initialized`
- `active`
- `waiting`
- `resolved`
- `abandoned`

If live introspection confirms this:
- use it for the active stage
- record the mapping to long-term target states
- do not write statuses absent from live schema

## Long-term target evolution

Execution contexts should progressively contain:

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

## Long-term canonical target lifecycle

Long-term target status concepts are:
- created
- planned
- executing
- partially_completed
- completed
- failed
- blocked

These are architectural target states, not permission to invent unavailable live values during the current stage.

## Status mapping rule

If live status labels differ from long-term target labels:
- map them explicitly
- use live labels for the current stage
- keep target labels for design documentation only
- log the mismatch in `AUDIT_REPORT.md`

## Retry rule

Retry is allowed only when:
- idempotency is preserved
- side effects are known
- previous partial writes are identifiable

Retry is forbidden when:
- destructive uncertainty exists
- source-of-truth conflict remains unresolved

## Module coordination rule

Each module may update execution-context state only through controlled contract.

Allowed:
- append module result
- append failure metadata
- append timing
- update current step ownership where contract allows it

Forbidden:
- overwrite foreign module evidence
- erase prior failure history silently

## Failure anchoring

Every failure must preserve:
- failing module
- failing resource
- exact error class
- rollback need
- safe next action

No failure may remain implicit.

## Recovery rule

If execution stops unexpectedly, execution context must allow restart without guessing.

This means:
- current module known
- prior writes known
- retry eligibility known
- blocker classification known

## Human-intervention minimization rule

Execution-context evolution must reduce human dependence by preserving:
- exact runtime position
- exact blocker
- exact safe continuation point

## DB safety rule

Execution-context evolution must never break live runtime.

If safe canonical evolution is not possible:
- create `execution_contexts_claude_mcp`
- continue on fallback structure
- document merge-back path
