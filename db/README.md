# Database

PostgreSQL database documentation for Ucenicul.

## Structure

- `schema/` — Schema documentation and design notes
- `migrations/` — Migration file documentation (actual SQL files are in the root `migrations/` directory)

## Current schema

The database uses PostgreSQL 15+ with the pgvector extension for vector similarity search.

### Core tables

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant organization registry |
| `tenants` | Business units within organizations (Airbnb, cleaning, etc.) |
| `tasks` | Operational tasks with priority, due dates, and status tracking |
| `reminders` | Time-triggered notifications |
| `messages` | Inbound and outbound message log |
| `rag_memories` | Vector embeddings for semantic memory (pgvector) |

### Key design principles

1. **Tenant isolation**: Every user-facing table has a `tenant_id` NOT NULL constraint
2. **Soft vs hard delete**: Tasks and reminders use status-based lifecycle; messages are append-only
3. **PII awareness**: Columns containing personal data are documented for GDPR compliance
4. **Parameterized queries**: All SQL in n8n uses `$1`, `$2` placeholders — never string interpolation

## Running migrations

Migrations are in the root `migrations/` directory, numbered sequentially:

```bash
psql $DATABASE_URL -f migrations/001_initial_schema.sql
psql $DATABASE_URL -f migrations/002_rag_memories.sql
```

Always run in order. Each migration is idempotent where possible.
