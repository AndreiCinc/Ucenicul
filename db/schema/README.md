# Schema Documentation

Detailed schema documentation for each table. Updated as migrations are applied.

## Tables

### organizations

Top-level tenant container. Each organization can have multiple business tenants.

Key columns: `id` (UUID), `name`, `owner_email`, `created_at`

### tenants

Business units within an organization (e.g., "Airbnb", "Cleaning", "Green Spaces").

Key columns: `id` (UUID), `organization_id` (FK), `name`, `slug`, `vertical`, `timezone`, `currency_code`, `telegram_chat_id`

### tasks

Operational tasks with lifecycle management.

Key columns: `id` (UUID), `tenant_id` (FK), `title`, `description`, `priority` (urgent/high/normal/low), `status` (open/completed/cancelled), `due_type` (flexible/date/datetime), `due_date`, `due_at`, `created_at`

### reminders

Time-triggered notifications.

Key columns: `id` (UUID), `tenant_id` (FK), `title`, `description`, `remind_at` (timestamp), `status` (pending/sent/cancelled), `created_at`

### messages

Append-only log of all inbound and outbound messages.

Key columns: `id` (UUID), `tenant_id` (FK), `organization_id` (FK), `direction` (inbound/outbound), `source` (telegram), `content`, `intent`, `created_at`

### rag_memories

Vector embeddings for semantic memory and RAG retrieval.

Key columns: `id` (UUID), `tenant_id` (FK), `content`, `memory_kind` (fact/insight/advice), `memory_category`, `embedding` (vector(1536)), `importance_score`, `created_at`

## Schema files

Actual DDL is in `migrations/`. This directory contains design notes and documentation only.
