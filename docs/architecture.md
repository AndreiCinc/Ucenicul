# Architecture

## Overview

Ucenicul is a modular AI executive assistant for small business owners. The system is built around a central **brain module** that understands natural language, manages operations, and accumulates business knowledge over time. Additional modules (marketing, sales, integrations) will connect to the same brain and share its memory — creating an assistant that understands the full picture of the entrepreneur's business.

The current focus is the brain MVP: intent classification, task/reminder management, and semantic memory — all orchestrated through n8n workflows with PostgreSQL + pgvector as the data layer.

## System layers

### 1. Interface layer — Telegram Bot

The user interacts through a Telegram bot. Messages arrive via webhook to n8n, and responses are sent back via Telegram Bot API HTTP requests.

The interface is deliberately simple: text-only, no menus, no buttons. The user speaks naturally in Romanian and the system interprets intent.

Future migration path: Telegram → WhatsApp Business API (Phase 2).

### 2. Orchestration layer — n8n

n8n serves as the execution engine. Every user message flows through a single monolithic workflow that handles the complete lifecycle:

```
Telegram Trigger
  → Normalize Input
  → Privacy Gate (NO-OP for MVP)
  → Resolve Organization & Tenant
  → Load Context (tasks, reminders, business, memories)
  → Build Brain Input (construct LLM prompt with context)
  → Brain Decision (GPT-4o API call)
  → Parse & Validate Contract (strict JSON validation)
  → Route by Intent (14-way switch)
  → Execute Action (intent-specific SQL)
  → Format Response
  → Insert Message Log
  → Privacy Gate Outbound
  → Send Telegram Response
```

n8n was chosen over a custom backend because it dramatically reduces development time for a solo developer. The trade-off is limited runtime flexibility, which is acceptable for MVP.

### 3. Brain layer — GPT-4o

A single LLM call per message handles:

- Intent classification (14 intents)
- Structured field extraction (task titles, dates, priorities, filter scopes)
- User-facing response generation (Romanian)
- Memory write candidates (facts, insights worth storing)

The LLM output is a strict JSON object validated against the brain contract. The parser handles inference, defaults, and edge cases that the LLM misses (e.g., filter scope inference from Romanian phrases, date normalization, disambiguation).

Model configuration: GPT-4o, temperature 0, JSON response format, ~800 max tokens.

### 4. Data layer — PostgreSQL + pgvector

**Structured data** (PostgreSQL):
- `organizations` — tenant registry
- `tenants` — business units (Airbnb, cleaning, green spaces)
- `tasks` — with priority, due dates, status, tenant isolation
- `reminders` — time-triggered notifications
- `messages` — full inbound/outbound message log

**Semantic memory** (pgvector):
- `rag_memories` — vector embeddings of durable business facts
- 1536-dimension embeddings via OpenAI text-embedding-3-small
- Cosine similarity search with tenant isolation
- Deduplication via similarity threshold (>0.92 = duplicate)

All tables enforce `tenant_id` NOT NULL constraints for strict data isolation.

### 5. Privacy layer

Designed for GDPR compliance from the start:

- EU data storage (Railway Frankfurt)
- PII identification in schema documentation
- Retention policies per data type
- Deletion paths for right-to-be-forgotten requests
- Encryption at rest for sensitive fields (planned)
- Privacy gates in the workflow (currently NO-OP, designed for future PII filtering)

## Brain contract

The brain contract (`src/brain/brain_contract.json`) is the single source of truth. It defines:

- 14 valid intents with field schemas
- Validation rules per intent
- Disambiguation patterns (Romanian language)
- Filter scope definitions and inference rules
- Default values for optional fields

All other artifacts (LLM prompt, parser, SQL queries, tests) are derived from or validated against this contract.

## Data flow — example: create task

1. User sends: "Mâine trebuie să sun furnizorul"
2. Telegram webhook delivers to n8n
3. Normalize Input extracts `raw_user_message`, `chat_id`, `message_id`
4. Resolve Org & Tenant looks up tenant by `chat_id`
5. Load Context fetches open tasks, reminders, business profile, memories
6. Build Brain Input constructs system prompt + context + user message
7. GPT-4o returns: `{ intent: "create_task", task_action: { title: "Sună furnizorul", due_date: "2026-04-06", priority: "normal" } }`
8. Parser validates contract, infers `due_type: "date"`, applies defaults
9. Route by Intent → Create Task branch
10. PostgreSQL INSERT with parameterized query
11. Merge result, build confirmation response
12. Insert outbound message to log
13. Send Telegram response: "Am creat task-ul: Sună furnizorul — 06.04.2026"

## Design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Orchestration | n8n workflows | Fastest path to working MVP for solo dev |
| LLM | GPT-4o (single call) | Best accuracy for Romanian + structured output |
| Database | PostgreSQL + pgvector | One database for everything, no extra infrastructure |
| Interface | Telegram | Entrepreneur already uses mobile messaging daily |
| Hosting | Railway (EU) | Simple PaaS, GDPR-compliant region, managed Postgres |
| Architecture | Monolithic workflow | Simpler to debug and maintain; split later if needed |

## Module roadmap

### Brain module (MVP — current)

The foundation. Handles intent classification, task/reminder CRUD, semantic memory, and business context. Everything else depends on this.

What's working: 14-intent classification, task/reminder operations, contract validation, context injection, memory writes, Telegram integration.

What's in progress: RAG retrieval optimization, morning briefing, prompt tuning.

### Marketing module (planned)

Connects the brain to content creation and distribution channels:

- Email integration (read, draft, manage business correspondence)
- Social media management (schedule, publish, track posts)
- Content generation (text, visuals, short videos via AI tools)
- WhatsApp Business API (primary interface migration from Telegram)

The brain's semantic memory means the marketing module will know the business context — it won't just schedule posts, it will know what to say based on the entrepreneur's business patterns, client preferences, and seasonal trends.

### Sales module (planned)

Financial intelligence connected to real business data:

- Accounting software integration for real revenue/expense data
- Revenue forecasting based on historical patterns and business seasonality
- Occupancy analytics, client retention tracking, margin analysis
- Growth scenario modeling (new apartments, new services, hiring decisions)

The shared memory layer means sales insights feed back into the brain — if revenue drops, the brain can proactively suggest operational adjustments.

### Future modules

- Client management (conversational CRM)
- Team coordination (task delegation to employees)
- Document generation (contracts, invoices, reports)
- Automation hub (connect any business tool through n8n)

## What's not built yet (brain MVP)

- Morning briefing (scheduled workflow)
- Advanced RAG retrieval (basic write works, retrieval in progress)
- PII encryption at rest
- Automated backups
