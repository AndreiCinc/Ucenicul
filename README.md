# Ucenicul

**AI executive assistant that learns your business, manages your operations, and grows with you.**

An entrepreneur shouldn't spend 4 hours a day on WhatsApp coordinating work. Ucenicul is the assistant that remembers everything, manages tasks and reminders, understands your business context, and eventually handles marketing, sales forecasting, and integrations — so you can focus on growing.

---

## The vision

Ucenicul is a modular AI assistant built for small business owners managing multiple operations (Airbnb, cleaning, green spaces, etc.). It starts as a conversational brain on Telegram that understands natural language in Romanian, and evolves into a full operational platform.

The system is designed around one core idea: **the assistant should know the entrepreneur's business as well as they do** — their tasks, their deadlines, their clients, their patterns, their history. It remembers the past, understands the present, and helps plan the future.

## Modules

### Brain (MVP — in development)

The core module. Everything else builds on top of this.

The brain processes natural language messages through a single LLM call that classifies intent, extracts structured data, and generates responses — all validated against a strict contract. It manages:

- **Tasks** — Create, list, update, complete, and delete through conversation. Supports priorities, due dates, batch operations, and natural filtering ("show me overdue tasks", "delete everything before today").
- **Reminders** — Time-triggered notifications with natural scheduling ("remind me tomorrow at 10 to call the supplier").
- **Semantic memory (RAG)** — Stores durable business facts, insights, client preferences, operational patterns, and relationship history as vector embeddings. The assistant retrieves relevant context automatically — it knows that Ion is your Airbnb supplier, that you buy detergent every Monday, that the cleaning crew works better in the morning.
- **Business context** — Understands the entrepreneur's business model, constraints, and goals. Uses this context to give relevant advice, flag risks, and make better decisions over time.
- **Mentoring** — As the memory builds up, the assistant can advise on business decisions, remind you of patterns you've forgotten, and help you think through operational challenges. It's not just a task manager — it's a business partner that never forgets.

### Marketing module (planned)

Integrations that help the entrepreneur create and distribute content without switching between 10 tools:

- **Email integration** — Read, draft, and manage business emails
- **Social media** — Connect to platforms, schedule and publish posts
- **Content creation** — Generate text, create visuals, produce short videos using AI tools
- **WhatsApp Business** — Migrate the primary interface from Telegram to WhatsApp (where most Romanian entrepreneurs already communicate)

### Sales module (planned)

Financial intelligence connected to real business data:

- **Accounting integration** — Connect to the entrepreneur's accounting software for real revenue/expense data
- **Forecasting** — Revenue projections based on historical patterns and business seasonality
- **Business analytics** — Occupancy rates, client retention, cost tracking, margin analysis
- **Growth planning** — Scenario modeling for expansion decisions (new apartments, new services, hiring)

### Future modules

- **Client management** — CRM-like features built into the conversation
- **Team coordination** — Delegate tasks to employees through the assistant
- **Document management** — Generate contracts, invoices, reports
- **Automation hub** — Connect any business tool through n8n integrations

## Tech stack

| Layer | Technology |
|-------|-----------|
| Interface | Telegram Bot API (WhatsApp planned) |
| Orchestration | n8n (workflow automation) |
| Brain | GPT-4o via OpenAI API |
| Database | PostgreSQL |
| Vector memory | pgvector extension |
| Embeddings | OpenAI text-embedding-3-small |
| Hosting | Railway (EU Frankfurt) |
| Development | Claude Code + 14 custom skills |

## Brain architecture

```
Telegram → n8n Webhook → Normalize Input → Load Context
    → Build Brain Prompt (context + tasks + reminders + memories)
    → GPT-4o (intent classification + structured JSON)
    → Parse & Validate Contract → Route by Intent (14 intents)
    → Execute Action (CRUD / memory write / response)
    → Format Response → Send Telegram
```

The brain follows a **single-LLM-call pattern**: one API call per message handles intent classification, field extraction, response generation, and memory writes. A strict brain contract (14 intents, typed fields, validation rules) ensures the output is always parseable and safe to execute.

Context is injected into every call: open tasks, pending reminders, business profile, and relevant memories from the vector store. This is what makes the assistant feel like it actually knows the business — not just a stateless chatbot.

See [docs/architecture.md](docs/architecture.md) for the full technical architecture.

## Repository structure

