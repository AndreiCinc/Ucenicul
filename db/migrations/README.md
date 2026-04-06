# Migrations

SQL migration files for Ucenicul's PostgreSQL database.

## Migration files

Actual SQL files are in the root `migrations/` directory:

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Core tables: organizations, tenants, tasks, reminders, messages |
| `002_rag_memories.sql` | Vector memory table with pgvector extension |

## Conventions

- Files are numbered sequentially: `001_`, `002_`, `003_`, etc.
- Each migration is designed to be run once, in order
- Use `IF NOT EXISTS` where possible for safety
- Include `CREATE EXTENSION IF NOT EXISTS vector` before any pgvector operations
- Never drop tables or columns in a migration without explicit documentation of data loss

## Adding a new migration

1. Create a file: `migrations/NNN_description.sql`
2. Include a comment header with date and purpose
3. Test locally before applying to production
4. Update this README and `db/schema/README.md`
