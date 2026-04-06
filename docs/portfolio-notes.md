# Portfolio Presentation Notes

Internal reference for presenting this project in a CV or interview context.

## What to emphasize

**Product vision**: This isn't a chatbot demo. It's a modular AI assistant designed to grow with the entrepreneur — starting with operational management (brain), expanding into marketing and sales. The modular architecture means each new module inherits the brain's memory and context.

**System design thinking**: Demonstrates the ability to design a multi-tenant, privacy-aware, modular system from scratch. The architecture document, brain contract, and skill system show deliberate engineering decisions — not just code.

**Contract-driven LLM integration**: The brain contract pattern is the most technically interesting aspect. Instead of hoping the LLM returns usable output, every response is validated against a typed schema with 14 intents, inference rules, and fallback logic. A real-world solution to LLM reliability.

**Semantic memory as business intelligence**: The RAG layer stores structured business knowledge (client preferences, operational patterns, supplier relationships) — not just chat logs. Over time, the assistant builds genuine understanding. This is what separates it from a simple task bot.

**Solo developer scope management**: 16 Claude skills enforce an architectural pipeline, preventing the kind of drift that kills solo projects. This is an AI-powered development methodology.

## What not to overclaim

- The brain is an MVP, not a production SaaS. Say "MVP" explicitly. Marketing and sales modules are planned, not built.
- n8n workflows are the orchestration layer, not a custom backend. This is a deliberate trade-off, not a limitation — explain it that way.
- GPT-4o does the classification. The engineering is in the contract, parser, and pipeline — not in training a model.
- The project is not deployed at scale. It's designed for one test client.
- The modular vision is real and architecturally supported, but only the brain module exists today. Be honest about what's working vs what's planned.

## How to explain the architecture

"The system uses a single LLM call per message to classify intent and extract structured fields. The output is validated against a strict contract — think of it like a typed API schema for LLM responses. A parser handles inference and edge cases that the model misses. The actual execution — database writes, message delivery, memory storage — happens through n8n workflows connected to PostgreSQL."

## How to explain the n8n choice

"I chose n8n as the orchestration layer because it let me build a working pipeline in days instead of weeks. For a solo MVP with a 90-day deadline, development speed was more important than runtime performance. The architecture is designed so n8n could be replaced with a custom backend later without changing the database schema or brain contract."

## How to explain the skill system

"I built 16 specialized Claude skills that act as an architectural review board — an orchestrator routes requests, an architect validates design, an analyst checks business value, specialists handle implementation, and a validator catches inconsistencies. It's essentially an AI-powered development methodology for working alone on a complex system."

## Interview talking points

1. How do you make LLM output reliable? → Brain contract + typed parser + inference fallbacks
2. How do you handle multi-tenancy? → tenant_id on every table, enforced at query level
3. Why n8n instead of a custom backend? → Solo dev, 90-day deadline, trade-off was deliberate
4. How do you handle GDPR? → EU hosting, PII identification, retention policies, deletion paths
5. How do the modules connect? → Shared memory layer (pgvector) + shared orchestration (n8n). Marketing knows what sales forecasted. Brain remembers what marketing posted.
6. What's the business model? → SaaS subscription per entrepreneur. Brain is free tier, modules are paid.
7. What would you change? → Move to a custom backend for latency-critical paths; add proper observability
