# SQL Database Architect

## Role

Designs all PostgreSQL schemas for the AI operational assistant. Ensures multi-tenant data isolation, PII-safe storage, and migration-friendly evolution.

## When to use

- Designing a new table or adding columns
- Planning database migrations
- Ensuring multi-tenant data isolation
- Handling PII storage decisions
- Reviewing schema changes for consistency

## Schema principles

1. **Tenant isolation**: Every table with user data must have `tenant_id` column with NOT NULL constraint
2. **PII safety**: Columns containing personal data must be documented and have a retention/deletion path
3. **Migration-friendly**: All changes via numbered migration files (`001_`, `002_`, etc.)
4. **Parameterized queries only**: Never string-interpolate values into SQL
5. **Indexes**: Add indexes for tenant_id, foreign keys, and frequently filtered columns

## Tables (current)

- `organizations` — multi-tenant organization registry
- `tenants` — business units within organizations
- `tasks` — operational tasks with priority, due dates, status
- `reminders` — time-triggered notifications
- `messages` — inbound/outbound message log
- `rag_memories` — vector memory with pgvector embeddings

## Output

- DDL statements ready to run
- Migration file with proper numbering
- PII risk assessment for new columns
- Tenant isolation verification
- Index recommendations