```
.
├── README.md                   # This file
├── CLAUDE.md                   # Claude project instructions
├── .gitignore                  # Git ignore rules
├── .claude/skills/             # Claude skill definitions (14 skills)
│   ├── orchestrator/           # Session coordination and routing
│   ├── system-architect/       # Architecture decisions
│   ├── sql-architect/          # Database schema design
│   ├── n8n-architect/          # Workflow design
│   ├── n8n-workflow-builder/   # Workflow JSON generation
│   ├── pgvector-architect/     # Vector memory design
│   ├── prompt-engineer/        # LLM prompt optimization
│   ├── telegram-architect/     # Bot interface design
│   ├── railway-devops/         # Infrastructure management
│   ├── gdpr-advisor/           # Privacy compliance
│   ├── integration-validator/  # Cross-system consistency checks
│   ├── repo-architect/         # Repository structure maintenance
│   ├── n8n-auditor/            # Workflow quality review
│   └── readme-writer/          # Documentation quality
├── src/brain/                  # Brain contract and parser
│   ├── brain_contract.json     # Single source of truth for all intents
│   └── parse_contract.js       # Contract validation and inference logic
├── workflows/                  # n8n workflow exports (sanitized, pending export)
├── db/                         # Database documentation
│   ├── schema/                 # Schema documentation
│   └── migrations/             # Migration file documentation
├── migrations/                 # SQL migration files
│   ├── 001_initial_schema.sql  # Core tables
│   └── 002_rag_memories.sql    # Vector memory table
├── testing/                    # Test suites
└── docs/                       # Project documentation
    ├── architecture.md         # System architecture
    ├── repository-structure.md # Repo organization guide
    └── portfolio-notes.md      # CV/interview presentation notes
```

## Setup

### Prerequisites

- PostgreSQL 15+ with pgvector extension
- n8n instance (cloud or self-hosted)
- OpenAI API key
- Telegram bot (via BotFather)

### Environment

Create a `.env` file and populate it with the variables listed in the [Environment variables](#environment-variables) section below.

### Database

```bash
psql $DATABASE_URL -f migrations/001_initial_schema.sql
psql $DATABASE_URL -f migrations/002_rag_memories.sql
```

### n8n workflows

Import workflow JSON files from `workflows/` into your n8n instance. Configure credentials for PostgreSQL, OpenAI, and Telegram.

## Environment variables

Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | GPT-4o API access |
| `TELEGRAM_BOT_TOKEN` | Telegram bot authentication |
| `N8N_WEBHOOK_URL` | Base URL for n8n webhooks |
| `ENCRYPTION_KEY` | PII encryption at rest |

## Current status

**Phase**: Brain MVP (in development)

**Working**:
- Intent classification across 14 intents
- Task CRUD (create, list, update, complete, delete with batch filters)
- Reminder CRUD
- Brain contract validation and parser with inference logic
- Context injection (tasks, reminders, business profile)
- Telegram integration (inbound + outbound)
- Multi-tenant database schema
- Vector memory table and embedding pipeline
- Memory writes (facts, insights, advice)

**In progress**:
- RAG memory retrieval and context enrichment
- Morning briefing workflow
- Prompt tuning for Romanian natural language edge cases

**Planned**:
- Marketing module (email, social media, content creation, WhatsApp)
- Sales module (accounting integration, forecasting, analytics)
- Client management
- Web dashboard

## What makes this technically interesting

**Contract-driven LLM integration** — Instead of treating the LLM as a black box, every response is validated against a typed contract with 14 intents, field schemas, and disambiguation rules. The parser handles inference, defaults, and edge cases that the LLM misses — making the system reliable despite LLM inconsistency.

**Semantic memory as business context** — The RAG layer doesn't just store chat history. It stores structured business knowledge: client preferences, operational patterns, supplier relationships, seasonal trends. Over time, the assistant builds a genuine understanding of the business.

**Modular architecture** — The brain is the foundation, but every future module (marketing, sales, CRM) connects through the same n8n orchestration layer and shares the same memory. This means the sales module knows what the marketing module posted, and the brain remembers what the sales forecast predicted.

**Skill-based development** — 14 specialized Claude skills enforce an architectural pipeline (Orchestrator → Architect → Specialist → Validator). An AI-powered development methodology for a solo developer building a complex system.

**Single-call brain pattern** — One LLM call per message handles classification, extraction, response, and memory writes. Low latency, predictable costs, structured output.

## My contribution

Designed and built as a solo developer:

- **Product vision** — The modular assistant concept, from brain to marketing to sales
- **Architecture** — Multi-tenant, privacy-aware system with contract-driven LLM integration
- **Brain contract** — Intent classification schema, validation rules, disambiguation logic, and inference engine
- **n8n workflows** — Complete workflow design, 61-node main pipeline, data flow implementation
- **Database schema** — Multi-tenant PostgreSQL with pgvector semantic memory layer
- **Prompt engineering** — 400+ line system prompt for intent classification in Romanian
- **Testing framework** — Structural validators, cross-artifact consistency checks, Telegram path simulators
- **Development methodology** — 14 Claude skills that enforce quality across architecture, code, and compliance
- **Claude Code** was used as a development tool throughout the project

## Workflow sanitization

Workflow JSON files in this repository have been sanitized:
- All credential IDs replaced with placeholders
- No API keys, tokens, or passwords
- No execution-specific data
- Node names are descriptive and consistent with architecture docs

## Screenshots / Demo

> Coming soon — live demo with sanitized test data.

---

Built with n8n, PostgreSQL, pgvector, and GPT-4o.
