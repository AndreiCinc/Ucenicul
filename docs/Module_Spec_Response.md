# Module Spec: response_module

> **Canonicality: LEVEL 2 — CANONICAL SUBORDINATE**
> Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md` and `docs/Module_Registry_Ucenicul.md`.

---

## Purpose

The response_module (Response Composer) composes one final user-facing response from aggregated module results. It is the SOLE owner of user-facing text composition. No other module may produce final user-facing response fragments.

## Scope

- Compose a single coherent response from all module results
- Format response appropriately for the output channel
- Include follow-up prompts where modules indicated `needs_followup`
- Acknowledge what was executed, what was not, and what needs clarification

## Input Contract (Module Request)

| Input field | Type | Required | Description |
|---|---|---|---|
| `thread_summary` | string | yes | Current thread summary for context |
| `aggregated_module_results` | array | yes | All Module Results from this execution |
| `unresolved_followups` | array | optional | Follow-up items from modules |
| `output_boundary_rules` | object | optional | Privacy gate outbound rules |
| `channel` | string | yes | Output channel (telegram, web, etc.) for formatting |

Standard Module Request fields always required.

## Output Contract (Module Result)

| Output field | Type | Description |
|---|---|---|
| `final_response_text` | string | The composed user-facing response |
| `response_metadata` | object | Channel, language, formatting hints, tokens used |

Standard Module Result fields always included.

## Read Scope

- `execution_context`, `threads`, `aggregated_results`

## Write Scope

- NONE (response_module does not write to any persistence layer; the outbound message is handled by the Output Gateway)

## Composition Rules

- Success, partial success, and failure must all be representable
- No module-specific partial response fragments become final truth by default
- The response must acknowledge: what was executed, what was not executed, what needs clarification
- Multiple module results are merged into one coherent narrative, not concatenated
- If all modules returned `no_action`, the response must still acknowledge the message

## Privacy Rules

- In MVP: response_module operates on module results which contain `normalized_content`-derived data
- In Phase 2: detokenization happens at the Privacy Gate Outbound, AFTER response composition
- The response_module itself does not perform detokenization

## Idempotency

- Response composition is idempotent given the same inputs
- No side effects from composition

## Error Handling

- If aggregated results are empty or malformed: produce a graceful fallback response
- Never expose internal error details to the user
- Log composition errors to audit trail

---

> **Level 2 — Canonical Subordinate.** Version: 1.0 | Last updated: 2026-04-15
