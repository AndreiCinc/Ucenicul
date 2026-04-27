# ADR-003 — Inference safety v1 uses Romanian lexical heuristic

## Decision

For v1, `store_memory` rejects clearly subjective Romanian judgments when storing `observation` or `pattern`.

## Reason

A lightweight deterministic filter is better than storing obviously unsafe judgments while waiting for a richer classifier.

## Consequence

- v1 stays cheap and auditable
- multilingual classification is deferred to v2
- final verification must document this limitation
