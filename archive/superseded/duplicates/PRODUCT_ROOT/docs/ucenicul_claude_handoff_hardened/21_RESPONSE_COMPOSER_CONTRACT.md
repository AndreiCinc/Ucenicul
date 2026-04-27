# Response Composer Contract

## Purpose

Defines strict final-response generation rules for Ucenicul runtime.

Response Composer is the only layer allowed to produce final user-facing output.

No module may bypass this rule.

## Canonical role

Response Composer receives:
- normalized module outputs
- warnings
- execution status
- partial failures
- relevant memory signals
- thread context if required

Response Composer produces:
- one final response
- one coherent user-facing payload
- one channel-safe output

## One-execution-one-response rule

A single execution may produce only one final response.

Forbidden:
- branch-local final replies
- partial independent replies
- module-level user-facing conclusions
- hidden shadow replies

## Mandatory input contract

Response Composer must receive:
- execution_id
- tenant_id
- thread_id
- normalized module result set
- execution status
- warning set

If any mandatory input is missing:
- response generation is incomplete
- the gap must be classified, not improvised

## Module result normalization rule

Before composing, every module result must include:
- success/failure status
- affected resource
- human-readable summary
- warnings
- machine-readable evidence anchor

No raw module payload reaches the final response directly.

## Priority order for composition

Response order is mandatory:
1. critical failure
2. completed actions
3. pending or blocked actions
4. warnings
5. optional contextual memory

## Failure composition rule

If one module fails and others succeed, the response must:
- preserve completed actions
- explicitly mention failed action
- state safe continuation
- avoid hiding partial failure

## Memory insertion rule

Memory may appear only when:
- relevant now
- useful for operational clarity
- short enough not to dominate
- privacy-safe

Forbidden:
- unsolicited long recall
- weak memory injection
- speculative memory
- memory-driven override of operational truth

## Task + reminder merge rule

When both task and reminder outcomes exist:
- merge them into one coherent response block
- avoid duplicate confirmation patterns
- preserve action clarity

## Warning visibility rule

Warnings appear only when operationally useful.

Warnings must be:
- short
- explicit
- actionable

## Channel adaptation rule

Telegram, WhatsApp, and future channels may differ only in formatting.

Business meaning must remain identical across channels.

## Privacy rule

The final response must not leak:
- internal DB ids
- internal execution ids
- internal memory metadata
- hidden identifiers
- non-user-safe audit details

## Runtime safety rule

If ambiguity remains unresolved:
- prefer safe minimal response over speculative completeness
- do not fabricate certainty

## Canonical decision rule

If expressive richness conflicts with runtime clarity:
- runtime clarity always wins
