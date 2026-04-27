# Module Spec: watcher_module_basic

> **Canonicality: LEVEL 2 — CANONICAL SUBORDINATE**
> Subordinate to `docs/Architecture_Spec_v3_Ucenicul.md` and `docs/Module_Registry_Ucenicul.md`.

---

## Purpose

The watcher_module_basic passively detects patterns, anomalies, and operational signals during execution. It produces proposals (not direct actions) that flow through the Result Aggregator and orchestrator promotion rules.

## Scope

- Pattern detection across thread history and recent memory
- Anomaly detection (unusual timing, repeated failures, contradictions)
- Memory promotion proposals (observations, patterns)
- Follow-up prompt proposals

## Input Contract (Module Request)

| Input field | Type | Required | Description |
|---|---|---|---|
| `thread_summary` | string | yes | Current thread summary |
| `recent_memory_context` | array | optional | Recent memory items for pattern matching |
| `module_results_so_far` | array | optional | Results from other modules in this execution |

Standard Module Request fields always required.

## Output Contract (Module Result)

| Output field | Type | Description |
|---|---|---|
| `observations` | array | Detected observations (each with content, confidence, category) |
| `proposals` | array | Proposed actions: memory promotions, improvement tickets, follow-ups |
| `anomaly_signals` | array | Detected anomalies with severity and description |

Standard Module Result fields always included.

## Read Scope

- `execution_context`, `threads`, `recent_memory`, `entities`

## Write Scope

- **NONE** — watchers produce proposals only; they do not write directly to any persistence layer

## What Watchers MAY Do

- Propose memory items (observations, patterns, anomalies)
- Propose improvement tickets
- Propose follow-up prompts for the user
- Return analysis-type results

## What Watchers MUST NOT Do

- Directly send user-facing responses
- Modify operational DB (tasks, reminders, threads, entities)
- Bypass orchestrator aggregation and promotion rules
- Store memory items directly (must go through memory_module via orchestrator)

## Output Handling

All watcher outputs pass through the Result Aggregator. The orchestrator decides:

- Whether to promote proposed observations to memory (via memory_module)
- Whether to create improvement tickets (via improvement_module)
- Whether to include follow-up prompts in the response

## Privacy Profile

| Field | MVP | Target |
|---|---|---|
| Consumed content class | `normalized_content` | `llm_safe_content` |
| Produces PII artifacts | No | No (uses token/entity references) |

## Idempotency

- Watcher outputs are proposals only with no direct side effects
- Idempotency is not critical for proposal generation
- The orchestrator's handling of proposals enforces idempotency at the write level

## Error Handling

- Watcher failures are non-blocking: the execution continues without watcher results
- Watcher errors are logged but do not cause execution failure
- Return `failed` status if watcher cannot execute; orchestrator ignores gracefully

---

> **Level 2 — Canonical Subordinate.** Version: 1.0 | Last updated: 2026-04-15
